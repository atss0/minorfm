package handlers_test

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http/httptest"
	"sync/atomic"
	"testing"

	"github.com/atss0/minorfm/internal/config"
	"github.com/atss0/minorfm/internal/handlers"
	"github.com/atss0/minorfm/internal/middleware"
	"github.com/atss0/minorfm/internal/models"
	"github.com/glebarez/sqlite"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var postDBCounter atomic.Int64

func setupPostApp(t *testing.T) (*fiber.App, *handlers.Handler) {
	t.Helper()

	n := postDBCounter.Add(1)
	dsn := fmt.Sprintf("file:post%d?mode=memory&cache=shared", n)
	db, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{Logger: logger.Discard})
	if err != nil {
		t.Fatalf("failed to open db: %v", err)
	}
	db.AutoMigrate(&models.User{}, &models.Category{}, &models.Post{}, &models.Like{}, &models.Bookmark{})
	t.Cleanup(func() {
		if sqlDB, err := db.DB(); err == nil {
			sqlDB.Close()
		}
	})

	cfg := &config.Config{JWTSecret: "test-secret"}
	h := &handlers.Handler{DB: db, Cfg: cfg}

	app := fiber.New(fiber.Config{
		ErrorHandler: func(c *fiber.Ctx, err error) error {
			code := fiber.StatusInternalServerError
			if e, ok := err.(*fiber.Error); ok {
				code = e.Code
			}
			return c.Status(code).JSON(fiber.Map{"error": err.Error()})
		},
	})

	protected := middleware.JWTProtected(cfg, nil)
	app.Get("/api/posts", h.GetPosts)
	app.Get("/api/posts/:id", h.GetPost)
	app.Post("/api/posts", protected, h.CreatePost)

	return app, h
}

func createTestUser(t *testing.T, db *gorm.DB) models.User {
	t.Helper()
	hash, _ := bcrypt.GenerateFromPassword([]byte("password123"), bcrypt.DefaultCost)
	user := models.User{
		Username:     "testuser-" + uuid.New().String()[:8],
		Email:        uuid.New().String() + "@example.com",
		PasswordHash: string(hash),
		Role:         models.RoleUser,
	}
	db.Create(&user)
	return user
}

func createTestCategory(t *testing.T, db *gorm.DB) models.Category {
	t.Helper()
	cat := models.Category{
		Name:  "Test Category",
		Slug:  "test-" + uuid.New().String()[:8],
		Order: 1,
	}
	db.Create(&cat)
	return cat
}

func TestGetPosts_Empty(t *testing.T) {
	app, _ := setupPostApp(t)

	req := httptest.NewRequest("GET", "/api/posts", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	if resp.StatusCode != fiber.StatusOK {
		t.Errorf("expected 200, got %d", resp.StatusCode)
	}

	var result map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&result)
	if _, ok := result["data"]; !ok {
		t.Error("expected data field in response")
	}
}

func TestCreatePost_Unauthorized(t *testing.T) {
	app, _ := setupPostApp(t)

	body, _ := json.Marshal(map[string]interface{}{
		"title":       "Test Post",
		"category_id": 1,
		"post_type":   "article",
	})
	req := httptest.NewRequest("POST", "/api/posts", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	resp, _ := app.Test(req)

	if resp.StatusCode != fiber.StatusUnauthorized {
		t.Errorf("expected 401, got %d", resp.StatusCode)
	}
}
