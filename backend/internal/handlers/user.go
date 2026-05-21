package handlers

import (
	"context"
	"errors"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/atss0/minorfm/internal/models"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

func (h *Handler) GetProfile(c *fiber.Ctx) error {
	username := c.Params("username")
	var user models.User
	if err := h.DB.Where("username = ?", username).First(&user).Error; err != nil {
		return fiber.NewError(fiber.StatusNotFound, "user not found")
	}

	var postCount int64
	var followerCount int64
	var followingCount int64
	h.DB.Model(&models.Post{}).Where("user_id = ?", user.ID).Count(&postCount)
	h.DB.Model(&models.Follow{}).Where("following_id = ?", user.ID).Count(&followerCount)
	h.DB.Model(&models.Follow{}).Where("follower_id = ?", user.ID).Count(&followingCount)

	return c.JSON(fiber.Map{
		"id":              user.ID,
		"username":        user.Username,
		"email":           user.Email,
		"avatar_url":      user.AvatarURL,
		"bio":             user.Bio,
		"role":            user.Role,
		"created_at":      user.CreatedAt,
		"post_count":      postCount,
		"follower_count":  followerCount,
		"following_count": followingCount,
	})
}

func (h *Handler) UpdateMe(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)

	type body struct {
		Bio       string `json:"bio"`
		AvatarURL string `json:"avatar_url"`
		Username  string `json:"username"`
	}
	var req body
	if err := c.BodyParser(&req); err != nil {
		return fiber.ErrBadRequest
	}

	updates := map[string]interface{}{}
	if req.Bio != "" {
		updates["bio"] = req.Bio
	}
	if req.AvatarURL != "" {
		updates["avatar_url"] = req.AvatarURL
	}
	if req.Username != "" {
		updates["username"] = req.Username
	}

	if err := h.DB.Model(&models.User{}).Where("id = ?", userID).Updates(updates).Error; err != nil {
		return fiber.NewError(fiber.StatusConflict, "username already taken")
	}

	h.InvalidateSession(userID)

	var user models.User
	h.DB.First(&user, "id = ?", userID)
	return c.JSON(user)
}

func (h *Handler) UpdatePassword(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)

	type body struct {
		CurrentPassword string `json:"current_password"`
		NewPassword     string `json:"new_password"`
	}
	var req body
	if err := c.BodyParser(&req); err != nil {
		return fiber.ErrBadRequest
	}
	if len(req.NewPassword) < 8 {
		return fiber.NewError(fiber.StatusBadRequest, "new password must be at least 8 characters")
	}

	var user models.User
	if err := h.DB.First(&user, "id = ?", userID).Error; err != nil {
		return fiber.ErrNotFound
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.CurrentPassword)); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "incorrect current password")
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	h.DB.Model(&user).Update("password_hash", string(hash))
	return c.JSON(fiber.Map{"message": "password updated"})
}

func (h *Handler) FollowUser(c *fiber.Ctx) error {
	followerID := c.Locals("userID").(string)
	targetID := c.Params("id")

	if followerID == targetID {
		return fiber.NewError(fiber.StatusBadRequest, "cannot follow yourself")
	}

	uid, _ := uuid.Parse(followerID)
	tid, _ := uuid.Parse(targetID)

	var follow models.Follow
	err := h.DB.Where("follower_id = ? AND following_id = ?", uid, tid).First(&follow).Error

	if err == nil {
		h.DB.Delete(&follow)
		return c.JSON(fiber.Map{"following": false})
	}

	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return err
	}

	follow = models.Follow{FollowerID: uid, FollowingID: tid}
	if err := h.DB.Create(&follow).Error; err != nil {
		return err
	}
	return c.JSON(fiber.Map{"following": true})
}

func (h *Handler) GetFollowers(c *fiber.Ctx) error {
	userID := c.Params("id")
	var users []models.User
	h.DB.Joins("JOIN follows ON follows.follower_id = users.id").
		Where("follows.following_id = ?", userID).
		Find(&users)
	return c.JSON(users)
}

func (h *Handler) GetFollowing(c *fiber.Ctx) error {
	userID := c.Params("id")
	var users []models.User
	h.DB.Joins("JOIN follows ON follows.following_id = users.id").
		Where("follows.follower_id = ?", userID).
		Find(&users)
	return c.JSON(users)
}

func (h *Handler) GetOnlineUsers(c *fiber.Ctx) error {
	// Returns users who have an active WS connection (members of the online sorted set)
	members, err := h.RDB.ZRange(context.Background(), "online:users", 0, -1).Result()
	if err != nil {
		return c.JSON([]string{})
	}
	if len(members) == 0 {
		return c.JSON([]string{})
	}
	var users []models.User
	h.DB.Select("id, username, avatar_url").Where("id IN ?", members).Find(&users)
	return c.JSON(users)
}
