# DotZero Change Request Management System — Product Specification

**Version:** 2.2 | **Date:** April 2026 | **Status:** Final | **Confidential — Internal Use Only**

| Field | Value |
|-------|-------|
| Roles | Super Admin · Product Owner · Delivery Manager · Finance |
| DM Financials | Strictly hidden — DM enters hours only |
| v1 Nice-to-have | Resubmission diff view for DM |

---

## 1. System Overview

The DotZero CRMS is a web-based workflow platform that standardises, tracks, and controls client Change Requests (CRs) across fixed-cost projects. Each CR moves through a structured lifecycle involving four roles: Super Admin, Product Owner (PO), Delivery Manager (DM), and Finance.

The system is a single Next.js application with role-based access control enforced on both frontend (App Router route groups) and backend (JWT middleware + roleGuard).

### 1.1 Roles Summary

| Role | Access Level | Primary Responsibility | Default Screen |
|------|-------------|----------------------|----------------|
| Super Admin | Full System | Project & user management, system configuration, oversee all CRs | Admin Dashboard |
| Product Owner (PO) | Project-scoped | Submit and manage CRs, approve or decline DM estimates | My CRs |
| Delivery Manager (DM) | Project-scoped | Review submitted CRs, submit effort estimation, update CR status | Pending Queue |
| Finance | Read-Only | View approved CRs, cost breakdowns, export reports | CR Listing / Dashboard |

> **Key Decision:** A Super Admin can also be assigned as the Delivery Manager for a project. This is configured at project creation — an existing SA user can be selected in the DM dropdown. The system treats them as DM for that project automatically.

### 1.2 CR Auto-Numbering

| Field | Rule / Format |
|-------|--------------|
| CR Number | `[PROJECT-CODE]-CO-[3-digit sequence]` e.g. DZERO-CO-001. Auto-assigned on first save (Draft). |
| SOW Reference | Auto-populated from project settings. |
| Version | v1 on creation. Increments to v2, v3… on each PO resubmission. |
| Date of Request | Auto-set to the submission date (not the draft creation date). |

---

## 2. CR Lifecycle & Status Workflow

All status transitions are enforced server-side. Invalid transitions are rejected with HTTP 403. A reason is mandatory for Declined and Cancelled statuses.

| Status | Set By | Description | Allowed Next Status(es) |
|--------|--------|-------------|------------------------|
| Draft | System (auto) | CR created by PO but not yet submitted. Auto-saves every 60s. | Submitted, Cancelled |
| Submitted | Product Owner | PO submitted CR to DM. CR is read-only to PO. DM notified by email. | Under Review, Cancelled |
| Under Review | Delivery Manager | DM has opened the CR. Status changes automatically when DM first opens a Submitted CR. | Estimated, Cancelled |
| Estimated | Delivery Manager | DM has completed effort estimation and returned CR to PO for decision. | Approved, Declined, Deferred, Resubmitted |
| Resubmitted | Product Owner | PO edited CR fields and re-sent to DM. New version (v2, v3…) created. Previous version archived. | Under Review |
| Approved | Product Owner | PO accepted the estimate. CR locked. Finance can now see this CR. Client signature captured. | In Progress |
| Declined | Product Owner | PO rejected estimate. Decline notes mandatory. DM notified with reason. | *(terminal)* |
| Deferred | Product Owner | PO placed CR on hold for future review. Defer reason mandatory. | *(terminal)* |
| In Progress | Delivery Manager | Implementation of the approved CR is underway. | Completed, Cancelled |
| Completed | Delivery Manager | CR fully implemented and closed. | *(terminal)* |
| Cancelled | SA or PO | CR withdrawn at any point before Completed. No further action possible. | *(terminal)* |

> **Note:** Resubmission creates a new version snapshot (v2, v3…). The DM sees a diff highlighting what the PO changed vs the previous version. Previous versions are archived but remain fully viewable.

---

## 3. Shared Modules (All Roles)

### 3.1 Authentication

| # | Feature | Specification |
|---|---------|--------------|
| 1 | Login | Email + password. Show/hide password toggle. Generic error message for invalid credentials (never reveal which field is wrong). |
| 2 | Forgot Password | User enters email. If found, a time-limited reset link (expires 1 hour) is sent. Link is single-use. |
| 3 | Password Reset | New password + confirm password. Min 8 chars, 1 uppercase, 1 number. All other sessions invalidated on reset. |
| 4 | Session Management | JWT tokens. Auto-logout after 8 hours of inactivity. "Remember me" option (30-day token). |
| 5 | Role-based Redirect | On login each role lands on their default screen (PO → My CRs, DM → Pending Queue, Finance → CR Listing, SA → Dashboard). |
| 6 | Brute Force Protection | Account locked after 5 failed attempts. Unlock via email link or SA reset. Lockout message shown to user. |
| 7 | New User Onboarding | SA creates PO, DM, Finance accounts directly. A welcome email with a one-time password setup link (expires 48 hrs) is sent automatically. |
| 8 | Client Registration | Clients register via invite link only — no self-registration. Invite link expires in 72 hrs and is single-use. After registration, client sets own password and updates profile. |

