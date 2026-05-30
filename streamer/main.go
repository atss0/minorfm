package main

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	_ "embed"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"
)

var (
	adminUser     = envOr("STREAMER_USER", "admin")
	adminPass     = envOr("STREAMER_PASS", "")
	elevenLabsKey = os.Getenv("ELEVENLABS_API_KEY")
)

var elClient = &http.Client{Timeout: 30 * time.Second}

func envOr(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

func sessionToken() string {
	mac := hmac.New(sha256.New, []byte(adminPass))
	mac.Write([]byte(adminUser))
	return hex.EncodeToString(mac.Sum(nil))
}

func basicAuth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if adminPass == "" {
			next(w, r)
			return
		}
		if cookie, err := r.Cookie("session"); err == nil && cookie.Value == sessionToken() {
			next(w, r)
			return
		}
		u, p, ok := r.BasicAuth()
		if !ok || u != adminUser || p != adminPass {
			w.Header().Set("WWW-Authenticate", `Basic realm="streamer"`)
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}
		next(w, r)
	}
}

//go:embed index.html
var indexPage []byte

const (
	uploadDir     = "./uploads"
	maxUploadSize = 200 << 20 // 200 MB
)

var (
	q  *Queue
	bc *Broadcaster
)

func main() {
	if adminPass == "" {
		log.Println("WARNING: STREAMER_PASS is not set — admin panel is open to everyone!")
	}

	if err := os.MkdirAll(uploadDir, 0o755); err != nil {
		log.Fatalf("cannot create uploads dir: %v", err)
	}

	q = LoadQueue()
	bc = NewBroadcaster(q)
	go bc.Run()

	mux := http.NewServeMux()
	mux.HandleFunc("/", basicAuth(handleIndex))
	mux.HandleFunc("/stream", handleStream)   // public — listeners
	mux.HandleFunc("/events", handleSSE)      // public — SSE for listeners
	mux.HandleFunc("/api/now", handleNow)     // public — current track metadata
	mux.HandleFunc("/api/status", basicAuth(handleStatus))
	mux.HandleFunc("/api/queue", basicAuth(handleQueue))
	mux.HandleFunc("/api/queue/reorder", basicAuth(handleReorder))
	mux.HandleFunc("/api/queue/", basicAuth(handleQueueItem))
	mux.HandleFunc("/api/skip", basicAuth(handleSkip))
	mux.HandleFunc("/api/loop", basicAuth(handleLoop))
	mux.HandleFunc("/api/upload", basicAuth(handleUpload))
	mux.HandleFunc("/api/tts", basicAuth(handleTTS))
	mux.HandleFunc("/api/mic", handleMicWS)

	addr := ":7000"
	log.Printf("admin  → http://localhost%s", addr)
	log.Printf("stream → http://localhost%s/stream", addr)
	log.Println("NOTE: serving over plain HTTP — use a reverse proxy with TLS in production")
	log.Fatal(http.ListenAndServe(addr, mux))
}

// ── Page ─────────────────────────────────────────────────────────────────────

func handleIndex(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != "/" {
		http.NotFound(w, r)
		return
	}
	if adminPass != "" {
		http.SetCookie(w, &http.Cookie{
			Name:     "session",
			Value:    sessionToken(),
			HttpOnly: true,
			SameSite: http.SameSiteStrictMode,
			Path:     "/",
		})
	}
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Write(indexPage)
}

// ── Stream ───────────────────────────────────────────────────────────────────

const icyMetaInt = 8192

func buildIcyMeta(track *Track) []byte {
	title := ""
	if track != nil {
		title = strings.ReplaceAll(track.Title, "'", "\\'")
	}
	s := fmt.Sprintf("StreamTitle='%s';", title)
	blocks := (len(s) + 15) / 16
	meta := make([]byte, 1+blocks*16)
	meta[0] = byte(blocks)
	copy(meta[1:], []byte(s))
	return meta
}

func handleStream(w http.ResponseWriter, r *http.Request) {
	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "streaming not supported", http.StatusInternalServerError)
		return
	}

	wantMeta := r.Header.Get("Icy-MetaData") == "1"

	w.Header().Set("Content-Type", "audio/mpeg")
	w.Header().Set("Cache-Control", "no-cache, no-store")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("icy-name", "MINOR.fm")
	if wantMeta {
		w.Header().Set("icy-metaint", strconv.Itoa(icyMetaInt))
	}

	ch := bc.Subscribe()
	defer bc.Unsubscribe(ch)

	log.Printf("+ listener %s (total: %d)", r.RemoteAddr, bc.ListenerCount())
	defer log.Printf("- listener %s (total: %d)", r.RemoteAddr, bc.ListenerCount()-1)

	byteCount := 0

	for {
		select {
		case chunk, ok := <-ch:
			if !ok {
				return
			}
			if wantMeta {
				pos := 0
				for pos < len(chunk) {
					space := icyMetaInt - byteCount
					if remaining := len(chunk) - pos; space > remaining {
						space = remaining
					}
					if _, err := w.Write(chunk[pos : pos+space]); err != nil {
						return
					}
					pos += space
					byteCount += space
					if byteCount >= icyMetaInt {
						if _, err := w.Write(buildIcyMeta(bc.Current())); err != nil {
							return
						}
						byteCount = 0
					}
				}
			} else {
				if _, err := w.Write(chunk); err != nil {
					return
				}
			}
			flusher.Flush()
		case <-r.Context().Done():
			return
		}
	}
}

