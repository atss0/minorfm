package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/datatypes"
)

type Notification struct {
	ID        uuid.UUID      `gorm:"type:uuid;primaryKey" json:"id"`
	UserID    uuid.UUID      `gorm:"type:uuid;not null;index" json:"user_id"`
	Type      string         `gorm:"type:varchar(50);not null" json:"type"`
	Payload   datatypes.JSON `gorm:"type:jsonb" json:"payload,omitempty"`
	Read      bool           `gorm:"default:false" json:"read"`
	CreatedAt time.Time      `json:"created_at"`
}