### 3.2 User Profile

| # | Feature | Specification |
|---|---------|--------------|
| 1 | View Profile | Displays: Full Name, Email (read-only), Role (read-only), Assigned Projects, Last Login, Date Joined. |
| 2 | Edit Profile | Editable: Full Name, Phone (optional), Display Timezone. Email and Role cannot be changed by the user — only Super Admin can configure. |
| 3 | Change Password | Requires current password verification. Same rules as password reset. |
| 4 | Notification Preferences | Per-event email opt-out toggles: CR submitted / returned / approved / declined. |

### 3.3 Email Notification Triggers

All emails must include: CR Number, Project Name, a brief message, and a deep-link button to the CR. Notification failures are logged but must not block the triggering operation.

| # | Trigger Event | Recipient | Email Content |
|---|--------------|-----------|---------------|
| 1 | New user created by SA | New User | Welcome email with one-time password setup link (expires 48 hrs). |
| 2 | Client invite sent | Client | Invite link with 72-hour expiry and registration instructions. |
| 3 | CR submitted by PO | Delivery Manager | New CR pending your estimation: [CR Number] — [Project Name]. |
| 4 | Estimation returned by DM | Product Owner | Estimate ready for review: [CR Number]. Please approve or decline. |
| 5 | CR approved by PO | Delivery Manager | CR [CR Number] has been approved. No further action required. |
| 6 | CR declined by PO | Delivery Manager | CR [CR Number] declined. Reason: [PO notes]. |
| 7 | CR resubmitted by PO | Delivery Manager | CR [CR Number] revised and resubmitted (v[N]). Please re-estimate. |
| 8 | CR status changed | PO / Client | CR [CR Number] status updated to [New Status]. [Portal link]. |
| 9 | CR pending > 48 hrs | Delivery Manager | Reminder: CR [CR Number] has been awaiting estimation for 48 hours. |
| 10 | Password reset requested | Requesting User | Reset link valid for 1 hour. |

### 3.4 Audit Log

Every state change and key action is logged. Audit logs are insert-only (tamper-proof) and accessible to Super Admin only.

| # | Event | Data Captured |
|---|-------|---------------|
| 1 | User login / logout | User ID, timestamp, IP address, device/browser |
| 2 | Failed login attempt | Email attempted, IP, count, timestamp |
| 3 | CR created (draft) | CR ID, PO, project, timestamp |
| 4 | CR submitted | CR ID, submitted by, timestamp |
| 5 | CR estimation submitted by DM | CR ID, DM, hours entered, timestamp (cost not stored against DM action) |
| 6 | CR status transition | CR ID, from status, to status, actor, notes/reason, timestamp |
| 7 | CR version created | CR ID, version number, actor, timestamp |
| 8 | User created / deactivated / reactivated | Actor (SA), affected user, role, timestamp |
| 9 | Project created / edited / archived | Actor (SA), project details, timestamp |
| 10 | Export generated | Exported by, filters applied, file type, timestamp |
| 11 | CR deferred by PO | CR ID, PO, defer reason, timestamp |

---

## 4. Super Admin Module

The Super Admin is the system configurator. They manage all projects, users, and system-wide configuration. They do not participate in the CR workflow directly but have read access to all CRs and can cancel CRs at any point.

### 4.1 Super Admin Dashboard

| # | Widget | Specification |
|---|--------|--------------|
| 1 | Summary Cards | Total Active Projects, Total Users by Role, Total CRs This Month, Total Approved CR Cost (this month vs last month % change). |
| 2 | Pending Actions Alert | Surface any CRs in "Submitted" state for more than X hours without DM action. Threshold configurable by SA. |
| 3 | Project Breakdown | Per-project: # Active CRs, # Approved CRs, Total Approved Hours, Total Approved Cost. |

### 4.2 Project Management

