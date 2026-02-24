# Supabase → Neon Replication Migration Progress

## Strategy: Free-Tier 3-Layer Architecture

> WAL logical replication requires Supabase IPv4 (paid add-on). On free tier we use:
> **Redis** (write-through cache) → **Neon** (cron-synced replica) → **Supabase** (primary/fallback)

| Layer | Freshness | Latency |
|---|---|---|
| Redis | Instant (write-through) | ~1 ms |
| Neon (`m-system-replica`) | ≤5 min (GitHub Action cron) | ~10-50 ms |
| Supabase | Always fresh | ~80-200 ms |

**Upgrade path**: When on Supabase Pro, 1 SQL command activates WAL replication. The `supabase_to_neon` publication is already created on Supabase.

---

## Phase Status

| # | Phase | Status |
|---|---|---|
| 1 | Deep Analysis of API Routes | ✅ Complete |
| 2 | Database Configuration | ✅ Complete |
| 3 | Initialize Neon Schema + Data | ✅ Complete |
| 4 | Migrate Reporting & Dashboard Endpoints | ⏳ Next |
| 5 | Migrate Entity List Endpoints | 🔲 Pending |
| 6 | Cache Invalidation (Write-Through) | 🔲 Pending |
| 7 | GitHub Actions (sync + backup) | 🔲 Pending |
| 8 | Verification | 🔲 Pending |

---

## ✅ Phase 1 — Endpoint Catalog

### Read-Only GETs → Migrate to Neon + Redis

| Route | Action |
|---|---|
| `app/api/statistics/route.ts` | ✅ Already done |
| `app/api/reports/route.ts` | Add `getPrismaClient('read')` + cache |
| `app/api/reports/[id]/route.ts` | Add `getPrismaClient('read')` + cache |
| `app/api/reports/export/route.ts` | Point to read replica (heavy PDF query) |
| `app/api/reporting/config/route.ts` | Add `getPrismaClient('read')` + cache |
| `app/api/universities/route.ts` | Add `getPrismaClient('read')` + cache |
| `app/api/students/route.ts` | Add `getPrismaClient('read')` + cache |
| `app/api/graduates/route.ts` | Add `getPrismaClient('read')` + cache |
| `app/api/gbu-data/route.ts` | Add `getPrismaClient('read')` + cache |
| `app/api/financial-support/route.ts` | Add `getPrismaClient('read')` + cache |
| `app/api/regions/route.ts` | Add `getPrismaClient('read')` + long TTL |
| `app/api/provinces/route.ts` | Add `getPrismaClient('read')` + long TTL |
| `app/api/locations/route.ts` | Add `getPrismaClient('read')` + long TTL |
| `app/api/small-groups/route.ts` | Add `getPrismaClient('read')` + cache |
| `app/api/graduate-small-groups/route.ts` | Add `getPrismaClient('read')` + cache |
| `app/api/properties/route.ts` | Add `getPrismaClient('read')` + cache |
| `app/api/notifications/route.ts` | Add `getPrismaClient('read')` + short TTL |

### Write Endpoints → Add `cacheDel` After Each Mutation

| Route | Cache Keys to Invalidate |
|---|---|
| `app/api/universities/route.ts` (POST/PUT/DELETE) | `universities:*`, `stats:*` |
| `app/api/students/route.ts` (POST/PUT/DELETE) | `students:*`, `stats:*` |
| `app/api/graduates/route.ts` (POST/PUT/DELETE) | `graduates:*`, `financial-support:*` |
| `app/api/gbu-data/route.ts` (POST/PUT/DELETE) | `gbu-data:*`, `stats:*` |
| `app/api/financial-support/route.ts` (POST) | `financial-support:*` |
| `app/api/regions/route.ts` (POST/PUT/DELETE) | `regions:*`, `universities:*` |
| `app/api/reports/route.ts` (POST) | `reports:*` |
| `app/api/reporting/config/route.ts` (POST/PUT) | `reporting-config` |

### Stay on Supabase Primary Always

`app/api/auth/**`, `app/api/users/**`, `app/api/admin/**`, `app/api/import/**`, `app/api/register/**`, `app/api/invitations/**`

---

## ✅ Phase 2 — Database Configuration

- ✅ Supabase WAL verified: 5 replication slots, 5 WAL senders
- ✅ `neon_replication` role created on Supabase
- ✅ `supabase_to_neon` publication created on Supabase (FOR ALL TABLES)
- ✅ Neon project `m-system-replica` created (ID: `mute-cake-99657005`)
- ✅ Logical replication enabled on Neon
- ✅ `.env` updated with `REPLICA_DATABASE_URL`

---

## ✅ Phase 3 — Neon Schema Initialized

- ✅ All public schema tables created on Neon via Prisma schema DDL (applied via MCP)
- ✅ Initial data sync completed via MCP SQL

---

## ⏳ Phase 4 — Migrate Reporting & Dashboard Routes

- [ ] `app/api/reports/route.ts` GET → `getPrismaClient('read')` + cache
- [ ] `app/api/reports/[id]/route.ts` GET
- [ ] `app/api/reports/export/route.ts` POST (read-only queries)
- [ ] `app/api/reporting/config/route.ts` GET

---

## 🔲 Phase 5 — Migrate Entity List Routes

- [ ] Universities, GBU data
- [ ] Students, graduates
- [ ] Financial support
- [ ] Regions, provinces, locations, small groups

---

## 🔲 Phase 6 — Cache Invalidation

- [ ] Add `cacheDel` to all POST/PUT/DELETE handlers

---

## 🔲 Phase 7 — GitHub Actions

- [ ] `.github/workflows/sync-neon-replica.yml` — every 5 min cron sync
- [ ] `.github/workflows/pg-dump-backup.yml` — nightly backup

---

## 🔲 Phase 8 — Verification

- [ ] Test `x-read-after-write: 1` header routing
- [ ] Verify Redis cache hit/miss via logs
- [ ] Verify Neon data matches Supabase
