# Code Review + Security Scan Report

**Branch:** `claude/friendly-sagan-5vD8h` (at parity with `origin/main`)
**Scope:** migration commits `0165ce0..HEAD` — Supabase → Prisma + self-hosted Postgres + NextAuth + Dokploy/Docker.
**Diff:** 33 files, +1834 / −962.
**Date:** 2026-04-21

---

## Executive Summary

The migration is broadly well-structured: Prisma singleton is idiomatic, server actions keep ownership/role checks, NextAuth JWT strategy is wired through `proxy.ts` (Next.js 16's renamed middleware file), the Dockerfile uses a sane multi-stage build with a non-root runtime user, and page components correctly `await searchParams` per Next 16.

Two **high-severity** security issues are present, both introduced by the deployment bootstrap: a default HR admin credential (`admin@company.com` / `admin123`) and a default `AUTH_SECRET` baked into `docker-compose.yml`. Either alone is sufficient for full takeover of a fresh deployment.

One **likely-critical data-model bug** — `@@unique([employeeId])` on `Assessment` — prevents more than one assessment row per employee across cycles. Worth confirming against product intent; the last pre-migration commit was "cycle-free flow" so this may be deliberate, but the `cycleId` FK + per-cycle UI suggests otherwise.

No injection, XSS, path-traversal, or authorization-bypass vulnerabilities were found in the application code itself.

---

## Security Findings

### Vuln 1 — Hardcoded default HR admin credentials

- **File:** `scripts/init-db.mjs:87-88`
- **Severity:** High  **Confidence:** 10/10  **Category:** `crypto_secrets`
- **Description:** The init script that runs on every container boot (`docker-entrypoint.sh`) creates a seed admin with `ADMIN_EMAIL || 'admin@company.com'` and `ADMIN_PASSWORD || 'admin123'`. `docker-compose.yml` does not set either variable, so a default Dokploy deploy silently provisions a fully privileged HR account with publicly-known credentials.
- **Exploit:** Attacker identifies a deployment → logs in at `/login` with `admin@company.com` / `admin123` → has HR role → reads all PII, exports all data via `/api/export`, promotes arbitrary users to HR/manager through HR server actions.
- **Fix:** Fail fast when `ADMIN_PASSWORD` is unset (throw), or generate a random password on first boot and log it once. Remove both the email and password defaults. Document `openssl rand -base64 24` in the deploy README.

### Vuln 2 — Default `AUTH_SECRET` in `docker-compose.yml`

- **File:** `docker-compose.yml:27`
- **Severity:** High  **Confidence:** 9/10  **Category:** `crypto_secrets`
- **Description:** `AUTH_SECRET: ${AUTH_SECRET:-please-change-this-secret-in-production}` falls back to a public string. This is the HMAC signing key for the NextAuth JWT consumed by `lib/auth.ts` and `proxy.ts` (`getToken({ secret: process.env.AUTH_SECRET })`). A deployment brought up without setting `AUTH_SECRET` will use the repo-visible value.
- **Exploit:** With the known secret, an attacker forges a JWT claiming `role: "hr"` (plus an `exp` and any `id`), sets it as the `authjs.session-token` / `__Secure-authjs.session-token` cookie, and accesses `/hr` + `/api/export` — no valid account needed.
- **Fix:** Use compose's required-var syntax so boot refuses to start without it:
  ```yaml
  AUTH_SECRET: ${AUTH_SECRET:?AUTH_SECRET must be set}
  ```
  Rotate any secret that was ever deployed with the default. Also remove the `DB_PASSWORD:-changeme` default on lines 8/21/26 for the same reason.

---

## Code-Review Findings

### Critical / Likely Bugs

1. **`Assessment.@@unique([employeeId])`** — `prisma/schema.prisma:135`
   Only one `Assessment` row is permitted per employee *forever*. If a second `Cycle` is ever opened, `prisma.assessment.create({ data: { cycleId, employeeId, ... } })` will throw `P2002`. The `cycleId` FK and the `@@index([cycleId])` strongly imply per-cycle rows were intended. Likely the constraint should be `@@unique([cycleId, employeeId])`. Confirm with product — the last feature commit mentioned a "cycle-free flow," which may or may not imply the current constraint is deliberate.

2. **`scripts/init-db.mjs:41` uses `prisma db push --accept-data-loss`**
   On every container start. If the running DB's schema drifts from the Prisma schema (e.g. a manual column add, a forgotten migration), Prisma will **silently drop** conflicting columns/tables. This is unsafe for production. Either replace with `prisma migrate deploy` against a versioned migration history, or guard `db push` so it only runs when the DB is empty.

### Medium

3. **`docker-compose.yml:28` — `AUTH_URL` default is `http://localhost:3012`**
   NextAuth uses this URL to validate cookies/issuer. Deploying to Dokploy without overriding it will break sessions (cookie domain/issuer mismatch). Remove the default and make it required.

4. **`lib/types.ts` vs Prisma generated types — duplicated shape with `snake_case` field names**
   Prisma models use `camelCase` (`managerId`, `jobLevel`, `createdAt`) while `lib/types.ts` redefines the same entities in `snake_case`. Server components and actions mix both styles and do manual field remapping (e.g. `app/manager/page.tsx:69`). Prefer `import type { User, Assessment } from '@prisma/client'` throughout; delete the parallel types.

5. **`lib/supabase.ts` — orphaned file**
   The file remains in the tree but is imported by nothing. Delete it to prevent accidental re-introduction.

6. **`prisma/schema.prisma:98-108` — `SkillStandard` composite index**
   Queries that filter by `(skillId, jobLevel)` are already served by the composite primary key `@@id([skillId, jobLevel])`; the separate `@@index([jobLevel])` supports job-level-only scans. No action required — the earlier reviewer flagged this as a missing composite index, but the composite PK covers it. Noting for correctness.

### Verified Non-Issues (false positives from the code-review sub-agent)

- **"`proxy.ts` is not hooked up as middleware"** — ❌ **False.** Next.js 16 renamed `middleware.ts` → `proxy.ts` and the exported function `middleware` → `proxy` (see Next.js 16 upgrade notes and `nextjs.org/docs/messages/middleware-to-proxy`). AGENTS.md explicitly warned about such breaking changes. Role-based access control **is** active at the edge.
- **"Race condition between `signIn` and role fetch in `app/actions/auth.ts`"** — not a security issue; worst case is a stale redirect target, and the page-level guards catch it.

### Conventions / Polish

- `app/employee/page.tsx`, `app/manager/page.tsx`, `app/hr/page.tsx` correctly `await searchParams` (Next 16 requires async dynamic APIs). ✓
- `next.config.ts` enables `output: 'standalone'` and `reactCompiler: true`. ✓
- `Dockerfile` uses multi-stage, non-root `nextjs:nodejs` user, copies Prisma client + scripts into the runner stage. ✓
- `.dockerignore` excludes `.env*` and `*.md`. ✓
- Server actions preserve ownership checks — `app/actions/assessment.ts` checks caller == employee; `app/actions/manager.ts` scopes by `managerId` relation; `app/actions/hr.ts` checks `role === 'hr'`. ✓

---

## Recommendations (ordered)

1. **Before any production deploy:** remove the `AUTH_SECRET`, `ADMIN_PASSWORD`, `ADMIN_EMAIL`, and `DB_PASSWORD` defaults; make them required via compose `${VAR:?err}` syntax.
2. **Confirm `Assessment.@@unique([employeeId])` is intentional.** If cycles are intended to produce separate assessment rows, change it to `@@unique([cycleId, employeeId])` and add a migration.
3. **Replace `prisma db push --accept-data-loss` in `init-db.mjs` with `prisma migrate deploy`.** Generate an initial migration from the current schema and commit it.
4. Delete `lib/supabase.ts`; migrate `lib/types.ts` consumers to Prisma-generated types.
5. Make `AUTH_URL` a required env var in `docker-compose.yml`.

---

## Files Reviewed

`lib/auth.ts` · `lib/auth-helpers.ts` · `lib/auth-types.d.ts` · `lib/prisma.ts` · `lib/types.ts` · `lib/supabase.ts` · `prisma/schema.prisma` · `app/api/auth/[...nextauth]/route.ts` · `app/api/export/route.ts` · `app/actions/{auth,assessment,manager,hr}.ts` · `app/{employee,manager,hr}/page.tsx` · `app/login/LoginForm.tsx` · `proxy.ts` · `next.config.ts` · `package.json` · `Dockerfile` · `docker-compose.yml` · `.dockerignore` · `scripts/docker-entrypoint.sh` · `scripts/init-db.mjs`
