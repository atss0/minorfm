package handlers

import (
	wsconn "github.com/gofiber/contrib/websocket"
	"github.com/atss0/minorfm/internal/models"
	"github.com/atss0/minorfm/internal/ws"
	"github.com/gofiber/fiber/v2"
)

func (h *Handler) GetNotifications(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	page := c.QueryInt("page", 1)
	limit := c.QueryInt("limit", 30)
	offset := (page - 1) * limit

	var notifs []models.Notification
	h.DB.Where("user_id = ?", userID).
		Order("created_at desc").
		Limit(limit).Offset(offset).
		Find(&notifs)

	return c.JSON(notifs)
}

func (h *Handler) MarkAllRead(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	h.DB.Model(&models.Notification{}).
		Where("user_id = ? AND read = false", userID).
		Update("read", true)
	return c.JSON(fiber.Map{"message": "all notifications marked as read"})
}

func (h *Handler) MarkRead(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	id := c.Params("id")
	h.DB.Model(&models.Notification{}).
		Where("id = ? AND user_id = ?", id, userID).
		Update("read", true)
	return c.JSON(fiber.Map{"ok": true})
}

func (h *Handler) NotificationWS(hub *ws.NotificationHub) fiber.Handler {
	return wsconn.New(func(c *wsconn.Conn) {
		userID, _ := c.Locals("userID").(string)
		hub.ServeClient(c, userID)
	})
}
