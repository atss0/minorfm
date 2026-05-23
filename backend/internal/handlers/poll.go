package handlers

import (
	"errors"

	"github.com/atss0/minorfm/internal/models"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

func (h *Handler) CreatePoll(c *fiber.Ctx) error {
	postID := c.Params("id")
	pid, err := uuid.Parse(postID)
	if err != nil {
		return fiber.ErrBadRequest
	}

	type optionInput struct {
		Text string `json:"text"`
	}
	type body struct {
		Options []optionInput `json:"options"`
	}
	var req body
	if err := c.BodyParser(&req); err != nil {
		return fiber.ErrBadRequest
	}
	if len(req.Options) < 2 || len(req.Options) > 10 {
		return fiber.NewError(fiber.StatusBadRequest, "polls need 2–10 options")
	}

	poll := models.Poll{PostID: pid}
	if err := h.DB.Create(&poll).Error; err != nil {
		return err
	}
	for _, o := range req.Options {
		if o.Text == "" {
			continue
		}
		h.DB.Create(&models.PollOption{PollID: poll.ID, Text: o.Text})
	}
	h.DB.Preload("Options").First(&poll, "id = ?", poll.ID)
	return c.Status(fiber.StatusCreated).JSON(poll)
}

func (h *Handler) VotePoll(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	pollID := c.Params("id")

	pid, err := uuid.Parse(pollID)
	if err != nil {
		return fiber.ErrBadRequest
	}
	uid, _ := uuid.Parse(userID)

	type body struct {
		OptionID string `json:"option_id"`
	}
	var req body
	if err := c.BodyParser(&req); err != nil {
		return fiber.ErrBadRequest
	}
	oid, err := uuid.Parse(req.OptionID)
	if err != nil {
		return fiber.ErrBadRequest
	}

	// One vote per user per poll
	var existing models.PollVote
	err = h.DB.Where("poll_id = ? AND user_id = ?", pid, uid).First(&existing).Error
	if err == nil {
		if existing.OptionID == oid {
			return fiber.NewError(fiber.StatusConflict, "already voted for this option")
		}
		// Change vote — wrap in transaction to keep vote_count consistent
		if txErr := h.DB.Transaction(func(tx *gorm.DB) error {
			if err := tx.Model(&models.PollOption{}).
				Where("id = ?", existing.OptionID).
				UpdateColumn("vote_count", gorm.Expr("GREATEST(vote_count - 1, 0)")).Error; err != nil {
				return err
			}
			if err := tx.Model(&existing).Update("option_id", oid).Error; err != nil {
				return err
			}
			return tx.Model(&models.PollOption{}).
				Where("id = ?", oid).
				UpdateColumn("vote_count", gorm.Expr("vote_count + 1")).Error
		}); txErr != nil {
			return txErr
		}
		return c.JSON(fiber.Map{"voted": true})
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return err
	}

	// First vote — wrap in transaction to keep vote_count consistent
	if txErr := h.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&models.PollVote{PollID: pid, OptionID: oid, UserID: uid}).Error; err != nil {
			return err
		}
		return tx.Model(&models.PollOption{}).
			Where("id = ?", oid).
			UpdateColumn("vote_count", gorm.Expr("vote_count + 1")).Error
	}); txErr != nil {
		// Unique constraint violation means a concurrent request already inserted the vote
		if errors.Is(txErr, gorm.ErrDuplicatedKey) {
			return fiber.NewError(fiber.StatusConflict, "already voted")
		}
		return txErr
	}
	return c.JSON(fiber.Map{"voted": true})
}

func (h *Handler) GetPollResults(c *fiber.Ctx) error {
	pollID := c.Params("id")

	var poll models.Poll
	if err := h.DB.Preload("Options").First(&poll, "id = ?", pollID).Error; err != nil {
		return fiber.NewError(fiber.StatusNotFound, "poll not found")
	}

	var total int64
	h.DB.Model(&models.PollVote{}).Where("poll_id = ?", poll.ID).Count(&total)

	return c.JSON(fiber.Map{
		"poll":        poll,
		"total_votes": total,
	})
}

func (h *Handler) GetPollByPost(c *fiber.Ctx) error {
	postID := c.Params("id")

	var poll models.Poll
	if err := h.DB.Preload("Options").Where("post_id = ?", postID).First(&poll).Error; err != nil {
		return fiber.NewError(fiber.StatusNotFound, "poll not found")
	}
	return c.JSON(poll)
}
