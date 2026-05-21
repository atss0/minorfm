package models

import (
	"time"

	"github.com/google/uuid"
)

type Follow struct {
	ID          uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	FollowerID  uuid.UUID `gorm:"type:uuid;not null;uniqueIndex:idx_follow" json:"follower_id"`
	FollowingID uuid.UUID `gorm:"type:uuid;not null;uniqueIndex:idx_follow" json:"following_id"`
	CreatedAt   time.Time `json:"created_at"`
}

type Like struct {
	ID           uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	UserID       uuid.UUID `gorm:"type:uuid;not null;uniqueIndex:idx_like" json:"user_id"`
	LikeableID   uuid.UUID `gorm:"type:uuid;not null;uniqueIndex:idx_like" json:"likeable_id"`
	LikeableType string    `gorm:"type:varchar(50);not null;uniqueIndex:idx_like" json:"likeable_type"`
	CreatedAt    time.Time `json:"created_at"`
}

type Bookmark struct {
	ID             uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	UserID         uuid.UUID `gorm:"type:uuid;not null;uniqueIndex:idx_bookmark" json:"user_id"`
	PostID         uuid.UUID `gorm:"type:uuid;not null;uniqueIndex:idx_bookmark" json:"post_id"`
	CollectionName string    `gorm:"type:varchar(100);default:'default'" json:"collection_name"`
	CreatedAt      time.Time `json:"created_at"`
}
