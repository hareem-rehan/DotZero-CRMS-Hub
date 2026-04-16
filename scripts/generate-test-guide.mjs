import * as XLSX from 'xlsx';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outPath = path.join(__dirname, '..', 'DotZero_CR_Portal_Test_Guide.xlsx');

const wb = XLSX.utils.book_new();

const addSheet = (name, rows) => {
  const ws = XLSX.utils.aoa_to_sheet(rows);
  // Set column widths based on content
  const cols = rows[0].map((_, ci) => ({
    wch: Math.min(60, Math.max(12, ...rows.map(r => String(r[ci] ?? '').length)) + 2),
  }));
  ws['!cols'] = cols;
  XLSX.utils.book_append_sheet(wb, ws, name);
};

// ─── Sheet 1: Overview ────────────────────────────────────────────────────────

addSheet('Overview', [
  ['DotZero CR Portal — Test Guide'],
  ['Generated', new Date().toISOString().slice(0, 10)],
  ['Version', '1.0'],
  ['Scope', 'Phases P-02A through P-05A'],
  [],
  ['Sheet', 'Contents'],
  ['Seed Data', 'Login credentials and project details'],
  ['URLs', 'Frontend page URLs to test'],
  ['Auth Tests', 'Login, brute-force, role redirect, session guard (14 cases)'],
  ['Project Tests', 'CRUD, archive, search, filter, role guards (18 cases)'],
  ['User Tests', 'Create, edit, deactivate, resend, reset (15 cases)'],
  ['Invitation Tests', 'Send invite, register, expiry, reuse (7 cases)'],
  ['CR API Tests', 'Create draft, update, submit, transitions, scoping (14 cases)'],
  ['Status Transitions', 'Allowed CR status transition matrix'],
  ['curl Commands', 'Copy-paste curl commands for API testing'],
]);

// ─── Sheet 2: Seed Data ───────────────────────────────────────────────────────

addSheet('Seed Data', [
  ['SEED USERS'],
  ['Name', 'Email', 'Password', 'Role', 'Notes'],
  ['Super Admin', 'admin@dotzero.com', 'Admin@123', 'SUPER_ADMIN', 'Full system access'],
  ['Delivery Manager', 'dm@dotzero.com', 'Dm@12345', 'DELIVERY_MANAGER', 'No financial data shown'],
  ['Finance', 'finance@dotzero.com', 'Finance@1', 'FINANCE', 'Read-only financial view'],
  ['Product Owner', 'po@dotzero.com', 'Po@123456', 'PRODUCT_OWNER', 'Raises and submits CRs'],
  [],
  ['SEED PROJECTS'],
  ['Project Name', 'Code', 'Status', 'All Users Assigned?'],
  ['DotZero Internal', 'DZERO', 'ACTIVE', 'Yes'],
  ['Client Beta Project', 'PROJ2', 'ACTIVE', 'Yes'],
  [],
  ['ENDPOINTS'],
  ['Frontend URL', 'http://localhost:3000'],
  ['API Base URL', 'http://localhost:4000/api/v1'],
  ['Health Check', 'http://localhost:4000/health'],
]);

// ─── Sheet 3: URLs ────────────────────────────────────────────────────────────

addSheet('URLs', [
  ['URL', 'Page / Feature', 'Login As', 'Phase'],
  ['http://localhost:3000/login', 'Login page', 'N/A', 'P-02B'],
  ['http://localhost:3000/forgot-password', 'Forgot password', 'N/A', 'P-02B'],
  ['http://localhost:3000/reset-password?token=<token>', 'Reset password', 'N/A', 'P-02B'],
  ['http://localhost:3000/register?token=<token>', 'Register via invite', 'N/A', 'P-02B'],
  ['http://localhost:3000/admin/dashboard', 'SA Dashboard', 'Super Admin', 'P-02C'],
  ['http://localhost:3000/admin/projects', 'Project Listing', 'Super Admin', 'P-03B'],
  ['http://localhost:3000/admin/projects/new', 'Create Project', 'Super Admin', 'P-03B'],
  ['http://localhost:3000/admin/projects/<id>', 'Project Detail', 'Super Admin', 'P-03B'],
  ['http://localhost:3000/admin/projects/<id>/edit', 'Edit Project', 'Super Admin', 'P-03B'],
  ['http://localhost:3000/admin/users', 'User Listing', 'Super Admin', 'P-04B'],
  ['http://localhost:3000/admin/users/new', 'Create User', 'Super Admin', 'P-04B'],
  ['http://localhost:3000/admin/users/<id>/edit', 'Edit User', 'Super Admin', 'P-04B'],
  ['http://localhost:3000/client/my-crs', 'PO Home (placeholder)', 'Product Owner', 'P-02C'],
  ['http://localhost:3000/dm/pending', 'DM Home (placeholder)', 'Delivery Manager', 'P-02C'],
  ['http://localhost:3000/finance/cr-listing', 'Finance Home (placeholder)', 'Finance', 'P-02C'],
]);

