package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/microcosm-cc/bluemonday"
	"github.com/atss0/minorfm/internal/models"
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

func (h *Handler) GetPosts(c *fiber.Ctx) error {
	page := c.QueryInt("page", 1)
	limit := c.QueryInt("limit", 20)
	if limit > 50 {
		limit = 50
	}
	offset := (page - 1) * limit
	sort := c.Query("sort", "new")
	categorySlug := c.Query("category")

	// Hot feed cache (page 1, no user filter) for 5 minutes
	cacheKey := fmt.Sprintf("feed:cache:%s:%s:%d", sort, categorySlug, page)
	if h.RDB != nil {
		if userIDFilter := c.Query("user_id"); userIDFilter == "" && page == 1 {
			if cached, err := h.RDB.Get(context.Background(), cacheKey).Result(); err == nil {
				c.Set("X-Cache", "HIT")
				return c.SendString(cached)
			}
		}
	}

	userIDFilter := c.Query("user_id")
	query := h.DB.Model(&models.Post{}).Preload("User").Preload("Category")

	if categorySlug != "" {
		var cat models.Category
		if err := h.DB.Where("slug = ?", categorySlug).First(&cat).Error; err != nil {
			return fiber.NewError(fiber.StatusNotFound, "category not found")
		}
		query = query.Where("category_id = ?", cat.ID)
	}

	if userIDFilter != "" {
		query = query.Where("user_id = ?", userIDFilter)
	}

	switch sort {
	case "top":
		query = query.Order("like_count desc, created_at desc")
	default:
		query = query.Order("created_at desc")
	}

	var total int64
	query.Count(&total)

	var posts []models.Post
	query.Limit(limit).Offset(offset).Find(&posts)

	result := fiber.Map{
		"data":  posts,
		"total": total,
		"page":  page,
		"limit": limit,
	}

	// Cache page-1 feed results
	if h.RDB != nil {
		if userIDFilter := c.Query("user_id"); userIDFilter == "" && page == 1 {
			if data, err := json.Marshal(result); err == nil {
				h.RDB.Set(context.Background(), cacheKey, string(data), 5*time.Minute)
			}
		}
	}

	return c.JSON(result)
}

func (h *Handler) GetPost(c *fiber.Ctx) error {
	id := c.Params("id")
	var post models.Post
	if err := h.DB.Preload("User").Preload("Category").First(&post, "id = ?", id).Error; err != nil {
		return fiber.NewError(fiber.StatusNotFound, "post not found")
	}
	return c.JSON(post)
}

func (h *Handler) CreatePost(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)

	type body struct {
		CategoryID uint                `json:"category_id"`
		Title      string              `json:"title"`
		Body       string              `json:"body"`
		PostType   models.PostType     `json:"post_type"`
		Metadata   datatypes.JSON      `json:"metadata"`
	}
	var req body
	if err := c.BodyParser(&req); err != nil {
		return fiber.ErrBadRequest
	}
	if req.Title == "" || req.CategoryID == 0 {
		return fiber.NewError(fiber.StatusBadRequest, "title and category_id are required")
	}

	// Validate post type against known values
	validTypes := map[models.PostType]bool{
		models.PostTypeArticle: true,
		models.PostTypeLink:    true,
		models.PostTypeEmbed:   true,
		models.PostTypePoll:    true,
		models.PostTypeGallery: true,
		models.PostTypeVideo:   true,
	}
	if req.PostType != "" && !validTypes[req.PostType] {
		return fiber.NewError(fiber.StatusBadRequest, "Geçersiz post tipi.")
	}

	// Validate metadata is a JSON object if provided
	if len(req.Metadata) > 0 {
		var metaCheck map[string]interface{}
		if err := json.Unmarshal(req.Metadata, &metaCheck); err != nil {
			return fiber.NewError(fiber.StatusBadRequest, "metadata geçerli bir JSON objesi olmalıdır.")
		}
	}

	// Sanitize body against stored XSS — UGCPolicy allows safe HTML tags only
	if req.Body != "" {
		req.Body = bluemonday.UGCPolicy().Sanitize(req.Body)
	}

	uid, _ := uuid.Parse(userID)
	postType := req.PostType
	if postType == "" {
		postType = models.PostTypeArticle
	}

	post := models.Post{
		UserID:     uid,
		CategoryID: req.CategoryID,
		Title:      req.Title,
		Body:       req.Body,
		PostType:   postType,
		Metadata:   req.Metadata,
	}

	if err := h.DB.Create(&post).Error; err != nil {
		return err
	}

	h.DB.Preload("User").Preload("Category").First(&post, "id = ?", post.ID)

	if err := h.bustFeedCache(post.Category.Slug); err != nil {
		log.Printf("feed cache temizlenemedi (%s): %v", post.Category.Slug, err)
	}

	return c.Status(fiber.StatusCreated).JSON(post)
}

