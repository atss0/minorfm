package handlers

import (
	"context"
	"fmt"
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
)

// GetLiveStats returns today's heart/clap counts and current listener count.
func (h *Handler) GetLiveStats(c *fiber.Ctx) error {
	ctx := context.Background()
	today := time.Now().UTC().Format("2006-01-02")

	heartsStr, _ := h.RDB.Get(ctx, fmt.Sprintf("stats:%s:hearts", today)).Result()
	clapsStr, _ := h.RDB.Get(ctx, fmt.Sprintf("stats:%s:claps", today)).Result()
	listeners, _ := h.RDB.ZCard(ctx, "online:users").Result()

	hearts, _ := strconv.ParseInt(heartsStr, 10, 64)
	claps, _ := strconv.ParseInt(clapsStr, 10, 64)

	return c.JSON(fiber.Map{
		"hearts":    hearts,
		"claps":     claps,
		"listeners": listeners,
	})
}
