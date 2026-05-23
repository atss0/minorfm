package handlers

import (
	"strings"

	"github.com/atss0/minorfm/internal/models"
	"github.com/gofiber/fiber/v2"
)

func (h *Handler) Search(c *fiber.Ctx) error {
	q := c.Query("q")
	if len(q) < 2 {
		return fiber.NewError(fiber.StatusBadRequest, "query must be at least 2 characters")
	}

	limit := c.QueryInt("limit", 20)
	if limit > 50 {
		limit = 50
	}

	escaped := strings.NewReplacer("%", "\\%", "_", "\\_").Replace(q)
	pattern := "%" + escaped + "%"

	var posts []models.Post
	h.DB.Preload("User").Preload("Category").
		Where("title ILIKE ? OR body ILIKE ?", pattern, pattern).
		Order("created_at desc").
		Limit(limit).
		Find(&posts)

	var users []models.User
	h.DB.Where("username ILIKE ? OR bio ILIKE ?", pattern, pattern).
		Limit(10).
		Find(&users)

	return c.JSON(fiber.Map{
		"posts": posts,
		"users": users,
	})
}
