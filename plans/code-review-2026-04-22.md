# Code Review + Security Scan

**Date:** 2026-04-22
**Branch:** `claude/friendly-sagan-17fvU` (identical to `origin/main` @ `d48bca4`)
**Scope:** Supabase → Prisma + Postgres + NextAuth migration (commits `0165ce0..d48bca4`, ~1,834 / -962 lines across 33 files)

Overall grade: **B+**. Migration is functionally complete, auth/authz layering is sound, but infra defaults and a handful of type-safety rough edges need cleanup before production.

---

## Critical

### C1. Hardcoded placeholder `AUTH_SECRET` default
- `docker-compose.yml:27` — `AUTH_SECRET: ${AUTH_SECRET:-please-change-this-secret-in-production}`
- If the env var isn't set, the entire JWT session layer is signed with a public, well-known string. An attacker who reads this file can mint JWTs for any role, including `role: 'hr'`, and every server-side authz check (`requireHrOrError`, `proxy.ts:30`, `app/api/export/route.ts:8`) trusts the decoded role.
- **Fix:** remove the fallback, fail fast in `lib/auth.ts` if `AUTH_SECRET` is unset or < 32 bytes.

### C2. Hardcoded `changeme` DB password default
- `docker-compose.yml:8, 21, 26` — `${DB_PASSWORD:-changeme}` propagated to Postgres init, build arg, and runtime `DATABASE_URL`.
- A forgotten override at deploy = internet-exposed Postgres with a known password.
- **Fix:** no default; let compose fail when `DB_PASSWORD` is unset.

### C3. Hardcoded default admin password
- `scripts/init-db.mjs:88` — `const adminPassword = process.env.ADMIN_PASSWORD || 'admin123'`
- Runs on every container start as an upsert (line 91) and prints the admin email to stdout (line 102). A first boot without `ADMIN_PASSWORD` creates `admin@company.com / admin123` with role `hr`.
- **Fix:** throw if `ADMIN_PASSWORD` is missing; never log the resulting email alongside.

---

## High

### H1. Role is trusted straight from JWT with no re-check on role changes
- `proxy.ts:24-30` reads `token.role` and `app/api/export/route.ts:8` reads `(session.user as any).role`.
- `lib/auth.ts:57-66` only hits the DB on first Keycloak login; on subsequent requests the token is reused. If HR demotes a user, they keep their old role until the JWT expires or they re-login.
- **Fix:** in the `session` / `jwt` callback, look up the fresh role from the DB on a TTL (e.g. 5 min), or invalidate sessions server-side on role change.

### H2. Middleware is advisory, not authoritative
- `proxy.ts:60-65` redirects cross-role navigation but doesn't block server actions or `/api/*`. Any employee who knows the action name can invoke HR actions.
- This is **currently mitigated** by per-action guards (`requireHrOrError` in `app/actions/hr.ts`, ownership checks in `app/actions/assessment.ts:18-19`, `manager.ts:27-30`), so it's defense-in-depth, not a live vuln — but worth documenting so no one relies on middleware alone.

---

## Medium

### M1. `as any` casts on `session.user.role`
- `lib/auth.ts:52, 74` and `app/api/export/route.ts:8` cast the role.
- `lib/auth-types.d.ts` already augments `Session` and `JWT`; the casts should not be necessary. They mask future typos like `'HR'` vs `'hr'`.
- **Fix:** remove the casts once the module augmentation is imported consistently, or add a `getRole(session)` type guard.

### M2. Naive CSV parser
- `components/hr/CsvImport.tsx:86, 93` — `line.split(',').map(v => v.trim())`.
- Breaks on quoted fields containing commas or newlines. Not a security issue (values are stored as strings, sanitized by Prisma), just correctness.
- **Fix:** `papaparse` or `csv-parse`.

### M3. `prisma db push --accept-data-loss` at every boot
- `scripts/init-db.mjs` runs `db push --accept-data-loss` on every container start. Safe while no real data exists, but this flag silently drops columns/tables when a future schema diff triggers one. For production use proper `prisma migrate deploy` against versioned migrations.

### M4. No login rate limiting
- `app/actions/auth.ts:16-45` — credentials login has no throttling or lockout. With weak passwords allowed (no policy), brute force is tractable.
- **Fix:** IP/email based rate limit (e.g., Upstash ratelimit) on the credentials authorize path.

---

## Low

### L1. `password: String` is non-nullable in schema
- `prisma/schema.prisma:47`. Keycloak-federated users have no local password, so `init-db.mjs` pads with a bcrypt'd dummy. Allow `String?` so SSO users don't carry a rotating dead field.

### L2. `evidence` text has no length cap
- `AssessmentScore.evidence` in schema and `app/actions/assessment.ts:45-68` — unbounded `string`. Malicious or distracted employee could submit megabyte-scale text. Add a `@db.VarChar(2000)` (or similar) limit.

### L3. `output: 'standalone'` is correct; `output-file-tracing-root` not set
- `next.config.ts:4` — fine for Docker. Just note that for monorepo setups you'd need `outputFileTracingRoot`.

---

## Clean / Verified

- ✅ No Supabase imports remaining after migration (grep confirms).
- ✅ Prisma singleton correct for HMR (`lib/prisma.ts:1-7`).
- ✅ Next 16 async `params` / `searchParams` awaited in `app/{employee,manager,hr}/page.tsx`.
- ✅ All server actions call `revalidatePath()` after mutations.
- ✅ Export endpoint auth-gated (`app/api/export/route.ts:7-8`).
- ✅ IDOR checks in place: `assessment.ts:18-19`, `manager.ts:27-30`.
- ✅ Docker multi-stage build, non-root runtime user, healthcheck gating app start.
- ✅ `.dockerignore` excludes `.env*`, `.git`, `node_modules`.
- ✅ No `console.log` debug cruft in app code.
- ✅ bcryptjs used with cost 10 for credentials (`lib/auth.ts:30-34`, `scripts/init-db.mjs:89`).
- ✅ Middleware has redirect-loop guard (`proxy.ts:14-19`).
- ✅ i18n (`vi`/`en`) unchanged; skill localized columns still present in schema.

---

## Recommended Priority Order

1. **C1–C3** — swap out every `${X:-weak-default}` pattern for a "must-be-set" check. One PR, ~20 lines.
2. **H1** — add role refresh TTL in the `session` callback.
3. **M1** — drop the `as any` casts (mostly cleanup).
4. **M3** — introduce `prisma migrate deploy` and remove `db push --accept-data-loss` from the container entrypoint before real data lands.
5. **M4 / L2** — add rate limiting and length caps once the above are done.