| # | Feature | Specification |
|---|---------|--------------|
| 1 | Create Project | Fields: Project Name, Client Name, Project Code (auto-generated or manual), Start Date, Hourly Rate, Currency, Status (Draft / Active / On Hold / Delivered). Assigned DM dropdown lists all DM + SA users. Checkbox: "Display hourly rate to DM" — controls DM financial visibility. |
| 2 | Project Attachments | SA can attach files (PDF, XLS, PNG, JPEG) at project level — e.g. SOW, BRD, WBS. Viewable by assigned DM and Client. |
| 3 | Edit Project | All fields editable. Changing Hourly Rate does NOT retroactively affect already-approved CRs. |
| 4 | Archive Project | Soft delete. All existing CRs remain intact and viewable. No new CRs can be raised. Shows as Inactive in listings. |
| 5 | Project Listing | Table: Project Name, Client, Code, Status (Active/Inactive), # Active CRs, # Users assigned, Date Created. Filterable by Status. Searchable by name. Actions: Edit, Archive/Unarchive, Delete. |
| 6 | Project Detail View | View all CRs under a project. Show total approved hours and cost to date. List assigned users. |

### 4.3 User Management

| # | Feature | Specification |
|---|---------|--------------|
| 1 | Create User | Fields: Full Name, Email, Role (PO / DM / Finance / Super Admin), Assign to Projects. On creation, welcome email with password setup link sent automatically. |
| 2 | Edit User | Edit: Name, Role, Project assignments. Email is not editable (used as unique identifier). |
| 3 | Deactivate / Reactivate User | Soft delete. Deactivated users cannot log in. Historical CRs show their name with "(Inactive)" label. Reactivation restores full access. |
| 4 | Assign to Projects | Multi-select project assignment. Nice-to-have: "All Projects" toggle. |
| 5 | User Listing | Table: Name, Email, Role, Status. Filterable by Status (Active/Inactive). All roles including Product Owner are visible. Actions: Edit, Deactivate/Reactivate, Delete (soft). |
| 6 | Resend Welcome Email | Button to resend password setup link if user has not yet activated account. |
| 7 | Reset User Password | SA can trigger password reset email for any user (useful for locked-out accounts). |
| 8 | Duplicate Email Prevention | Email uniqueness validated at creation. Clear error shown if email already exists. |

---

## 5. Product Owner (PO) Module

The Product Owner initiates all Change Requests. They fill out the client-facing CR form, submit it to the DM, and make the final approval or rejection decision after receiving an estimate.

### 5.1 CR Creation & Draft

| # | Feature | Specification |
|---|---------|--------------|
| 1 | Create New CR | PO selects a project from their assigned projects. CR Number, SOW Reference, project details, and Date are auto-populated. |
| 2 | PO-Editable Fields | Title, Description of Proposed Change (rich text), Business Justification, Priority (Critical / High / Medium / Low), Change Type (Scope / Timeline / Scope & Timeline), Requesting Party (auto-set, editable). |
| 3 | File Attachments | Up to 5 files. Max 10 MB each. Accepted: PDF, DOCX, XLSX, PNG, JPG. Invalid files rejected with clear error message. |
| 4 | Save as Draft | PO can save at any point without all required fields filled. Auto-saves every 60 seconds. Draft is only visible to PO and SA. |
| 5 | Draft Validation on Submit | On submit: Description and Business Justification not empty, Priority and Change Type selected. Field-level errors shown inline. |
| 6 | Submit CR | Status → Submitted. DM is notified by email. CR becomes read-only to PO (except cancellation). Date of Request is recorded. |

### 5.2 PO Decision Flow (Post-Estimation)

| # | Feature | Specification |
|---|---------|--------------|
| 1 | View Estimation | PO sees DM-filled section: Estimated Hours, Timeline Impact, Affected Deliverables, DM Recommendation. Cost is NOT shown to PO — visible to SA and Finance only. |
| 2 | Approve | PO clicks Approve. Confirmation modal shows summary of timeline impact (not cost). PO adds optional approval notes. Status → Approved. DM notified. Client signature captured. |
| 3 | Decline | PO clicks Decline. Notes field is mandatory. Status → Declined. DM notified with PO reason. |
| 4 | Resubmit to DM | PO edits CR description/justification fields and resubmits. New version (v2, v3…) created. Previous version archived and viewable. DM re-notified. |
| 5 | Approval Confirmation Modal | Before approving, show modal with: CR Number, Timeline Impact, DM Recommendation. PO must explicitly confirm. Prevents accidental approval. |

### 5.3 PO CR Listing Screen

