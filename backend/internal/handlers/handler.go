package handlers

import (
	"github.com/atss0/minorfm/internal/config"
	"github.com/atss0/minorfm/internal/mailer"
	"github.com/atss0/minorfm/internal/radio"
	"github.com/atss0/minorfm/internal/storage"
	"github.com/atss0/minorfm/internal/ws"
	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
)

type Handler struct {
	DB        *gorm.DB
	RDB       *redis.Client
	Cfg       *config.Config
	Hub       *ws.Hub
	RadioHub  *ws.RadioHub
	NotifHub  *ws.NotificationHub
	Scheduler *radio.Scheduler
	Storage   *storage.R2Store
	Mailer    *mailer.Mailer
}
