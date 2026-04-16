# DotZero CRMS — Claude Code Prompts v2 (Atomic)

Paste each prompt one at a time. Wait for completion + verify before moving to the next.
Commit after each: `git add -A && git commit -m "P-XX: description"`

Total: 24 prompts | Estimated: 9 development slices

---

## PHASE 0 — Project Setup (3 prompts)

### P-0A: Root Config

```
Read docs/DotZero_CRMS_Tech_Reference.md. Set up:
- Root package.json (name: dotzero-cr-portal, scripts: dev using concurrently, dev:client, dev:server, build, lint, format, db:migrate, db:seed, db:studio)
- tsconfig.base.json (strict, ES2022) + client/tsconfig.json + server/tsconfig.json extending base
- .eslintrc.js, .prettierrc (semi, singleQuote, trailingComma all, printWidth 100)
- .gitignore (node_modules, .env, .next, dist)
- .env.example with: DATABASE_URL (postgres localhost:5432/dotzero_crms), JWT_SECRET, NEXTAUTH_SECRET, NEXTAUTH_URL, SENDGRID_API_KEY, EMAIL_FROM, S3_BUCKET, S3_REGION, S3_ACCESS_KEY, S3_SECRET_KEY, NODE_ENV, PORT=4000, CLIENT_URL=http://localhost:3000
- docker/docker-compose.yml — PostgreSQL 16 (user: dotzero, pass: dotzero, db: dotzero_crms, port 5432)
- README.md with prerequisites and getting started
- .github/workflows/ci.yml — lint + typecheck on push to main

prisma/schema.prisma already exists — don't touch it. No features, just root config.
```

✅ Verify: `docker compose -f docker/docker-compose.yml up -d` starts PostgreSQL

---

I also want to create a log file of token consumed against each prompt 

---- 

### P-0B: Server Skeleton

```
Read docs/DotZero_CRMS_Tech_Reference.md Sections 4, 6, 7. Scaffold server/ with Express + TypeScript:

- config/db.ts — Prisma client singleton
- config/env.ts — Zod-validated env vars (DATABASE_URL, JWT_SECRET, SENDGRID_API_KEY, EMAIL_FROM, PORT, CLIENT_URL, NODE_ENV), crash on missing
- config/logger.ts — Pino structured JSON logger
- middleware/auth.ts — JWT verification stub
- middleware/errorHandler.ts — global error handler returning { success, data, error, meta }
- middleware/rateLimiter.ts — express-rate-limit wrapper
- middleware/roleGuard.ts — role check stub accepting allowed roles array
- middleware/validate.ts — generic Zod validation middleware for body/params/query
- Empty module folders: auth/, users/, projects/, changeRequests/, impactAnalysis/, invitations/, dashboard/ — each with index.ts placeholder
- utils/email.ts — SendGrid stub (import @sendgrid/mail, export sendEmail function)
- utils/auditLog.ts — helper to insert AuditLog entries via Prisma
- app.ts — Express setup: helmet, cors, json parser, error handler
- server.ts — entry point: validate env, start server

Install all server dependencies. Must compile with no errors.
```

✅ Verify: `npm run dev:server` starts without errors on port 4000

---

### P-0C: Client + Shared

```
Read docs/DotZero_CRMS_Tech_Reference.md Section 11 for branding and docs/DotZero_CRMS_Product_Spec.md Section 9 for entity types.

Scaffold client/ with Next.js App Router:
- Route groups with empty layout.tsx + page.tsx: (auth), (admin), (dashboard), (client), (dm), (finance)
- Root layout.tsx with Inter font via next/font/google
- Root page.tsx redirects to /login
- tailwind.config.ts with DotZero colors: primary #EF323F, dark #2D2D2D, neutrals (#F7F7F7, #F3F0E8, #5D5B5B, #D3D3D3), success #22C55E, warning #F59E0B
- src/lib/apiClient.ts — Axios instance, baseURL http://localhost:4000/api/v1
- src/store/useAuthStore.ts — Zustand shell (user, token, role)
- Empty folders: components/ui/, components/forms/, components/layouts/, hooks/, types/

Scaffold shared/:
- types/index.ts — TS types for all entities from Product Spec Section 9 (User type WITHOUT passwordHash)
- types/api.ts — ApiResponse<T> generic type
- validators/auth.ts — Zod: loginSchema, registerSchema, forgotPasswordSchema, resetPasswordSchema
- validators/project.ts — Zod: createProjectSchema, updateProjectSchema
- validators/changeRequest.ts — Zod: createCRSchema, updateCRSchema
- validators/user.ts — Zod: createUserSchema, updateUserSchema
- constants/roles.ts — Role values + display names
- constants/crStatus.ts — CRStatus values, display names, badge colors, allowed transitions map
- constants/index.ts — re-export all

Install client dependencies. Must compile with no errors.
```

