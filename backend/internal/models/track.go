package models

import (
	"time"

	"github.com/google/uuid"
)

type Track struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	Title     string    `gorm:"not null;size:255" json:"title"`
	Artist    string    `gorm:"size:255" json:"artist"`
	CoverURL  string    `gorm:"size:500" json:"cover_url"`
	StreamURL string    `gorm:"not null;size:500" json:"stream_url"`
	Duration  int       `gorm:"not null" json:"duration"` // seconds
	Order     int       `gorm:"default:0" json:"order"`
	CreatedAt time.Time `json:"created_at"`
}
