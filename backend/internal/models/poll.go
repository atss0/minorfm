package models

import (
	"time"

	"github.com/google/uuid"
)

type Poll struct {
	ID        uuid.UUID    `gorm:"type:uuid;primaryKey" json:"id"`
	PostID    uuid.UUID    `gorm:"type:uuid;not null;uniqueIndex" json:"post_id"`
	Options   []PollOption `gorm:"foreignKey:PollID" json:"options,omitempty"`
	CreatedAt time.Time    `json:"created_at"`
}

type PollOption struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	PollID    uuid.UUID `gorm:"type:uuid;not null;index" json:"poll_id"`
	Text      string    `gorm:"not null;size:255" json:"text"`
	VoteCount int       `gorm:"default:0" json:"vote_count"`
}

type PollVote struct {
	ID       uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	PollID   uuid.UUID `gorm:"type:uuid;not null;uniqueIndex:idx_poll_vote" json:"poll_id"`
	OptionID uuid.UUID `gorm:"type:uuid;not null" json:"option_id"`
	UserID   uuid.UUID `gorm:"type:uuid;not null;uniqueIndex:idx_poll_vote" json:"user_id"`
}