| # | Feature | Specification |
|---|---------|--------------|
| 1 | Default View | All CRs across PO's assigned projects. Sorted by last updated, descending. |
| 2 | Columns | CR Number, Project, Change Type, Priority, Status (badge — colour + text), Submitted Date, Last Updated, Action. |
| 3 | Filters | Project (multi-select), Status (multi-select), Change Type, Priority, Date Range. |
| 4 | Search | Free-text search across CR Number and Description. |
| 5 | Action Column | Context-aware: Draft → "Edit", Estimated → "Review & Decide", all others → "View". |
| 6 | Pending Action Highlight | CRs with status = Estimated are visually highlighted (bold row or "Action Required" badge). |
| 7 | Status History Role Tags | Each entry in the status history timeline shows the actor's name with a colour-coded role tag (PO · DM · SA · Finance) for quick identification. |

### 5.4 Client Signature on Approval

When a PO approves a CR, the system captures a digital acknowledgement signature before finalising the approval:

- A signature capture modal appears after the PO clicks Approve and confirms the modal.
- The signature is drawn on a canvas (touch and mouse supported) or typed as a name acknowledgement.
- The captured signature is stored against the CR and rendered on the CR detail view and the single-CR PDF export.
- The signature field is mandatory — approval cannot be finalised without it.
- Signature is timestamped and linked to the approving user's account.

---

## 6. Delivery Manager (DM) Module

The Delivery Manager receives submitted CRs, fills out the effort estimation, adds recommendations, and returns the CR to the PO for a decision. DMs do not see any financial figures — hourly rate and calculated cost are hidden from them.

> **CRITICAL RULE:** DM enters hours only. Hourly rate and total cost are auto-calculated by the system and visible to Super Admin and Finance only. The DM estimation form must never display rate or cost figures.

### 6.1 DM Pending Queue

| # | Feature | Specification |
|---|---------|--------------|
| 1 | Default View | CRs with status = Submitted or Resubmitted assigned to DM's projects. Sorted by submission date ascending (oldest first). |
| 2 | Columns | CR Number, Project, Priority, Version, Submitted Date, Days Pending, Action. |
| 3 | Days Pending Indicator | Number of days since submission. Amber highlight if > 2 days; red if > 5 days. |
| 4 | Auto Status Change | When DM first opens a Submitted CR, status automatically changes to Under Review. |

### 6.2 DM Estimation Form

| # | Field / Feature | Specification |
|---|----------------|--------------|
| 1 | Read PO Section | DM can read all PO-filled fields but cannot edit them. PO and DM sections are clearly visually separated. |
| 2 | Estimated Additional Hours | Numeric field. Minimum value: 0. Required. This is the only financial input DM provides. |
| 3 | Hourly Rate & Cost | NOT shown to DM. Rate is pulled from project settings. Cost = Hours × Rate. Calculated server-side, visible only to SA and Finance. |
| 4 | Timeline Impact | Free text. e.g. "+3 days to Milestone 3". Required. |
| 5 | Impact on Other Deliverables | Free text. Describe knock-on effects. Required. |
| 6 | Revised Milestones Affected | Multi-line text listing affected milestones. Optional. |
| 7 | Resources Required | Free text. Additional personnel or tools needed. Optional. |
| 8 | DM Recommendation | Free text. Overall recommendation, alternatives, or risk notes. Required. |
| 9 | Save Draft | DM can save estimation progress without submitting (e.g. to consult the team). Draft estimation not visible to PO. |
| 10 | DM Signature | DM adds a digital signature when submitting estimation (same mechanism as PO approval signature). Mandatory before returning to PO. |
| 11 | Return to PO | Submits estimation. Status → Estimated. PO notified. DM section becomes read-only after submission. |
| 12 | Resubmission Diff (v1) | When a CR is resubmitted (v2+), highlight what PO changed vs previous version so DM does not re-read entire CR. |

### 6.3 DM All CRs View

| # | Feature | Specification |
|---|---------|--------------|
| 1 | Full History View | DM can view **all CRs across all statuses** on their assigned projects — including Approved, Declined, Completed, and Cancelled. No status restriction applies. |
| 2 | Filters | Project, Status, Date Range, Priority. |
| 3 | CR Detail — Read Only | Approved / Declined / Completed CRs are fully viewable but not editable. |
| 4 | Internal Notes | DM can attach internal notes to any CR they are assigned to. Notes are visible only to DM and Super Admin. Notes show author name and timestamp. |
| 5 | Status History Role Tags | Each entry in the status history timeline shows the actor's name with a colour-coded role tag (PO · DM · SA · Finance) for quick identification. |

---

## 7. Finance Module

