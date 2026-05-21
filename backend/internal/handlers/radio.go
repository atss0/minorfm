package handlers

import (
	"context"
	"encoding/json"

	wsconn "github.com/gofiber/contrib/websocket"
	"github.com/gofiber/fiber/v2"

	"github.com/atss0/minorfm/internal/models"
)

// GetRadioCurrent returns the live radio state cached in Redis.
func (h *Handler) GetRadioCurrent(c *fiber.Ctx) error {
	state, err := h.Scheduler.GetState(context.Background())
	if err != nil {
		return c.JSON(fiber.Map{"track": nil, "is_playing": false})
	}
	return c.JSON(state)
}

// GetRadioQueue returns all tracks ordered for playback.
func (h *Handler) GetRadioQueue(c *fiber.Ctx) error {
	var tracks []models.Track
	if err := h.DB.Order(`"order" ASC, created_at ASC`).Find(&tracks).Error; err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "could not fetch queue")
	}
	return c.JSON(fiber.Map{"data": tracks})
}

// AddRadioTrack adds a track to the queue (admin / moderator only).
func (h *Handler) AddRadioTrack(c *fiber.Ctx) error {
	var req struct {
		Title     string `json:"title"`
		Artist    string `json:"artist"`
		CoverURL  string `json:"cover_url"`
		StreamURL string `json:"stream_url"`
		Duration  int    `json:"duration"`
	}
	if err := c.BodyParser(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "invalid request body")
	}
	if req.Title == "" || req.StreamURL == "" || req.Duration < 0 {
		return fiber.NewError(fiber.StatusBadRequest, "title and stream_url are required; duration must be >= 0 (0 = live stream)")
	}

	track := models.Track{
		Title:     req.Title,
		Artist:    req.Artist,
		CoverURL:  req.CoverURL,
		StreamURL: req.StreamURL,
		Duration:  req.Duration,
	}
	if err := h.DB.Create(&track).Error; err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "could not save track")
	}

	// Auto-start playback if nothing is queued yet
	h.Scheduler.Start(context.Background())

	return c.Status(fiber.StatusCreated).JSON(track)
}

// AdminDeleteTrack removes a track from the queue (admin / moderator only).
func (h *Handler) AdminDeleteTrack(c *fiber.Ctx) error {
	id := c.Params("id")
	var track models.Track
	if err := h.DB.First(&track, "id = ?", id).Error; err != nil {
		return fiber.NewError(fiber.StatusNotFound, "track not found")
	}
	h.DB.Delete(&track)
	return c.SendStatus(fiber.StatusNoContent)
}

// AdminUpdateTrackOrder updates the playback order of a track (admin / moderator only).
func (h *Handler) AdminUpdateTrackOrder(c *fiber.Ctx) error {
	id := c.Params("id")
	type body struct {
		Order int `json:"order"`
	}
	var req body
	if err := c.BodyParser(&req); err != nil {
		return fiber.ErrBadRequest
	}
	if err := h.DB.Model(&models.Track{}).Where("id = ?", id).Update("order", req.Order).Error; err != nil {
		return err
	}
	return c.JSON(fiber.Map{"order": req.Order})
}

// AdminSkipTrack forces the scheduler to advance to the next track (admin / moderator only).
func (h *Handler) AdminSkipTrack(c *fiber.Ctx) error {
	if err := h.Scheduler.Advance(context.Background()); err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "could not skip track")
	}
	return c.JSON(fiber.Map{"skipped": true})
}

// RadioWS upgrades to a WebSocket that streams radio state changes.
// No authentication required — anyone can listen.
func (h *Handler) RadioWS() fiber.Handler {
	return wsconn.New(func(c *wsconn.Conn) {
		var initial []byte
		if state, err := h.Scheduler.GetState(context.Background()); err == nil {
			initial, _ = json.Marshal(state)
		}
		h.RadioHub.ServeClient(c, initial)
	})
}