✅ Verify: `npm run dev` starts both client (3000) + server (4000)
Always preview after each phase before moving to next phase 

---

## PHASE 1 — Database (1 prompt)

### P-01: Seed Data

```
Create prisma/seed.ts:
- 1 Super Admin (admin@dotzero.com / Admin@123)
- 1 DM (dm@dotzero.com / Dm@12345)
- 1 Finance (finance@dotzero.com / Finance@1)
- 1 PO (po@dotzero.com / Po@123456)
- 2 projects: DZERO (DotZero Internal, hourlyRate: 25, USD) and PROJ2 (Client Alpha, hourlyRate: 35, USD). Assign SA as DM on DZERO project.
- Assign all users to both projects via ProjectUser
- Hash passwords with bcrypt cost 12
- Use upsert to make seed idempotent

Run: npx prisma migrate dev --name init, then npm run db:seed. Verify no errors.
```

✅ Verify: `npx prisma studio` shows all 4 users + 2 projects + assignments

---

## PHASE 2 — Auth (3 prompts)

### P-02A: Backend Auth Module

```
Read docs/DotZero_CRMS_Product_Spec.md Section 3.1 (Authentication).

Build server/src/modules/auth/ following module pattern (controller → service → Prisma):
- auth.routes.ts — POST /login, /forgot-password, /reset-password, /register
- auth.validation.ts — Zod schemas for each endpoint (use shared validators)
- auth.service.ts — verify credentials + return JWT with role/userId, brute force (lock after 5 fails), generate 1-hour reset token, validate invite token for registration, invalidate sessions on password reset
- auth.controller.ts — thin handlers calling service

Wire auth routes into app.ts. Implement real JWT middleware in middleware/auth.ts and roleGuard in middleware/roleGuard.ts.
Rate limit: 10 req/min on auth endpoints. Log all auth events to AuditLog.
Password rules: min 8 chars, 1 uppercase, 1 number.
```

✅ Verify: `POST /api/v1/auth/login` with seed user returns JWT

---

### P-02B: Frontend Auth Pages

```
Read docs/DotZero_CRMS_Product_Spec.md Section 3.1.

Build client/src/app/(auth)/:
- /login — email + password, show/hide toggle, Remember me, Forgot password link, generic error on fail, redirect by role on success (SA→/admin/dashboard, PO→/client/my-crs, DM→/dm/pending, Finance→/finance/cr-listing)
- /register — invite token from URL, name + password + confirm, validate token on load
- /forgot-password — email input, always show success message
- /reset-password — token from URL, new password + confirm

Build:
- src/hooks/useAuth.ts — React Query mutations for login, register, forgot, reset
- src/store/useAuthStore.ts — full Zustand store (setUser, clearUser, token)
- src/lib/apiClient.ts — add JWT interceptor (attach token from store)

Use DotZero branding. Client + server validation on all forms.
```

✅ Verify: login with admin@dotzero.com / Admin@123 redirects to /admin/dashboard

---

### P-02C: Layouts + Route Protection

```
Build:

1. src/components/layouts/Sidebar.tsx — role-aware nav:
   - SA: Dashboard, Projects, Users, All CRs, Audit Log
   - PO: My CRs, Profile
   - DM: Pending Queue, All CRs, Profile
   - Finance: CR Listing, Dashboard, Profile

2. src/components/layouts/Navbar.tsx — user name, role badge, logout

3. src/components/layouts/PageWrapper.tsx — consistent padding + breadcrumbs

4. Protected route wrapper — redirect to /login if no session, redirect to role home if accessing wrong role's routes

5. Session: auto-logout after 8hrs inactivity, 30-day token if Remember me

Test: all 4 seed users log in → correct screen. Wrong role → redirected.
```

