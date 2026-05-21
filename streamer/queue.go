package main

import (
	"crypto/rand"
	"fmt"
	"sync"
)

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

func newID() string {
	b := make([]byte, 8)
	rand.Read(b)
	return fmt.Sprintf("%x", b)
}

func (q *Queue) Add(t Track) Track {
	if t.ID == "" {
		t.ID = newID()
	}
	q.mu.Lock()
	q.tracks = append(q.tracks, t)
	q.mu.Unlock()
	return t
}

func (q *Queue) Remove(id string) (Track, bool) {
	q.mu.Lock()
	defer q.mu.Unlock()
	for i, t := range q.tracks {
		if t.ID == id {
			q.tracks = append(q.tracks[:i], q.tracks[i+1:]...)
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
