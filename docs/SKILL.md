---
name: docs-sync
description: >
  Keep the DotZero CR Portal documentation in sync after any code change.
  Activate this skill after EVERY task that adds, modifies, or removes a
  feature, endpoint, component, module, configuration option, status transition,
  role permission, data entity, environment variable, or any other functionality
  in the dotzero-cr-portal project. Trigger phrases include: "add", "update",
  "change", "refactor", "remove", "fix", "implement", "build", "scaffold",
  "create module", "add endpoint", "update schema", or any prompt from the
  Claude_Code_Prompts_v2.md phases (P-0A through P-09C). Always prompt the user
  for confirmation before writing any documentation changes.
---

# Docs Sync Skill — DotZero CR Portal

After every code change in `dotzero-cr-portal`, check if the docs need updating and ask the user before writing anything.

---

## Project Docs Location

```
dotzero-cr-portal/docs/
├── DotZero_CRMS_Product_Spec.md   — Product spec: roles, CR lifecycle, features, user stories, data entities, API endpoints
├── DotZero_CRMS_Tech_Reference.md — Tech reference: stack, architecture, file structure, conventions, branding, env vars
├── Claude_Code_Prompts_v2.md      — Atomic build prompts (P-0A → P-09C) + phase summary table + dev tips
```

Also check:
```
dotzero-cr-portal/
└── README.md                      — Prerequisites and getting started guide
```

---

## What Each File Covers (Quick Reference)

| File | Update When... |
|------|----------------|
| `DotZero_CRMS_Product_Spec.md` | New/changed features, API endpoints, status transitions, role permissions, data entity fields, email triggers, user stories, acceptance criteria |
| `DotZero_CRMS_Tech_Reference.md` | Stack changes, new dependencies, file structure changes, new env vars, architecture decisions, branding/color updates, new conventions |
| `Claude_Code_Prompts_v2.md` | A prompt is completed (mark ✅), a prompt is revised, a new phase or prompt is added, phase summary table changes |
| `README.md` | New prerequisites, changed setup steps, new scripts added to package.json |

---

## Step-by-Step Workflow

### Step 1 — Finish the Code Change
Complete the requested code task as normal.

### Step 2 — Identify Affected Docs
Based on what changed, determine which of the 4 files above are impacted. Use the quick reference table above.

**Common mappings:**

| What changed | Likely affected docs |
|---|---|
| New API endpoint added | `Product_Spec.md` (Section 10 — API Endpoints) |
| New data field on an entity | `Product_Spec.md` (Section 9 — Key Data Entities) |
| New status transition or rule | `Product_Spec.md` (Section 2 — CR Lifecycle) |
| New role permission or access rule | `Product_Spec.md` (Section 1.1 — Roles Summary) |
| New email trigger | `Product_Spec.md` (Section 3.3 — Email Triggers) |
| New audit log event | `Product_Spec.md` (Section 3.4 — Audit Log) |
| New npm package added | `Tech_Reference.md` (Section 1 — Stack or Section 9 — Tooling) |
| New env variable added | `Tech_Reference.md` (Section 12 — Environment Variables) |
| New folder or module created | `Tech_Reference.md` (Section 3 — File Structure) |
| Architecture decision made | `Tech_Reference.md` (Section 13 — Key Architecture Decisions) |
| New script in package.json | `README.md` |
| Prompt P-XX completed | `Claude_Code_Prompts_v2.md` (mark ✅ on that prompt, update phase summary) |
| Prompt P-XX revised | `Claude_Code_Prompts_v2.md` (update prompt body) |

### Step 3 — Ask the User Before Writing

**Always confirm before making any edits.** Present a summary like this:

---

> ✅ Code change complete.
>
> The following docs may need updating:
>
> | File | Section | Reason |
> |------|---------|--------|
> | `docs/DotZero_CRMS_Product_Spec.md` | Section 10 — API Endpoints | New endpoint `POST /api/v1/change-requests/:id/notes` should be added |
> | `docs/DotZero_CRMS_Tech_Reference.md` | Section 12 — Environment Variables | New `CRON_ENABLED` env var added |
> | `docs/Claude_Code_Prompts_v2.md` | P-06A | Prompt completed — mark ✅ |
>
> **Shall I update these? Reply "yes", "skip [filename]" to skip specific ones, or "no" to skip all.**

---

### Step 4 — Apply Updates (Only After Confirmation)

Once confirmed:

1. Make **surgical edits** — update only the relevant section, never rewrite entire files
2. Match the existing formatting style of each doc exactly (tables, headers, numbering)
3. After writing, confirm what was changed:

> 📝 Updated `Product_Spec.md` Section 10 (added notes endpoint) and `Claude_Code_Prompts_v2.md` (marked P-06A ✅).

---

## Prompt Completion Tracking

When any of the 24 build prompts (P-0A → P-09C) is completed, update `Claude_Code_Prompts_v2.md`:

1. Add ✅ to the prompt's verify line, e.g.:
   ```
   ✅ Verify: `POST /api/v1/auth/login` with seed user returns JWT ← add ✅ here
   ```
2. Update the **Summary table** at the bottom if the phase is now fully complete

---

## Rules

- **Never update docs without explicit user confirmation**
- **Never rewrite entire files** — surgical edits to relevant sections only
- **Never change the Product Spec or Tech Reference structure** (section numbers, heading hierarchy) — only add/update content within existing sections
- **Match table formatting exactly** — new rows in existing tables must use the same column structure
- If a change requires a new section (rare), propose it to the user before creating it
- If no docs are affected, say so: *"No doc updates needed for this change."*
- DM financial hiding rule (`DotZero_CRMS_Product_Spec.md` Section 6) is a **critical business rule** — if any change touches financial visibility, always flag this in the update summary

---

## Critical Business Rules to Watch For

These rules are baked into the spec — if any code change touches them, flag it prominently:

| Rule | Location in Spec |
|------|-----------------|
| DM must NEVER see hourly rate or total cost | Section 6, critical rule callout |
| Status transitions are enforced server-side; invalid → 403 | Section 2 |
| Audit logs are insert-only (tamper-proof) | Section 3.4 |
| File attachments go to S3/R2, never the DB | Section 11.2 Security |
| All secrets in env vars, never hardcoded | Section 11.2 Security |
| Both client-side AND server-side validation required | Section 11.2 Security |
| Approval requires PO signature (mandatory canvas) | Section 5.4 |
