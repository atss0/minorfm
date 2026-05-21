package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type UserRole string

const (
	RoleUser      UserRole = "user"
	RoleModerator UserRole = "moderator"
	RoleAdmin     UserRole = "admin"
)

type User struct {
	ID           uuid.UUID      `gorm:"type:uuid;primaryKey" json:"id"`
	Username     string         `gorm:"uniqueIndex;not null;size:50" json:"username"`
	Email        string         `gorm:"uniqueIndex;not null;size:255" json:"email"`
	PasswordHash string         `gorm:"not null" json:"-"`
	AvatarURL    string         `gorm:"size:500" json:"avatar_url"`
	Bio          string         `gorm:"size:500" json:"bio"`
	Role         UserRole       `gorm:"type:varchar(20);default:'user'" json:"role"`
	BannedAt     *time.Time     `gorm:"index"                          json:"banned_at,omitempty"`
	BanExpiresAt *time.Time     `                                      json:"ban_expires_at,omitempty"`
	BanReason    string         `gorm:"size:500"                       json:"ban_reason,omitempty"`
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`
}
