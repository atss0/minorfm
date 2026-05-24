package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Recording struct {
	ID        uuid.UUID      `gorm:"type:uuid;primaryKey" json:"id"`
	UserID    uuid.UUID      `gorm:"type:uuid;not null;index" json:"user_id"`
	User      User           `gorm:"foreignKey:UserID" json:"user,omitempty"`
	AudioURL  string         `gorm:"not null" json:"audio_url"`
	Duration  int            `gorm:"not null;default:0" json:"duration"` // seconds
	Title     *string        `gorm:"size:255" json:"title"`
	CreatedAt time.Time      `json:"created_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

func (r *Recording) BeforeCreate(tx *gorm.DB) error {
	if r.ID == uuid.Nil {
		r.ID = uuid.New()
	}
	return nil
}
