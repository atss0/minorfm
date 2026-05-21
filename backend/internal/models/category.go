package models

type Category struct {
	ID          uint   `gorm:"primaryKey;autoIncrement" json:"id"`
	Name        string `gorm:"uniqueIndex;not null;size:100" json:"name"`
	Slug        string `gorm:"uniqueIndex;not null;size:100" json:"slug"`
	Icon        string `gorm:"size:50" json:"icon"`
	Description string `gorm:"size:500" json:"description"`
	Order       int    `gorm:"column:sort_order;default:0" json:"order"`
}