Finance has a read-only, reporting-focused view. They can filter, view, and export CRs for billing, reconciliation, and monthly financial analysis. Finance sees full cost breakdowns including hourly rate and total cost.

### 7.1 Finance CR Listing

| # | Feature | Specification |
|---|---------|--------------|
| 1 | Default View | All CRs with status = Approved across all projects Finance has access to. Sorted by approval date descending. |
| 2 | Columns | CR Number, Project, Client, Approved Date, Estimated Hours, Hourly Rate, Total Cost, Currency, Version. |
| 3 | Filters | Project (multi-select), Client Name, Status, Date Range (approval date), Currency. |
| 4 | Show All Toggle | Finance can toggle to view CRs in all statuses (Declined, Pending, etc.) for context. |
| 5 | CR Detail View | Click any CR to see full read-only detail: PO fields, DM estimation, approval notes, PO signature, cost breakdown. |
| 6 | Cumulative Totals | Below the listing table: Total CRs shown, Total Approved Hours, Total Approved Cost (in selected currency). |

### 7.2 Finance Dashboard

| # | Widget | Specification |
|---|--------|--------------|
| 1 | Consolidated Summary Cards | This Month: Total Approved CRs, Total Hours Approved, Total Cost Approved (all projects consolidated into selected currency). Comparison to previous month (% change). Default currency: USD. |
| 2 | Live Currency Conversion | A currency selector (USD / EUR / GBP / AED / PKR / SAR) converts all project costs into the selected currency using live exchange rates fetched from open.er-api.com (refreshed every hour). Fallback to original values if rates are unavailable. Status indicator shows "Live rates" / "Fetching rates…" / "Rates unavailable". |
| 3 | Project Breakdown Table | Per-project: # Approved CRs, Total Hours, Original Cost (in project currency), Converted Cost (in selected currency). |
| 4 | Filters | Project dropdown, Client dropdown, Date range (from / to). All filters combine and can be cleared with a single Reset button. |

### 7.3 Export

| # | Feature | Specification |
|---|---------|--------------|
| 1 | Export to CSV | Exports all currently filtered CRs. Includes all listing columns plus PO Notes and DM Recommendation. Filename includes date and applied filters. |
| 2 | Export to PDF (List) | Clean summary report: title page with filter details, CR listing table, cumulative totals at end. DotZero branding and export timestamp included. |
| 3 | Export Individual CR as PDF | Single CR export matching the original Change Order Request Form layout. Includes PO fields, DM estimation, approval notes, PO signature, and timestamp. |

---

## 8. CR Versioning & History

Every resubmission by the PO creates an immutable snapshot of the CR at that point in time. Version history is available on all CR detail pages.

| # | Feature | Specification |
|---|---------|--------------|
| 1 | Version Tracking | Every submission and resubmission creates a snapshot. Versions numbered v1, v2, v3… |
| 2 | Version History Panel | Collapsible panel on CR detail page showing: version number, actor, action taken, date. |
| 3 | View Past Version | Any version can be opened in read-only mode to see the exact fields at that point in time. |
| 4 | Resubmission Diff (v1) | When DM receives a resubmitted CR, a diff highlights what changed vs the previous version. |

---

## 9. Key Data Entities

| Entity | Key Fields |
|--------|-----------|
| User | id, name, email, passwordHash, role (SUPER_ADMIN · PRODUCT_OWNER · DELIVERY_MANAGER · FINANCE), isActive, phone, timezone, notifyOnCrSubmitted, notifyOnCrReturned, notifyOnCrApproved, notifyOnCrDeclined, lastLogin, createdAt |
| Project | id, name, clientName, clientEmail, code, hourlyRate, currency, assignedDmId (FK → User), status (DRAFT · ACTIVE · ON_HOLD · DELIVERED · ARCHIVED), showRateToDm (bool), createdAt |
| ProjectAttachment | id, projectId, fileName, fileUrl, fileSize, uploadedAt |
| ProjectUser | id, projectId, userId (join table for multi-project assignment) |
| Invitation | id, email, projectId, role, token, expiresAt, usedAt |
| ChangeRequest | id, crNumber, projectId, submittedById, title, description (rich text), businessJustification, priority, changeType, requestingParty, status, version, sowRef, dateOfRequest, createdAt |
| CRAttachment | id, changeRequestId, fileName, fileUrl, fileSize, uploadedAt |
| ImpactAnalysis | id, changeRequestId, dmId, estimatedHours, timelineImpact, affectedDeliverables, revisedMilestones, resourcesRequired, recommendation, dmSignature, submittedAt |
| CRApproval | id, changeRequestId, approvedById, approvalNotes, poSignature, approvedAt |
| CRVersion | id, changeRequestId, versionNumber, snapshotJson, createdById, createdAt |
| StatusHistory | id, changeRequestId, fromStatus, toStatus, changedById, reason, changedAt |
| InternalNote | id, changeRequestId, authorId, content, createdAt |
| AuditLog | id, event, actorId, entityType, entityId, metadata (JSON), ipAddress, createdAt |

