package ws

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/gofiber/contrib/websocket"
	"github.com/redis/go-redis/v9"
)

const (
	writeWait      = 10 * time.Second
	pongWait       = 60 * time.Second
	pingPeriod     = (pongWait * 9) / 10
	maxMessageSize = 1024
	rateLimitMax   = 5 // messages per second per user
)

type incomingMessage struct {
	Body string `json:"body"`
}

// Client represents a single WebSocket connection.
type Client struct {
	hub       *Hub
	conn      *websocket.Conn
	send      chan []byte
	roomID    string
	userID    string
	username  string
	avatarURL string
	rdb       *redis.Client
}

func NewClient(hub *Hub, conn *websocket.Conn, rdb *redis.Client, roomID, userID, username, avatarURL string) *Client {
	return &Client{
		hub:       hub,
		conn:      conn,
		send:      make(chan []byte, 256),
		roomID:    roomID,
		userID:    userID,
		username:  username,
		avatarURL: avatarURL,
		rdb:       rdb,
	}
}

const onlineUsersKey = "online:users"

// Run registers the client with the hub and starts read/write pumps.
func (c *Client) Run() {
	c.hub.AddClient(c)
	// Mark user online (score = Unix timestamp for last_seen)
	c.rdb.ZAdd(context.Background(), onlineUsersKey, redis.Z{
		Score:  float64(time.Now().Unix()),
		Member: c.userID,
	})
	defer func() {
		c.hub.RemoveClient(c)
		c.rdb.ZRem(context.Background(), onlineUsersKey, c.userID)
	}()

	go c.writePump()
	c.readPump()
}

func (c *Client) readPump() {
	defer c.conn.Close()

	c.conn.SetReadLimit(maxMessageSize)
	c.conn.SetReadDeadline(time.Now().Add(pongWait))
	c.conn.SetPongHandler(func(string) error {
		c.conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	for {
		_, raw, err := c.conn.ReadMessage()
		if err != nil {
			break
		}

		var msg incomingMessage
		if err := json.Unmarshal(raw, &msg); err != nil || msg.Body == "" {
			continue
		}
		if len(msg.Body) > 500 {
			continue
		}

		if err := c.checkRateLimit(); err != nil {
			continue
		}

		if err := c.hub.SaveAndPublish(c.roomID, c.userID, c.username, c.avatarURL, msg.Body); err != nil {
			log.Printf("ws: publish error: %v", err)
		}
	}
}

func (c *Client) writePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()

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

// checkRateLimit uses a Redis sliding window counter (1 second window, 5 msg max).
func (c *Client) checkRateLimit() error {
	ctx := context.Background()
	key := fmt.Sprintf("ratelimit:chat:%s", c.userID)
	count, err := c.rdb.Incr(ctx, key).Result()
	if err != nil {
		return nil // fail open
	}
	if count == 1 {
		c.rdb.Expire(ctx, key, time.Second)
	}
	if count > rateLimitMax {
		return fmt.Errorf("rate limited")
	}
	return nil
}
