package handlers

import (
	"context"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/atss0/minorfm/internal/models"
	"github.com/atss0/minorfm/internal/ws"
	wsconn "github.com/gofiber/contrib/websocket"
	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v4"
)

// WSAuth is a Fiber middleware that validates a JWT before the WebSocket upgrade.
// Token is read from (in order): access_token cookie, Authorization header, ?token= query param.
func (h *Handler) WSAuth(c *fiber.Ctx) error {
	if !wsconn.IsWebSocketUpgrade(c) {
		return fiber.ErrUpgradeRequired
	}

	// Prefer cookie > Authorization header > query param (least secure)
	tokenStr := c.Cookies("access_token")
	if tokenStr == "" {
		auth := c.Get("Authorization")
		tokenStr = strings.TrimPrefix(auth, "Bearer ")
	}
	if tokenStr == "" {
		tokenStr = c.Query("token")
	}
	if tokenStr == "" {
		return fiber.NewError(fiber.StatusUnauthorized, "missing token")
	}

	if h.RDB != nil {
		ctx := context.Background()
		// New: Sorted Set blacklist
		if score, err := h.RDB.ZScore(ctx, "token_blacklist", tokenStr).Result(); err == nil && score > float64(time.Now().Unix()) {
			return fiber.NewError(fiber.StatusUnauthorized, "token has been revoked")
		}
		// Backward compat: old per-key blacklist
		if h.RDB.Exists(ctx, fmt.Sprintf("blacklist:%s", tokenStr)).Val() > 0 {
			return fiber.NewError(fiber.StatusUnauthorized, "token has been revoked")
		}
	}

	claims := &jwt.MapClaims{}
	token, err := jwt.ParseWithClaims(tokenStr, claims, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fiber.ErrUnauthorized
		}
		return []byte(h.Cfg.JWTSecret), nil
	})
	if err != nil || !token.Valid {
		return fiber.NewError(fiber.StatusUnauthorized, "invalid or expired token")
	}

	c.Locals("userID", (*claims)["sub"].(string))
	return c.Next()
}

// ChatWS upgrades the connection and starts the WebSocket client loop.
func (h *Handler) ChatWS(hub *ws.Hub) fiber.Handler {
	return wsconn.New(func(c *wsconn.Conn) {
		userID, _ := c.Locals("userID").(string)
		roomID := c.Params("room_id")

		var user models.User
		if err := h.DB.Where("id = ?", userID).First(&user).Error; err != nil {
			c.Close()
			return
		}

		client := ws.NewClient(hub, c, h.RDB, roomID, userID, user.Username, user.AvatarURL)
		client.Run()
	})
}

// GetRoomMessages returns the last N messages for a room (default 50, max 100).
func (h *Handler) GetRoomMessages(c *fiber.Ctx) error {
	roomID := c.Params("room_id")

	limit := 50
	if l, err := strconv.Atoi(c.Query("limit", "50")); err == nil && l > 0 && l <= 100 {
		limit = l
	}

	var messages []models.ChatMessage
	if err := h.DB.
		Preload("User").
		Where("room_id = ?", roomID).
		Order("created_at DESC").
		Limit(limit).
		Find(&messages).Error; err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "could not fetch messages")
	}

	// Reverse to chronological order for the client
	for i, j := 0, len(messages)-1; i < j; i, j = i+1, j-1 {
		messages[i], messages[j] = messages[j], messages[i]
	}

	return c.JSON(fiber.Map{"data": messages})
}

// GetRooms returns public chat rooms (excludes DM rooms).
func (h *Handler) GetRooms(c *fiber.Ctx) error {
	var rooms []models.ChatRoom
	if err := h.DB.Where("type != 'dm'").Order("name ASC").Find(&rooms).Error; err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "could not fetch rooms")
	}
	return c.JSON(fiber.Map{"rooms": rooms})
}
