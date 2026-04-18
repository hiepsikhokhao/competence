# Code & Security Review Report

**Branch:** `claude/friendly-sagan-3voCu`
**Scope:** Commits `0165ce0..HEAD` — migration from Supabase to PostgreSQL + Prisma + NextAuth + Dokploy
**Date:** 2026-04-18
**Files changed:** 33 files, +1,834 / −962 lines

---

## 1. Overview

The migration replaces Supabase with self-hosted PostgreSQL + Prisma ORM, introduces NextAuth.js v5 (Credentials + Keycloak SSO), and adds Docker/Dokploy deployment (Dockerfile, compose, entrypoint, idempotent init-db). RSC + server-actions discipline is preserved; application component logic is largely unchanged.

Port changed 3012 → 3000. Dependencies: removed `@supabase/*`, added `@prisma/client`, `next-auth`, `bcryptjs`.

---

## 2. Code Review Findings

### Critical (block deployment)

| # | File:Line | Issue | Fix |
|---|-----------|-------|-----|
| C1 | `Dockerfile:46` | `node_modules/.bin` symlinks not copied to runner stage; `npx prisma db push` at container start will fail | Add `COPY --from=builder /app/node_modules/.bin ./node_modules/.bin` |
| C2 | `docker-compose.yml:28` | `AUTH_URL=http://localhost:3012` — stale port; app now runs on 3000, breaking NextAuth callbacks | Change to `http://localhost:3000` or `${AUTH_URL:-http://localhost:3000}` |

### Medium

| # | File:Line | Issue | Fix |
|---|-----------|-------|-----|
| M1 | `scripts/init-db.mjs:18–75` | Generated-column idempotency logic convoluted (preemptive drop + redundant re-add) | Collapse to single `DO $$ IF NOT EXISTS … $$` block |
| M2 | `lib/auth.ts:48–54` | JWT callback casts `(user as any).role`; loses type safety | Declare `{ role: UserRole }` on user or use Prisma inferred type |
| M3 | `app/actions/manager.ts:10–41` | `saveManagerScore` omits `revalidatePath` — looks like a bug, is intentional auto-save | Add one-line comment explaining auto-save pattern |
| M4 | `CLAUDE.md:18, 27, 32–35` | Stale docs still describe Supabase DB/auth | Update to Postgres + Prisma + NextAuth; document i18n `_en`/`_vi` fallback |
| M5 | `app/actions/manager.ts:18` | Assessment fetched without checking cycle status | Document intent or gate on cycle.status |

### Low

| # | File:Line | Issue | Fix |
|---|-----------|-------|-----|
| L1 | `Dockerfile` | No container `HEALTHCHECK` | Add HTTP healthcheck once `/health` endpoint exists |
| L2 | `components/assessment/AssessmentTabContent.tsx:30–78` | In-app grouping of skills/levels; not an N+1 but not pre-joined | Acceptable for current scale |
| L3 | `app/login/LoginForm.tsx:4, 22` | Mixes server-action `login()` and client `signIn('keycloak')` | Add comment explaining dual auth paths |

### Strengths

- Clean RSC + server-action discipline; no client-side data fetching introduced.
- `revalidateAll()` helper in `app/actions/hr.ts` keeps mutations DRY.
- Standalone Next output enabled for slim Docker images; non-root `nextjs` user in runner stage.
- Parallelised Prisma reads in `app/api/export/route.ts:11–28`.
- Supabase code cleanly removed — no dead code left behind.

---

## 3. Security Review Findings

### CRITICAL

**S1. Hardcoded default admin password — `scripts/init-db.mjs:87–89`**
Creates `admin@company.com` with fallback password `admin123` when `ADMIN_PASSWORD` is unset.
*Attacker:* anyone with network access logs in as HR and gains full control (export, user management, assessment tampering).
*Fix:* `const pw = process.env.ADMIN_PASSWORD; if (!pw) throw new Error('ADMIN_PASSWORD required');`