✅ Verify: all 4 users land on their correct default screen with proper sidebar

---

## PHASE 3 — Super Admin: Projects (2 prompts)

### P-03A: Backend Project CRUD

```
Read Product Spec Section 4.2.

Build server/src/modules/projects/:
- projects.routes.ts — GET /, POST /, GET /:id, PATCH /:id
- projects.validation.ts — Zod schemas for create + update
- projects.service.ts — create project (auto-gen code if empty), edit, archive (status→ARCHIVED), list with filters (status, search by name), detail with user + CR counts
- projects.controller.ts — thin handlers

DM dropdown query: WHERE role IN (DELIVERY_MANAGER, SUPER_ADMIN) AND isActive = true.
Changing hourlyRate does NOT affect already-approved CRs.
Archive = soft delete, no new CRs allowed.
File attachments: accept PDF, XLS, PNG, JPEG. Upload to S3 — build utils/fileUpload.ts with multer + S3 client.
Role guard: Super Admin only. Log to AuditLog.
```

✅ Verify: `POST /api/v1/projects` creates a project, `GET /api/v1/projects` lists it

---

### P-03B: Frontend Project Pages

```
Read Product Spec Section 4.2.

Build client/src/app/(admin)/projects/:
- /admin/projects — listing table with columns: Name, Client, Code, Status badge, # CRs, # Users, Date Created. Filter by status. Search by name. Actions: Edit, Archive/Unarchive.
- /admin/projects/new — create form: name, clientName, code, hourlyRate, currency selector, startDate, assignedDm dropdown (shows SA + DM users), showRateToDm checkbox, file attachments
- /admin/projects/[id] — detail: project info card, assigned users list, CR summary
- /admin/projects/[id]/edit — edit form (same as create, pre-filled)

Build reusable components: DataTable (sortable, filterable), Badge, Modal (confirmation).
```

✅ Verify: SA can create, view, edit, and archive a project from the UI

---

## PHASE 4 — Super Admin: Users + Invitations (2 prompts)

### P-04A: Backend User CRUD + Invitations

```
Read Product Spec Sections 4.3 and 3.1 (item 7 + 8).

Build server/src/modules/users/:
- users.routes.ts — GET /, POST /, PATCH /:id, POST /:id/resend-invite
- users.service.ts — create user (with role + project assignments), edit (name, role, projects — email read-only), deactivate/reactivate (soft), resend welcome email, reset password trigger
- Email uniqueness validation on create
- On create: send welcome email with 48-hour password setup link via SendGrid

Build server/src/modules/invitations/:
- invitations.routes.ts — POST /
- invitations.service.ts — generate 72-hour single-use invite token, send email to client

Role guard: Super Admin only. Log to AuditLog.
```

✅ Verify: `POST /api/v1/users` creates a user, welcome email function is called

---

### P-04B: Frontend User + Invitation Pages

```
Read Product Spec Section 4.3.

Build client/src/app/(admin)/users/:
- /admin/users — listing: Name, Email, Role badge, Status, Actions (Edit, Deactivate/Reactivate, Resend Email)
- /admin/users/new — create form: name, email, role selector (PO/DM/Finance/SA), multi-select project assignment
- /admin/users/[id]/edit — edit form (email read-only, everything else editable)

Build client/src/app/(admin)/invitations/:
- Invite client section (can be a modal from users page): email input + project selector → sends invite

Build reusable: MultiSelect component, RoleBadge component.
```

✅ Verify: SA creates a user, assigns to project, sees them in listing

---

## PHASE 5 — PO: CR Creation (2 prompts)

### P-05A: Backend CR CRUD + Submit

```
Read Product Spec Sections 5.1 and 2 (status workflow).

Build server/src/modules/changeRequests/:
- changeRequests.routes.ts — POST / (create draft), PATCH /:id (update draft), POST /:id/submit, GET / (list), GET /:id (detail)
- changeRequests.service.ts:
  - Create: auto-generate crNumber ([project.code]-CO-[3-digit seq]), auto-increment project.crSequence, status=DRAFT
  - Update: only while DRAFT, validate ownership
  - Submit: validate required fields (description, justification, priority, changeType), status→SUBMITTED, set dateOfRequest, create StatusHistory entry
  - List: scoped by role — PO sees own projects only
  - Detail: scoped, return with attachments

File attachments: max 5, max 10MB, types: PDF/DOCX/XLSX/PNG/JPG. Use the fileUpload util from P-03A.
Status transitions enforced per Product Spec Section 2 — invalid → 403.
Email DM on submit.
```

