package handlers

import (
	"github.com/atss0/minorfm/internal/models"
	"github.com/atss0/minorfm/internal/storage"
	"github.com/gofiber/fiber/v2"
)

const maxAvatarSize = 5 << 20  // 5 MB
const maxMediaSize  = 20 << 20 // 20 MB

func (h *Handler) UploadAvatar(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)

	fileHeader, err := c.FormFile("avatar")
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "avatar file required")
	}

	file, err := fileHeader.Open()
	if err != nil {
		return err
	}
	defer file.Close()

	if err := storage.ValidateImage(fileHeader, file, maxAvatarSize); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}

	if h.Storage == nil {
		return fiber.NewError(fiber.StatusServiceUnavailable, "storage not configured")
	}

	// Upload with a 256×256 thumbnail (used as avatar display)
	result, err := h.Storage.UploadWithThumbnail(c.Context(), file, fileHeader, "avatars", 256, 256)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "upload failed")
	}

	// Use thumbnail URL as avatar if available, otherwise original
	avatarURL := result.URL
	if result.ThumbnailURL != "" {
		avatarURL = result.ThumbnailURL
	}

	if err := h.DB.Model(&models.User{}).Where("id = ?", userID).Update("avatar_url", avatarURL).Error; err != nil {
		return err
	}

	h.InvalidateSession(userID)

	return c.JSON(fiber.Map{
		"avatar_url":    avatarURL,
		"original_url":  result.URL,
		"thumbnail_url": result.ThumbnailURL,
	})
}

func (h *Handler) UploadMedia(c *fiber.Ctx) error {
	fileHeader, err := c.FormFile("file")
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "file required")
	}

	file, err := fileHeader.Open()
	if err != nil {
		return err
	}
	defer file.Close()

	if err := storage.ValidateImage(fileHeader, file, maxMediaSize); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}

	if h.Storage == nil {
		return fiber.NewError(fiber.StatusServiceUnavailable, "storage not configured")
	}

	result, err := h.Storage.UploadWithThumbnail(c.Context(), file, fileHeader, "media", 800, 600)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "upload failed")
	}

	return c.JSON(result)
}