**S2. Default credentials in compose file — `docker-compose.yml:8, 21, 26`**
`POSTGRES_PASSWORD=changeme` and `AUTH_SECRET=please-change-this-secret-in-production` silently accepted as fallbacks.
*Attacker:* forgable JWTs (→ role escalation) and direct DB access if env not supplied.
*Fix:* use `${VAR:?message}` form so compose fails fast when the variable is missing.

**S3. Login timing oracle → account enumeration — `lib/auth.ts:23–34`**
`authorize()` returns `null` immediately on missing user; bcrypt runs only for real users, leaking a ~100 ms signal per request.
*Attacker:* enumerate valid accounts for phishing / targeted brute force.
*Fix:* run a dummy bcrypt compare on the miss path so both branches take equivalent time.

**S4. No runtime validation of scores — `app/actions/assessment.ts:10–41`, `app/actions/manager.ts:10–41`**
`selfScore` / `managerScore` typed as `ProficiencyLevel` but never validated. Client can submit `0`, `999`, negatives.
*Attacker:* poison assessment data, break gap math, trigger downstream invariants.
*Fix:* `if (![1,2,3,4].includes(score)) return { error: 'invalid' };`

### HIGH

**S5. XLSX formula injection — `app/api/export/route.ts:109`**
Evidence strings written verbatim to cells.
*Attacker:* employee writes `=cmd|'/c …'!A1` in evidence; HR opens export; arbitrary code executes in their desktop Excel.
*Fix:* prefix leading `= + @ -` with `'` before writing: `v.replace(/^([=+@\-\t\r])/, "'$1")`.

**S6. No rate limiting on login / export — `app/actions/auth.ts`, `app/api/export/route.ts`**
Unlimited credential brute force; unlimited heavy exports.
*Fix:* IP-based limiter for login (5/15 min); per-user limiter for export (1/min).

**S7. Keycloak callback not pinned — `lib/auth.ts:10–14`**
Relies on NextAuth defaults without explicit `allowDangerousEmailAccountLinking: false` or redirect-URI pinning.
*Attacker:* account takeover via email-based linking if a Keycloak realm is misconfigured.
*Fix:* set `allowDangerousEmailAccountLinking: false` (default in v5, but pin explicitly) and restrict callback hosts at the IdP.

### MEDIUM

**S8. bcrypt cost factor 10 — `scripts/init-db.mjs:89`** — raise to 12 for new installs.
**S9. Export endpoint lacks Origin/CSRF check — `app/api/export/route.ts`** — GET route returns sensitive HR data; validate `Origin`/`Referer` or move to POST+token.

### LOW

**S10. Admin email printed to stdout — `scripts/init-db.mjs:102`** — drop the email from the log line.
**S11. init-db runs every container start** — idempotent but widens blast radius if script is ever tampered with; consider a one-shot init container.

### Findings explicitly ruled out

- Supabase credentials: cleanly removed, no residual tokens.
- IDOR on assessment save: ownership check verified in `app/actions/assessment.ts`.
- SQL injection: only `$executeRawUnsafe` in `init-db.mjs` — DDL with no user input.

---

## 4. Prioritised Action Plan

**Must fix before deploy**
1. C1 — copy `.bin` into runner stage.
2. C2 — fix `AUTH_URL` port.
3. S1 — require `ADMIN_PASSWORD`, no fallback.
4. S2 — `${VAR:?}` on `POSTGRES_PASSWORD`, `AUTH_SECRET`, `DATABASE_URL`.
5. S3 — constant-time login path.
6. S4 — runtime score validation (both actions).
7. S5 — XLSX cell sanitisation in export.

**Next sprint**
8. S6 — rate limiting (login + export).
9. S7 — pin Keycloak linking behaviour.
10. M1–M4 — init-db cleanup, type fixes, docs refresh.

**Backlog**
11. S8, S9, S10, S11, L1–L3.

---

## 5. Overall Posture

Migration is architecturally clean and preserves RSC discipline. Two deployment-blocking bugs (missing `.bin`, wrong `AUTH_URL`) and seven exploitable security issues (default admin creds, enumerable login, unvalidated scores, XLSX injection, unthrottled login/export) must land before this ships. Application-level authorization (manager → direct reports, HR-only routes, employee-owned assessment writes) is sound.
