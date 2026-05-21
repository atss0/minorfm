package handlers

import (
	"context"
	"fmt"
	"sort"
	"time"

	"github.com/atss0/minorfm/internal/models"
	"github.com/gofiber/fiber/v2"
)

// ─── Stats ────────────────────────────────────────────────────────────────────

func (h *Handler) AdminGetStats(c *fiber.Ctx) error {
	var totalUsers, totalPosts, totalComments, activeInvites int64

	h.DB.Model(&models.User{}).Count(&totalUsers)
	h.DB.Model(&models.Post{}).Count(&totalPosts)
	h.DB.Model(&models.Comment{}).Count(&totalComments)
	h.DB.Model(&models.Invite{}).
		Where("used_at IS NULL AND (expires_at IS NULL OR expires_at > NOW())").
		Count(&activeInvites)

	var newUsers7, newPosts7 int64
	h.DB.Model(&models.User{}).Where("created_at > NOW() - INTERVAL '7 days'").Count(&newUsers7)
	h.DB.Model(&models.Post{}).Where("created_at > NOW() - INTERVAL '7 days'").Count(&newPosts7)

	var newUsers30, newPosts30 int64
	h.DB.Model(&models.User{}).Where("created_at > NOW() - INTERVAL '30 days'").Count(&newUsers30)
	h.DB.Model(&models.Post{}).Where("created_at > NOW() - INTERVAL '30 days'").Count(&newPosts30)

	var recentUsers []models.User
	h.DB.Order("created_at desc").Limit(5).Find(&recentUsers)

	var recentPosts []models.Post
	h.DB.Preload("User").Preload("Category").Order("created_at desc").Limit(5).Find(&recentPosts)

	return c.JSON(fiber.Map{
		"totals": fiber.Map{
			"users":          totalUsers,
			"posts":          totalPosts,
			"comments":       totalComments,
			"active_invites": activeInvites,
		},
		"last_7_days":  fiber.Map{"new_users": newUsers7, "new_posts": newPosts7},
		"last_30_days": fiber.Map{"new_users": newUsers30, "new_posts": newPosts30},
		"recent_users": recentUsers,
		"recent_posts": recentPosts,
	})
}

// ─── Users ────────────────────────────────────────────────────────────────────

func (h *Handler) AdminGetUsers(c *fiber.Ctx) error {
	page := c.QueryInt("page", 1)
	limit := c.QueryInt("limit", 50)
	if limit > 100 {
		limit = 100
	}
	offset := (page - 1) * limit
	q := c.Query("q")
	role := c.Query("role")

	query := h.DB.Model(&models.User{})
	if q != "" {
		like := "%" + q + "%"
		query = query.Where("username ILIKE ? OR email ILIKE ?", like, like)
	}
	if role != "" {
		query = query.Where("role = ?", role)
	}

	var total int64
	query.Count(&total)

	var users []models.User
	query.Order("created_at desc").Limit(limit).Offset(offset).Find(&users)

	return c.JSON(fiber.Map{"data": users, "total": total, "page": page, "limit": limit})
}

func (h *Handler) AdminUpdateUserRole(c *fiber.Ctx) error {
	id := c.Params("id")

	type body struct {
		Role models.UserRole `json:"role"`
	}
	var req body
	if err := c.BodyParser(&req); err != nil {
		return fiber.ErrBadRequest
	}
	if req.Role != models.RoleUser && req.Role != models.RoleModerator && req.Role != models.RoleAdmin {
		return fiber.NewError(fiber.StatusBadRequest, "invalid role")
	}

	if err := h.DB.Model(&models.User{}).Where("id = ?", id).Update("role", req.Role).Error; err != nil {
		return err
	}
	return c.JSON(fiber.Map{"role": req.Role})
}

func (h *Handler) AdminDeleteUser(c *fiber.Ctx) error {
	id := c.Params("id")
	callerID := c.Locals("userID").(string)
	if id == callerID {
		return fiber.NewError(fiber.StatusBadRequest, "cannot delete your own account")
	}

	var user models.User
	if err := h.DB.First(&user, "id = ?", id).Error; err != nil {
		return fiber.NewError(fiber.StatusNotFound, "user not found")
	}
	h.DB.Delete(&user)
	return c.SendStatus(fiber.StatusNoContent)
}