---

## 10. API Endpoints

All endpoints: `[METHOD] /api/v1/[resource]`. Response shape: `{ success, data, error, meta }`. HTTP codes: 200, 201, 400, 401, 403, 404, 500.

| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| POST | /api/v1/auth/login | Login, returns JWT | All |
| POST | /api/v1/auth/forgot-password | Send reset email | All |
| POST | /api/v1/auth/reset-password | Reset password via token | All |
| POST | /api/v1/auth/register | Register via invite token | PO |
| GET | /api/v1/auth/me | Get current user profile | All (authenticated) |
| PATCH | /api/v1/auth/me | Update profile (name, phone, timezone, notification prefs) | All (authenticated) |
| POST | /api/v1/auth/me/change-password | Change own password | All (authenticated) |
| GET | /api/v1/auth/me/stats | System-wide counts (users, projects, CRs) | Super Admin |
| GET | /api/v1/users | List all users | Super Admin |
| POST | /api/v1/users | Create user | Super Admin |
| PATCH | /api/v1/users/:id | Update / deactivate user | Super Admin |
| POST | /api/v1/users/:id/resend-invite | Resend welcome email | Super Admin |
| GET | /api/v1/projects | List projects (scoped) | SA, DM, PO |
| POST | /api/v1/projects | Create project | Super Admin |
| GET | /api/v1/projects/:id | Project detail | SA, DM, PO |
| PATCH | /api/v1/projects/:id | Update / archive project | Super Admin |
| POST | /api/v1/invitations | Send client invite | Super Admin |
| GET | /api/v1/change-requests | List CRs (filtered, scoped) | All |
| POST | /api/v1/change-requests | Create / save draft CR | PO |
| GET | /api/v1/change-requests/:id | CR detail | All (scoped) |
| PATCH | /api/v1/change-requests/:id | Update draft CR | PO |
| POST | /api/v1/change-requests/:id/submit | Submit CR to DM | PO |
| PATCH | /api/v1/change-requests/:id/status | Transition status | DM, SA |
| POST | /api/v1/change-requests/:id/impact-analysis | Submit DM estimation | DM |
| POST | /api/v1/change-requests/:id/approve | PO approve + signature | PO |
| POST | /api/v1/change-requests/:id/decline | PO decline | PO |
| POST | /api/v1/change-requests/:id/defer | PO defer with mandatory reason | PO |
| POST | /api/v1/change-requests/:id/resubmit | PO resubmit (new version) | PO |
| POST | /api/v1/change-requests/:id/notes | Add internal note | DM, SA |
| GET | /api/v1/change-requests/:id/versions | List CR versions | All (scoped) |
| GET | /api/v1/dashboard | Dashboard stats (scoped by role) | All |
| GET | /api/v1/dashboard/export | Export CRs to CSV or PDF | Finance, SA |
| GET | /api/v1/audit-log | View audit log | Super Admin |

---

## 11. Non-Functional Requirements

### 11.1 Performance

- All listing pages load within 2 seconds for up to 500 CRs. Pagination: 25 rows per page default.
- API response time under 500 ms for standard CRUD operations.
- File uploads processed asynchronously; UI shows a progress indicator.

### 11.2 Security

- All passwords hashed with bcrypt (min cost factor 12).
- HTTPS enforced. SQL injection protection via Prisma parameterised queries.
- XSS protection via input sanitisation on all rich-text fields.
- All API routes protected by JWT middleware. Role-based access enforced server-side on every endpoint.
- Rate limiting on auth endpoints (max 10 requests/minute per IP).
- helmet.js for HTTP header hardening. CORS restricted to frontend origin only.
- All form inputs validated on both client-side (UX) and server-side (security). Never rely on frontend validation alone.
- All secrets stored in environment variables — never hardcoded.
- File attachments stored in object storage (S3 or Cloudflare R2) — not in the database.

### 11.3 Reliability & Observability

- Structured JSON logging via Pino (levels: error, warn, info, debug).
- Error tracking via Sentry. Metrics via Prometheus + Grafana.
- All DB migrations versioned via Prisma migrations. Seed script for dev and staging.

### 11.4 Hosting & Deployment

