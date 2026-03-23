# CLAUDE.md — GBUR Management System

> **Project memory file.** This document gives AI assistants permanent context about the project so they can provide accurate, consistent help across every conversation.

---

## 1. Project Overview

**Name:** GBUR Management System (`m-system`)
**Description:** A full-stack management platform for **Groupe Biblique Universitaire du Rwanda (GBUR)**. It manages students, graduates, universities, regions, small groups, properties, financial support, activity reports, and role-based administrative workflows.

**Production URL:** `https://my-ministry.gburwanda.com`
**Repo name:** `management-system-`

### Core Domain Entities

| Entity | Purpose |
|---|---|
| **Region** | Top-level geographic/organizational unit |
| **University** | Educational institution belonging to a region |
| **SmallGroup** | Sub-unit within a university and region |
| **GraduateSmallGroup** | Post-graduation cell groups organized by province |
| **Student** | Active university member (can migrate, become alumni) |
| **Graduate** | Alumni member with financial support tracking |
| **Property** | Physical assets tracked per region |
| **Report / Activity** | Strategic priority reports with evaluation scoring |
| **InvitationLink** | Time-limited registration links (student or graduate) |
| **RegistrationRequest** | Public self-registration requests requiring approval |

### Role Hierarchy (`RoleScope` enum)

```
superadmin → national → region → university → smallgroup → graduatesmallgroup
```

Each role is scoped to a specific entity (region, university, small group, or graduate group). A user can hold **multiple roles** simultaneously.

---

## 2. Tech Stack

### Core Framework
| Layer | Technology | Version |
|---|---|---|
| **Framework** | Next.js (App Router) | 15.x |
| **Runtime** | React | 19.x |
| **Language** | TypeScript | 5.x |
| **Bundler** | Turbopack | (via `--turbopack` flag) |
| **Build output** | Standalone (`output: 'standalone'`) | — |

### Database & ORM
| Tool | Details |
|---|---|
| **ORM** | Prisma 6.x |
| **Database** | PostgreSQL (Supabase primary → Neon read replica) |
| **Prisma Client output** | `lib/generated/prisma/` |
| **Binary targets** | `native`, `rhel-openssl-3.0.x` |
| **Read/Write split** | `prisma` (write) / `prismaReplica` (read) via `lib/prisma.ts` |
| **Replication** | Supabase → Neon logical replication (see `Makefile`, `docs/ONE_WAY_REPLICATION.md`) |

### Authentication & Authorization
| Tool | Details |
|---|---|
| **Auth library** | NextAuth v5 (beta 25) with Prisma Adapter |
| **Strategy** | JWT sessions (40 min max age, 5 min refresh) |
| **Provider** | Credentials (email + bcrypt password) |
| **Middleware** | `middleware.ts` — protects `/dashboard` and `/links` routes |
| **Sign-in page** | Root `/` |
| **Role-based access** | Custom `RoleAccessProvider` + `role-based-access.tsx` component |
| **Session timeout** | 15 min idle timeout with warning modal (`use-idle-timeout.ts`) |
| **Public routes** | `/`, `/join/*`, `/api/auth/*` (no auth required) |

### Styling
| Tool | Details |
|---|---|
| **CSS framework** | Tailwind CSS v4 with `@tailwindcss/postcss` |
| **Animations** | `tw-animate-css`, Framer Motion |
| **UI Components** | shadcn/ui (Radix UI primitives + `components.json`) |
| **Utility function** | `cn()` from `lib/utils.ts` (clsx + tailwind-merge) |
| **Font** | Geist (loaded via Google Fonts in `globals.css`) |
| **Theme** | Dark blue-gray design system with CSS custom properties |
| **Component library paths** | `app/components/ui/` and `components/ui/` |

### Caching & Infrastructure
| Tool | Details |
|---|---|
| **Cache** | Upstash Redis + ioredis (`lib/cache.ts`) |
| **Email** | Nodemailer with Mustache templates (`lib/email.ts`, `templates/`) |
| **PDF generation** | jsPDF + html2canvas, Puppeteer Core (with `@sparticuz/chromium-min`) |
| **File uploads** | Cloudinary (configured in `next.config.ts` image patterns) |
| **Charts** | Recharts |
| **Data export** | xlsx (SheetJS) |
| **Validation** | Zod v4 (`lib/data-validation.ts`) |
| **HTTP client** | Axios |
| **Notifications** | Sonner (toast notifications) |

---

## 3. Project Structure

