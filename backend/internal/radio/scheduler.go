package radio

import (
	"context"
	"encoding/json"
	"log"
	"time"

	"github.com/atss0/minorfm/internal/models"
	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
)

const (
	StateKey   = "radio:state"
	PubChannel = "radio:updates"
)

// State holds the current radio broadcast state stored in Redis.
type State struct {
	Track     *models.Track `json:"track"`
	StartedAt time.Time     `json:"started_at"`
	IsPlaying bool          `json:"is_playing"`
}

type Scheduler struct {
	db  *gorm.DB
	rdb *redis.Client
}

func NewScheduler(db *gorm.DB, rdb *redis.Client) *Scheduler {
	return &Scheduler{db: db, rdb: rdb}
}

// Run is the main loop: waits for the current track to finish, then advances.
func (s *Scheduler) Run(ctx context.Context) {
	for {
		state, err := s.GetState(ctx)
		if err != nil || state == nil || state.Track == nil {
			select {
			case <-time.After(5 * time.Second):
				continue
			case <-ctx.Done():
				return
			}
		}

		// Duration == 0 means live stream — never auto-advance; only a manual skip moves it
		if state.Track.Duration == 0 {
			select {
			case <-ctx.Done():
				return
			case <-time.After(30 * time.Second):
				// Re-check state in case it was updated externally
				continue
			}
		}

		elapsed := time.Since(state.StartedAt)
		remaining := time.Duration(state.Track.Duration)*time.Second - elapsed

		if remaining <= 0 {
			if err := s.Advance(ctx); err != nil {
				log.Printf("radio: advance error: %v", err)
				time.Sleep(time.Second)
			}
			continue
		}

		select {
		case <-time.After(remaining):
			if err := s.Advance(ctx); err != nil {
				log.Printf("radio: advance error: %v", err)
			}
		case <-ctx.Done():
			return
		}
	}
}

// GetState reads the current radio state from Redis.
func (s *Scheduler) GetState(ctx context.Context) (*State, error) {
	raw, err := s.rdb.Get(ctx, StateKey).Result()
	if err != nil {
		return nil, err
	}
	var state State
	if err := json.Unmarshal([]byte(raw), &state); err != nil {
		return nil, err
	}
	return &state, nil
}

// Advance picks the next track in the DB queue and starts it.
func (s *Scheduler) Advance(ctx context.Context) error {
	var tracks []models.Track
	if err := s.db.Order(`"order" ASC, created_at ASC`).Find(&tracks).Error; err != nil {
		return err
	}
	if len(tracks) == 0 {
		return s.setState(ctx, &State{IsPlaying: false})
	}

	nextIdx := 0
	if cur, _ := s.GetState(ctx); cur != nil && cur.Track != nil {
		for i, t := range tracks {
			if t.ID == cur.Track.ID {
				nextIdx = (i + 1) % len(tracks)
				break
			}
		}
	}

	t := tracks[nextIdx]
	return s.setState(ctx, &State{
		Track:     &t,
		StartedAt: time.Now(),
		IsPlaying: true,
	})
}

// Start begins playback if nothing is currently playing.
func (s *Scheduler) Start(ctx context.Context) error {
	if state, _ := s.GetState(ctx); state != nil && state.Track != nil {
		return nil
	}
	return s.Advance(ctx)
}

func (s *Scheduler) setState(ctx context.Context, state *State) error {
	data, err := json.Marshal(state)
	if err != nil {
		return err
	}
	if err := s.rdb.Set(ctx, StateKey, string(data), 0).Err(); err != nil {
		return err
	}
	return s.rdb.Publish(ctx, PubChannel, string(data)).Err()
}
