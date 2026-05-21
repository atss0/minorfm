//go:build integration

// Integration tests require a real PostgreSQL and Redis instance.
// Run with: go test -tags=integration ./internal/integration/... -v
// Environment variables: DATABASE_URL, REDIS_URL (defaults to localhost)
package integration

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/atss0/minorfm/internal/config"
	"github.com/atss0/minorfm/internal/database"
	"github.com/atss0/minorfm/internal/handlers"
	"github.com/atss0/minorfm/internal/mailer"
	"github.com/atss0/minorfm/internal/middleware"
	"github.com/atss0/minorfm/internal/models"
	"github.com/gofiber/fiber/v2"
)

func setupIntegrationApp(t *testing.T) (*fiber.App, *handlers.Handler, func()) {
	t.Helper()

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgres://postgres:password@localhost:5432/minorfm_test?sslmode=disable"
	}
	redisURL := os.Getenv("REDIS_URL")
	if redisURL == "" {
		redisURL = "redis://localhost:6379"
	}

	db, err := database.NewPostgres(dbURL)
	if err != nil {
		t.Fatalf("postgres: %v", err)
	}

	rdb, err := database.NewRedis(redisURL)
	if err != nil {
		t.Fatalf("redis: %v", err)
	}

	cfg := &config.Config{
		JWTSecret: "integration-test-secret",
		AppURL:    "http://localhost:3000",
	}

	h := &handlers.Handler{
		DB:     db,
		RDB:    rdb,
		Cfg:    cfg,
		Mailer: mailer.New("", ""),
	}

	protected := middleware.JWTProtected(cfg, rdb)

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
	app.Get("/api/posts", h.GetPosts)
	app.Post("/api/posts", protected, h.CreatePost)
	app.Get("/api/users/:username", h.GetProfile)

	cleanup := func() {
		// Clean up test data
		db.Exec("DELETE FROM users WHERE email LIKE '%@integration-test.com'")
		if sqlDB, err := db.DB(); err == nil {
			sqlDB.Close()
		}
		rdb.Close()
	}

	return app, h, cleanup
}

func TestIntegration_RegisterAndLogin(t *testing.T) {
	app, _, cleanup := setupIntegrationApp(t)
	defer cleanup()

	email := fmt.Sprintf("user-%d@integration-test.com", testing.Verbose())

	// Register
	regBody, _ := json.Marshal(map[string]string{
		"username": "inttest_user",
		"email":    email,
		"password": "password123",
	})
	req := httptest.NewRequest("POST", "/api/auth/register", bytes.NewReader(regBody))
	req.Header.Set("Content-Type", "application/json")
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("register request: %v", err)
	}
	if resp.StatusCode != fiber.StatusCreated {
		t.Errorf("register: expected 201, got %d", resp.StatusCode)
	}

	// Login
	loginBody, _ := json.Marshal(map[string]string{
		"email":    email,
		"password": "password123",
	})
	req2 := httptest.NewRequest("POST", "/api/auth/login", bytes.NewReader(loginBody))
	req2.Header.Set("Content-Type", "application/json")
	resp2, err := app.Test(req2)
	if err != nil {
		t.Fatalf("login request: %v", err)
	}
	if resp2.StatusCode != fiber.StatusOK {
		t.Errorf("login: expected 200, got %d", resp2.StatusCode)
	}

	var loginResult map[string]interface{}
	json.NewDecoder(resp2.Body).Decode(&loginResult)
	if _, ok := loginResult["access_token"]; !ok {
		t.Error("expected access_token in login response")
	}
}

func TestIntegration_CreateAndGetPost(t *testing.T) {
	app, h, cleanup := setupIntegrationApp(t)
	defer cleanup()

	// Create a category for the test
	cat := models.Category{Name: "Integration Test", Slug: "integration-test", Order: 99}
	h.DB.FirstOrCreate(&cat, models.Category{Slug: "integration-test"})

	// Register a user to get a token
	email := fmt.Sprintf("poster@integration-test.com")
	regBody, _ := json.Marshal(map[string]string{
		"username": "inttest_poster",
		"email":    email,
		"password": "password123",
	})
	regReq := httptest.NewRequest("POST", "/api/auth/register", bytes.NewReader(regBody))
	regReq.Header.Set("Content-Type", "application/json")
	app.Test(regReq) //nolint

	loginBody, _ := json.Marshal(map[string]string{"email": email, "password": "password123"})
	loginReq := httptest.NewRequest("POST", "/api/auth/login", bytes.NewReader(loginBody))
	loginReq.Header.Set("Content-Type", "application/json")
	loginResp, _ := app.Test(loginReq)

	var loginResult map[string]interface{}
	json.NewDecoder(loginResp.Body).Decode(&loginResult)
	token, _ := loginResult["access_token"].(string)
	if token == "" {
		t.Skip("could not obtain token")
	}

	// Create post
	postBody, _ := json.Marshal(map[string]interface{}{
		"title":       "Integration Test Post",
		"body":        "Test body content",
		"category_id": cat.ID,
		"post_type":   "article",
	})
	postReq := httptest.NewRequest("POST", "/api/posts", bytes.NewReader(postBody))
	postReq.Header.Set("Content-Type", "application/json")
	postReq.Header.Set("Authorization", "Bearer "+token)
	postResp, err := app.Test(postReq)
	if err != nil {
		t.Fatalf("create post: %v", err)
	}
	if postResp.StatusCode != fiber.StatusCreated {
		t.Errorf("expected 201, got %d", postResp.StatusCode)
	}

	// Get posts
	getReq := httptest.NewRequest("GET", "/api/posts", nil)
	getResp, err := app.Test(getReq)
	if err != nil {
		t.Fatalf("get posts: %v", err)
	}
	if getResp.StatusCode != fiber.StatusOK {
		t.Errorf("expected 200, got %d", getResp.StatusCode)
	}
}