// ─── Sheet 4: Auth Tests ──────────────────────────────────────────────────────

addSheet('Auth Tests', [
  ['#', 'Test Case', 'Precondition', 'Steps', 'Expected Result', 'Pass / Fail', 'Notes'],
  ['A-01', 'Login — Super Admin', 'Backend + DB running', 'Email: admin@dotzero.com | Password: Admin@123 | Click Sign In', 'Redirected to /admin/dashboard with SA sidebar', '', ''],
  ['A-02', 'Login — Product Owner', 'Seed data loaded', 'Email: po@dotzero.com | Password: Po@123456', 'Redirected to /client/my-crs with PO sidebar', '', ''],
  ['A-03', 'Login — Delivery Manager', 'Seed data loaded', 'Email: dm@dotzero.com | Password: Dm@12345', 'Redirected to /dm/pending with DM sidebar', '', ''],
  ['A-04', 'Login — Finance', 'Seed data loaded', 'Email: finance@dotzero.com | Password: Finance@1', 'Redirected to /finance/cr-listing', '', ''],
  ['A-05', 'Wrong password', 'Any user exists', 'Correct email + wrong password', 'Generic error — no role or email hint', '', ''],
  ['A-06', 'Non-existent email', 'N/A', 'nobody@example.com + any password', 'Same generic error (no email leak)', '', ''],
  ['A-07', 'Brute-force lock', 'Active user', 'Wrong password 5 times for same account', 'On 5th attempt: Account locked message', '', ''],
  ['A-08', 'Locked account login', 'A-07 done', 'Correct credentials after lock', '403 Account is locked', '', ''],
  ['A-09', 'Wrong role redirect', 'Logged in as PO', 'Manually navigate to /admin/dashboard', 'Redirected to /client/my-crs', '', ''],
  ['A-10', 'Unauthenticated guard', 'Not logged in', 'Navigate to /admin/projects', 'Redirected to /login', '', ''],
  ['A-11', 'Logout', 'Any user logged in', 'Click Logout in navbar', 'Session cleared, redirected to /login', '', ''],
  ['A-12', 'Forgot password — always success', 'N/A', 'Enter admin@dotzero.com → submit', 'Success message shown regardless of email validity', '', ''],
  ['A-13', 'Remember Me — long session', 'N/A', 'Login with Remember Me checked', 'JWT has 30d expiry instead of 8h', '', 'Decode token to verify exp claim'],
  ['A-14', 'Inactivity timeout', 'Logged in', 'Leave browser idle 8+ hours', 'Auto-logout, redirected to /login', '', 'Long-running manual test'],
]);

// ─── Sheet 5: Project Tests ───────────────────────────────────────────────────

