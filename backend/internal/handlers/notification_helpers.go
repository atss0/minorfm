package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"

	"github.com/atss0/minorfm/internal/models"
	"github.com/google/uuid"
	"gorm.io/datatypes"
)

// pushNotification creates a Notification record, sends it over WebSocket,
// and delivers a push notification via OneSignal (if API key is configured).
// Call fire-and-forget (errors are silently dropped).
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

	// Real-time WebSocket delivery
	if h.NotifHub != nil {
		msg, _ := json.Marshal(map[string]any{
			"type":         "notification",
			"notification": notif,
		})
		h.NotifHub.Publish(context.Background(), targetUserID.String(), msg)
	}

	// OneSignal push delivery
	if h.Cfg.OneSignalAPIKey != "" {
		go h.sendOneSignalPush(targetUserID.String(), notifType, payload)
	}
}

func (h *Handler) sendOneSignalPush(externalUserID, notifType string, payload map[string]any) {
	actor, _ := payload["actor_username"].(string)

	title := "MINOR.fm"
	body := "Yeni bir bildiriminiz var"
	switch notifType {
	case "follow":
		body = actor + " sizi takip etmeye başladı"
	case "like":
		body = actor + " kaydınızı beğendi"
	case "comment":
		body = actor + " yorum yaptı"
	case "mention":
		body = actor + " sizden bahsetti"
	}

	reqBody := map[string]any{
		"app_id": h.Cfg.OneSignalAppID,
		"include_aliases": map[string]any{
			"external_id": []string{externalUserID},
		},
		"target_channel": "push",
		"headings":       map[string]string{"en": title, "tr": title},
		"contents":       map[string]string{"en": body, "tr": body},
		"data":           payload,
	}

	data, err := json.Marshal(reqBody)
	if err != nil {
		return
	}

	req, err := http.NewRequest("POST", "https://api.onesignal.com/notifications", bytes.NewBuffer(data))
	if err != nil {
		return
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Basic "+h.Cfg.OneSignalAPIKey)

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return
	}
	defer resp.Body.Close()
}