✅ Verify: create draft CR → update it → submit → status is SUBMITTED, crNumber is correct

---

### P-05B: Frontend PO CR Pages

```
Read Product Spec Sections 5.1, 5.3.

Build client/src/app/(client)/:
- /client/my-crs — listing: CR Number, Project, Change Type, Priority, Status badge (color+text), Submitted Date, Last Updated, Action column (Draft→Edit, Estimated→Review & Decide, others→View). Filters: project, status, type, priority, date range. Search by CR number + description. Estimated CRs highlighted with "Action Required" badge.
- /client/my-crs/new — CR form: project selector (auto-populates crNumber + SOW ref), title, description (rich text editor), business justification, priority, change type, requesting party, file attachments (drag & drop). Auto-save every 60s. Save Draft + Submit buttons.
- /client/my-crs/[id] — CR detail view (read-only for non-Draft)
- /client/my-crs/[id]/edit — edit draft

Build: RichTextEditor component (use tiptap), FileUpload component (drag & drop, validation).
```

✅ Verify: PO creates CR, saves draft, attaches file, submits → appears in listing as Submitted

---

## PHASE 6 — DM: Estimation (2 prompts)

### P-06A: Backend DM Estimation

```
Read Product Spec Section 6. CRITICAL: DM sees NO financial data.

Build server/src/modules/impactAnalysis/:
- impactAnalysis.routes.ts — POST /change-requests/:id/impact-analysis
- impactAnalysis.service.ts:
  - Auto-status: when DM first opens a Submitted CR via GET /change-requests/:id → status changes to UNDER_REVIEW (check in changeRequests service)
  - Save estimation: estimatedHours, timelineImpact, affectedDeliverables, revisedMilestones, resourcesRequired, recommendation, dmSignature, isDraft flag
  - Return to PO: isDraft→false, status→ESTIMATED, email PO
  - DM save draft: isDraft stays true, not visible to PO

GET /change-requests responses for role=DELIVERY_MANAGER must STRIP hourlyRate and totalCost. Enforce in service layer.

Also add: POST /change-requests/:id/notes — internal notes visible to DM + SA only.
```

✅ Verify: DM opens CR → status becomes UNDER_REVIEW. DM submits estimation → status ESTIMATED. No financial data in DM API responses. ✅ COMPLETED

---

### P-06B: Frontend DM Pages

```
Read Product Spec Sections 6.1, 6.2, 6.3.

Build client/src/app/(dm)/:
- /dm/pending — queue: Submitted + Resubmitted CRs for DM's projects. Columns: CR Number, Project, Priority, Version, Submitted Date, Days Pending (amber >2d, red >5d). Sorted oldest first.
- /dm/pending/[id] — two-section layout: PO section (read-only, grey background) + DM estimation form (hours, timeline impact, affected deliverables, revised milestones, resources, recommendation). Save Draft + Return to PO buttons. DM signature canvas (mandatory before return).
- /dm/all-crs — full history: all statuses, all DM's projects. Filters: project, status, date, priority. Search bar.
- /dm/all-crs/[id] — read-only detail + internal notes section (add note form + notes list with author + timestamp)

Build: SignatureCanvas component (draw on canvas with mouse/touch, or type name, returns base64 string). NO hourly rate, NO cost anywhere in DM UI.
```

✅ Verify: DM sees pending queue → opens CR → fills estimation → signs → returns to PO → CR shows as Estimated ✅ COMPLETED

---

## PHASE 7 — PO: Decision Flow (2 prompts)

### P-07A: Backend Approve + Decline + Resubmit

