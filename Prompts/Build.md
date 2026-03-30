# 1. Install Claude Code
npm install -g @anthropic/claude-code

# 2. Tạo project
npx create-next-app@latest competency-tool \
  --typescript --tailwind --app --no-src-dir

# 3. Vào folder, start Claude Code
cd competency-tool
claude

# 4. Paste prompt đầu tiên vào Claude Code:
```

**Prompt Sprint 1 — Supabase setup:**
```
I'm building a Competency Assessment Tool. Here is the full spec: Build a web app for ~1000 employees to self-assess functional competencies. Line Managers verify results. HR Admin manages the system and views reports. This is a POC — single assessment cycle, email/password auth (SSO later).
Stack: Next.js 14 (App Router) + Supabase (PostgreSQL + Auth) + Tailwind CSS + Vercel.

Start with Sprint 1:
1. Install @supabase/supabase-js @supabase/ssr
2. Create /lib/supabase.ts with browser + server clients
3. Create /lib/types.ts with TypeScript interfaces for all tables
4. Create a SQL migration file at /supabase/schema.sql with the full schema + RLS policies above
```

**Prompt Sprint 2 — Auth:**
```
Continue the Competency Assessment Tool (see spec above).
Sprint 2: Auth flow
1. Build /app/login page with email/password form using Supabase Auth
2. After login, read user role from users table
3. Redirect: hr → /hr, manager → /manager, employee → /employee
4. Add middleware.ts to protect all routes by role
```

**Prompt Sprint 3 — Employee flow:**
```
Sprint 3: Employee assessment
1. /app/employee page: load skills by user's function from Supabase
2. Show assessment form: each skill has name, definition, 4 radio options with level descriptions
3. Auto-save to assessment_scores as draft on each change
4. Submit button: set self_status = 'submitted', lock form
5. Post-submit: show GapTable component (self_score vs standard, color-coded)
```

**Prompt Sprint 4 — Manager flow:**
```
Sprint 4: Manager review
1. /app/manager: two tabs — "My Assessment" (reuse Employee component) and "My Team"
2. My Team tab: fetch all users where manager_id = current user, show status badges
3. Click employee → review form: skill table with self_score (read-only) + manager_score (editable, pre-filled from self_score) + standard + gap column
4. Submit → set manager_status = 'reviewed', lock form, finalize gap display
```

**Prompt Sprint 5 — HR dashboard:**
```
Sprint 5: HR Admin
1. /app/hr: tabs for Dashboard, Cycle, Users, Skills, Export
2. Dashboard: completion rate cards by function, gap heatmap using a simple color grid (recharts or plain CSS)
3. Cycle tab: show status, Open/Close button updates cycle.status
4. Users tab: table with import CSV functionality
5. Skills tab: CRUD for skills + skill_standards matrix (job level vs required level)
6. Export: generate Excel file using xlsx library with full report data