addSheet('Project Tests', [
  ['#', 'Test Case', 'Precondition', 'Steps', 'Expected Result', 'Pass / Fail', 'Notes'],
  ['P-01', 'List projects', 'Logged in as SA', 'Visit /admin/projects', 'DZERO and PROJ2 listed in table', '', ''],
  ['P-02', 'Search by name', 'Project listing open', 'Type "DotZero" in search', 'Only DZERO project shown', '', ''],
  ['P-03', 'Filter — Active', 'Project listing open', 'Select Active in status filter', 'Only active projects shown', '', ''],
  ['P-04', 'Filter — Archived', 'At least one archived project', 'Select Archived in filter', 'Only archived projects shown', '', ''],
  ['P-05', 'Create — manual code', 'SA on /admin/projects/new', 'Fill form, code=TESTPROJ → submit', '201, project listed with code TESTPROJ', '', ''],
  ['P-06', 'Create — auto code', 'SA on /admin/projects/new', 'Leave code blank → submit', 'Auto-generated code e.g. PROJ003', '', ''],
  ['P-07', 'Create — duplicate code', 'DZERO exists', 'Create project with code=DZERO', '409: Project code already in use', '', ''],
  ['P-08', 'Create — validation', 'SA on create form', 'Submit with name blank', 'Inline error on name field', '', ''],
  ['P-09', 'Edit project', 'DZERO exists', 'Edit DZERO, change clientName → save', 'Client name updated, detail page reflects change', '', ''],
  ['P-10', 'Hourly rate non-retroactive', 'Approved CRs exist', 'Change hourlyRate on project', 'Existing approved CR totals unchanged', '', 'Business rule — verify via API'],
  ['P-11', 'View project detail', 'DZERO exists', 'Click project name', 'Detail card shows name, code, rate, users, attachments', '', ''],
  ['P-12', 'Archive project', 'DZERO active', 'Click Archive → confirm modal', 'Badge changes to Archived', '', ''],
  ['P-13', 'No new CRs on archived', 'P-12 done', 'POST /api/v1/change-requests with DZERO project ID (PO)', '400: Cannot create CR for archived project', '', 'API test'],
  ['P-14', 'Unarchive', 'P-12 done', 'Click Unarchive → confirm', 'Status back to Active', '', ''],
  ['P-15', 'Sort table', 'Projects listed', 'Click Project Name column header', 'Rows reorder alphabetically; click again reverses', '', ''],
  ['P-16', 'SA-only — no token', 'N/A', 'POST /api/v1/projects without auth header', '401 Unauthorized', '', 'API test'],
  ['P-17', 'SA-only — DM token', 'DM JWT available', 'POST /api/v1/projects with DM token', '403 Forbidden', '', 'API test'],
  ['P-18', 'DM dropdown correct', 'SA on new project form', 'Open Assigned DM dropdown', 'Shows DM + SA users only — no PO or Finance', '', ''],
]);

// ─── Sheet 6: User Tests ──────────────────────────────────────────────────────

addSheet('User Tests', [
  ['#', 'Test Case', 'Precondition', 'Steps', 'Expected Result', 'Pass / Fail', 'Notes'],
  ['U-01', 'List users', 'SA logged in', 'Visit /admin/users', 'All 4 seed users listed', '', ''],
  ['U-02', 'Filter by role', 'User listing open', 'Select Delivery Manager', 'Only dm@dotzero.com shown', '', ''],
  ['U-03', 'Filter by status Active', 'User listing open', 'Select Active', 'All 4 active users shown', '', ''],
  ['U-04', 'Search by name', 'User listing open', 'Type "finance"', 'Finance user shown', '', ''],
  ['U-05', 'Create user', 'SA on /admin/users/new', 'Name=Test User, email=test@example.com, role=PO, project=DZERO → submit', '201, user listed, welcome email triggered', '', ''],
  ['U-06', 'Duplicate email', 'admin@dotzero.com exists', 'Create user with email=admin@dotzero.com', '409: User with this email already exists', '', ''],
  ['U-07', 'Edit name + role', 'User exists', 'Edit dm@dotzero.com, change name → save', 'Name updated in listing', '', ''],
  ['U-08', 'Email read-only on edit', 'Edit form open', 'Inspect email field', 'Email input is disabled', '', ''],
  ['U-09', 'Assign to multiple projects', 'SA on create form', 'Select DZERO + PROJ2 in MultiSelect → save', 'User has 2 project assignments', '', ''],
  ['U-10', 'Deactivate user', 'Active user exists', 'Click Deactivate → confirm', 'Status shows Inactive badge', '', ''],
  ['U-11', 'Deactivated login blocked', 'U-10 done', 'Login with deactivated user', '403: Account is deactivated', '', ''],
  ['U-12', 'Reactivate user', 'U-10 done', 'Click Reactivate → confirm', 'Status Active, login works', '', ''],
  ['U-13', 'Resend welcome email', 'User exists', 'Click Resend Email', 'New 48hr link generated, email sent', '', 'Check server logs'],
  ['U-14', 'SA reset password', 'Any active user', 'Click Reset Password', 'New 1hr reset link, email sent', '', ''],
  ['U-15', 'SA-only endpoint guard', 'DM JWT', 'GET /api/v1/users with DM token', '403 Forbidden', '', 'API test'],
]);

