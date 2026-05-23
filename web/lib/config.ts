// Fails loudly in production if the required env var is absent rather than
// silently falling back to localhost and appearing to work while broken.
const raw = process.env.NEXT_PUBLIC_API_URL

if (!raw && process.env.NODE_ENV === 'production') {
  throw new Error(
    'NEXT_PUBLIC_API_URL env değişkeni tanımlanmamış. ' +
    'Dockerfile veya .env.production dosyasına ekleyin.',
  )
}

export const API_BASE = raw ?? 'http://localhost:8080'

// Strips a trailing /api path segment if present, then swaps http→ws.
// Used by WebSocket hooks that connect to the root WS endpoint, not /api.
export const WS_BASE = API_BASE.replace(/\/api\/?$/, '').replace(/^http/, 'ws')
