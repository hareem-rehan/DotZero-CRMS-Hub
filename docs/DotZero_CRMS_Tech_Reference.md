# DotZero CR Portal — Technical Reference

**Version:** 2.1 | **Date:** April 2026 | **Confidential — Internal Use Only**

This document covers architecture, stack, conventions, file structure, and branding. For the product specification (what to build), see `DotZero_CRMS_Product_Spec.md`.

---

## 1. Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js v20 LTS + Express.js + TypeScript |
| Frontend | React 18 + Next.js (App Router) + TypeScript |
| Database | PostgreSQL 16 + Prisma ORM |
| Auth | NextAuth.js (frontend) + JWT middleware (backend API) |
| Client State | Zustand |
| Server State | React Query |
| Styling | Tailwind CSS (utility-first) |
| Validation | Zod (shared between client and server) |
| Email | SendGrid or Resend |
| Logging | Pino (structured JSON) |
| Error Tracking | Sentry |
| Metrics | Prometheus + Grafana |
| Testing | Jest, React Testing Library, Supertest, Playwright |
| CI/CD | GitHub Actions |
| Hosting — Frontend | Vercel |
| Hosting — Backend | PM2 on Node.js server |
| File Storage | S3 or Cloudflare R2 (object storage, not DB) |

---

## 2. Architecture

- Single repo: `client/` (Next.js), `server/` (Express), `shared/` (types, validators, constants)
- Backend follows **module-per-feature** pattern — each feature is a self-contained folder
- Frontend uses Next.js **App Router** with route groups for layout scoping
- API: REST, validated with Zod schemas shared between client and server
- Auth: NextAuth.js (frontend) + JWT middleware (backend API)
- DB access: Prisma Client only — no raw SQL unless performance-critical
- Shared code imported via `../shared` path aliases — no workspace packages needed
- Single `package.json` for the whole project

---

## 3. File Structure

```
dotzero-cr-portal/
│
├── client/                        # Next.js frontend
│   ├── public/                    # Static assets (logo.svg, favicon)
│   ├── src/
│   │   ├── app/                   # Next.js App Router
│   │   │   ├── (auth)/            # Login, register, accept-invite
│   │   │   ├── (admin)/           # Super Admin: projects, users, settings
│   │   │   ├── (dashboard)/       # Role-aware dashboard
│   │   │   ├── (client)/          # Client CR submission + tracking
│   │   │   ├── (dm)/              # DM: CR review + impact analysis
│   │   │   ├── (finance)/         # Finance: summaries, reports, filters
│   │   │   ├── api/               # BFF API routes
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   ├── components/
│   │   │   ├── ui/                # Button, Input, Modal, Badge, DataTable, SignatureCanvas, FileUpload, RichTextEditor
│   │   │   ├── forms/             # CrForm, ProjectForm, ImpactAnalysisForm
│   │   │   └── layouts/           # Sidebar, Navbar, PageWrapper
│   │   ├── hooks/                 # useAuth, useCr, useFilters, usePagination
│   │   ├── lib/                   # apiClient.ts, utils.ts, constants.ts
│   │   ├── styles/                # Global CSS, Tailwind config
│   │   ├── types/                 # Frontend-only types
│   │   └── store/                 # useAuthStore, useCrStore
│   ├── next.config.js
│   ├── tailwind.config.ts
│   └── tsconfig.json
│
├── server/                        # Express.js backend
│   ├── src/
│   │   ├── config/                # db.ts, env.ts, logger.ts
│   │   ├── modules/
│   │   │   ├── auth/              # Login, JWT, invite token verification, profile CRUD
│   │   │   ├── users/             # CRUD, role assignment
│   │   │   ├── projects/          # Project creation, DM/client assignment
│   │   │   ├── changeRequests/    # CR submission, status transitions
│   │   │   ├── impactAnalysis/    # DM analysis (structured + free-text)
│   │   │   ├── invitations/       # Generate + send invite links
│   │   │   ├── auditLog/          # SA-only audit log query endpoint
│   │   │   └── dashboard/         # Aggregated stats, filters
│   │   ├── middleware/            # auth.ts, errorHandler.ts, rateLimiter.ts, roleGuard.ts, validate.ts
│   │   ├── utils/
│   │   ├── app.ts                 # Express app setup
│   │   └── server.ts              # Entry point
│   └── tsconfig.json
│
├── shared/                        # Shared between client and server
│   ├── types/                     # User, Project, ChangeRequest, ImpactAnalysis
│   ├── validators/                # Zod schemas (crSchema, projectSchema, etc.)
│   └── constants/                 # Roles, CR statuses, currencies
│
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
│
├── docker/
│   ├── Dockerfile.client
│   ├── Dockerfile.server
│   └── docker-compose.yml
│
├── .github/workflows/
│   ├── ci.yml
│   └── deploy.yml
│
├── .env.example
├── .eslintrc.js
├── .prettierrc
├── tsconfig.base.json             # Base config extended by client/ and server/
├── package.json                   # Single package.json for the whole project
└── README.md
```