```
m-system/
├── app/                        # Next.js App Router
│   ├── api/                    # API route handlers (30+ resource directories)
│   │   ├── auth/               # NextAuth route handlers
│   │   ├── students/           # Student CRUD
│   │   ├── graduates/          # Graduate CRUD
│   │   ├── reports/            # Report generation
│   │   ├── validation/         # Server-side validation endpoints
│   │   └── ...                 # regions, universities, small-groups, etc.
│   ├── components/             # App-scoped components
│   │   ├── ui/                 # shadcn/ui primitives (36+ components)
│   │   ├── providers/          # Context providers (auth, role, session, ID)
│   │   ├── public/             # Public-facing registration forms
│   │   ├── reporting/          # Report-related components
│   │   └── statistics/         # Statistics/charts components
│   ├── dashboard/              # Dashboard pages
│   ├── links/                  # Admin panel pages
│   │   ├── admin/              # Admin management (reports, migrations, etc.)
│   │   ├── organization/       # Org structure pages
│   │   └── people/             # People management pages
│   ├── join/                   # Public registration routes (no auth required)
│   ├── globals.css             # Global styles + Tailwind config + theme
│   ├── layout.tsx              # Root layout with providers
│   └── page.tsx                # Login / landing page
├── components/                 # Shared/root-level components
│   └── ui/                     # Additional shadcn/ui components
├── hooks/                      # Custom React hooks
│   ├── use-data-fetch.tsx      # Data fetching hook
│   ├── use-hierarchical-navigation.tsx
│   ├── use-idle-timeout.ts     # Session idle timeout
│   ├── use-mobile.ts           # Mobile detection
│   ├── use-sidebar-cache.tsx   # Sidebar data caching
│   └── use-user-scope.ts      # Current user scope resolution
├── lib/                        # Shared utilities and services
│   ├── auth.ts                 # NextAuth configuration
│   ├── prisma.ts               # Prisma client (read/write split)
│   ├── cache.ts                # Redis caching layer
│   ├── email.ts                # Email service (Nodemailer + Mustache)
│   ├── data-validation.ts      # Zod schemas for validation
│   ├── rls.ts                  # Row-level security helpers
│   ├── rls-middleware.ts       # RLS middleware
│   ├── generate-pdf.ts         # PDF generation
│   ├── utils.ts                # cn() utility
│   ├── generated/prisma/       # Auto-generated Prisma client (DO NOT EDIT)
│   └── services/               # Business logic services
├── prisma/
│   ├── schema.prisma           # Database schema (745 lines, 40+ models)
│   └── seed-reporting.ts       # Reporting seed data
├── types/
│   ├── api.ts                  # API response types
│   └── next-auth.d.ts          # NextAuth type augmentations
├── templates/                  # Email templates (Mustache)
├── docs/                       # Internal documentation
├── scripts/                    # Utility scripts
├── middleware.ts               # Next.js edge middleware (auth guards)
├── next.config.ts              # Next.js configuration
├── Makefile                    # Supabase → Neon replication commands
└── package.json
```

---

## 4. Key Commands

### Development
```bash
npm run dev              # Start dev server with Turbopack
npm run build            # Generate Prisma client + build with Turbopack
npm run start            # Start production server
npm run lint             # Run ESLint
npm run lint:fix         # Auto-fix lint issues
npm run type-check       # TypeScript type checking (tsc --noEmit)
```

### Deployment
```bash
npm run build:production      # Production build (NODE_ENV=production)
npm run build:ci              # CI build (npm ci + production build)
npm run prepare-deploy        # Prepare deployment artifacts
npm run build-for-deploy      # Build + prepare deployment
npm run deploy                # Execute deploy.sh
```

### Database
```bash
npx prisma generate           # Regenerate Prisma client
npx prisma db push             # Push schema to database
npx prisma migrate dev         # Create + run migrations
npx prisma studio              # Open Prisma Studio GUI
```

### Replication (Makefile)
```bash
make replication-precheck              # Verify WAL settings
make replication-create-role           # Create replication role on Supabase
make replication-create-publication    # Create publication on Supabase
make replication-create-subscription   # Create subscription on Neon
make replication-verify                # Check replication status
make replication-drop-subscription     # Tear down replication
```

---

## 5. Coding Style Guide

### TypeScript Conventions
- **Strict mode** is enabled in `tsconfig.json`
- Use `type` imports where possible: `import type { Foo } from './bar'`
- Prefix unused variables/args with `_` (configured in ESLint)
- Enums come from Prisma — import from `@/lib/generated/prisma`
- Path aliases: `@/*` maps to project root, `@/components/*` maps to both `./app/components/*` and `./components/*`

### Component Patterns
- **Client components**: Must have `"use client"` directive at the top
- **Server components**: Default (no directive needed)
- **File naming**: kebab-case for files (e.g., `add-user-modal.tsx`, `use-data-fetch.tsx`)
- **Component naming**: PascalCase for component names (e.g., `StudentForm`, `GraduateTable`)
- **Modals follow the pattern**: `add-*-modal.tsx`, `edit-*-modal.tsx`, `delete-*-modal.tsx`
- **UI primitives live in**: `app/components/ui/` (shadcn/ui standard)
- **Toast notifications**: Use Sonner (`sonner`) — do not use native `alert()`