func (h *Handler) UpdatePost(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	userRole := c.Locals("userRole").(string)
	id := c.Params("id")

	var post models.Post
	if err := h.DB.First(&post, "id = ?", id).Error; err != nil {
		return fiber.NewError(fiber.StatusNotFound, "post not found")
	}

	if post.UserID.String() != userID && userRole != "admin" && userRole != "moderator" {
		return fiber.ErrForbidden
	}

	type body struct {
		Title string `json:"title"`
		Body  string `json:"body"`
	}
	var req body
	if err := c.BodyParser(&req); err != nil {
		return fiber.ErrBadRequest
	}

	updates := map[string]interface{}{}
	if req.Title != "" {
		updates["title"] = req.Title
	}
	if req.Body != "" {
		updates["body"] = req.Body
	}

	h.DB.Model(&post).Updates(updates)
	h.DB.Preload("User").Preload("Category").First(&post, "id = ?", post.ID)
	return c.JSON(post)
}

func (h *Handler) DeletePost(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	userRole := c.Locals("userRole").(string)
	id := c.Params("id")

	var post models.Post
	if err := h.DB.First(&post, "id = ?", id).Error; err != nil {
		return fiber.NewError(fiber.StatusNotFound, "post not found")
	}

	if post.UserID.String() != userID && userRole != "admin" && userRole != "moderator" {
		return fiber.ErrForbidden
	}

	var cat models.Category
	h.DB.First(&cat, post.CategoryID)
	h.DB.Delete(&post)
	if err := h.bustFeedCache(cat.Slug); err != nil {
		log.Printf("feed cache temizlenemedi (%s): %v", cat.Slug, err)
	}

	return c.SendStatus(fiber.StatusNoContent)
}

func (h *Handler) LikePost(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	postID := c.Params("id")

	uid, _ := uuid.Parse(userID)
	pid, err := uuid.Parse(postID)
	if err != nil {
		return fiber.ErrBadRequest
	}

	var like models.Like
	err = h.DB.Where("user_id = ? AND likeable_id = ? AND likeable_type = ?", uid, pid, "post").First(&like).Error

	if err == nil {
		h.DB.Delete(&like)
		h.DB.Model(&models.Post{}).Where("id = ?", pid).UpdateColumn("like_count", gorm.Expr("like_count - 1"))
		return c.JSON(fiber.Map{"liked": false})
	}

	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return err
	}

	h.DB.Create(&models.Like{UserID: uid, LikeableID: pid, LikeableType: "post"})
	h.DB.Model(&models.Post{}).Where("id = ?", pid).UpdateColumn("like_count", gorm.Expr("like_count + 1"))

	// Notify post author (skip if they liked their own post)
	var post models.Post
	if h.DB.Select("user_id").First(&post, "id = ?", pid).Error == nil && post.UserID != uid {
		var liker models.User
		if h.DB.Select("username").First(&liker, "id = ?", uid).Error == nil {
			go h.pushNotification(post.UserID, "like", map[string]any{
				"actor_username": liker.Username,
			})
		}
	}

	return c.JSON(fiber.Map{"liked": true})
}

func (h *Handler) BookmarkPost(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	postID := c.Params("id")

	uid, _ := uuid.Parse(userID)
	pid, _ := uuid.Parse(postID)

	var bookmark models.Bookmark
	err := h.DB.Where("user_id = ? AND post_id = ?", uid, pid).First(&bookmark).Error

	if err == nil {
		h.DB.Delete(&bookmark)
		return c.JSON(fiber.Map{"bookmarked": false})
	}

	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return err
	}

	h.DB.Create(&models.Bookmark{UserID: uid, PostID: pid})
	return c.JSON(fiber.Map{"bookmarked": true})
}
