package ws

import (
	"context"
	"log"
	"sync"
	"time"

	"github.com/gofiber/contrib/websocket"
	"github.com/redis/go-redis/v9"
)

const radioPubChannel = "radio:updates"

// RadioHub broadcasts radio state updates to all connected WebSocket clients.
type RadioHub struct {
	mu      sync.RWMutex
	clients map[*radioClient]struct{}
	rdb     *redis.Client
}

type radioClient struct {
	conn *websocket.Conn
	send chan []byte
}

func NewRadioHub(rdb *redis.Client) *RadioHub {
	return &RadioHub{
		clients: make(map[*radioClient]struct{}),
		rdb:     rdb,
	}
}

// Run subscribes to Redis and forwards radio state updates to all clients.
func (h *RadioHub) Run(ctx context.Context) {
	sub := h.rdb.Subscribe(ctx, radioPubChannel)
	defer sub.Close()

	ch := sub.Channel()
	for {
		select {
		case msg, ok := <-ch:
			if !ok {
				return
			}
			h.broadcastAll([]byte(msg.Payload))
		case <-ctx.Done():
			return
		}
	}
}

func (h *RadioHub) addClient(c *radioClient) {
	h.mu.Lock()
	h.clients[c] = struct{}{}
	h.mu.Unlock()
}

func (h *RadioHub) removeClient(c *radioClient) {
	h.mu.Lock()
	if _, ok := h.clients[c]; ok {
		delete(h.clients, c)
		close(c.send)
	}
	h.mu.Unlock()
}

func (h *RadioHub) broadcastAll(data []byte) {
	h.mu.RLock()
	defer h.mu.RUnlock()
	for c := range h.clients {
		select {
		case c.send <- data:
		default:
			log.Printf("radio: dropped update (buffer full)")
		}
	}
}

// ServeClient registers the connection, sends the initial state, and blocks until disconnect.
func (h *RadioHub) ServeClient(conn *websocket.Conn, initialState []byte) {
	c := &radioClient{conn: conn, send: make(chan []byte, 64)}
	h.addClient(c)
	defer h.removeClient(c)

	// Send current state immediately on connect
	if len(initialState) > 0 {
		conn.SetWriteDeadline(time.Now().Add(writeWait))
		conn.WriteMessage(websocket.TextMessage, initialState)
	}

	go c.writePump()

	// Read loop — radio clients send nothing, this just detects disconnect
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
}

func (c *radioClient) writePump() {
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
