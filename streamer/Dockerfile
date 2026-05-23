FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o streamer .

FROM alpine:3.21
RUN apk add --no-cache ca-certificates ffmpeg wget su-exec
RUN adduser -D -u 1001 streamer
WORKDIR /app
COPY --from=builder /app/streamer .
RUN mkdir -p /app/uploads && chown -R streamer:streamer /app
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
VOLUME ["/app/uploads"]
EXPOSE 7000
HEALTHCHECK --interval=15s --timeout=5s --start-period=5s \
    CMD wget -qO- http://localhost:7000/api/status || exit 1
ENTRYPOINT ["/entrypoint.sh"]
CMD ["./streamer"]