- Frontend: Vercel (Next.js). Backend: PM2 on a Node.js server.
- Database: PostgreSQL 16.
- CI/CD: GitHub Actions — lint, test, build, deploy on merge to main.
- Transactional email: SendGrid or Resend. Proper SPF/DKIM configured.

### 11.5 Accessibility & UX

- Responsive design: desktop (primary), tablet (secondary). Mobile must not be broken.
- WCAG 2.1 AA compliance for all form elements.
- All status badges use both colour and text labels — never colour alone.

---

## 12. User Stories

Priority: **Must** = MVP must-have | **Should** = important, deferrable | **Could** = nice to have

### 12.1 Super Admin

| ID | User Story | Acceptance Criteria | Pri |
|----|-----------|---------------------|-----|
| SA-01 | As a SA, I want to create a project with name, code, hourly rate, currency, and assign a DM (including SA users) | Project saved; DM notified; DM dropdown includes SA users; client can be invited immediately | Must |
| SA-02 | As a SA, I want to invite a client by email with a time-limited link | 72-hr expiry; single-use; client receives email; registers via link only | Must |
| SA-03 | As a SA, I want to view all CRs across all projects with filters | Filterable by project, status, priority, date; sortable | Must |
| SA-04 | As a SA, I want to create PO, DM, and Finance users directly | Welcome email with password setup link sent; role assigned correctly | Must |
| SA-05 | As a SA, I want to deactivate and reactivate user accounts | Deactivated users cannot log in; historical CRs show "(Inactive)"; data retained | Must |
| SA-06 | As a SA, I want to archive a project | Archived project hidden from active views; existing CRs remain intact | Should |
| SA-07 | As a SA, I want to view an audit log of all system actions | Log shows: event, actor, entity, timestamp; read-only; SA access only | Should |
| SA-08 | As a SA, I want to reassign a DM to a project | Previous DM loses project access; new DM sees all existing CRs | Should |
| SA-09 | As a SA acting as DM, I want to appear in the DM dropdown | SA users listed in DM dropdown; selecting one gives them DM responsibilities for that project | Must |

### 12.2 Product Owner

| ID | User Story | Acceptance Criteria | Pri |
|----|-----------|---------------------|-----|
| PO-01 | As a PO, I want to create a CR and save it as a draft before submitting | CR auto-numbered on creation; draft saves every 60s; all fields editable while in Draft | Must |
| PO-02 | As a PO, I want to attach supporting files to my CR | Up to 5 files; max 10 MB each; accepted: PDF, DOCX, XLSX, PNG, JPG; invalid files rejected | Must |
| PO-03 | As a PO, I want to submit my CR to the DM | Validation runs on submit; status → Submitted; DM notified by email; CR read-only to PO | Must |
| PO-04 | As a PO, I want to view the DM's estimation (hours, timeline, recommendation — not cost) | DM section visible; cost hidden from PO; timeline and recommendation shown clearly | Must |
| PO-05 | As a PO, I want to approve a CR estimate after seeing a confirmation modal | Modal shows timeline impact; signature canvas required; status → Approved on confirm | Must |
| PO-06 | As a PO, I want to decline a CR estimate with mandatory notes | Decline notes required; status → Declined; DM notified with reason | Must |
| PO-07 | As a PO, I want to resubmit a modified CR to the DM | New version (v2, v3…) created; DM re-notified; previous version archived and viewable | Must |
| PO-08 | As a PO, I want to view all my CRs with status badges and action indicators | Estimated CRs highlighted with "Action Required"; context-aware action buttons | Must |
| PO-09 | As a PO, I want to filter and search my CR list | Filters: project, status, type, priority, date range; free-text search on number and description | Should |

### 12.3 Delivery Manager

| ID | User Story | Acceptance Criteria | Pri |
|----|-----------|---------------------|-----|
| DM-01 | As a DM, I want to see only CRs in Submitted or Resubmitted status on my default queue | CRs from other projects not visible; oldest first; days-pending indicator with colour coding | Must |
| DM-02 | As a DM, I want a CR to move to Under Review automatically when I open it | Status transitions from Submitted → Under Review on first open; PO not notified at this step | Must |
| DM-03 | As a DM, I want to fill in my estimation (hours, timeline, recommendations) without seeing cost | Hours field only for financials; no rate or cost shown anywhere in DM form | Must |
| DM-04 | As a DM, I want to save my estimation as a draft before submitting | Draft estimation not visible to PO; DM can return and continue filling | Must |
| DM-05 | As a DM, I want to sign and return my estimation to the PO | DM signature required; status → Estimated; PO notified; DM form becomes read-only | Must |
| DM-06 | As a DM, I want to view all CRs across my projects (all statuses) | Full history view; filters by status, priority, date, project; completed CRs read-only | Must |
| DM-07 | As a DM, I want to add internal notes to a CR | Notes visible to DM and SA only; author and timestamp shown | Should |
| DM-08 | As a DM, I want to be reminded if a CR has been waiting for 48 hours | Automated email reminder sent at 48-hr mark; days-pending highlighted amber/red in queue | Should |