func (h *Handler) AdminBanUser(c *fiber.Ctx) error {
	id := c.Params("id")
	callerID := c.Locals("userID").(string)
	if id == callerID {
		return fiber.NewError(fiber.StatusBadRequest, "cannot ban your own account")
	}

	type body struct {
		Reason    string `json:"reason"`
		DurationH int    `json:"duration_hours"` // 0 = permanent
	}
	var req body
	if err := c.BodyParser(&req); err != nil {
		return fiber.ErrBadRequest
	}

	now := time.Now()
	updates := map[string]interface{}{
		"banned_at":  now,
		"ban_reason": req.Reason,
	}
	if req.DurationH > 0 {
		exp := now.Add(time.Duration(req.DurationH) * time.Hour)
		updates["ban_expires_at"] = exp
	} else {
		updates["ban_expires_at"] = nil
	}

	if err := h.DB.Model(&models.User{}).Where("id = ?", id).Updates(updates).Error; err != nil {
		return err
	}
	return c.JSON(fiber.Map{"banned": true})
}

func (h *Handler) AdminUnbanUser(c *fiber.Ctx) error {
	id := c.Params("id")
	if err := h.DB.Model(&models.User{}).Where("id = ?", id).Updates(map[string]interface{}{
		"banned_at":      nil,
		"ban_expires_at": nil,
		"ban_reason":     "",
	}).Error; err != nil {
		return err
	}
	return c.JSON(fiber.Map{"unbanned": true})
}

// ─── Posts ────────────────────────────────────────────────────────────────────

func (h *Handler) AdminGetPosts(c *fiber.Ctx) error {
	page := c.QueryInt("page", 1)
	limit := c.QueryInt("limit", 50)
	if limit > 100 {
		limit = 100
	}
	offset := (page - 1) * limit
	q := c.Query("q")
	userQ := c.Query("user")
	category := c.Query("category")
	postType := c.Query("type")

	query := h.DB.Model(&models.Post{}).Preload("User").Preload("Category")
	if q != "" {
		query = query.Where("title ILIKE ?", "%"+q+"%")
	}
	if userQ != "" {
		query = query.Joins("JOIN users ON users.id = posts.user_id").
			Where("users.username ILIKE ?", "%"+userQ+"%")
	}
	if category != "" {
		query = query.Joins("JOIN categories ON categories.id = posts.category_id").
			Where("categories.slug = ?", category)
	}
	if postType != "" {
		query = query.Where("post_type = ?", postType)
	}

	var total int64
	query.Count(&total)

	var posts []models.Post
	query.Order("posts.created_at desc").Limit(limit).Offset(offset).Find(&posts)

	return c.JSON(fiber.Map{"data": posts, "total": total, "page": page, "limit": limit})
}

func (h *Handler) AdminDeletePost(c *fiber.Ctx) error {
	id := c.Params("id")
	var post models.Post
	if err := h.DB.Preload("Category").First(&post, "id = ?", id).Error; err != nil {
		return fiber.NewError(fiber.StatusNotFound, "post not found")
	}
	h.DB.Delete(&post)
	h.bustFeedCache(post.Category.Slug)
	return c.SendStatus(fiber.StatusNoContent)
}

func (h *Handler) AdminPinPost(c *fiber.Ctx) error {
	id := c.Params("id")
	var post models.Post
	if err := h.DB.Preload("Category").First(&post, "id = ?", id).Error; err != nil {
		return fiber.NewError(fiber.StatusNotFound, "post not found")
	}

	now := time.Now()
	if post.Pinned {
		h.DB.Model(&post).Updates(map[string]interface{}{"pinned": false, "pinned_at": nil})
	} else {
		h.DB.Model(&post).Updates(map[string]interface{}{"pinned": true, "pinned_at": now})
	}
	h.bustFeedCache(post.Category.Slug)
	return c.JSON(fiber.Map{"pinned": !post.Pinned})
}

func (h *Handler) bustFeedCache(categorySlug string) {
	if h.RDB == nil {
		return
	}
	ctx := context.Background()
	h.RDB.Del(ctx,
		fmt.Sprintf("feed:cache:new:%s:1", categorySlug),
		fmt.Sprintf("feed:cache:top:%s:1", categorySlug),
		"feed:cache:new::1",
		"feed:cache:top::1",
	)
}