```
Read Product Spec Sections 5.2, 5.4, 8.

Build in server/src/modules/changeRequests/:
- POST /change-requests/:id/approve — validate status=ESTIMATED, require poSignature (base64), optional approvalNotes, status→APPROVED, create CRApproval record, lock CR, email DM. Compute totalCost = estimatedHours × project.hourlyRate (store for Finance/SA access, never return to PO/DM).
- POST /change-requests/:id/decline — validate status=ESTIMATED, require mandatory declineNotes, status→DECLINED, email DM with reason.
- POST /change-requests/:id/resubmit — validate status=ESTIMATED, PO edits CR fields, create CRVersion snapshot (snapshotJson = full CR+impactAnalysis state before edit), increment version number, status→RESUBMITTED, email DM.
- GET /change-requests/:id/versions — list all CRVersion snapshots for a CR.
- PATCH /change-requests/:id/status — for CANCELLED only, allowed by SA or PO at any non-terminal status.

Each transition creates a StatusHistory entry.
```

✅ Verify: approve (with signature) → APPROVED. Decline (with notes) → DECLINED. Resubmit → new version created, status RESUBMITTED.

---

### P-07B: Frontend PO Decision UI

```
Read Product Spec Sections 5.2, 5.4.

Enhance /client/my-crs/[id] when status = ESTIMATED:
- Show DM estimation section: hours, timeline impact, affected deliverables, recommendation. NO cost shown to PO.
- Three action buttons: Approve, Decline, Resubmit

Approve flow:
1. Click Approve → ConfirmationModal shows: CR Number, Timeline Impact, DM Recommendation
2. Confirm → SignatureCanvas modal (mandatory)
3. Optional approval notes textarea
4. Submit → status APPROVED

Decline flow:
1. Click Decline → modal with mandatory notes textarea
2. Submit → status DECLINED

Resubmit flow:
1. Click Resubmit → CR form becomes editable (description, justification, priority, type)
2. Submit → new version created, status RESUBMITTED

Build: VersionHistory panel — collapsible section on CR detail page showing all versions (version number, actor, action, date). Click any version → read-only view of that snapshot.
```

✅ Verify: full lifecycle works — PO creates → submits → DM estimates → PO approves with signature → CR locked

---

## PHASE 8 — Finance (3 prompts)

### P-08A: Backend Finance Endpoints

```
Read Product Spec Section 7.

Add Finance-scoped logic to changeRequests service:
- GET /change-requests with role=FINANCE: default returns APPROVED CRs only, includes hourlyRate + totalCost + currency. Support "showAll" query param to include all statuses.
- Add cumulative totals to meta: { totalCRs, totalApprovedHours, totalApprovedCost, currency } grouped by currency when mixed.
- GET /change-requests/:id for Finance: full read-only detail with cost breakdown (PO fields + DM estimation + approval notes + PO signature + hourlyRate + totalCost).

Role guard: FINANCE + SUPER_ADMIN.
```

✅ Verify: Finance user GET /change-requests returns approved CRs with cost data

---

### P-08B: Backend Dashboard + Export

```
Read Product Spec Sections 4.1 and 7.2, 7.3.

Build server/src/modules/dashboard/:
- GET /dashboard — scoped by role:
  - SA: total active projects, total users by role, total CRs this month, total approved cost (this month vs last month % change), pending actions (CRs in Submitted > X hours)
  - Finance: monthly summary (total approved CRs, hours, cost vs last month %), per-project breakdown (# approved, hours, cost) filterable by date range, grouped by currency
  - PO: total own CRs by status
  - DM: total pending CRs, total estimated this month

- GET /dashboard/export?format=csv|pdf — Finance + SA only:
  - CSV: all filtered listing columns + PO Notes + DM Recommendation. Filename: dotzero_crs_YYYY-MM-DD_[filters].csv
  - PDF: title page (DotZero branding, filter details, export date), CR table, cumulative totals. Use pdfkit or pdfmake library.
```

✅ Verify: GET /dashboard returns correct stats per role. CSV/PDF export downloads correctly.

---

### P-08C: Frontend Finance + SA Dashboard Pages

```
Read Product Spec Sections 7.1, 7.2, 4.1.

Build client/src/app/(finance)/:
- /finance/cr-listing — table: CR Number, Project, Client, Approved Date, Hours, Hourly Rate, Total Cost, Currency, Version. Filters: project, client, status, date range, currency. Show All toggle (default Approved only). Cumulative totals bar below table (total CRs, hours, cost grouped by currency). Export buttons: CSV + PDF.
- /finance/cr-listing/[id] — full read-only CR detail with cost breakdown section
- /finance/dashboard — monthly summary cards (approved CRs, hours, cost + % change vs last month), project breakdown table grouped by currency, date range filter

Build client/src/app/(admin)/dashboard/:
- /admin/dashboard — summary cards (active projects, users by role, CRs this month, approved cost + % change), pending actions alert (CRs stuck in Submitted), project breakdown table
```

