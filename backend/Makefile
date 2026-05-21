.PHONY: dev build run test tidy docker-up docker-down

dev:
	air

build:
	go build -o bin/api ./cmd/api

run:
	go run ./cmd/api

test:
	go test ./...

tidy:
	go mod tidy

docker-up:
	docker-compose up -d

docker-down:
	docker-compose down

docker-logs:
	docker-compose logs -f api