### 12.4 Finance

| ID | User Story | Acceptance Criteria | Pri |
|----|-----------|---------------------|-----|
| FI-01 | As Finance, I want to view all approved CRs with full cost breakdowns | Each CR shows: hours, hourly rate, total cost, currency; read-only; no action buttons | Must |
| FI-02 | As Finance, I want to filter the CR list by date range, project, status, and currency | Filters combinable; results update immediately; filter state persists in session | Must |
| FI-03 | As Finance, I want to see cumulative totals below the filtered CR list | Totals: CRs shown, approved hours, approved cost; grouped by currency if mixed | Must |
| FI-04 | As Finance, I want to view an aggregated cost summary per project | Per-project: # approved CRs, total hours, total cost; filterable by month/date range | Must |
| FI-05 | As Finance, I want to export the filtered CR list to CSV | All columns exported; filename includes date and filters applied | Must |
| FI-06 | As Finance, I want to export a PDF summary report | PDF includes title page with filter details, CR table, cumulative totals, DotZero branding | Should |
| FI-07 | As Finance, I want to export a single CR as a client-facing PDF | PDF mirrors original CR form layout; includes PO signature, DM estimation, approval details | Should |
| FI-08 | As Finance, I want to toggle to see CRs in all statuses for context | "Show All" toggle available; default view stays Approved-only | Could |

---

## 13. Recommended Development Slices

Build each slice as a complete vertical cut (DB → Backend → Frontend) and test end-to-end before starting the next. Commit after each slice.

| Slice | Name | What to Build | Testable Outcome |
|-------|------|--------------|-----------------|
| 1 | Auth & Onboarding | Login, forgot/reset password, session management, role-based redirect, brute force protection, welcome email flow | Each role logs in and lands on the correct screen |
| 2 | Super Admin Setup | Project CRUD (incl. SA-as-DM dropdown, project attachments), User CRUD, project-user assignment, invite flow | SA creates project, invites client, creates DM/Finance users |
| 3 | PO — CR Creation | CR form (PO fields), draft save + auto-save, auto-numbering, file attachments, validation, submit | PO creates, drafts, attaches files, and submits a CR |
| 4 | DM — Estimation | DM pending queue, auto-status on open, estimation form (no financials), draft save, DM signature, return to PO | DM estimates and returns CR to PO; cost hidden from DM |
| 5 | PO — Decision Flow | Approve (confirmation modal + PO signature), Decline (mandatory notes), Resubmit (versioning + diff), status transitions | Full CR lifecycle works end-to-end; signature captured on approve |
| 6 | Notifications | All email triggers wired to workflow events (Section 3.3), 48-hr reminder, delivery failure logging | Correct emails fire at each workflow step |
| 7 | Finance Module | CR listing, filters, cumulative totals, dashboard summary cards, CSV export, PDF list export | Finance filters and exports approved CRs with cost data |
| 8 | CR Versioning & Audit | Version snapshots on resubmission, version history panel, audit log table, read-past-version | Full CR history traceable; audit log accessible to SA |
| 9 | Individual CR PDF Export | Single CR PDF matching original form layout, including PO signature block | Finance/SA downloads client-ready CR PDF |

---

## 14. Definition of Done

A feature is complete when ALL of the following are true:

- Functionality matches the acceptance criteria in Section 12
- Unit tests written and passing (Jest for services, React Testing Library for UI)
- API endpoint documented in Swagger/OpenAPI
- TypeScript strict mode — no `any` without justification comment
- ESLint and Prettier pass with zero warnings
- Both client-side and server-side validation implemented
- Code reviewed and merged to main branch
- Feature tested in staging environment
- Email notifications verified end-to-end in staging

---

## 15. Out of Scope — v1

- Mobile-native app (responsive web only)
- Multi-language / i18n support
- Automated CR approval rules / workflow engine
- Integration with external tools (Jira, Asana, etc.)
- Client-facing invoice generation
- Scheduled auto-export (Finance — deferred to v1.1)
- Resource-type hourly rates per project (deferred to v1.1)