✅ Verify: Finance sees cost data, filters work, export downloads. SA dashboard shows system-wide stats.

---

## PHASE 9 — Notifications + Audit (3 prompts)

### P-09A: Email Service + Core Triggers

```
Read Product Spec Section 3.3 (triggers 1-7).

Implement server/src/utils/email.ts fully with SendGrid:
- sendEmail(to, subject, htmlBody) — generic sender
- Build email templates (HTML) with DotZero branding: red header bar, CR Number + Project Name, brief message, deep-link button to CR

Wire up these triggers in the relevant services:
1. New user created → welcome email with password setup link (48hr)
2. Client invite sent → invite link with 72hr expiry
3. CR submitted by PO → email DM
4. Estimation returned by DM → email PO
5. CR approved by PO → email DM
6. CR declined by PO → email DM with reason
7. CR resubmitted by PO → email DM

Notification failures: catch errors, log via Pino, never block the main operation.
```

✅ Verify: submit a CR → DM receives email notification (check SendGrid activity or logs)

---

### P-09B: Remaining Triggers + 48hr Reminder

```
Read Product Spec Section 3.3 (triggers 8-10).

Wire up:
8. CR status changed → email PO/Client with new status + portal link
9. CR pending > 48 hrs → reminder email to DM
10. Password reset requested → email with reset link (1hr)

For trigger 9, set up a scheduled job using node-cron:
- Runs every hour
- Queries CRs with status=SUBMITTED and submittedAt < 48 hours ago
- Sends reminder to assigned DM
- Only sends once per CR (track via a lastReminderSentAt field or a flag)

Add node-cron setup in server.ts after app starts.
```

✅ Verify: all email triggers fire. 48hr cron job runs and sends reminders.

---

### P-09C: Audit Log Page

```
Read Product Spec Section 3.4.

Verify utils/auditLog.ts is being called across all modules for all 10 event types from Section 3.4. Add any missing calls.

Build:
- GET /audit-log — Super Admin only. Query params: eventType, actorId, entityType, dateFrom, dateTo, page, pageSize. Returns paginated results sorted by createdAt descending.

Frontend — client/src/app/(admin)/audit-log/:
- /admin/audit-log — read-only table: Event, Actor name, Entity type + ID, Timestamp, IP Address. Filters: event type dropdown, actor search, date range. Pagination.

SA only. No edit/delete actions — audit logs are immutable.
```

✅ Verify: SA sees full audit trail. Filter by event type works. All actions across the system are logged.

---

## Summary

| Phase | Prompts | What you get |
|-------|---------|-------------|
| 0 — Setup | P-0A, P-0B, P-0C | Repo scaffolded, Docker running, compiles |
| 1 — Database | P-01 | Tables + seed data |
| 2 — Auth | P-02A, P-02B, P-02C | Login works for all 4 roles |
| 3 — SA Projects | P-03A, P-03B | Project CRUD with UI |
| 4 — SA Users | P-04A, P-04B | User management + invitations |
| 5 — PO CRs | P-05A, P-05B | CR creation + submission |
| 6 — DM Estimation | P-06A, P-06B | Estimation flow, no financials | ✅ |
| 7 — PO Decision | P-07A, P-07B | Approve/Decline/Resubmit + signatures + versioning |
| 8 — Finance | P-08A, P-08B, P-08C | Listings, dashboard, exports |
| 9 — Notifications | P-09A, P-09B, P-09C | All emails + cron + audit log |

**24 prompts total. Each is atomic — one concern, one module.**

## Tips

1. Always start prompts with: "Read docs/DotZero_CRMS_Product_Spec.md and docs/DotZero_CRMS_Tech_Reference.md" — but ONLY if Claude Code hasn't already read them in the current session
2. Commit after each prompt: `git add -A && git commit -m "P-0A: root config"`
3. If errors: paste the error into Claude Code, ask it to fix just that
4. Don't skip prompts — each builds on the previous
5. Test the ✅ checkpoint before moving on
