import { Redis as UpstashRedis } from '@upstash/redis'

type CacheSetOptions = {
  ttlSeconds?: number
}

const upstashUrl = process.env.UPSTASH_REDIS_REST_URL
const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN

// ── Upstash REST backend ─────────────────────────────────────────────────────
// Upstash SDK auto-serializes/deserializes values — do NOT double-stringify
const createUpstashBackend = (url: string, token: string) => {
  const client = new UpstashRedis({ url, token })

  return {
    async get<T>(key: string): Promise<T | null> {
      try {
        return await client.get<T>(key)
      } catch {
        return null
      }
    },
    async set<T>(key: string, value: T, options?: CacheSetOptions): Promise<void> {
      try {
        if (options?.ttlSeconds && options.ttlSeconds > 0) {
          await client.set(key, value, { ex: options.ttlSeconds })
        } else {
          await client.set(key, value)
        }
      } catch {
        // silently fail — cache is best-effort
      }
    },
    async del(key: string): Promise<void> {
      try {
        if (key.includes('*')) {
          const keys = await client.keys(key)
          if (keys.length > 0) {
            await client.del(...(keys as [string, ...string[]]))
          }
        } else {
          await client.del(key)
        }
      } catch {
        // silently fail
      }
    },
  }
}

// ── In-memory backend (fallback) ─────────────────────────────────────────────
const createInMemoryBackend = () => {
  type Entry = { value: unknown; expiresAt?: number }
  const store = new Map<string, Entry>()

  const sweep = () => {
    const now = Date.now()
    for (const [key, entry] of store.entries()) {
      if (entry.expiresAt && entry.expiresAt <= now) store.delete(key)
    }
  }

  return {
    async get<T>(key: string): Promise<T | null> {
      sweep()
      const entry = store.get(key)
      if (!entry) return null
      if (entry.expiresAt && entry.expiresAt <= Date.now()) {
        store.delete(key)
        return null
      }
      return entry.value as T
    },
    async set<T>(key: string, value: T, options?: CacheSetOptions): Promise<void> {
      const expiresAt = options?.ttlSeconds
        ? Date.now() + options.ttlSeconds * 1000
        : undefined
      store.set(key, { value, expiresAt })
    },
    async del(key: string): Promise<void> {
      if (key.includes('*')) {
        const pattern = new RegExp('^' + key.replace(/\*/g, '.*') + '$')
        for (const k of store.keys()) {
          if (pattern.test(k)) store.delete(k)
        }
      } else {
        store.delete(key)
      }
    },
  }
}

// ── Select backend ───────────────────────────────────────────────────────────
const backend =
  upstashUrl && upstashToken
    ? createUpstashBackend(upstashUrl, upstashToken)
    : createInMemoryBackend()

// ── Public API ───────────────────────────────────────────────────────────────
export const cacheGet = async <T>(key: string): Promise<T | null> => {
  if (!key) return null
  return backend.get<T>(key)
}

export const cacheSet = async <T>(
  key: string,
  value: T,
  options?: CacheSetOptions
) => {
  if (!key) return
  await backend.set(key, value, options)
}

export const cacheDel = async (key: string | string[]) => {
  if (!key) return
  if (Array.isArray(key)) {
    await Promise.all(key.map((k) => backend.del(k)))
    return
  }
  await backend.del(key)
}

export const withCache = async <T>(
  key: string,
  options: CacheSetOptions,
  loader: () => Promise<T>,
  preferPrimary = false
): Promise<T> => {
  if (!preferPrimary) {
    const cached = await cacheGet<T>(key)
    if (cached !== null) return cached
  }
  const value = await loader()
  if (!preferPrimary) await cacheSet(key, value, options)
  return value
}
