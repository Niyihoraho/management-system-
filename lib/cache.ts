import Redis from 'ioredis'
import { Redis as UpstashRedis } from '@upstash/redis'

type CacheSetOptions = {
  ttlSeconds?: number
}

type CacheBackend = {
  get(key: string): Promise<string | null>
  set(key: string, value: string, options?: CacheSetOptions): Promise<void>
  del(key: string): Promise<void>
}

type GlobalWithCache = typeof globalThis & {
  __cacheClient?: Redis
}

const upstashUrl = process.env.UPSTASH_REDIS_REST_URL
const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN
const redisUrl = process.env.REDIS_URL ?? process.env.CACHE_URL

const globalForCache = globalThis as GlobalWithCache

// ── Upstash REST backend (best for Vercel/serverless) ───────────────────────
const createUpstashBackend = (url: string, token: string): CacheBackend => {
  const client = new UpstashRedis({ url, token })

  return {
    async get(key) {
      const value = await client.get<string>(key)
      return value ?? null
    },
    async set(key, value, options) {
      if (options?.ttlSeconds && options.ttlSeconds > 0) {
        await client.set(key, value, { ex: options.ttlSeconds })
      } else {
        await client.set(key, value)
      }
    },
    async del(key) {
      // Support wildcard patterns for cacheDel('entity:*')
      if (key.includes('*')) {
        const keys = await client.keys(key)
        if (keys.length > 0) {
          await client.del(...keys)
        }
      } else {
        await client.del(key)
      }
    },
  }
}

// ── ioredis backend (for self-hosted Redis) ──────────────────────────────────
const createRedisBackend = (url: string): CacheBackend => {
  const client =
    globalForCache.__cacheClient ??
    new Redis(url, { lazyConnect: true, maxRetriesPerRequest: 1 })

  if (!globalForCache.__cacheClient) {
    globalForCache.__cacheClient = client
  }

  const ensureConnected = async () => {
    if (client.status === 'wait' || client.status === 'end') {
      await client.connect().catch(() => { })
    }
  }

  return {
    async get(key) {
      await ensureConnected()
      return client.get(key)
    },
    async set(key, value, options) {
      await ensureConnected()
      if (options?.ttlSeconds && options.ttlSeconds > 0) {
        await client.set(key, value, 'EX', options.ttlSeconds)
      } else {
        await client.set(key, value)
      }
    },
    async del(key) {
      await ensureConnected()
      if (key.includes('*')) {
        const keys = await client.keys(key)
        if (keys.length > 0) {
          await client.del(...keys)
        }
      } else {
        await client.del(key)
      }
    },
  }
}

// ── In-memory backend (fallback — resets on restart) ────────────────────────
const createInMemoryBackend = (): CacheBackend => {
  type Entry = { value: string; expiresAt?: number }
  const store = new Map<string, Entry>()

  const sweep = () => {
    const now = Date.now()
    for (const [key, entry] of store.entries()) {
      if (entry.expiresAt && entry.expiresAt <= now) store.delete(key)
    }
  }

  return {
    async get(key) {
      sweep()
      const entry = store.get(key)
      if (!entry) return null
      if (entry.expiresAt && entry.expiresAt <= Date.now()) {
        store.delete(key)
        return null
      }
      return entry.value
    },
    async set(key, value, options) {
      const expiresAt = options?.ttlSeconds
        ? Date.now() + options.ttlSeconds * 1000
        : undefined
      store.set(key, { value, expiresAt })
    },
    async del(key) {
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
const backend: CacheBackend =
  upstashUrl && upstashToken
    ? createUpstashBackend(upstashUrl, upstashToken)   // Upstash REST (serverless)
    : redisUrl
      ? createRedisBackend(redisUrl)                      // ioredis (self-hosted)
      : createInMemoryBackend()                           // fallback

const serialize = (value: unknown) => JSON.stringify(value)
const deserialize = <T>(value: string | null): T | null =>
  value ? (JSON.parse(value) as T) : null

export const cacheGet = async <T>(key: string): Promise<T | null> => {
  if (!key) return null
  const hit = await backend.get(key)
  return deserialize<T>(hit)
}

export const cacheSet = async <T>(
  key: string,
  value: T,
  options?: CacheSetOptions
) => {
  if (!key) return
  await backend.set(key, serialize(value), options)
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
    if (cached) return cached
  }
  const value = await loader()
  if (!preferPrimary) await cacheSet(key, value, options)
  return value
}
