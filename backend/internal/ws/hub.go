package ws

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"sync"
	"time"

	"github.com/atss0/minorfm/internal/models"
	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
)

// OutgoingMessage is broadcast to WebSocket clients.
type OutgoingMessage struct {
	ID        string    `json:"id"`
	RoomID    string    `json:"room_id"`
	UserID    string    `json:"user_id"`
	Username  string    `json:"username"`
	AvatarURL string    `json:"avatar_url"`
	Body      string    `json:"body"`
	CreatedAt time.Time `json:"created_at"`
}

// OutgoingHeartTap is broadcast when a user sends a heart_tap event.
type OutgoingHeartTap struct {
	Type      string `json:"type"`
	UserID    string `json:"user_id"`
	Username  string `json:"username"`
	AvatarURL string `json:"avatar_url"`
	Effect    string `json:"effect"` // "heart" or "clap"
}

// OutgoingPresence is broadcast when a user joins or leaves the broadcast room.
type OutgoingPresence struct {
	Type      string `json:"type"`
	Action    string `json:"action"` // "join" or "leave"
	UserID    string `json:"user_id"`
	Username  string `json:"username"`
	AvatarURL string `json:"avatar_url"`
}

// Hub manages all WebSocket rooms and their Redis Pub/Sub subscriptions.
type Hub struct {
	mu    sync.RWMutex
	rooms map[string]map[*Client]struct{}
	subs  map[string]context.CancelFunc
	rdb   *redis.Client
	db    *gorm.DB
}

func NewHub(rdb *redis.Client, db *gorm.DB) *Hub {
	return &Hub{
		rooms: make(map[string]map[*Client]struct{}),
		subs:  make(map[string]context.CancelFunc),
		rdb:   rdb,
		db:    db,
	}
}

func (h *Hub) AddClient(c *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()

	if _, ok := h.rooms[c.roomID]; !ok {
		h.rooms[c.roomID] = make(map[*Client]struct{})
		ctx, cancel := context.WithCancel(context.Background())
		h.subs[c.roomID] = cancel
		go h.subscribeRoom(ctx, c.roomID)
	}
	h.rooms[c.roomID][c] = struct{}{}
}

func (h *Hub) RemoveClient(c *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()

	clients, ok := h.rooms[c.roomID]
	if !ok {
		return
	}
	if _, exists := clients[c]; exists {
		delete(clients, c)
		close(c.send)
	}

	if len(clients) == 0 {
		if cancel, ok := h.subs[c.roomID]; ok {
			cancel()
			delete(h.subs, c.roomID)
		}
		delete(h.rooms, c.roomID)
	}
}

// SaveAndPublish persists a chat message to the DB and publishes it via Redis.
func (h *Hub) SaveAndPublish(roomID, userID, username, avatarURL, body string) error {
	uid, err := uuid.Parse(userID)
	if err != nil {
		return err
	}

	msg := models.ChatMessage{
		RoomID: roomID,
		UserID: uid,
		Body:   body,
	}
	if err := h.db.Create(&msg).Error; err != nil {
		return err
	}

	out := &OutgoingMessage{
		ID:        msg.ID.String(),
		RoomID:    roomID,
		UserID:    userID,
		Username:  username,
		AvatarURL: avatarURL,
		Body:      body,
		CreatedAt: msg.CreatedAt,
	}

	data, err := json.Marshal(out)
	if err != nil {
		return err
	}
	return h.rdb.Publish(context.Background(), "chat:"+roomID, string(data)).Err()
}

// PublishPresence broadcasts a join/leave event to all clients in the room.
func (h *Hub) PublishPresence(roomID, action, userID, username, avatarURL string) error {
	out := &OutgoingPresence{
		Type:      "presence",
		Action:    action,
		UserID:    userID,
		Username:  username,
		AvatarURL: avatarURL,
	}
	data, err := json.Marshal(out)
	if err != nil {
		return err
	}
	return h.rdb.Publish(context.Background(), "chat:"+roomID, string(data)).Err()
}

// PublishHeartTap broadcasts a heart_tap event and increments the daily stats counter.
func (h *Hub) PublishHeartTap(roomID, userID, username, avatarURL, effect string) error {
	ctx := context.Background()
	today := time.Now().UTC().Format("2006-01-02")

	statKey := fmt.Sprintf("stats:%s:%ss", today, effect) // "stats:2026-05-30:hearts" or ":claps"
	if n, err := h.rdb.Incr(ctx, statKey).Result(); err == nil && n == 1 {
		h.rdb.Expire(ctx, statKey, 25*time.Hour)
	}

	out := &OutgoingHeartTap{
		Type:      "heart_tap",
		UserID:    userID,
		Username:  username,
		AvatarURL: avatarURL,
		Effect:    effect,
	}
	data, err := json.Marshal(out)
	if err != nil {
		return err
	}
	return h.rdb.Publish(ctx, "chat:"+roomID, string(data)).Err()
}

func (h *Hub) subscribeRoom(ctx context.Context, roomID string) {
	sub := h.rdb.Subscribe(ctx, "chat:"+roomID)
	defer sub.Close()

	ch := sub.Channel()
	for {
		select {
		case msg, ok := <-ch:
			if !ok {
				return
			}
			h.broadcastLocal(roomID, []byte(msg.Payload))
		case <-ctx.Done():
			return
		}
	}
}

func (h *Hub) broadcastLocal(roomID string, data []byte) {
	h.mu.RLock()
	defer h.mu.RUnlock()

	for c := range h.rooms[roomID] {
		select {
		case c.send <- data:
		default:
			log.Printf("ws: dropped message for user %s (buffer full)", c.userID)
		}
	}
}
