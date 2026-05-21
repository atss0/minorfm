package handlers

// @title MINOR.fm API
// @version 1.0
// @description MINOR.fm — müzik ve kültür platformu REST API
// @termsOfService http://minor.fm/terms
// @contact.name API Destek
// @contact.email api@minor.fm
// @license.name MIT
// @host localhost:8080
// @BasePath /api
// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/atss0/minorfm/internal/models"
	"github.com/gofiber/fiber/v2"
)

const sessionTTL = 15 * time.Minute
const sessionKeyPrefix = "session:"

// GetMe returns the authenticated user, using Redis session cache for speed.
func (h *Handler) GetMe(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	ctx := context.Background()

	if h.RDB != nil {
		if cached, err := h.RDB.Get(ctx, sessionKeyPrefix+userID).Result(); err == nil {
			c.Set("X-Cache", "HIT")
			return c.SendString(cached)
		}
	}

	var user models.User
	if err := h.DB.First(&user, "id = ?", userID).Error; err != nil {
		return fiber.ErrUnauthorized
	}

	if h.RDB != nil {
		if data, err := json.Marshal(user); err == nil {
			h.RDB.Set(ctx, sessionKeyPrefix+userID, string(data), sessionTTL)
		}
	}

	return c.JSON(user)
}

// InvalidateSession removes the Redis session cache for a user (call on profile update, password change).
func (h *Handler) InvalidateSession(userID string) {
	if h.RDB == nil {
		return
	}
	h.RDB.Del(context.Background(), fmt.Sprintf("%s%s", sessionKeyPrefix, userID))
}