---

## 4. Backend Module Pattern

Every backend feature follows this exact structure:

```
modules/changeRequests/
├── changeRequests.controller.ts  # Route handlers — req/res only, no business logic
├── changeRequests.service.ts     # Business logic — calls Prisma, returns data
├── changeRequests.routes.ts      # Express router — maps paths to controller
├── changeRequests.validation.ts  # Zod schemas for request validation
└── changeRequests.test.ts        # Tests for this module
```

**Rule: Controller calls Service. Service calls Prisma. Never skip layers.**

---

## 5. File Naming Conventions

| Category | Convention | Example |
|----------|-----------|---------|
| All files | camelCase | `errorHandler.ts`, `authGuard.ts` |
| Module files | `[module].[role].ts` | `users.controller.ts`, `changeRequests.service.ts` |
| React components | PascalCase.tsx | `UserCard.tsx`, `SidebarNav.tsx` |
| Hooks | `use[Name].ts` | `useAuth.ts`, `usePagination.ts` |
| Types/interfaces | PascalCase | Prefix with `I` only when ambiguous |
| Zustand stores | `use[Name]Store.ts` | `useAuthStore.ts` |
| Variables/functions | camelCase | `getUserById`, `crStatus` |
| Test files | colocated | `[name].test.ts` or `[Name].test.tsx` |

---

## 6. Code Conventions

- **TypeScript strict mode** — no `any` unless explicitly justified with a comment
- **Zod for all validation** — API inputs, form data, env vars
- **Async/await** — no raw Promises or callbacks
- **Error handling**: Express global error middleware catches all; services throw typed errors
- **Imports**: absolute paths via `@/` alias in client and server; shared code via `@shared/` alias pointing to `../../shared`
- **No default exports** except Next.js pages/layouts (required by framework)
- **Env vars**: validated at startup via `config/env.ts` with Zod; crash early on missing vars
- **API responses**: consistent shape `{ success, data, error, meta }`
- **HTTP status codes**: 200 success, 201 created, 400 bad request, 401 unauthorized, 403 forbidden, 404 not found, 500 internal
- **Logging**: structured JSON via Pino; log levels: error, warn, info, debug

---

## 7. API Pattern

```
[METHOD] /api/v1/[resource]
```

Plural nouns, versioned. Examples:

- `GET /api/v1/users`
- `POST /api/v1/auth/login`
- `PATCH /api/v1/users/:id`

All responses follow this shape:

```typescript
interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: string | null;
  meta: {
    page?: number;
    pageSize?: number;
    total?: number;
  } | null;
}
```

---

## 8. Security Checklist

- All passwords hashed with bcrypt (min cost factor 12)
- HTTPS enforced everywhere
- SQL injection protection via Prisma parameterised queries
- XSS protection via input sanitisation on all rich-text fields
- All API routes protected by JWT middleware
- Role-based access enforced server-side on every endpoint
- Rate limiting on auth endpoints (max 10 requests/minute per IP)
- helmet.js for HTTP header hardening
- CORS restricted to frontend origin only
- All form inputs validated on both client-side (UX) and server-side (security)
- All secrets in environment variables — never hardcoded
- File attachments in object storage (S3 / R2) — not in DB
- All API errors return structured JSON; frontend shows user-friendly messages
- Account lockout after 5 failed login attempts

---

## 9. Tooling

| Category | Tools |
|----------|-------|
| Dev | TypeScript (strict), ESLint, Prettier, Husky + lint-staged, dotenv, nodemon |
| Testing | Jest, React Testing Library, Supertest, Playwright |
| API | Axios, Zod, Swagger/OpenAPI |
| Auth/Security | NextAuth.js, bcrypt, helmet, cors, jsonwebtoken |
| DevOps | Docker, GitHub Actions, Vercel (client), PM2 (server), Pino (logging) |
| Monitoring | Sentry (errors), Prometheus + Grafana (metrics) |

