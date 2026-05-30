package config

import (
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	DatabaseURL    string
	RedisURL       string
	JWTSecret      string
	Port           string
	AllowedOrigins string

	// Cloudflare R2
	R2AccountID       string
	R2AccessKeyID     string
	R2SecretAccessKey string
	R2BucketName      string
	R2PublicURL       string

	// Resend (for transactional emails)
	ResendAPIKey string
	ResendFrom   string
	AppURL       string

	// OneSignal push notifications
	OneSignalAppID  string
	OneSignalAPIKey string
}

func Load() *Config {
	godotenv.Load()
	return &Config{
		DatabaseURL:    getEnv("DATABASE_URL", "postgres://postgres:password@localhost:5432/minorfm?sslmode=disable"),
		RedisURL:       getEnv("REDIS_URL", "redis://localhost:6379"),
		JWTSecret:      getEnv("JWT_SECRET", "dev-secret-key-change-in-production"),
		Port:           getEnv("PORT", "8080"),
		AllowedOrigins: getEnv("ALLOWED_ORIGINS", "*"),

		R2AccountID:       getEnv("R2_ACCOUNT_ID", ""),
		R2AccessKeyID:     getEnv("R2_ACCESS_KEY_ID", ""),
		R2SecretAccessKey: getEnv("R2_SECRET_ACCESS_KEY", ""),
		R2BucketName:      getEnv("R2_BUCKET_NAME", "minorfm"),
		R2PublicURL:       getEnv("R2_PUBLIC_URL", ""),

		ResendAPIKey: getEnv("RESEND_API_KEY", ""),
		ResendFrom:   getEnv("RESEND_FROM", "MINOR.fm <noreply@minor.fm>"),
		AppURL:       getEnv("APP_URL", "http://localhost:3000"),

		OneSignalAppID:  getEnv("ONESIGNAL_APP_ID", "cd627586-9de2-4400-88f2-dad2d6c4a059"),
		OneSignalAPIKey: getEnv("ONESIGNAL_API_KEY", ""),
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