// ─── Comments ─────────────────────────────────────────────────────────────────

func (h *Handler) AdminGetComments(c *fiber.Ctx) error {
	page := c.QueryInt("page", 1)
	limit := c.QueryInt("limit", 50)
	if limit > 100 {
		limit = 100
	}
	offset := (page - 1) * limit
	postID := c.Query("post_id")
	userID := c.Query("user_id")

	query := h.DB.Model(&models.Comment{}).Preload("User")
	if postID != "" {
		query = query.Where("post_id = ?", postID)
	}
	if userID != "" {
		query = query.Where("user_id = ?", userID)
	}

	var total int64
	query.Count(&total)

	var comments []models.Comment
	query.Order("created_at desc").Limit(limit).Offset(offset).Find(&comments)

	return c.JSON(fiber.Map{"data": comments, "total": total, "page": page, "limit": limit})
}

func (h *Handler) AdminDeleteComment(c *fiber.Ctx) error {
	id := c.Params("id")
	var comment models.Comment
	if err := h.DB.First(&comment, "id = ?", id).Error; err != nil {
		return fiber.NewError(fiber.StatusNotFound, "comment not found")
	}
	h.DB.Delete(&comment)
	return c.SendStatus(fiber.StatusNoContent)
}

// ─── Categories ───────────────────────────────────────────────────────────────

func (h *Handler) AdminCreateCategory(c *fiber.Ctx) error {
	type body struct {
		Name        string `json:"name"`
		Slug        string `json:"slug"`
		Icon        string `json:"icon"`
		Description string `json:"description"`
		Order       int    `json:"order"`
	}
	var req body
	if err := c.BodyParser(&req); err != nil {
		return fiber.ErrBadRequest
	}
	if req.Name == "" || req.Slug == "" {
		return fiber.NewError(fiber.StatusBadRequest, "name and slug are required")
	}

	cat := models.Category{
		Name: req.Name, Slug: req.Slug, Icon: req.Icon,
		Description: req.Description, Order: req.Order,
	}
	if err := h.DB.Create(&cat).Error; err != nil {
		return fiber.NewError(fiber.StatusConflict, "slug already exists")
	}
	return c.Status(fiber.StatusCreated).JSON(cat)
}

func (h *Handler) AdminUpdateCategory(c *fiber.Ctx) error {
	id := c.Params("id")
	var cat models.Category
	if err := h.DB.First(&cat, "id = ?", id).Error; err != nil {
		return fiber.NewError(fiber.StatusNotFound, "category not found")
	}

	type body struct {
		Name        string `json:"name"`
		Slug        string `json:"slug"`
		Icon        string `json:"icon"`
		Description string `json:"description"`
		Order       int    `json:"order"`
	}
	var req body
	if err := c.BodyParser(&req); err != nil {
		return fiber.ErrBadRequest
	}

	updates := map[string]interface{}{}
	if req.Name != "" {
		updates["name"] = req.Name
	}
	if req.Slug != "" {
		updates["slug"] = req.Slug
	}
	if req.Icon != "" {
		updates["icon"] = req.Icon
	}
	if req.Description != "" {
		updates["description"] = req.Description
	}
	if req.Order != 0 {
		updates["order"] = req.Order
	}

	h.DB.Model(&cat).Updates(updates)
	return c.JSON(cat)
}

func (h *Handler) AdminDeleteCategory(c *fiber.Ctx) error {
	id := c.Params("id")
	var cat models.Category
	if err := h.DB.First(&cat, "id = ?", id).Error; err != nil {
		return fiber.NewError(fiber.StatusNotFound, "category not found")
	}

	var postCount int64
	h.DB.Model(&models.Post{}).Where("category_id = ?", id).Count(&postCount)
	if postCount > 0 {
		return fiber.NewError(fiber.StatusConflict, "category has posts, reassign them first")
	}

	h.DB.Delete(&cat)
	return c.SendStatus(fiber.StatusNoContent)
}

// ─── Curated Collection (public) ──────────────────────────────────────────────

