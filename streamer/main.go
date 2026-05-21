package main

import (
	"bytes"
	_ "embed"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
)

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
	if err := os.MkdirAll(uploadDir, 0o755); err != nil {
		log.Fatalf("cannot create uploads dir: %v", err)
	}

	q = &Queue{}
	bc = NewBroadcaster(q)
	go bc.Run()

	mux := http.NewServeMux()
	mux.HandleFunc("/", handleIndex)
	mux.HandleFunc("/stream", handleStream)
	mux.HandleFunc("/events", handleSSE)
	mux.HandleFunc("/api/status", handleStatus)
	mux.HandleFunc("/api/queue", handleQueue)
	mux.HandleFunc("/api/queue/reorder", handleReorder)
	mux.HandleFunc("/api/queue/", handleQueueItem)
	mux.HandleFunc("/api/skip", handleSkip)
	mux.HandleFunc("/api/loop", handleLoop)
	mux.HandleFunc("/api/upload", handleUpload)
	mux.HandleFunc("/api/tts", handleTTS)

	addr := ":7000"
	log.Printf("admin  → http://localhost%s", addr)
	log.Printf("stream → http://localhost%s/stream", addr)
	log.Fatal(http.ListenAndServe(addr, mux))
}

// ── Page ─────────────────────────────────────────────────────────────────────

func handleIndex(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != "/" {
		http.NotFound(w, r)
		return
	}
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Write(indexPage)
}

// ── Stream ───────────────────────────────────────────────────────────────────

func handleStream(w http.ResponseWriter, r *http.Request) {
	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "streaming not supported", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "audio/mpeg")
	w.Header().Set("Cache-Control", "no-cache, no-store")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	ch := bc.Subscribe()
	defer bc.Unsubscribe(ch)

	log.Printf("+ listener %s (total: %d)", r.RemoteAddr, bc.ListenerCount())
	defer log.Printf("- listener %s (total: %d)", r.RemoteAddr, bc.ListenerCount()-1)

	for {
		select {
		case chunk, ok := <-ch:
			if !ok {
				return
			}
			if _, err := w.Write(chunk); err != nil {
				return
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

	ch := bc.subscribeSSE()
	defer bc.unsubscribeSSE(ch)

	fmt.Fprintf(w, "data: update\n\n")
	flusher.Flush()

	for {
		select {
		case _, ok := <-ch:
			if !ok {
				return
			}
			fmt.Fprintf(w, "data: update\n\n")
			flusher.Flush()
		case <-r.Context().Done():
			return
		}
	}
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
		if body.Title == "" {
			body.Title = body.Source
		}
		t := q.Add(Track{Title: body.Title, Source: body.Source})
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
		os.Remove(dest)
		http.Error(w, "failed to save", http.StatusInternalServerError)
		return
	}

	title := strings.TrimSuffix(header.Filename, filepath.Ext(header.Filename))
	t := q.Add(Track{ID: id, Title: title, Source: dest, IsFile: true})
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
	if body.APIKey == "" {
		http.Error(w, "api_key required", http.StatusBadRequest)
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
	req.Header.Set("xi-api-key", body.APIKey)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "audio/mpeg")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		http.Error(w, "elevenlabs unreachable", http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		msg, _ := io.ReadAll(io.LimitReader(resp.Body, 512))
		http.Error(w, fmt.Sprintf("elevenlabs %d: %s", resp.StatusCode, string(msg)), http.StatusBadGateway)
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
		os.Remove(dest)
		http.Error(w, "failed to save", http.StatusInternalServerError)
		return
	}

	label := strings.TrimSpace(body.Text)
	if len([]rune(label)) > 60 {
		label = string([]rune(label)[:60]) + "…"
	}
	t := q.Add(Track{ID: id, Title: "TTS: " + label, Source: dest, IsFile: true})
	bc.notify()

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(t)
}
