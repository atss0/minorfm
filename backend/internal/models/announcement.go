package models

import (
	"time"

	"github.com/google/uuid"
)

type Announcement struct {
	ID        uuid.UUID  `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	Body      string     `gorm:"type:text;not null"                            json:"body"`
	URL       string     `gorm:"size:500"                                      json:"url,omitempty"`
	Active    bool       `gorm:"default:true;index"                            json:"active"`
	ExpiresAt *time.Time `                                                     json:"expires_at,omitempty"`
	CreatedAt time.Time  `json:"created_at"`
	UpdatedAt time.Time  `json:"updated_at"`
}
