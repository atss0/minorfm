// @title MINOR.fm API
// @version 1.0
// @description MINOR.fm müzik ve kültür platformu REST API
// @contact.name API Destek
// @contact.email api@minor.fm
// @license.name MIT
// @host localhost:8080
// @BasePath /api
// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization

package main

import (
	"fmt"
	"log"
	"log/slog"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/atss0/minorfm/internal/config"
	"github.com/atss0/minorfm/internal/database"
	"github.com/atss0/minorfm/internal/router"
)

func main() {
	slog.SetDefault(slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	})))

	cfg := config.Load()

	if cfg.JWTSecret == "dev-secret-key-change-in-production" {
		log.Fatal("CRITICAL: JWT_SECRET ortam değişkeni tanımlanmamış. Uygulama durduruluyor.")
	}

	db, err := database.NewPostgres(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("postgres connection failed: %v", err)
	}

	rdb, err := database.NewRedis(cfg.RedisURL)
	if err != nil {
		log.Fatalf("redis connection failed: %v", err)
	}

	app := fiber.New(fiber.Config{
		BodyLimit:    50 * 1024 * 1024, // 50 MB (audio uploads)
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  120 * time.Second,
		ErrorHandler: func(c *fiber.Ctx, err error) error {
			code := fiber.StatusInternalServerError
			if e, ok := err.(*fiber.Error); ok {
				code = e.Code
			}
			return c.Status(code).JSON(fiber.Map{"error": err.Error()})
		},
	})

	app.Use(recover.New())
	app.Use(logger.New())

	// Security headers
	app.Use(func(c *fiber.Ctx) error {
		c.Set("X-Content-Type-Options", "nosniff")
		c.Set("X-Frame-Options", "DENY")
		c.Set("Referrer-Policy", "strict-origin-when-cross-origin")
		c.Set("Content-Security-Policy", "default-src 'none'")
		return c.Next()
	})

	app.Use(cors.New(cors.Config{
		AllowOrigins: cfg.AllowedOrigins,
		AllowHeaders: "Origin, Content-Type, Accept, Authorization, X-CSRF-Token",
		AllowMethods: "GET, POST, PUT, DELETE, OPTIONS",
	}))

	router.Setup(app, db, rdb, cfg)

	go func() {
		if err := app.Listen(fmt.Sprintf(":%s", cfg.Port)); err != nil {
			log.Fatalf("server error: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("shutting down server...")
	if err := app.Shutdown(); err != nil {
		log.Fatalf("shutdown error: %v", err)
	}
}
