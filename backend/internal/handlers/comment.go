package handlers

import (
	"errors"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/atss0/minorfm/internal/models"
	"gorm.io/gorm"
)

func (h *Handler) GetComments(c *fiber.Ctx) error {
	postID := c.Params("id")
	page := c.QueryInt("page", 1)
	limit := c.QueryInt("limit", 50)
	if limit > 100 {
		limit = 100
	}
	offset := (page - 1) * limit

	var total int64
	h.DB.Model(&models.Comment{}).Where("post_id = ? AND parent_id IS NULL", postID).Count(&total)

	var comments []models.Comment
	h.DB.
		Preload("User").
		Preload("Replies.User").
		Where("post_id = ? AND parent_id IS NULL", postID).
		Order("created_at asc").
		Limit(limit).
		Offset(offset).
		Find(&comments)

	return c.JSON(fiber.Map{
		"data":  comments,
		"total": total,
		"page":  page,
		"limit": limit,
	})
}

func (h *Handler) CreateComment(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	postID := c.Params("id")

	type body struct {
		Body     string  `json:"body"`
		ParentID *string `json:"parent_id"`
	}
	var req body
	if err := c.BodyParser(&req); err != nil {
		return fiber.ErrBadRequest
	}
	if req.Body == "" {
		return fiber.NewError(fiber.StatusBadRequest, "body is required")
	}
	if len(req.Body) > 5000 {
		return fiber.NewError(fiber.StatusBadRequest, "Yorum en fazla 5000 karakter olabilir.")
	}

	uid, _ := uuid.Parse(userID)
	pid, err := uuid.Parse(postID)
	if err != nil {
		return fiber.ErrBadRequest
	}

	comment := models.Comment{
		PostID: pid,
		UserID: uid,
		Body:   req.Body,
	}

	if req.ParentID != nil {
		parentUUID, err := uuid.Parse(*req.ParentID)
		if err != nil {
			return fiber.ErrBadRequest
		}
		comment.ParentID = &parentUUID
	}

	// Create comment and update comment_count atomically
	if err := h.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&comment).Error; err != nil {
			return err
		}
		return tx.Model(&models.Post{}).
			Where("id = ?", pid).
			UpdateColumn("comment_count", gorm.Expr("comment_count + 1")).Error
	}); err != nil {
		return err
	}

	h.DB.Preload("User").First(&comment, "id = ?", comment.ID)
	return c.Status(fiber.StatusCreated).JSON(comment)
}

func (h *Handler) DeleteComment(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	userRole := c.Locals("userRole").(string)
	commentID := c.Params("comment_id")

	var comment models.Comment
	if err := h.DB.First(&comment, "id = ?", commentID).Error; err != nil {
		return fiber.NewError(fiber.StatusNotFound, "comment not found")
	}

	if comment.UserID.String() != userID && userRole != "admin" && userRole != "moderator" {
		return fiber.ErrForbidden
	}

	h.DB.Delete(&comment)
	h.DB.Model(&models.Post{}).Where("id = ?", comment.PostID).UpdateColumn("comment_count", gorm.Expr("GREATEST(comment_count - 1, 0)"))

	return c.SendStatus(fiber.StatusNoContent)
}

func (h *Handler) LikeComment(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	commentID := c.Params("comment_id")

	uid, _ := uuid.Parse(userID)
	cid, err := uuid.Parse(commentID)
	if err != nil {
		return fiber.ErrBadRequest
	}

	var like models.Like
	err = h.DB.Where("user_id = ? AND likeable_id = ? AND likeable_type = ?", uid, cid, "comment").First(&like).Error

	if err == nil {
		h.DB.Delete(&like)
		h.DB.Model(&models.Comment{}).Where("id = ?", cid).UpdateColumn("like_count", gorm.Expr("like_count - 1"))
		return c.JSON(fiber.Map{"liked": false})
	}

	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return err
	}

	h.DB.Create(&models.Like{UserID: uid, LikeableID: cid, LikeableType: "comment"})
	h.DB.Model(&models.Comment{}).Where("id = ?", cid).UpdateColumn("like_count", gorm.Expr("like_count + 1"))
	return c.JSON(fiber.Map{"liked": true})
}

func (h *Handler) GetBookmarks(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)

	var bookmarks []models.Bookmark
	h.DB.Where("user_id = ?", userID).Order("created_at desc").Find(&bookmarks)

	if len(bookmarks) == 0 {
		return c.JSON([]models.Post{})
	}

	postIDs := make([]uuid.UUID, len(bookmarks))
	for i, b := range bookmarks {
		postIDs[i] = b.PostID
	}

	var posts []models.Post
	h.DB.Preload("User").Preload("Category").Where("id IN ?", postIDs).Find(&posts)

	return c.JSON(posts)
}
