package handlers

import (
	"github.com/gofiber/fiber/v2"
	"github.com/atss0/minorfm/internal/models"
)

func (h *Handler) GetCategories(c *fiber.Ctx) error {
	var categories []models.Category
	if err := h.DB.Order("sort_order asc").Find(&categories).Error; err != nil {
		return err
	}
	return c.JSON(categories)
}

func (h *Handler) GetCategory(c *fiber.Ctx) error {
	slug := c.Params("slug")
	var category models.Category
	if err := h.DB.Where("slug = ?", slug).First(&category).Error; err != nil {
		return fiber.NewError(fiber.StatusNotFound, "category not found")
	}
	return c.JSON(category)
}
