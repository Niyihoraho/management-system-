# Database Architecture: Redis + Supabase + Neon Backup

## Overview

This system uses a **2-layer read architecture** with a **dual nightly backup**:

```
┌─────────────────────────────────────────────────────────────┐
│  Application (Next.js API Routes)                           │
│                                                             │
│  READ:  Redis (hit?) ──yes──▶ return cached data            │
│             │ no                                            │
│             └──▶ Supabase (read + populate Redis cache)     │
│                                                             │
│  WRITE: Supabase (primary) ──▶ cacheDel(Redis keys)         │
└─────────────────────────────────────────────────────────────┘
                          │
              (nightly pg_dump at 2 AM UTC)
                    ┌─────┴──────┐
                    ▼            ▼
           GitHub Artifact    Neon DB
           (.dump file,     (restore copy,
           30-day keep)     query-ready)
```

---

## Why This Architecture

| Concern | Solution |
|---|---|
| Supabase free tier has limited connections | Redis absorbs most read traffic |
| Need data backup | Dual backup: GitHub artifact + Neon |
| Supabase free tier IPv6-only | Not an issue — no live replication needed |
| Read-after-write consistency | `x-read-after-write: 1` header bypasses cache → reads Supabase directly |
| GitHub Actions free minutes | Nightly job only ≈ 60 min/month (limit: 2,000) |

---

## Read Path Detail

### Cache Hit (fastest — milliseconds)
```
Client → GET /api/students → Redis hit → return data
```

### Cache Miss (normal — ~50ms to Supabase)
```
Client → GET /api/students → Redis miss → Supabase → cache → return data
```

### Read After Write (guaranteed fresh — forces Supabase)
```
Client sends header: x-read-after-write: 1
→ Skips Redis entirely
→ Reads directly from Supabase
→ Does NOT populate cache (next read re-populates)
```

---

## Write Path

Every write handler:
1. Calls `prisma.model.create/update/delete` → goes to **Supabase**
2. Calls `cacheDel('entity:*')` → instantly invalidates stale Redis keys
3. Returns the fresh result to the client
4. Client sets `x-read-after-write: 1` on the next read if it needs the fresh data immediately

---

## Cache TTL Policy

| Cache Keys | TTL | Reason |
|---|---|---|
| `reports:<userId>` | 120s | Report data, moderately dynamic |
| `students:list:*` | 120s | List views, changes on CRUD |
| `graduates:list:*` | 120s | List views |
| `financial-support:*` | 120s | Support records |
| `universities:list:*` | 300s | University list, infrequent changes |
| `gbu-data:*` | 300s | Annual stats data |
| `reporting-config` | 600s | Config data, rarely changes |
| `regions:*` | 3600s | Reference data |
| `provinces:*` | 3600s | Reference data |
| `locations:*` | 3600s | Reference data |

---

## Dual Backup System

### Backup 1 — GitHub Actions Artifact

- **What**: Full `pg_dump --format=custom` of Supabase
- **When**: Every night at 2:00 AM UTC
- **Retention**: 30 days (configurable in workflow)
- **How to restore**:
  ```bash
  # Download artifact from GitHub Actions tab
  pg_restore --host=<target> --dbname=<db> --clean backup-YYYY-MM-DD.dump
  ```

### Backup 2 — Neon Database

- **What**: Same dump, restored into Neon via `pg_restore`
- **When**: Same nightly run (immediately after dump)
- **Use cases**:
  - Point-in-time restore from last night's snapshot
  - Run analytics queries without hitting Supabase production
  - Emergency read-only access if Supabase is down
- **How to restore to Supabase**:
  ```bash
  pg_dump $NEON_DSN | psql $SUPABASE_DSN
  ```

### GitHub Secrets Required

Add these in: **GitHub repo → Settings → Secrets and variables → Actions**

```
SUPABASE_DB_HOST       db.xxxx.supabase.co
SUPABASE_DB_USER       postgres
SUPABASE_DB_NAME       postgres
SUPABASE_DB_PASSWORD   <your password>

NEON_DB_HOST           ep-xxxx.eu-central-1.aws.neon.tech
NEON_DB_USER           neondb_owner
NEON_DB_NAME           neondb
NEON_DB_PASSWORD       <your password>
```

> See `.github/BACKUP_SECRETS_TEMPLATE.env` for the full list.

---

## lib/prisma.ts Routing

```typescript
// REPLICA_DATABASE_URL not set → both read and write go to Supabase
getPrismaClient('read')   // → Supabase (REPLICA_DATABASE_URL unset)
getPrismaClient('write')  // → Supabase (always)

// Future upgrade: set REPLICA_DATABASE_URL to a live read replica
// and getPrismaClient('read') will automatically route there
```

---

## Future Upgrade Path

If you ever need a **live read replica** (e.g., after upgrading Supabase to Pro):

1. Enable IPv4 on Supabase Pro (adds network accessibility)
2. Run on Neon:
   ```sql
   CREATE SUBSCRIPTION supabase_to_neon
   CONNECTION 'host=db.xxx.supabase.co dbname=postgres user=neon_replication password=xxx'
   PUBLICATION supabase_to_neon;
   ```
3. Set `REPLICA_DATABASE_URL=<neon-connection-string>` in `.env`
4. `getPrismaClient('read')` immediately starts routing to Neon — **no other code changes needed**

The `supabase_to_neon` publication is already created on Supabase from the earlier setup. ✅
