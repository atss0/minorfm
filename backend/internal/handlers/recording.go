package handlers

import (
	"strconv"

	"github.com/atss0/minorfm/internal/models"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

const maxAudioSize = 50 << 20 // 50 MB

func (h *Handler) GetRecordings(c *fiber.Ctx) error {
	page, _ := strconv.Atoi(c.Query("page", "1"))
	if page < 1 {
		page = 1
	}
	limit := 20
	offset := (page - 1) * limit

	var recordings []models.Recording
	if err := h.DB.Preload("User").
		Order("created_at DESC").
		Limit(limit).Offset(offset).
		Find(&recordings).Error; err != nil {
		return err
	}

	return c.JSON(fiber.Map{"recordings": recordings})
}

func (h *Handler) CreateRecording(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)

	fileHeader, err := c.FormFile("audio")
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "audio file required")
	}
	if fileHeader.Size > maxAudioSize {
		return fiber.NewError(fiber.StatusBadRequest, "file too large: max 50MB")
	}

	file, err := fileHeader.Open()
	if err != nil {
		return err
	}
	defer file.Close()

	if h.Storage == nil {
		return fiber.NewError(fiber.StatusServiceUnavailable, "storage not configured")
	}

	audioURL, err := h.Storage.UploadAudio(c.Context(), file, fileHeader, "recordings")
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "upload failed")
	}

	duration, _ := strconv.Atoi(c.FormValue("duration", "0"))

	titleStr := c.FormValue("title")
	var title *string
	if titleStr != "" {
		title = &titleStr
	}

	uid, _ := uuid.Parse(userID)
	recording := &models.Recording{
		UserID:   uid,
		AudioURL: audioURL,
		Duration: duration,
		Title:    title,
	}

	if err := h.DB.Create(recording).Error; err != nil {
		return err
	}

	h.DB.Preload("User").First(recording, "id = ?", recording.ID)

	return c.Status(fiber.StatusCreated).JSON(recording)
}

func (h *Handler) DeleteRecording(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	id := c.Params("id")

	var recording models.Recording
	if err := h.DB.First(&recording, "id = ?", id).Error; err != nil {
		return fiber.NewError(fiber.StatusNotFound, "recording not found")
	}

	uid, _ := uuid.Parse(userID)
	if recording.UserID != uid {
		return fiber.NewError(fiber.StatusForbidden, "not your recording")
	}

	if h.Storage != nil && recording.AudioURL != "" {
		_ = h.Storage.Delete(c.Context(), recording.AudioURL)
	}

	if err := h.DB.Delete(&recording).Error; err != nil {
		return err
	}

	return c.SendStatus(fiber.StatusNoContent)
}