// ── SSE ──────────────────────────────────────────────────────────────────────

func handleSSE(w http.ResponseWriter, r *http.Request) {
	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "SSE not supported", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("X-Accel-Buffering", "no")

	ch := bc.subscribeSSE()
	defer bc.unsubscribeSSE(ch)

	sendUpdate := func() {
		cur := bc.Current()
		title := ""
		if cur != nil {
			title = cur.Title
		}
		data, _ := json.Marshal(map[string]any{
			"playing": bc.IsPlaying(),
			"title":   title,
		})
		fmt.Fprintf(w, "data: %s\n\n", data)
		flusher.Flush()
	}

	sendUpdate()

	for {
		select {
		case _, ok := <-ch:
			if !ok {
				return
			}
			sendUpdate()
		case <-r.Context().Done():
			return
		}
	}
}

// ── Now (public metadata) ─────────────────────────────────────────────────────

func handleNow(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	cur := bc.Current()
	title := ""
	if cur != nil {
		title = cur.Title
	}
	json.NewEncoder(w).Encode(map[string]any{
		"title":   title,
		"playing": bc.IsPlaying(),
	})
}

// ── Status ───────────────────────────────────────────────────────────────────

func handleStatus(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{
		"playing":   bc.IsPlaying(),
		"current":   bc.Current(),
		"listeners": bc.ListenerCount(),
		"queue_len": q.Len(),
		"loop":      bc.IsLoop(),
	})
}

// ── Queue ────────────────────────────────────────────────────────────────────