// ─── Sheet 7: Invitation Tests ────────────────────────────────────────────────

addSheet('Invitation Tests', [
  ['#', 'Test Case', 'Precondition', 'Steps', 'Expected Result', 'Pass / Fail', 'Notes'],
  ['I-01', 'Send invite', 'SA logged in, DZERO exists', 'Invite Client modal: email=newclient@test.com, project=DZERO → Send', '201, success message in modal', '', ''],
  ['I-02', 'Duplicate active invite', 'I-01 done', 'Send same email + project again', '409: Active invitation already exists', '', ''],
  ['I-03', 'Register via token', 'Valid token from I-01', 'Open /register?token=<token>, set name + password', 'Account created, login works as PRODUCT_OWNER', '', 'Get token from DB or server log'],
  ['I-04', 'Used token rejected', 'I-03 done', 'Use same token again', '400: Invitation already used', '', ''],
  ['I-05', 'Expired token', 'Manually expire token in DB', 'Use expired token', '400: Invitation has expired', '', 'Update expiresAt in DB to past'],
  ['I-06', 'Archived project invite', 'Project archived', 'POST /api/v1/invitations with archived project ID', '400: Cannot invite to archived project', '', 'API test'],
  ['I-07', 'User assigned to project on register', 'I-03 done', 'Login as new user, check /api/v1/users/<id>', 'User has DZERO project assignment', '', ''],
]);

// ─── Sheet 8: CR API Tests ────────────────────────────────────────────────────

addSheet('CR API Tests', [
  ['#', 'Test Case', 'Auth', 'Method + Endpoint', 'Body / Notes', 'Expected Result', 'Pass / Fail'],
  ['C-01', 'Create draft CR', 'PO JWT', 'POST /api/v1/change-requests', '{"projectId":"<DZERO_ID>","title":"Add export","description":"CSV export","businessJustification":"Client request","priority":"HIGH","changeType":"SCOPE"}', '201 | crNumber=DZERO-CO-001 | status=DRAFT', ''],
  ['C-02', 'Auto-increment CR number', 'PO JWT', 'POST /api/v1/change-requests', 'Same as C-01', '201 | crNumber=DZERO-CO-002', ''],
  ['C-03', 'PO not assigned to project', 'PO JWT', 'POST /api/v1/change-requests', '{"projectId":"<unassigned project ID>",...}', '403: Not assigned to this project', ''],
  ['C-04', 'Update draft', 'PO JWT', 'PATCH /api/v1/change-requests/<id>', '{"title":"Updated title"}', '200 | title updated', ''],
  ['C-05', 'Update non-draft blocked', 'PO JWT', 'PATCH /api/v1/change-requests/<SUBMITTED_id>', 'Any body', '400: Only DRAFT change requests can be updated', ''],
  ['C-06', 'Submit — missing description', 'PO JWT', 'POST /api/v1/change-requests/<id>/submit', 'CR has empty description', '400: Description is required', ''],
  ['C-07', 'Submit valid CR', 'PO JWT', 'POST /api/v1/change-requests/<id>/submit', 'CR has all required fields', '200 | status=SUBMITTED | dateOfRequest set | DM emailed', ''],
  ['C-08', 'Re-submit blocked', 'PO JWT', 'POST /api/v1/change-requests/<SUBMITTED_id>/submit', 'No body', '403: Cannot transition from SUBMITTED to SUBMITTED', ''],
  ['C-09', 'PO scoping — own CRs only', 'PO JWT', 'GET /api/v1/change-requests', '', 'Only CRs submitted by this PO returned', ''],
  ['C-10', 'DM response — no cost data', 'DM JWT', 'GET /api/v1/change-requests/<id>', 'SUBMITTED CR', 'Response has no hourlyRate or totalCost fields', ''],
  ['C-11', 'Finance scope', 'Finance JWT', 'GET /api/v1/change-requests', '', 'Only APPROVED / IN_PROGRESS / COMPLETED CRs', ''],
  ['C-12', 'SA sees all', 'SA JWT', 'GET /api/v1/change-requests', '', 'All statuses returned', ''],
  ['C-13', 'Unauthenticated', 'No token', 'GET /api/v1/change-requests', '', '401 Unauthorized', ''],
  ['C-14', 'Not found', 'SA JWT', 'GET /api/v1/change-requests/invalid-id', '', '404 Change request not found', ''],
]);

