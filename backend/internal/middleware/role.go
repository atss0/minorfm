package middleware

import (
	"github.com/gofiber/fiber/v2"
	"github.com/atss0/minorfm/internal/models"
)

func RequireRole(roles ...models.UserRole) fiber.Handler {
	return func(c *fiber.Ctx) error {
		userRole, _ := c.Locals("userRole").(string)
		for _, role := range roles {
			if string(role) == userRole {
				return c.Next()
			}
		}
		return fiber.NewError(fiber.StatusForbidden, "insufficient permissions")
	}
}
