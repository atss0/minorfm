package handlers

import (
	"context"
	"encoding/json"

	"github.com/atss0/minorfm/internal/models"
	"github.com/google/uuid"
	"gorm.io/datatypes"
)

// pushNotification creates a Notification record and publishes it to the user's
// real-time WebSocket channel. Call fire-and-forget (errors are silently dropped).
func (h *Handler) pushNotification(targetUserID uuid.UUID, notifType string, payload map[string]any) {
	payloadJSON, err := json.Marshal(payload)
	if err != nil {
		return
	}

	notif := models.Notification{
		ID:      uuid.New(),
		UserID:  targetUserID,
		Type:    notifType,
		Payload: datatypes.JSON(payloadJSON),
	}
	if err := h.DB.Create(&notif).Error; err != nil {
		return
	}

	if h.NotifHub == nil {
		return
	}

	msg, err := json.Marshal(map[string]any{
		"type":         "notification",
		"notification": notif,
	})
	if err != nil {
		return
	}
	h.NotifHub.Publish(context.Background(), targetUserID.String(), msg)
}