### API Route Patterns
- Routes live in `app/api/[resource]/route.ts`
- Use standard REST methods: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`
- Always validate inputs with Zod schemas from `lib/data-validation.ts`
- Return typed `NextResponse.json()` responses
- Auth check: Use `auth()` from `lib/auth.ts` to verify sessions in API routes

### Prisma & Database
- **Always use `prisma` (write) or `prismaReplica` (read)** from `lib/prisma.ts`
- **Never** import `PrismaClient` directly — use the singleton
- Prisma client is generated to `lib/generated/prisma/` — **never edit generated files**
- Schema maps model names to lowercase table names via `@@map()`
- Use `include` for relations, not manual joins
- All BigInt IDs (location tables: Province, District, Sector, Cell, Village) — handle serialization carefully

### Styling Rules
- Use Tailwind CSS v4 utility classes (imported via `@import "tailwindcss"`)
- Combine classes with `cn()` from `lib/utils.ts`
- Use CSS custom properties for the theme (defined in `globals.css`)
- The project uses a **dark blue-gray theme** by default — maintain this aesthetic
- Animation: Prefer Framer Motion for complex animations, `tw-animate-css` for simple Tailwind animations

### Form Handling
- Use React Hook Form + `@hookform/resolvers` with Zod for form validation
- Validation schemas are defined in `lib/data-validation.ts`
- Public registration forms: `student-registration-form.tsx`, `graduate-registration-form.tsx`, `migrate-registration-form.tsx`

---

## 6. Environment Variables

The project expects these environment variables (via `.env`):

```env
# Database
DATABASE_URL=            # Primary Supabase PostgreSQL connection (pooled)
DIRECT_URL=              # Direct connection (non-pooled, for migrations)
REPLICA_DATABASE_URL=    # Neon read replica (optional)

# Auth
NEXTAUTH_SECRET=         # JWT signing secret
NEXTAUTH_URL=            # Base URL (e.g., https://my-ministry.gburwanda.com)

# Email
SMTP_HOST=               # Mail server host
SMTP_PORT=               # Mail server port
SMTP_USER=               # Mail credentials
SMTP_PASS=

# Cloudinary (image uploads)
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Redis (caching)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

---

## 7. Important Context & Conventions

### Architecture Decisions
1. **Read/Write Split**: The app uses Supabase as the primary (write) database and Neon as a read replica via logical replication. Use `prismaReplica` for read-heavy operations and `prisma` for writes.
2. **Standalone Output**: `next.config.ts` sets `output: 'standalone'` for containerized deployments. Prisma client files must be included via `outputFileTracingIncludes`.
3. **Row-Level Security (RLS)**: The project has RLS helpers (`lib/rls.ts`, `lib/rls-middleware.ts`) for scoping data access based on user roles.
4. **Build Tolerance**: ESLint and TypeScript errors are **ignored during builds** (`ignoreDuringBuilds: true`, `ignoreBuildErrors: true`). This is intentional for deployment resilience, but always aim for clean code.
5. **Console removal in production**: `compiler.removeConsole` strips `console.log()` and `console.info()` in production, keeping only `console.error()` and `console.warn()`.

### Session & Auth Rules
- Session timeout: 40 minutes max age, refreshed every 5 minutes
- Idle timeout: 15 minutes with a warning modal asking the user to continue or log out
- The idle timeout **does not apply** to public registration forms
- Login redirects via `middleware.ts` to root `/`
- Auth redirect callback always resolves to the production domain `my-ministry.gburwanda.com`

### Data Model Gotchas
- **User `id` is a `String`** (not auto-increment) — it comes from NextAuth
- **Location tables** (`Province`, `District`, `Sector`, `Cell`, `Village`) use **`BigInt`** IDs — need `Number()` conversion when passing to components
- **Graduate `servingPillars`** is a Prisma **enum array** (`GraduatePillar[]`) — not a relation
- **Students have lifecycle statuses**: `active → migrating → inactive → mobilized → alumning`
- **Registration requests** store form data as `Json` (`payload` field)

### What NOT to Do
- ❌ **Don't** create new Prisma client instances — always import from `lib/prisma.ts`
- ❌ **Don't** edit files in `lib/generated/` — they are auto-generated by Prisma
- ❌ **Don't** use `alert()` or `window.confirm()` — use Sonner toasts or Radix AlertDialog
- ❌ **Don't** hardcode database URLs — always use environment variables
- ❌ **Don't** add `console.log()` for debugging in production code — use `console.error()` or `console.warn()`
- ❌ **Don't** bypass the role-based access system — always scope data by user roles
- ❌ **Don't** make API calls without auth checks — always verify the session first

### Provider Wrapping Order (Root Layout)
```tsx
<AuthProvider>          {/* NextAuth SessionProvider + SessionTimeoutWarning */}
  <RoleAccessProvider>  {/* Role-based access context */}
    <IdProvider>        {/* Stable ID generation (prevents hydration mismatches) */}
      {children}
    </IdProvider>
  </RoleAccessProvider>
</AuthProvider>
```

---

## 8. Documentation

Internal documentation lives in `docs/`:
- `ONE_WAY_REPLICATION.md` — Supabase → Neon replication setup guide
- `REPLICATION_MIGRATION_PROGRESS.md` — Replication migration tracking
- `RLS_TESTING_GUIDE.md` — Row-level security testing procedures
- `DASHBOARD_SCOPE_DISPLAY.md` — Dashboard scoping behavior
- `gatekeeper-progress.md` — Gatekeeper feature progress
