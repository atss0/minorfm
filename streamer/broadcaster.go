package main

import (
	"context"
	"log"
	"os"
	"os/exec"
	"strings"
	"sync"
	"time"
)

type listener = chan []byte

type Broadcaster struct {
	mu        sync.RWMutex
	subs      map[listener]struct{}
	queue     *Queue
	skip      chan struct{}
	current   *Track
	playing   bool
	loop      bool
	micActive bool

	sseMu   sync.RWMutex
	sseSubs map[chan struct{}]struct{}
}

func NewBroadcaster(q *Queue) *Broadcaster {
	return &Broadcaster{
		subs:    make(map[listener]struct{}),
		queue:   q,
		skip:    make(chan struct{}, 1),
		sseSubs: make(map[chan struct{}]struct{}),
	}
}

func (b *Broadcaster) Subscribe() listener {
	ch := make(chan []byte, 64)
	b.mu.Lock()
	b.subs[ch] = struct{}{}
	b.mu.Unlock()
	return ch
}

func (b *Broadcaster) Unsubscribe(ch listener) {
	b.mu.Lock()
	delete(b.subs, ch)
	b.mu.Unlock()
	for len(ch) > 0 {
		<-ch
	}
	close(ch)
}

func (b *Broadcaster) ListenerCount() int {
	b.mu.RLock()
	defer b.mu.RUnlock()
	return len(b.subs)
}

func (b *Broadcaster) broadcast(data []byte) {
	b.mu.RLock()
	defer b.mu.RUnlock()
	for ch := range b.subs {
		select {
		case ch <- data:
		default: // slow listener — drop chunk, don't block
		}
	}
}

func (b *Broadcaster) Skip() {
	select {
	case b.skip <- struct{}{}:
	default:
	}
}

func (b *Broadcaster) Current() *Track {
	b.mu.RLock()
	defer b.mu.RUnlock()
	return b.current
}

func (b *Broadcaster) IsPlaying() bool {
	b.mu.RLock()
	defer b.mu.RUnlock()
	return b.playing
}

func (b *Broadcaster) SetLoop(v bool) {
	b.mu.Lock()
	b.loop = v
	b.mu.Unlock()
	b.notify()
}

func (b *Broadcaster) IsLoop() bool {
	b.mu.RLock()
	defer b.mu.RUnlock()
	return b.loop
}

func (b *Broadcaster) StartMic() {
	b.mu.Lock()
	b.micActive = true
	b.mu.Unlock()
	b.Skip()
	b.notify()
}

func (b *Broadcaster) StopMic() {
	b.mu.Lock()
	b.micActive = false
	b.mu.Unlock()
	// Drain any skip signal queued while mic was active so it doesn't skip the next track
	select {
	case <-b.skip:
	default:
	}
	b.notify()
}

func (b *Broadcaster) IsMicActive() bool {
	b.mu.RLock()
	defer b.mu.RUnlock()
	return b.micActive
}

func (b *Broadcaster) Run() {
	for {
		if b.IsMicActive() {
			time.Sleep(100 * time.Millisecond)
			continue
		}

		track := b.queue.Pop()
		if track == nil {
			b.mu.Lock()
			b.playing = false
			b.current = nil
			b.mu.Unlock()
			b.notify()
			time.Sleep(500 * time.Millisecond)
			continue
		}

		b.mu.Lock()
		b.current = track
		b.playing = true
		b.mu.Unlock()
		b.notify()

		log.Printf("▶ playing: %s", track.Title)
		b.streamTrack(track)
		log.Printf("✓ finished: %s", track.Title)

		b.mu.RLock()
		looping := b.loop
		b.mu.RUnlock()
		if looping {
			if _, err := b.queue.Add(*track); err != nil {
				log.Printf("loop add: %v", err)
			}
			b.notify()
		} else if track.IsFile {
			if err := os.Remove(track.Source); err != nil && !os.IsNotExist(err) {
				log.Printf("temp file remove failed: %v", err)
			}
		}
	}
}

func (b *Broadcaster) streamTrack(track *Track) {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Honor skip signal
	go func() {
		select {
		case <-b.skip:
			cancel()
		case <-ctx.Done():
		}
	}()

	cmd := exec.CommandContext(ctx, "ffmpeg",
		"-nostdin",
		"-re", // read at native frame rate (real-time)
		"-i", track.Source,
		"-vn",           // no video
		"-ac", "2",      // stereo
		"-ar", "44100",  // sample rate
		"-b:a", "128k",  // bitrate
		"-f", "mp3",
		"-loglevel", "error",
		"pipe:1",
	)
	var ffmpegStderr strings.Builder
	cmd.Stderr = &ffmpegStderr

	stdout, err := cmd.StdoutPipe()
	if err != nil {
		log.Printf("pipe error: %v", err)
		return
	}
	if err := cmd.Start(); err != nil {
		log.Printf("ffmpeg start error: %v — is ffmpeg installed?", err)
		return
	}

	buf := make([]byte, 4096)
	for {
		n, err := stdout.Read(buf)
		if n > 0 {
			chunk := make([]byte, n)
			copy(chunk, buf[:n])
			b.broadcast(chunk)
		}
		if err != nil {
			break
		}
	}
	if err := cmd.Wait(); err != nil {
		if msg := strings.TrimSpace(ffmpegStderr.String()); msg != "" {
			log.Printf("ffmpeg [%s]: %s", track.Title, msg)
		}
	}
}

// SSE notifications for queue/status changes

func (b *Broadcaster) subscribeSSE() chan struct{} {
	ch := make(chan struct{}, 4)
	b.sseMu.Lock()
	b.sseSubs[ch] = struct{}{}
	b.sseMu.Unlock()
	return ch
}

func (b *Broadcaster) unsubscribeSSE(ch chan struct{}) {
	b.sseMu.Lock()
	delete(b.sseSubs, ch)
	b.sseMu.Unlock()
	close(ch)
}

func (b *Broadcaster) notify() {
	b.sseMu.RLock()
	defer b.sseMu.RUnlock()
	for ch := range b.sseSubs {
		select {
		case ch <- struct{}{}:
		default:
		}
	}
}
