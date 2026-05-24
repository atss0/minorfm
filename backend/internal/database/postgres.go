package database

import (
	"github.com/atss0/minorfm/internal/models"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func NewPostgres(dsn string) (*gorm.DB, error) {
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
	if err != nil {
		return nil, err
	}

	if err := db.AutoMigrate(
		&models.User{},
		&models.Category{},
		&models.Post{},
		&models.Follow{},
		&models.Like{},
		&models.Bookmark{},
		&models.ChatRoom{},
		&models.ChatMessage{},
		&models.Track{},
		&models.Comment{},
		&models.Notification{},
		&models.Poll{},
		&models.PollOption{},
		&models.PollVote{},
		&models.Invite{},
		&models.Announcement{},
		&models.Recording{},
	); err != nil {
		return nil, err
	}

	// Ensure performance-critical indexes that GORM doesn't create automatically.
	indexes := []string{
		"CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id)",
		"CREATE INDEX IF NOT EXISTS idx_posts_category_id ON posts(category_id)",
		"CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC)",
		"CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id)",
		"CREATE INDEX IF NOT EXISTS idx_chat_messages_room_id ON chat_messages(room_id)",
		"CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id)",
	}
	for _, idx := range indexes {
		if err := db.Exec(idx).Error; err != nil {
			return nil, err
		}
	}

	seedCategories(db)

	return db, nil
}

func seedCategories(db *gorm.DB) {
	type row struct {
		name, slug, icon, desc string
		order                  int
	}
	cats := []row{
		{"hiperfokus", "hiperfokus", "👁", "Görsel odak ve keşif", 1},
		{"dipses", "dipses", "🎧", "Müzik ve ses dünyası", 2},
		{"sinemaskop", "sinemaskop", "🎬", "Film ve sinema", 3},
		{"okuryazar", "okuryazar", "✏️", "Yazı ve okuma", 4},
		{"sualite", "sualite", "⚡", "Tartışma ve soru-cevap", 5},
		{"hemfikir", "hemfikir", "🙌", "Anketler ve oylamalar", 6},
		{"sinedump", "sinedump", "🎞", "Film sahneleri ve kareler", 7},
		{"koleksiyon", "koleksiyon", "✨", "Editörün seçkileri", 8},
	}
	for _, c := range cats {
		db.Where(models.Category{Slug: c.slug}).
			FirstOrCreate(&models.Category{
				Name:        c.name,
				Slug:        c.slug,
				Icon:        c.icon,
				Description: c.desc,
				Order:       c.order,
			})
	}
}
