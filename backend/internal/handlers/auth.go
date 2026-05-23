package handlers

import (
	"context"
	"fmt"
	"regexp"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v4"
	"github.com/atss0/minorfm/internal/models"
	"github.com/redis/go-redis/v9"
	"golang.org/x/crypto/bcrypt"
)

var usernameRegex = regexp.MustCompile(`^[a-zA-Z0-9_-]{3,50}$`)

type registerRequest struct {
	Username   string `json:"username"`
	Email      string `json:"email"`
	Password   string `json:"password"`
	InviteCode string `json:"invite_code"`
}

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func (h *Handler) Register(c *fiber.Ctx) error {
	var req registerRequest
	if err := c.BodyParser(&req); err != nil {
		return fiber.ErrBadRequest
	}
	if req.Username == "" || req.Email == "" || len(req.Password) < 8 {
		return fiber.NewError(fiber.StatusBadRequest, "username, email and password (min 8 chars) are required")
	}
	if !usernameRegex.MatchString(req.Username) {
		return fiber.NewError(fiber.StatusBadRequest, "Kullanıcı adı yalnızca harf, rakam, _ ve - içerebilir (3-50 karakter).")
	}
	req.Email = strings.ToLower(strings.TrimSpace(req.Email))

	// Invite code is mandatory
	code := strings.ToUpper(strings.TrimSpace(req.InviteCode))
	if code == "" {
		return fiber.NewError(fiber.StatusBadRequest, "invite code required")
	}
	var invite models.Invite
	if err := h.DB.Where("code = ? AND used_by IS NULL", code).First(&invite).Error; err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "invalid or already used invite code")
	}
	if invite.ExpiresAt != nil && invite.ExpiresAt.Before(time.Now()) {
		return fiber.NewError(fiber.StatusBadRequest, "invite code has expired")
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	user := models.User{
		Username:     req.Username,
		Email:        req.Email,
		PasswordHash: string(hash),
		Role:         models.RoleUser,
	}

	if err := h.DB.Create(&user).Error; err != nil {
		return fiber.NewError(fiber.StatusConflict, "username or email already exists")
	}

	// Mark invite as used
	now := time.Now()
	h.DB.Model(&invite).Updates(map[string]interface{}{"used_by": user.ID, "used_at": now})

	return c.Status(fiber.StatusCreated).JSON(user)
}

func (h *Handler) Login(c *fiber.Ctx) error {
	var req loginRequest
	if err := c.BodyParser(&req); err != nil {
		return fiber.ErrBadRequest
	}
	req.Email = strings.ToLower(strings.TrimSpace(req.Email))

	// Account-level rate limiting: block after 10 consecutive failures per email
	if h.RDB != nil {
		ctx := context.Background()
		failKey := fmt.Sprintf("login_fail:%s", req.Email)
		fails, _ := h.RDB.Get(ctx, failKey).Int()
		if fails >= 10 {
			return fiber.NewError(fiber.StatusTooManyRequests, "Çok fazla başarısız deneme. 15 dakika sonra tekrar deneyin.")
		}
	}

	var user models.User
	authErr := func() error {
		if err := h.DB.Where("email = ?", req.Email).First(&user).Error; err != nil {
			return fiber.NewError(fiber.StatusUnauthorized, "invalid credentials")
		}
		if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
			return fiber.NewError(fiber.StatusUnauthorized, "invalid credentials")
		}
		return nil
	}()

	if authErr != nil {
		if h.RDB != nil {
			ctx := context.Background()
			failKey := fmt.Sprintf("login_fail:%s", req.Email)
			count, _ := h.RDB.Incr(ctx, failKey).Result()
			if count == 1 {
				h.RDB.Expire(ctx, failKey, 15*time.Minute)
			}
		}
		return authErr
	}

	// Reset failure counter on successful login
	if h.RDB != nil {
		h.RDB.Del(context.Background(), fmt.Sprintf("login_fail:%s", req.Email))
	}

	accessToken, err := h.generateAccessToken(user)
	if err != nil {
		return err
	}

	refreshToken, err := h.generateRefreshToken(user)
	if err != nil {
		return err
	}

	if h.RDB != nil {
		key := fmt.Sprintf("refresh:%s", user.ID.String())
		h.RDB.Set(context.Background(), key, refreshToken, 7*24*time.Hour)
	}

	return c.JSON(fiber.Map{
		"access_token":  accessToken,
		"refresh_token": refreshToken,
		"user":          user,
	})
}

func (h *Handler) Refresh(c *fiber.Ctx) error {
	type body struct {
		RefreshToken string `json:"refresh_token"`
	}
	var req body
	if err := c.BodyParser(&req); err != nil {
		return fiber.ErrBadRequest
	}

	claims := &jwt.MapClaims{}
	token, err := jwt.ParseWithClaims(req.RefreshToken, claims, func(t *jwt.Token) (interface{}, error) {
		return []byte(h.Cfg.JWTSecret), nil
	})
	if err != nil || !token.Valid {
		return fiber.NewError(fiber.StatusUnauthorized, "invalid refresh token")
	}

	userID, _ := (*claims)["sub"].(string)
	if h.RDB != nil {
		key := fmt.Sprintf("refresh:%s", userID)
		stored, err := h.RDB.Get(context.Background(), key).Result()
		if err != nil || stored != req.RefreshToken {
			return fiber.NewError(fiber.StatusUnauthorized, "refresh token expired or invalid")
		}
	}

	var user models.User
	if err := h.DB.First(&user, "id = ?", userID).Error; err != nil {
		return fiber.NewError(fiber.StatusUnauthorized, "invalid refresh token")
	}

	accessToken, err := h.generateAccessToken(user)
	if err != nil {
		return err
	}

	return c.JSON(fiber.Map{"access_token": accessToken})
}

func (h *Handler) Logout(c *fiber.Ctx) error {
	authHeader := c.Get("Authorization")
	if len(authHeader) < 8 {
		return fiber.ErrBadRequest
	}
	tokenStr := authHeader[7:]

	claims := &jwt.MapClaims{}
	jwt.ParseWithClaims(tokenStr, claims, func(t *jwt.Token) (interface{}, error) { //nolint
		return []byte(h.Cfg.JWTSecret), nil
	})

	if h.RDB != nil {
		ctx := context.Background()
		if exp, ok := (*claims)["exp"].(float64); ok {
			expireAt := time.Unix(int64(exp), 0)
			if expireAt.After(time.Now()) {
				// Sorted Set blacklist — score is the expiry Unix timestamp for easy cleanup
				h.RDB.ZAdd(ctx, "token_blacklist", redis.Z{
					Score:  float64(expireAt.Unix()),
					Member: tokenStr,
				})
			}
		}
		if userID, ok := (*claims)["sub"].(string); ok {
			h.RDB.Del(ctx, fmt.Sprintf("refresh:%s", userID))
		}
	}

	return c.JSON(fiber.Map{"message": "logged out"})
}

func (h *Handler) generateAccessToken(user models.User) (string, error) {
	claims := jwt.MapClaims{
		"sub":  user.ID.String(),
		"role": string(user.Role),
		"exp":  time.Now().Add(15 * time.Minute).Unix(),
	}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString([]byte(h.Cfg.JWTSecret))
}

func (h *Handler) generateRefreshToken(user models.User) (string, error) {
	claims := jwt.MapClaims{
		"sub": user.ID.String(),
		"exp": time.Now().Add(7 * 24 * time.Hour).Unix(),
	}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString([]byte(h.Cfg.JWTSecret))
}
