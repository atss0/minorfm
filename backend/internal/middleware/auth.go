package middleware

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v4"
	"github.com/atss0/minorfm/internal/config"
	"github.com/atss0/minorfm/internal/models"
	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
)

func JWTProtected(cfg *config.Config, rdb *redis.Client, db *gorm.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		authHeader := c.Get("Authorization")
		if !strings.HasPrefix(authHeader, "Bearer ") {
			return fiber.NewError(fiber.StatusUnauthorized, "missing or malformed token")
		}
		tokenStr := authHeader[7:]

		// Blacklist check (skip if Redis unavailable)
		if rdb != nil {
			ctx := context.Background()
			// New: Sorted Set blacklist
			if score, err := rdb.ZScore(ctx, "token_blacklist", tokenStr).Result(); err == nil && score > float64(time.Now().Unix()) {
				return fiber.NewError(fiber.StatusUnauthorized, "token has been revoked")
			}
			// Backward compat: old per-key blacklist
			if rdb.Exists(ctx, fmt.Sprintf("blacklist:%s", tokenStr)).Val() > 0 {
				return fiber.NewError(fiber.StatusUnauthorized, "token has been revoked")
			}
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

		userID, _ := (*claims)["sub"].(string)

		// Load user and enforce ban status (skip if DB unavailable)
		if db != nil {
			var user models.User
			if err := db.First(&user, "id = ?", userID).Error; err != nil {
				return fiber.ErrUnauthorized
			}
			if user.BannedAt != nil {
				if user.BanExpiresAt == nil || user.BanExpiresAt.After(time.Now()) {
					return fiber.NewError(fiber.StatusForbidden, "Hesabınız yasaklanmıştır.")
				}
				// Ban expired — clear it
				db.Model(&user).Update("banned_at", nil)
			}
			c.Locals("userID", user.ID.String())
			c.Locals("userRole", string(user.Role))
			c.Locals("user", user)
		} else {
			c.Locals("userID", userID)
			c.Locals("userRole", (*claims)["role"].(string))
		}

		return c.Next()
	}
}
