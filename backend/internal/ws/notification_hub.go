package ws

import (
	"context"
	"log"
	"sync"
	"time"

	"github.com/gofiber/contrib/websocket"
	"github.com/redis/go-redis/v9"
)

const notifPubChannel = "notifications:"

// NotificationHub delivers per-user real-time notifications via WebSocket.
type NotificationHub struct {
	mu      sync.RWMutex
	clients map[string]*notifClient // userID → client
	rdb     *redis.Client
}

type notifClient struct {
	conn   *websocket.Conn
	send   chan []byte
	userID string
}

func NewNotificationHub(rdb *redis.Client) *NotificationHub {
	return &NotificationHub{
		clients: make(map[string]*notifClient),
		rdb:     rdb,
	}
}

// Publish sends a notification payload to a user's channel in Redis.
func (h *NotificationHub) Publish(ctx context.Context, userID string, payload []byte) error {
	return h.rdb.Publish(ctx, notifPubChannel+userID, string(payload)).Err()
}

// ServeClient registers a client and blocks until disconnect.
func (h *NotificationHub) ServeClient(conn *websocket.Conn, userID string) {
	c := &notifClient{conn: conn, send: make(chan []byte, 64), userID: userID}

	h.mu.Lock()
	h.clients[userID] = c
	h.mu.Unlock()

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	go h.subscribeUser(ctx, c)
	go c.writePump()

	conn.SetReadLimit(64)
	conn.SetReadDeadline(time.Now().Add(pongWait))
	conn.SetPongHandler(func(string) error {
		conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})
	for {
		if _, _, err := conn.ReadMessage(); err != nil {
			break
		}
	}

	h.mu.Lock()
	if h.clients[userID] == c {
		delete(h.clients, userID)
	}
	close(c.send)
	h.mu.Unlock()
}

func (h *NotificationHub) subscribeUser(ctx context.Context, c *notifClient) {
	sub := h.rdb.Subscribe(ctx, notifPubChannel+c.userID)
	defer sub.Close()

	ch := sub.Channel()
	for {
		select {
		case msg, ok := <-ch:
			if !ok {
				return
			}
			select {
			case c.send <- []byte(msg.Payload):
			default:
				log.Printf("notif: dropped for user %s (buffer full)", c.userID)
			}
		case <-ctx.Done():
			return
		}
	}
}

func (c *notifClient) writePump() {
	ticker := time.NewTicker(pingPeriod)
	defer ticker.Stop()
	for {
		select {
		case data, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			if err := c.conn.WriteMessage(websocket.TextMessage, data); err != nil {
				return
			}
		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}
