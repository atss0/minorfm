package main

import (
	"context"
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
	CheckOrigin: func(r *http.Request) bool {
		return true // Tüm Origin'lere (kaynaklara) izin ver
	},
}

// ── PCM Mixer ────────────────────────────────────────────────────────────────

const (
	mixRate     = 44100
	mixCh       = 2
	mixInterval = 20 * time.Millisecond
	// bytes for one 20 ms chunk: 44100 * 2ch * 4 bytes(f32) * 0.02s
	mixChunk     = int(float64(mixRate*mixCh*4) * 0.02)
	maxMicBuf    = mixChunk * 50 // ~1 second of audio per input
	maxMicInputs = 5             // max concurrent mic connections
)

type micInput struct {
	mu  sync.Mutex
	buf []byte
}

func (m *micInput) write(p []byte) {
	m.mu.Lock()
	if len(m.buf) < maxMicBuf {
		m.buf = append(m.buf, p...)
	}
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
	mu     sync.Mutex
	inputs map[string]*micInput
	encIn  io.WriteCloser
	encCmd *exec.Cmd
	cancel context.CancelFunc
	ticker *time.Ticker
	done   chan struct{}
}

var mx = &micMixer{inputs: make(map[string]*micInput)}

func (m *micMixer) add(id string) (*micInput, bool) {
	m.mu.Lock()
	if len(m.inputs) >= maxMicInputs {
		m.mu.Unlock()
		return nil, false
	}
	inp := &micInput{}
	m.inputs[id] = inp
	start := len(m.inputs) == 1
	if start {
		m.startLocked()
	}
	m.mu.Unlock()
	if start {
		bc.StartMic()
	}
	return inp, true
}

func (m *micMixer) remove(id string) {
	m.mu.Lock()
	delete(m.inputs, id)
	stop := len(m.inputs) == 0
	if stop {
		m.stopLocked()
	}
	m.mu.Unlock()
	if stop {
		bc.StopMic()
	}
}

func (m *micMixer) startLocked() {
	ctx, cancel := context.WithCancel(context.Background())

	cmd := exec.CommandContext(ctx, "ffmpeg",
		"-nostdin",
		"-f", "f32le", "-ar", "44100", "-ac", "2",
		"-i", "pipe:0",
		"-b:a", "128k", "-f", "mp3", "-loglevel", "error",
		"pipe:1",
	)
	encIn, err := cmd.StdinPipe()
	if err != nil {
		log.Printf("mixer stdin pipe: %v", err)
		cancel()
		return
	}
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		log.Printf("mixer stdout pipe: %v", err)
		cancel()
		return
	}
	cmd.Stderr = io.Discard
	if err := cmd.Start(); err != nil {
		log.Printf("mixer ffmpeg başlatılamadı (ffmpeg kurulu mu?): %v", err)
		cancel()
		return
	}

	m.cancel = cancel
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

	done := make(chan struct{})
	m.done = done
	m.ticker = time.NewTicker(mixInterval)
	go m.loop(done, m.ticker.C, encIn)

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
	log.Printf("🎙 mixer stopped")
}

func (m *micMixer) loop(done <-chan struct{}, tick <-chan time.Time, encIn io.WriteCloser) {
	nSamples := mixChunk / 4
	for {
		select {
		case <-done:
			return
		case <-tick:
			mixed := make([]float32, nSamples)

			m.mu.Lock()
			count := float32(len(m.inputs))
			for _, inp := range m.inputs {
				raw := inp.drain(mixChunk)
				for i := 0; i+3 < len(raw); i += 4 {
					v := math.Float32frombits(binary.LittleEndian.Uint32(raw[i:]))
					mixed[i/4] += v
				}
			}
			m.mu.Unlock()

			if count > 1 {
				for i := range mixed {
					mixed[i] /= count
				}
			}

			out := make([]byte, mixChunk)
			for i, v := range mixed {
				if v > 1 {
					v = 1
				} else if v < -1 {
					v = -1
				}
				binary.LittleEndian.PutUint32(out[i*4:], math.Float32bits(v))
			}
			encIn.Write(out)
		}
	}
}

// ── WebSocket Handler ─────────────────────────────────────────────────────────

func handleMicWS(w http.ResponseWriter, r *http.Request) {
	if adminPass != "" {
		cookie, err := r.Cookie("session")
		if err != nil || cookie.Value != sessionToken() {
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
	inp, ok := mx.add(id)
	if !ok {
		conn.WriteMessage(websocket.CloseMessage,
			websocket.FormatCloseMessage(websocket.ClosePolicyViolation, "too many concurrent mic connections"))
		return
	}
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
	decIn, err := dec.StdinPipe()
	if err != nil {
		log.Printf("mic decoder stdin pipe: %v", err)
		return
	}
	decOut, err := dec.StdoutPipe()
	if err != nil {
		log.Printf("mic decoder stdout pipe: %v", err)
		return
	}
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
