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
	"github.com/atss0/minorfm/internal/mailer"
	"github.com/atss0/minorfm/internal/models"
	"github.com/glebarez/sqlite"
	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var dbCounter atomic.Int64

func setupTestApp(t *testing.T) (*fiber.App, *handlers.Handler) {
	t.Helper()

	n := dbCounter.Add(1)
	dsn := fmt.Sprintf("file:auth%d?mode=memory&cache=shared", n)
	db, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{Logger: logger.Discard})
	if err != nil {
		t.Fatalf("failed to open in-memory sqlite: %v", err)
	}
	db.AutoMigrate(&models.User{})
	t.Cleanup(func() {
		if sqlDB, err := db.DB(); err == nil {
			sqlDB.Close()
		}
	})

	cfg := &config.Config{
		JWTSecret: "test-secret",
		AppURL:    "http://localhost:3000",
	}

	h := &handlers.Handler{
		DB:     db,
		Cfg:    cfg,
		Mailer: mailer.New("", ""),
	}

	app := fiber.New(fiber.Config{
		ErrorHandler: func(c *fiber.Ctx, err error) error {
			code := fiber.StatusInternalServerError
			if e, ok := err.(*fiber.Error); ok {
				code = e.Code
			}
			return c.Status(code).JSON(fiber.Map{"error": err.Error()})
		},
	})

	app.Post("/api/auth/register", h.Register)
	app.Post("/api/auth/login", h.Login)

	return app, h
}

func TestRegister(t *testing.T) {
	app, _ := setupTestApp(t)

	body, _ := json.Marshal(map[string]string{
		"username": "testuser",
		"email":    "test@example.com",
		"password": "password123",
	})

	req := httptest.NewRequest("POST", "/api/auth/register", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")

	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	if resp.StatusCode != fiber.StatusCreated {
		var errBody map[string]interface{}
		json.NewDecoder(resp.Body).Decode(&errBody)
		t.Errorf("expected 201, got %d: %v", resp.StatusCode, errBody)
	}
}

func TestRegister_DuplicateEmail(t *testing.T) {
	app, _ := setupTestApp(t)

	body, _ := json.Marshal(map[string]string{
		"username": "user1",
		"email":    "dup@example.com",
		"password": "password123",
	})

	req1 := httptest.NewRequest("POST", "/api/auth/register", bytes.NewReader(body))
	req1.Header.Set("Content-Type", "application/json")
	app.Test(req1) //nolint

	body2, _ := json.Marshal(map[string]string{
		"username": "user2",
		"email":    "dup@example.com",
		"password": "password123",
	})
	req2 := httptest.NewRequest("POST", "/api/auth/register", bytes.NewReader(body2))
	req2.Header.Set("Content-Type", "application/json")
	resp, _ := app.Test(req2)

	if resp.StatusCode != fiber.StatusConflict {
		t.Errorf("expected 409 conflict, got %d", resp.StatusCode)
	}
}

func TestLogin(t *testing.T) {
	app, _ := setupTestApp(t)

	// Register first
	regBody, _ := json.Marshal(map[string]string{
		"username": "loginuser",
		"email":    "login@example.com",
		"password": "password123",
	})
	regReq := httptest.NewRequest("POST", "/api/auth/register", bytes.NewReader(regBody))
	regReq.Header.Set("Content-Type", "application/json")
	app.Test(regReq) //nolint

	// Then login
	loginBody, _ := json.Marshal(map[string]string{
		"email":    "login@example.com",
		"password": "password123",
	})
	req := httptest.NewRequest("POST", "/api/auth/login", bytes.NewReader(loginBody))
	req.Header.Set("Content-Type", "application/json")
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	if resp.StatusCode != fiber.StatusOK {
		t.Errorf("expected 200, got %d", resp.StatusCode)
	}

	var result map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&result)
	if _, ok := result["access_token"]; !ok {
		t.Error("expected access_token in response")
	}
}

func TestLogin_InvalidCredentials(t *testing.T) {
	app, _ := setupTestApp(t)

	body, _ := json.Marshal(map[string]string{
		"email":    "nobody@example.com",
		"password": "wrongpass",
	})
	req := httptest.NewRequest("POST", "/api/auth/login", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	resp, _ := app.Test(req)

	if resp.StatusCode != fiber.StatusUnauthorized {
		t.Errorf("expected 401, got %d", resp.StatusCode)
	}
}
