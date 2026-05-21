package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

type PostType string

const (
	PostTypeArticle PostType = "article"
	PostTypePoll    PostType = "poll"
	PostTypeVideo   PostType = "video"
	PostTypeEmbed   PostType = "embed"
	PostTypeLink    PostType = "link"
	PostTypeGallery PostType = "gallery"
)

type Post struct {
	ID           uuid.UUID      `gorm:"type:uuid;primaryKey" json:"id"`
	UserID       uuid.UUID      `gorm:"type:uuid;not null" json:"user_id"`
	User         User           `gorm:"foreignKey:UserID" json:"user,omitempty"`
	CategoryID   uint           `gorm:"not null" json:"category_id"`
	Category     Category       `gorm:"foreignKey:CategoryID" json:"category,omitempty"`
	Title        string         `gorm:"not null;size:255" json:"title"`
	Body         string         `gorm:"type:text" json:"body"`
	PostType     PostType       `gorm:"type:varchar(20);default:'article'" json:"post_type"`
	Metadata     datatypes.JSON `gorm:"type:jsonb" json:"metadata,omitempty"`
	LikeCount    int            `gorm:"default:0"     json:"like_count"`
	CommentCount int            `gorm:"default:0"     json:"comment_count"`
	Pinned       bool           `gorm:"default:false" json:"pinned"`
	PinnedAt     *time.Time     `                     json:"pinned_at,omitempty"`
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`
}
