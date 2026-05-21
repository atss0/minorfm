package models

import (
	"time"

	"github.com/google/uuid"
)

type Invite struct {
	ID        uuid.UUID  `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	Code      string     `gorm:"uniqueIndex;size:32;not null"                  json:"code"`
	CreatedBy uuid.UUID  `gorm:"type:uuid;not null"                            json:"created_by"`
	Creator   User       `gorm:"foreignKey:CreatedBy"                          json:"creator,omitempty"`
	UsedBy    *uuid.UUID `gorm:"type:uuid"                                     json:"used_by,omitempty"`
	UsedByUser *User     `gorm:"foreignKey:UsedBy"                             json:"used_by_user,omitempty"`
	UsedAt    *time.Time `                                                     json:"used_at,omitempty"`
	ExpiresAt *time.Time `                                                     json:"expires_at,omitempty"`
	CreatedAt time.Time  `                                                     json:"created_at"`
}
