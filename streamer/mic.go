package main

import (
	"context"
	"encoding/base64"
	"encoding/binary"
	"io"
	"log"
	"math"
	"net/http"
	"os/exec"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

var wsUpgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

// ── PCM Mixer ────────────────────────────────────────────────────────────────

const (
	mixRate     = 44100
	mixCh       = 2
	mixInterval = 20 * time.Millisecond
	// bytes for one 20 ms chunk: 44100 * 2ch * 4 bytes(f32) * 0.02s
	mixChunk = int(float64(mixRate*mixCh*4) * 0.02)
)

type micInput struct {
	mu  sync.Mutex
	buf []byte
}

func (m *micInput) write(p []byte) {
	m.mu.Lock()
	m.buf = append(m.buf, p...)
	m.mu.Unlock()
}

func (m *micInput) drain(n int) []byte {
	m.mu.Lock()
	defer m.mu.Unlock()
	out := make([]byte, n)
	copy(out, m.buf)
	if len(m.buf) >= n {
		m.buf = m.buf[n:]
	} else {
		m.buf = nil
	}
	return out
}

type micMixer struct {
	mu      sync.Mutex
	inputs  map[string]*micInput
	encIn   io.WriteCloser
	encCmd  *exec.Cmd
	cancel  context.CancelFunc
	ticker  *time.Ticker
	done    chan struct{}
}

var mx = &micMixer{inputs: make(map[string]*micInput)}

func (m *micMixer) add(id string) *micInput {
	m.mu.Lock()
	defer m.mu.Unlock()
	inp := &micInput{}
	m.inputs[id] = inp
	if len(m.inputs) == 1 {
		m.startLocked()
	}
	return inp
}

func (m *micMixer) remove(id string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	delete(m.inputs, id)
	if len(m.inputs) == 0 {
		m.stopLocked()
	}
}

func (m *micMixer) startLocked() {
	ctx, cancel := context.WithCancel(context.Background())
	m.cancel = cancel

	cmd := exec.CommandContext(ctx, "ffmpeg",
		"-nostdin",
		"-f", "f32le", "-ar", "44100", "-ac", "2",
		"-i", "pipe:0",
		"-b:a", "128k", "-f", "mp3", "-loglevel", "error",
		"pipe:1",
	)
	encIn, _ := cmd.StdinPipe()
	stdout, _ := cmd.StdoutPipe()
	cmd.Stderr = io.Discard
	cmd.Start()

	m.encIn = encIn
	m.encCmd = cmd

	go func() {
		buf := make([]byte, 4096)
		for {
			n, err := stdout.Read(buf)
			if n > 0 {
				chunk := make([]byte, n)
				copy(chunk, buf[:n])
				bc.broadcast(chunk)
			}
			if err != nil {
				return
			}
		}
	}()

	m.done = make(chan struct{})
	m.ticker = time.NewTicker(mixInterval)
	go m.loop()

	bc.StartMic()
	log.Printf("🎙 mixer started")
}

func (m *micMixer) stopLocked() {
	m.ticker.Stop()
	close(m.done)
	m.cancel()
	m.encIn.Close()
	m.encCmd.Wait()
	m.done = nil
	m.ticker = nil
	m.encIn = nil
	m.encCmd = nil
	bc.StopMic()
	log.Printf("🎙 mixer stopped")
}

func (m *micMixer) loop() {
	nSamples := mixChunk / 4
	for {
		select {
		case <-m.done:
			return
		case <-m.ticker.C:
			mixed := make([]float32, nSamples)

			m.mu.Lock()
			for _, inp := range m.inputs {
				raw := inp.drain(mixChunk)
				for i := 0; i+3 < len(raw); i += 4 {
					v := math.Float32frombits(binary.LittleEndian.Uint32(raw[i:]))
					mixed[i/4] += v
				}
			}
			m.mu.Unlock()

			out := make([]byte, mixChunk)
			for i, v := range mixed {
				if v > 1 {
					v = 1
				} else if v < -1 {
					v = -1
				}
				binary.LittleEndian.PutUint32(out[i*4:], math.Float32bits(v))
			}
			m.encIn.Write(out)
		}
	}
}

// ── WebSocket Handler ─────────────────────────────────────────────────────────

func handleMicWS(w http.ResponseWriter, r *http.Request) {
	if adminPass != "" {
		token := r.URL.Query().Get("token")
		expected := base64.StdEncoding.EncodeToString([]byte(adminUser + ":" + adminPass))
		if token != expected {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}
	}

	conn, err := wsUpgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("mic ws upgrade: %v", err)
		return
	}
	defer conn.Close()

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	id := newID()
	inp := mx.add(id)
	defer mx.remove(id)
	log.Printf("🎙 mic %s joined", id)
	defer log.Printf("🎙 mic %s left", id)

	// webm/opus → f32le PCM
	dec := exec.CommandContext(ctx, "ffmpeg",
		"-nostdin",
		"-f", "webm", "-i", "pipe:0",
		"-f", "f32le", "-ar", "44100", "-ac", "2",
		"-loglevel", "error",
		"pipe:1",
	)
	decIn, _ := dec.StdinPipe()
	decOut, _ := dec.StdoutPipe()
	dec.Stderr = io.Discard
	if err := dec.Start(); err != nil {
		log.Printf("mic decoder start: %v", err)
		return
	}
	defer func() { cancel(); decIn.Close(); dec.Wait() }()

	go func() {
		buf := make([]byte, 4096)
		for {
			n, err := decOut.Read(buf)
			if n > 0 {
				inp.write(buf[:n])
			}
			if err != nil {
				return
			}
		}
	}()

	for {
		msgType, data, err := conn.ReadMessage()
		if err != nil {
			return
		}
		if msgType == websocket.BinaryMessage {
			if _, err := decIn.Write(data); err != nil {
				return
			}
		}
	}
}