func handleQueue(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	switch r.Method {
	case http.MethodGet:
		tracks := q.List()
		if tracks == nil {
			tracks = []Track{}
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(tracks)

	case http.MethodPost:
		var body struct {
			Title  string `json:"title"`
			Source string `json:"source"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Source == "" {
			http.Error(w, "source required", http.StatusBadRequest)
			return
		}
		u, err := url.Parse(body.Source)
		if err != nil || (u.Scheme != "http" && u.Scheme != "https") {
			http.Error(w, "only http/https URLs are accepted", http.StatusBadRequest)
			return
		}
		if body.Title == "" {
			body.Title = body.Source
		}
		t, err := q.Add(Track{Title: body.Title, Source: body.Source})
		if err != nil {
			http.Error(w, "queue is full", http.StatusTooManyRequests)
			return
		}
		bc.notify()
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(t)

	default:
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

func handleQueueItem(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	id := strings.TrimPrefix(r.URL.Path, "/api/queue/")
	if id == "" {
		http.Error(w, "id required", http.StatusBadRequest)
		return
	}
	removed, ok := q.Remove(id)
	if !ok {
		if cur := bc.Current(); cur != nil && cur.ID == id {
			bc.Skip()
			w.WriteHeader(http.StatusNoContent)
			return
		}
		http.Error(w, "not found", http.StatusNotFound)
		return
	}
	if removed.IsFile {
		os.Remove(removed.Source)
	}
	bc.notify()
	w.WriteHeader(http.StatusNoContent)
}

func handleReorder(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	var ids []string
	if err := json.NewDecoder(r.Body).Decode(&ids); err != nil {
		http.Error(w, "invalid body", http.StatusBadRequest)
		return
	}
	if !q.Reorder(ids) {
		http.Error(w, "invalid ids", http.StatusBadRequest)
		return
	}
	bc.notify()
	w.WriteHeader(http.StatusNoContent)
}

// ── Skip ─────────────────────────────────────────────────────────────────────

func handleSkip(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	bc.Skip()
	w.WriteHeader(http.StatusNoContent)
}

// ── Loop ─────────────────────────────────────────────────────────────────────

func handleLoop(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]bool{"loop": bc.IsLoop()})
	case http.MethodPost:
		var body struct {
			Loop bool `json:"loop"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			http.Error(w, "invalid body", http.StatusBadRequest)
			return
		}
		bc.SetLoop(body.Loop)
		w.WriteHeader(http.StatusNoContent)
	default:
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

// ── Upload ───────────────────────────────────────────────────────────────────

var allowedExt = map[string]bool{
	".mp3": true, ".wav": true, ".flac": true,
	".ogg": true, ".aac": true, ".m4a": true, ".opus": true,
}

func handleUpload(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	if err := r.ParseMultipartForm(maxUploadSize); err != nil {
		http.Error(w, "file too large (max 200 MB)", http.StatusRequestEntityTooLarge)
		return
	}
	file, header, err := r.FormFile("file")
	if err != nil {
		http.Error(w, "file required", http.StatusBadRequest)
		return
	}
	defer file.Close()

	ext := strings.ToLower(filepath.Ext(header.Filename))
	if !allowedExt[ext] {
		http.Error(w, "unsupported format (mp3/wav/flac/ogg/aac/m4a/opus)", http.StatusBadRequest)
		return
	}

	id := newID()
	dest := filepath.Join(uploadDir, id+ext)
	f, err := os.Create(dest)
	if err != nil {
		http.Error(w, "failed to save", http.StatusInternalServerError)
		return
	}
	defer f.Close()

	if _, err := io.Copy(f, file); err != nil {
		f.Close()
		if rerr := os.Remove(dest); rerr != nil && !os.IsNotExist(rerr) {
			log.Printf("cleanup after upload write error: %v", rerr)
		}
		http.Error(w, "failed to save", http.StatusInternalServerError)
		return
	}

	title := strings.TrimSuffix(header.Filename, filepath.Ext(header.Filename))
	t, err := q.Add(Track{ID: id, Title: title, Source: dest, IsFile: true})
	if err != nil {
		f.Close()
		os.Remove(dest)
		http.Error(w, "queue is full", http.StatusTooManyRequests)
		return
	}
	bc.notify()

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(t)
}

// ── TTS (ElevenLabs) ─────────────────────────────────────────────────────────

func handleTTS(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var body struct {
		Text    string `json:"text"`
		VoiceID string `json:"voice_id"`
		APIKey  string `json:"api_key"`
		ModelID string `json:"model_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || strings.TrimSpace(body.Text) == "" {
		http.Error(w, "text required", http.StatusBadRequest)
		return
	}
	key := elevenLabsKey
	if key == "" {
		key = body.APIKey
	}
	if key == "" {
		http.Error(w, "api_key required (set ELEVENLABS_API_KEY env var or pass in body)", http.StatusBadRequest)
		return
	}
	if body.VoiceID == "" {
		body.VoiceID = "21m00Tcm4TlvDq8ikWAM" // Rachel (default)
	}
	if body.ModelID == "" {
		body.ModelID = "eleven_multilingual_v2"
	}

	payload, _ := json.Marshal(map[string]any{
		"text":     body.Text,
		"model_id": body.ModelID,
		"voice_settings": map[string]float64{
			"stability":        0.5,
			"similarity_boost": 0.75,
		},
	})

	elURL := fmt.Sprintf("https://api.elevenlabs.io/v1/text-to-speech/%s", body.VoiceID)
	req, err := http.NewRequest(http.MethodPost, elURL, bytes.NewReader(payload))
	if err != nil {
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}
	req.Header.Set("xi-api-key", key)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "audio/mpeg")

	resp, err := elClient.Do(req)
	if err != nil {
		http.Error(w, "elevenlabs unreachable", http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		msg, _ := io.ReadAll(io.LimitReader(resp.Body, 512))
		http.Error(w, fmt.Sprintf("elevenlabs %d: %s", resp.StatusCode, string(msg)), http.StatusUnprocessableEntity)
		return
	}

	id := newID()
	dest := filepath.Join(uploadDir, id+".mp3")
	f, err := os.Create(dest)
	if err != nil {
		http.Error(w, "failed to save", http.StatusInternalServerError)
		return
	}
	defer f.Close()

	if _, err := io.Copy(f, resp.Body); err != nil {
		f.Close()
		if rerr := os.Remove(dest); rerr != nil && !os.IsNotExist(rerr) {
			log.Printf("cleanup after TTS write error: %v", rerr)
		}
		http.Error(w, "failed to save", http.StatusInternalServerError)
		return
	}

	label := strings.TrimSpace(body.Text)
	if len([]rune(label)) > 60 {
		label = string([]rune(label)[:60]) + "…"
	}
	t, err := q.Add(Track{ID: id, Title: "TTS: " + label, Source: dest, IsFile: true})
	if err != nil {
		f.Close()
		os.Remove(dest)
		http.Error(w, "queue is full", http.StatusTooManyRequests)
		return
	}
	bc.notify()

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(t)
}
