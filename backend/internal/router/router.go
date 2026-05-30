package router

import (
	"context"

	wsconn "github.com/gofiber/contrib/websocket"
	"github.com/gofiber/fiber/v2"
	fiberSwagger "github.com/swaggo/fiber-swagger"
	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"

	_ "github.com/atss0/minorfm/docs"
	"github.com/atss0/minorfm/internal/config"
	"github.com/atss0/minorfm/internal/handlers"
	"github.com/atss0/minorfm/internal/mailer"
	"github.com/atss0/minorfm/internal/middleware"
	"github.com/atss0/minorfm/internal/models"
	"github.com/atss0/minorfm/internal/radio"
	"github.com/atss0/minorfm/internal/storage"
	"github.com/atss0/minorfm/internal/ws"
)

func healthHandler(db *gorm.DB, rdb *redis.Client) fiber.Handler {
	return func(c *fiber.Ctx) error {
		sqlDB, err := db.DB()
		if err != nil {
			return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{"status": "unhealthy", "error": "db unavailable"})
		}
		if err := sqlDB.Ping(); err != nil {
			return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{"status": "unhealthy", "error": "db ping failed"})
		}
		if err := rdb.Ping(context.Background()).Err(); err != nil {
			return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{"status": "unhealthy", "error": "redis ping failed"})
		}
		return c.JSON(fiber.Map{"status": "ok"})
	}
}

