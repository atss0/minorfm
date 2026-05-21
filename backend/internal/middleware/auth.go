package middleware

import (
	"context"
	"fmt"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v4"
	"github.com/atss0/minorfm/internal/config"
	"github.com/redis/go-redis/v9"
)

func JWTProtected(cfg *config.Config, rdb *redis.Client) fiber.Handler {
	return func(c *fiber.Ctx) error {
		authHeader := c.Get("Authorization")
		if !strings.HasPrefix(authHeader, "Bearer ") {
			return fiber.NewError(fiber.StatusUnauthorized, "missing or malformed token")
		}
		tokenStr := authHeader[7:]

		if rdb.Exists(context.Background(), fmt.Sprintf("blacklist:%s", tokenStr)).Val() > 0 {
			return fiber.NewError(fiber.StatusUnauthorized, "token has been revoked")
		}

		claims := &jwt.MapClaims{}
		token, err := jwt.ParseWithClaims(tokenStr, claims, func(t *jwt.Token) (interface{}, error) {
			if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fiber.ErrUnauthorized
			}
			return []byte(cfg.JWTSecret), nil
		})
		if err != nil || !token.Valid {
			return fiber.NewError(fiber.StatusUnauthorized, "invalid or expired token")
		}

		c.Locals("userID", (*claims)["sub"].(string))
		c.Locals("userRole", (*claims)["role"].(string))
		return c.Next()
	}
}
