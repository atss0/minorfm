package models

import (
	"time"

	"github.com/google/uuid"
)

type ChatRoom struct {
	ID         uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	Name       string    `gorm:"not null;size:100" json:"name"`
	Slug       string    `gorm:"uniqueIndex;size:100" json:"slug"`
	Type       string    `gorm:"type:varchar(20);default:'global'" json:"type"`
	CategoryID *uint     `json:"category_id,omitempty"`
	CreatedAt  time.Time `json:"created_at"`
}

// ChatMessage stores a string room_id (slug or UUID) for flexibility.
type ChatMessage struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	RoomID    string    `gorm:"type:varchar(100);not null;index" json:"room_id"`
	UserID    uuid.UUID `gorm:"type:uuid;not null" json:"user_id"`
	User      User      `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Body      string    `gorm:"type:text;not null" json:"body"`
	CreatedAt time.Time `json:"created_at"`
}