func Setup(app *fiber.App, db *gorm.DB, rdb *redis.Client, cfg *config.Config) {
	// Health check (before any auth middleware)
	app.Get("/health", healthHandler(db, rdb))

	chatHub := ws.NewHub(rdb, db)
	radioHub := ws.NewRadioHub(rdb)
	notifHub := ws.NewNotificationHub(rdb)
	sched := radio.NewScheduler(db, rdb)

	var r2Store *storage.R2Store
	if cfg.R2AccountID != "" {
		r2Store = storage.NewR2Store(
			cfg.R2AccountID,
			cfg.R2AccessKeyID,
			cfg.R2SecretAccessKey,
			cfg.R2BucketName,
			cfg.R2PublicURL,
		)
	}

	h := &handlers.Handler{
		DB:        db,
		RDB:       rdb,
		Cfg:       cfg,
		Hub:       chatHub,
		RadioHub:  radioHub,
		NotifHub:  notifHub,
		Scheduler: sched,
		Storage:   r2Store,
		Mailer:    mailer.New(cfg.ResendAPIKey, cfg.ResendFrom),
	}

	// Background services
	go radioHub.Run(context.Background())
	go sched.Run(context.Background())

	protected := middleware.JWTProtected(cfg, rdb, db)
	adminOrMod := middleware.RequireRole(models.RoleAdmin, models.RoleModerator)
	adminOnly := middleware.RequireRole(models.RoleAdmin)

	wsUpgrade := func(c *fiber.Ctx) error {
		if wsconn.IsWebSocketUpgrade(c) {
			return c.Next()
		}
		return fiber.ErrUpgradeRequired
	}

	api := app.Group("/api")

	authLimit := middleware.AuthLimiter()
	globalLimit := middleware.GlobalLimiter()
	api.Use(globalLimit)

	// auth
	auth := api.Group("/auth")
	auth.Post("/register", authLimit, h.Register)
	auth.Post("/login", authLimit, h.Login)
	auth.Post("/refresh", authLimit, h.Refresh)
	auth.Post("/logout", protected, h.Logout)
	auth.Post("/forgot-password", authLimit, h.ForgotPassword)
	auth.Post("/reset-password", authLimit, h.ResetPassword)

	// Swagger UI
	app.Get("/swagger/*", fiberSwagger.WrapHandler)

	// me (session-cached current user)
	api.Get("/me", protected, h.GetMe)

	// users
	users := api.Group("/users")
	users.Get("/online", h.GetOnlineUsers)
	users.Get("/:username", middleware.JWTOptional(cfg), h.GetProfile)
	users.Put("/me", protected, h.UpdateMe)
	users.Put("/me/password", protected, h.UpdatePassword)
	users.Post("/:id/follow", protected, h.FollowUser)
	users.Get("/:id/followers", h.GetFollowers)
	users.Get("/:id/following", h.GetFollowing)

	// categories
	categories := api.Group("/categories")
	categories.Get("/", h.GetCategories)
	categories.Get("/:slug", h.GetCategory)

	// posts
	posts := api.Group("/posts")
	posts.Get("/", h.GetPosts)
	posts.Get("/:id", h.GetPost)
	posts.Post("/", protected, h.CreatePost)
	posts.Put("/:id", protected, h.UpdatePost)
	posts.Delete("/:id", protected, h.DeletePost)
	posts.Post("/:id/like", protected, h.LikePost)
	posts.Post("/:id/bookmark", protected, h.BookmarkPost)
	posts.Get("/:id/comments", h.GetComments)
	posts.Post("/:id/comments", protected, h.CreateComment)
	posts.Delete("/:id/comments/:comment_id", protected, h.DeleteComment)
	posts.Post("/:id/comments/:comment_id/like", protected, h.LikeComment)
	// Poll routes (per post)
	posts.Get("/:id/poll", h.GetPollByPost)
	posts.Post("/:id/poll", protected, h.CreatePoll)

	// Polls (by poll ID)
	polls := api.Group("/polls")
	polls.Post("/:id/vote", protected, h.VotePoll)
	polls.Get("/:id/results", h.GetPollResults)

	// collections & bookmarks
	api.Get("/me/bookmarks", protected, h.GetBookmarks)
	api.Get("/me/collections/:name", protected, h.GetCollectionByName)
	api.Get("/collections/curated", h.GetCuratedCollection)

	// notifications
	notifs := api.Group("/notifications", protected)
	notifs.Get("/", h.GetNotifications)
	notifs.Put("/read-all", h.MarkAllRead)
	notifs.Put("/:id/read", h.MarkRead)

	// media upload
	api.Post("/media/avatar", protected, h.UploadAvatar)
	api.Post("/media/upload", protected, h.UploadMedia)

	// recordings
	recordings := api.Group("/recordings")
	recordings.Get("/", h.GetRecordings)
	recordings.Post("/", protected, h.CreateRecording)
	recordings.Delete("/:id", protected, h.DeleteRecording)

	// search
	api.Get("/search", h.Search)

	// chat REST
	chat := api.Group("/chat")
	chat.Get("/rooms", h.GetRooms)
	chat.Get("/rooms/:room_id/messages", h.GetRoomMessages)

	// DM REST
	dm := api.Group("/dm", protected)
	dm.Get("/rooms", h.GetDMRooms)
	dm.Post("/rooms", h.CreateDMRoom)

	// radio REST
	radioGroup := api.Group("/radio")
	radioGroup.Get("/current", h.GetRadioCurrent)
	radioGroup.Get("/queue", h.GetRadioQueue)

	// admin (admin + moderator)
	admin := api.Group("/admin", protected, adminOrMod)
	admin.Get("/stats", h.AdminGetStats)

	// users
	admin.Get("/users", h.AdminGetUsers)
	admin.Post("/users/:id/ban", h.AdminBanUser)
	admin.Delete("/users/:id/ban", h.AdminUnbanUser)

	// posts
	admin.Get("/posts", h.AdminGetPosts)
	admin.Delete("/posts/:id", h.AdminDeletePost)
	admin.Put("/posts/:id/pin", h.AdminPinPost)

	// comments
	admin.Get("/comments", h.AdminGetComments)
	admin.Delete("/comments/:id", h.AdminDeleteComment)

	// categories
	admin.Post("/categories", h.AdminCreateCategory)
	admin.Put("/categories/:id", h.AdminUpdateCategory)
	admin.Delete("/categories/:id", h.AdminDeleteCategory)

	// radio
	admin.Post("/radio/tracks", h.AddRadioTrack)
	admin.Delete("/radio/tracks/:id", h.AdminDeleteTrack)
	admin.Put("/radio/tracks/:id/order", h.AdminUpdateTrackOrder)
	admin.Post("/radio/skip", h.AdminSkipTrack)

	// announcements
	admin.Post("/announcements", h.AdminCreateAnnouncement)
	admin.Put("/announcements/:id", h.AdminUpdateAnnouncement)

	// admin-only actions
	adminOnlyGroup := api.Group("/admin", protected, adminOnly)
	adminOnlyGroup.Put("/users/:id/role", h.AdminUpdateUserRole)
	adminOnlyGroup.Delete("/users/:id", h.AdminDeleteUser)

	// Invites (admin + mod can generate; public validate endpoint for register page)
	admin.Post("/invites", h.AdminCreateInvite)
	admin.Get("/invites", h.AdminListInvites)
	admin.Delete("/invites/:id", h.AdminRevokeInvite)
	api.Get("/invites/:code/validate", h.ValidateInvite)

	// public: active announcement for banner
	api.Get("/announcements/active", h.GetActiveAnnouncement)

	// WebSocket: chat (requires auth via cookie/header/token param)
	app.Get("/ws/chat/:room_id", h.WSAuth, h.ChatWS(chatHub))

	// WebSocket: radio (public broadcast)
	app.Get("/ws/radio", wsUpgrade, h.RadioWS())

	// WebSocket: notifications (requires auth via cookie/header/token param)
	app.Get("/ws/notifications", h.WSAuth, h.NotificationWS(notifHub))
}