---

## 10. Getting Started

```bash
git clone <repo-url> && cd dotzero-cr-portal
npm install
cp .env.example .env
npx prisma migrate dev
npx prisma db seed
npm run dev                # Starts both client and server via concurrently
```

---

## 11. Branding — DotZero

### Company & Product

- **Company**: DotZero
- **Product name**: DotZero CR Portal

Use light theme 

### Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| Primary (Velocity Red) | `#EF323F` | CTAs, links, active states, destructive actions |
| Primary Dark (Dark Slate) | `#2D2D2D` | Headings, sidebar, navbar background |
| Dark Hover | `#212121` | Hover state for dark elements |
| Dark Pressed | `#161616` | Pressed/footer state |
| Neutral — White | `#FFFFFF` | Page background, card background |
| Neutral — Soft White | `#F7F7F7` | Section backgrounds, table stripes |
| Neutral — Almond | `#F3F0E8` | Subtle highlights, empty states |
| Neutral — Ash Gray | `#5D5B5B` | Secondary text, labels, placeholders |
| Neutral — Soft Silver | `#D3D3D3` | Borders, dividers, disabled states |
| Success | `#22C55E` | Success states, approved badges |
| Warning | `#F59E0B` | Warning states, pending indicators |
| Error | `#EF323F` | Error states (reuses primary red) |

### Typography

- **Font**: Inter (headings + body) via `next/font/google`
- **Tone of voice**: Professional, clear, concise — no jargon in user-facing copy

### Spacing & Shape

- **Border radius**: `rounded-lg` (8px) for cards/buttons; `rounded-md` (6px) for inputs
- **Spacing**: Tailwind 4px grid (p-2 = 8px, p-4 = 16px, etc.)
- **Shadows**: `shadow-sm` for cards, `shadow-md` for modals/dropdowns
- **Logo**: `client/public/logo.svg` (dark version for light backgrounds)

---

## 12. Environment Variables

Required env vars (validated at startup via Zod — app crashes if missing):

```env
# Database
DATABASE_URL=postgresql://user:pass@host:5432/dotzero_crms

# Auth
JWT_SECRET=<random-64-char-string>
NEXTAUTH_SECRET=<random-64-char-string>
NEXTAUTH_URL=http://localhost:3000

# Email
EMAIL_PROVIDER=resend          # or sendgrid
EMAIL_API_KEY=<api-key>
EMAIL_FROM=noreply@dotzero.com

# File Storage
S3_BUCKET=dotzero-cr-attachments
S3_REGION=us-east-1
S3_ACCESS_KEY=<key>
S3_SECRET_KEY=<secret>

# App
NODE_ENV=development
PORT=4000
CLIENT_URL=http://localhost:3000

# Monitoring (optional in dev)
SENTRY_DSN=<dsn>
```

---

## 13. Key Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| Single repo, single package.json | Simplifies dependency management; shared/ types imported via path alias without workspace config |
| Express.js backend (not Next.js API routes) | Separation of concerns; backend can be deployed independently; easier to add middleware, rate limiting, and background jobs |
| Prisma ORM (no raw SQL) | Type-safe queries; auto-generated migrations; schema as single source of truth for DB |
| Zod for validation (not Joi, not class-validator) | Works on both client and server; composes well with TypeScript; schemas are shareable |
| Zustand + React Query (not Redux) | Zustand for minimal client state; React Query handles caching, refetching, and server state |
| JWT (not sessions) | Stateless backend; horizontally scalable; works with Vercel edge functions |
| S3/R2 for files (not DB blobs) | Scalable; CDN-cacheable; doesn't bloat DB backups |
| DM cannot see financials | Business rule — cost calculations happen server-side only; DM API responses strip rate/cost fields |
| Local file fallback (dev) | When `S3_ACCESS_KEY` is not set, `fileUpload.ts` writes files to `server/uploads/` and serves them via `express.static`. Production always requires S3. |
| Auto UNDER_REVIEW on DM open | When a DM calls `GET /change-requests/:id` and the CR status is SUBMITTED, the service atomically transitions it to UNDER_REVIEW and creates a StatusHistory entry — no separate endpoint needed. |
