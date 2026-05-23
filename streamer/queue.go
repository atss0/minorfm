package main

import (
	"crypto/rand"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"os"
	"sync"
)

const maxQueueSize = 200

var errQueueFull = errors.New("queue full")

type Track struct {
	ID     string `json:"id"`
	Title  string `json:"title"`
	Source string `json:"source"`
	IsFile bool   `json:"is_file"`
}

type Queue struct {
	mu     sync.RWMutex
	tracks []Track
}

const queueFile = "./queue.json"

func newID() string {
	b := make([]byte, 8)
	if _, err := rand.Read(b); err != nil {
		log.Fatalf("crypto/rand failed: %v", err)
	}
	return fmt.Sprintf("%x", b)
}

func (q *Queue) save() {
	q.mu.RLock()
	data, _ := json.Marshal(q.tracks)
	q.mu.RUnlock()
	os.WriteFile(queueFile, data, 0o644)
}

func LoadQueue() *Queue {
	q := &Queue{}
	data, err := os.ReadFile(queueFile)
	if err != nil {
		return q
	}
	if err := json.Unmarshal(data, &q.tracks); err != nil {
		log.Printf("queue.json parse error: %v", err)
	}
	return q
}

func (q *Queue) Add(t Track) (Track, error) {
	if t.ID == "" {
		t.ID = newID()
	}
	q.mu.Lock()
	if len(q.tracks) >= maxQueueSize {
		q.mu.Unlock()
		return Track{}, errQueueFull
	}
	q.tracks = append(q.tracks, t)
	q.mu.Unlock()
	go q.save()
	return t, nil
}

func (q *Queue) Prepend(t Track) (Track, error) {
	if t.ID == "" {
		t.ID = newID()
	}
	q.mu.Lock()
	if len(q.tracks) >= maxQueueSize {
		q.mu.Unlock()
		return Track{}, errQueueFull
	}
	q.tracks = append([]Track{t}, q.tracks...)
	q.mu.Unlock()
	go q.save()
	return t, nil
}

func (q *Queue) Remove(id string) (Track, bool) {
	q.mu.Lock()
	defer q.mu.Unlock()
	for i, t := range q.tracks {
		if t.ID == id {
			q.tracks = append(q.tracks[:i], q.tracks[i+1:]...)
			go q.save()
			return t, true
		}
	}
	return Track{}, false
}

func (q *Queue) Reorder(ids []string) bool {
	q.mu.Lock()
	defer q.mu.Unlock()
	if len(ids) != len(q.tracks) {
		return false
	}
	idx := make(map[string]Track, len(q.tracks))
	for _, t := range q.tracks {
		idx[t.ID] = t
	}
	next := make([]Track, 0, len(ids))
	for _, id := range ids {
		t, ok := idx[id]
		if !ok {
			return false
		}
		next = append(next, t)
	}
	q.tracks = next
	go q.save()
	return true
}

func (q *Queue) Pop() *Track {
	q.mu.Lock()
	defer q.mu.Unlock()
	if len(q.tracks) == 0 {
		return nil
	}
	t := q.tracks[0]
	q.tracks = q.tracks[1:]
	go q.save()
	return &t
}

func (q *Queue) List() []Track {
	q.mu.RLock()
	defer q.mu.RUnlock()
	out := make([]Track, len(q.tracks))
	copy(out, q.tracks)
	return out
}

func (q *Queue) Len() int {
	q.mu.RLock()
	defer q.mu.RUnlock()
	return len(q.tracks)
}