// ─── Sheet 9: Status Transition Matrix ───────────────────────────────────────

const statuses = ['DRAFT','SUBMITTED','UNDER_REVIEW','ESTIMATED','RESUBMITTED','APPROVED','IN_PROGRESS','COMPLETED','DECLINED','CANCELLED'];
const allowed = {
  DRAFT: ['SUBMITTED','CANCELLED'],
  SUBMITTED: ['UNDER_REVIEW','CANCELLED'],
  UNDER_REVIEW: ['ESTIMATED','CANCELLED'],
  ESTIMATED: ['APPROVED','DECLINED','RESUBMITTED'],
  RESUBMITTED: ['UNDER_REVIEW'],
  APPROVED: ['IN_PROGRESS'],
  IN_PROGRESS: ['COMPLETED'],
  COMPLETED: [],
  DECLINED: [],
  CANCELLED: [],
};

addSheet('Status Transitions', [
  ['FROM \\ TO', ...statuses],
  ...statuses.map(from => [
    from,
    ...statuses.map(to =>
      from === to ? '—' : (allowed[from]?.includes(to) ? 'ALLOWED' : 'BLOCKED')
    ),
  ]),
]);

// ─── Sheet 10: curl Commands ──────────────────────────────────────────────────

addSheet('curl Commands', [
  ['Action', 'Command'],
  ['Get SA token', `curl -s -X POST http://localhost:4000/api/v1/auth/login -H "Content-Type: application/json" -d '{"email":"admin@dotzero.com","password":"Admin@123"}' | jq -r '.data.token'`],
  ['Get PO token', `curl -s -X POST http://localhost:4000/api/v1/auth/login -H "Content-Type: application/json" -d '{"email":"po@dotzero.com","password":"Po@123456"}' | jq -r '.data.token'`],
  ['Get DM token', `curl -s -X POST http://localhost:4000/api/v1/auth/login -H "Content-Type: application/json" -d '{"email":"dm@dotzero.com","password":"Dm@12345"}' | jq -r '.data.token'`],
  ['Get Finance token', `curl -s -X POST http://localhost:4000/api/v1/auth/login -H "Content-Type: application/json" -d '{"email":"finance@dotzero.com","password":"Finance@1"}' | jq -r '.data.token'`],
  ['Health check', 'curl http://localhost:4000/health'],
  ['List projects (SA)', 'curl -H "Authorization: Bearer $SA_TOKEN" http://localhost:4000/api/v1/projects'],
  ['List users (SA)', 'curl -H "Authorization: Bearer $SA_TOKEN" http://localhost:4000/api/v1/users'],
  ['Create CR (PO)', `curl -X POST http://localhost:4000/api/v1/change-requests -H "Authorization: Bearer $PO_TOKEN" -H "Content-Type: application/json" -d '{"projectId":"<DZERO_PROJECT_ID>","title":"Test CR","description":"Details here","businessJustification":"Business need","priority":"HIGH","changeType":"SCOPE"}'`],
  ['Submit CR (PO)', 'curl -X POST http://localhost:4000/api/v1/change-requests/<CR_ID>/submit -H "Authorization: Bearer $PO_TOKEN"'],
  ['List CRs as DM', 'curl -H "Authorization: Bearer $DM_TOKEN" http://localhost:4000/api/v1/change-requests'],
  ['List CRs as Finance', 'curl -H "Authorization: Bearer $FINANCE_TOKEN" http://localhost:4000/api/v1/change-requests'],
  ['Send invitation (SA)', `curl -X POST http://localhost:4000/api/v1/invitations -H "Authorization: Bearer $SA_TOKEN" -H "Content-Type: application/json" -d '{"email":"client@test.com","projectId":"<PROJECT_ID>","role":"PRODUCT_OWNER"}'`],
  ['Forgot password', `curl -X POST http://localhost:4000/api/v1/auth/forgot-password -H "Content-Type: application/json" -d '{"email":"admin@dotzero.com"}'`],
]);

// ─── Write ────────────────────────────────────────────────────────────────────

XLSX.writeFile(wb, outPath);
console.log('Done:', outPath);