func (h *Handler) GetCuratedCollection(c *fiber.Ctx) error {
	page := c.QueryInt("page", 1)
	limit := c.QueryInt("limit", 20)
	if limit > 50 {
		limit = 50
	}
	offset := (page - 1) * limit

	type row struct {
		PostID string `gorm:"column:post_id"`
	}
	var rows []row
	h.DB.Raw(`
		SELECT b.post_id
		FROM bookmarks b
		JOIN users u ON u.id = b.user_id
		WHERE u.role IN ('moderator','admin')
		GROUP BY b.post_id
		ORDER BY MAX(b.created_at) DESC
		LIMIT ? OFFSET ?
	`, limit, offset).Scan(&rows)

	var total int64
	h.DB.Raw(`
		SELECT COUNT(DISTINCT b.post_id)
		FROM bookmarks b
		JOIN users u ON u.id = b.user_id
		WHERE u.role IN ('moderator','admin')
	`).Scan(&total)

	postIDs := make([]string, len(rows))
	for i, r := range rows {
		postIDs[i] = r.PostID
	}

	var posts []models.Post
	if len(postIDs) > 0 {
		h.DB.Where("id IN ? AND deleted_at IS NULL", postIDs).
			Preload("User").Preload("Category").
			Find(&posts)
		orderMap := make(map[string]int, len(postIDs))
		for i, id := range postIDs {
			orderMap[id] = i
		}
		sort.Slice(posts, func(i, j int) bool {
			return orderMap[posts[i].ID.String()] < orderMap[posts[j].ID.String()]
		})
	}

	return c.JSON(fiber.Map{"data": posts, "total": total, "page": page, "limit": limit})
}

func (h *Handler) GetCollectionByName(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	name := c.Params("name")

	var bookmarks []models.Bookmark
	h.DB.Where("user_id = ? AND collection_name = ?", userID, name).
		Order("created_at desc").
		Find(&bookmarks)

	if len(bookmarks) == 0 {
		return c.JSON([]models.Post{})
	}

	postIDs := make([]string, len(bookmarks))
	for i, b := range bookmarks {
		postIDs[i] = b.PostID.String()
	}

	var posts []models.Post
	h.DB.Preload("User").Preload("Category").Where("id IN ?", postIDs).Find(&posts)
	return c.JSON(posts)
}

// ─── Announcements ────────────────────────────────────────────────────────────

func (h *Handler) GetActiveAnnouncement(c *fiber.Ctx) error {
	var ann models.Announcement
	err := h.DB.Where("active = true AND (expires_at IS NULL OR expires_at > NOW())").
		Order("created_at desc").
		First(&ann).Error
	if err != nil {
		return c.JSON(nil)
	}
	return c.JSON(ann)
}

func (h *Handler) AdminCreateAnnouncement(c *fiber.Ctx) error {
	type body struct {
		Body      string     `json:"body"`
		URL       string     `json:"url"`
		ExpiresAt *time.Time `json:"expires_at"`
	}
	var req body
	if err := c.BodyParser(&req); err != nil {
		return fiber.ErrBadRequest
	}
	if req.Body == "" {
		return fiber.NewError(fiber.StatusBadRequest, "body is required")
	}

	ann := models.Announcement{Body: req.Body, URL: req.URL, Active: true, ExpiresAt: req.ExpiresAt}
	if err := h.DB.Create(&ann).Error; err != nil {
		return err
	}
	return c.Status(fiber.StatusCreated).JSON(ann)
}

func (h *Handler) AdminUpdateAnnouncement(c *fiber.Ctx) error {
	id := c.Params("id")
	var ann models.Announcement
	if err := h.DB.First(&ann, "id = ?", id).Error; err != nil {
		return fiber.NewError(fiber.StatusNotFound, "announcement not found")
	}

	type body struct {
		Body      string     `json:"body"`
		URL       string     `json:"url"`
		Active    *bool      `json:"active"`
		ExpiresAt *time.Time `json:"expires_at"`
	}
	var req body
	if err := c.BodyParser(&req); err != nil {
		return fiber.ErrBadRequest
	}

	updates := map[string]interface{}{}
	if req.Body != "" {
		updates["body"] = req.Body
	}
	if req.URL != "" {
		updates["url"] = req.URL
	}
	if req.Active != nil {
		updates["active"] = *req.Active
	}
	if req.ExpiresAt != nil {
		updates["expires_at"] = req.ExpiresAt
	}

	h.DB.Model(&ann).Updates(updates)
	return c.JSON(ann)
}
