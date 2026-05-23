#!/bin/sh
set -e
chown -R streamer:streamer /app/uploads 2>/dev/null || true
exec su-exec streamer "$@"
