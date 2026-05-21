package handlers

import (
	"crypto/rand"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/atss0/minorfm/internal/models"
)

const inviteCharset = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

func generateInviteCode() (string, error) {
	b := make([]byte, 8)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	code := make([]byte, 8)
	for i, v := range b {
		code[i] = inviteCharset[int(v)%len(inviteCharset)]
	}
	return string(code), nil
}

// AdminCreateInvite generates a new invite code.
// POST /api/admin/invites
func (h *Handler) AdminCreateInvite(c *fiber.Ctx) error {
	creatorID, err := uuid.Parse(c.Locals("userID").(string))
	if err != nil {
		return fiber.ErrUnauthorized
	}

	var body struct {
		ExpiresInDays int `json:"expires_in_days"`
	}
	_ = c.BodyParser(&body)

	code, err := generateInviteCode()
	if err != nil {
		return err
	}

	invite := models.Invite{
		Code:      code,
		CreatedBy: creatorID,
	}
	if body.ExpiresInDays > 0 {
		exp := time.Now().AddDate(0, 0, body.ExpiresInDays)
		invite.ExpiresAt = &exp
	}

	if err := h.DB.Create(&invite).Error; err != nil {
		return err
	}

	h.DB.Preload("Creator").First(&invite, "id = ?", invite.ID)
	return c.Status(fiber.StatusCreated).JSON(invite)
}

// AdminListInvites returns all invite codes with usage info.
// GET /api/admin/invites
func (h *Handler) AdminListInvites(c *fiber.Ctx) error {
	var invites []models.Invite
	h.DB.Preload("Creator").Preload("UsedByUser").
		Order("created_at DESC").Find(&invites)
	return c.JSON(invites)
}

// AdminRevokeInvite deletes an unused invite.
// DELETE /api/admin/invites/:id
func (h *Handler) AdminRevokeInvite(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return fiber.ErrBadRequest
	}

	var invite models.Invite
	if err := h.DB.First(&invite, "id = ?", id).Error; err != nil {
		return fiber.NewError(fiber.StatusNotFound, "invite not found")
	}
	if invite.UsedBy != nil {
		return fiber.NewError(fiber.StatusConflict, "cannot revoke an already-used invite")
	}

	h.DB.Delete(&invite)
	return c.JSON(fiber.Map{"message": "invite revoked"})
}

// ValidateInvite checks whether a code is valid (public — used on register page load).
// GET /api/invites/:code/validate
func (h *Handler) ValidateInvite(c *fiber.Ctx) error {
	code := strings.ToUpper(strings.TrimSpace(c.Params("code")))
	var invite models.Invite
	if err := h.DB.Where("code = ? AND used_by IS NULL", code).First(&invite).Error; err != nil {
		return fiber.NewError(fiber.StatusNotFound, "invalid or used invite code")
	}
	if invite.ExpiresAt != nil && invite.ExpiresAt.Before(time.Now()) {
		return fiber.NewError(fiber.StatusGone, "invite code has expired")
	}
	return c.JSON(fiber.Map{"valid": true})
}
