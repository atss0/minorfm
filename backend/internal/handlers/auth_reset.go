package handlers

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"time"

	"github.com/atss0/minorfm/internal/models"
	"github.com/gofiber/fiber/v2"
	"golang.org/x/crypto/bcrypt"
)

const resetTokenTTL = time.Hour

func (h *Handler) ForgotPassword(c *fiber.Ctx) error {
	type body struct {
		Email string `json:"email"`
	}
	var req body
	if err := c.BodyParser(&req); err != nil {
		return fiber.ErrBadRequest
	}

	var user models.User
	if err := h.DB.Where("email = ?", req.Email).First(&user).Error; err != nil {
		// Don't leak whether the email exists
		return c.JSON(fiber.Map{"message": "If that email exists, a reset link has been sent."})
	}

	token := make([]byte, 32)
	if _, err := rand.Read(token); err != nil {
		return err
	}
	tokenStr := hex.EncodeToString(token)

	ctx := context.Background()
	if err := h.RDB.Set(ctx, "pwd_reset:"+tokenStr, user.ID.String(), resetTokenTTL).Err(); err != nil {
		return err
	}

	resetURL := h.Cfg.AppURL + "/reset-password?token=" + tokenStr
	_ = h.Mailer.SendPasswordReset(user.Email, resetURL)

	return c.JSON(fiber.Map{"message": "If that email exists, a reset link has been sent."})
}

func (h *Handler) ResetPassword(c *fiber.Ctx) error {
	type body struct {
		Token    string `json:"token"`
		Password string `json:"new_password"`
	}
	var req body
	if err := c.BodyParser(&req); err != nil {
		return fiber.ErrBadRequest
	}
	if len(req.Password) < 8 {
		return fiber.NewError(fiber.StatusBadRequest, "password must be at least 8 characters")
	}

	ctx := context.Background()
	userID, err := h.RDB.Get(ctx, "pwd_reset:"+req.Token).Result()
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "invalid or expired token")
	}

	hashBytes, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	hash := string(hashBytes)

	if err := h.DB.Model(&models.User{}).Where("id = ?", userID).Update("password_hash", hash).Error; err != nil {
		return err
	}

	h.RDB.Del(ctx, "pwd_reset:"+req.Token)
	return c.JSON(fiber.Map{"message": "password reset successfully"})
}
