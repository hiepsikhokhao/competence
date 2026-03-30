COMPETENCY ASSESSMENT TOOL — VNGGAMES
Final Product Specs v1.0

CONTEXT
Build a web app for ~1000 employees to self-assess functional competencies. Line Managers verify results. HR Admin manages the system and views reports. This is a POC — single assessment cycle, email/password auth (SSO later).
Stack: Next.js 14 (App Router) + Supabase (PostgreSQL + Auth) + Tailwind CSS + Vercel

ROLES
Employee     → self-assess, view own results + gap
Line Manager → self-assess (own) + review all direct reports + view their gaps
HR Admin     → full access: user mgmt, skill library, open/close cycle, reports, export

DATABASE SCHEMA
sql-- Users
create table users (
  domain text references auth.users primary key,
  name text not null,
  email text unique not null,
  role text check (role in ('employee','manager','hr')) not null,
  dept text,
  function text check (function in ('UA','MKT','LiveOps')),
  job_level text not null, -- e.g. '1.1','1.2','1.3','2.1','2.2','2.3','3.1'
  manager_id text references users(domain)
);

-- Skills
create table skills (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  definition text,
  function text check (function in ('UA','MKT','LiveOps')) not null
);

-- Skill level descriptors (what each proficiency level means per skill)
create table skill_levels (
  id uuid primary key default gen_random_uuid(),
  skill_id uuid references skills(id),
  level int check (level in (1,2,3,4)),
  label text, -- 'Basic','Developing','Proficient','Expert'
  description text
);

-- Standard: required proficiency per skill per job level
create table skill_standards (
  skill_id uuid references skills(id),
  job_level text not null,
  required_level int check (required_level in (1,2,3,4)),
  primary key (skill_id, job_level)
);

-- Single assessment cycle
create table cycle (
  id uuid primary key default gen_random_uuid(),
  name text default 'POC 2026',
  status text check (status in ('open','closed')) default 'closed',
  opened_at timestamptz,
  closed_at timestamptz
);

-- One assessment record per employee
create table assessments (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid references cycle(id),
  employee_id uuid references users(id) unique,
  self_status text check (self_status in ('not_started','draft','submitted')) default 'not_started',
  manager_status text check (manager_status in ('pending','reviewed')) default 'pending',
  self_submitted_at timestamptz,
  manager_reviewed_at timestamptz
);

-- Scores per skill per assessment
create table assessment_scores (
  assessment_id uuid references assessments(id),
  skill_id uuid references skills(id),
  self_score int check (self_score between 1 and 4),
  manager_score int check (manager_score between 1 and 4),
  final_score int generated always as (coalesce(manager_score, self_score)) stored,
  primary key (assessment_id, skill_id)
);

ROW LEVEL SECURITY (RLS)
sql-- Employees: read/write own assessment only
-- Managers: read all assessments where employee.manager_id = auth.uid()
-- HR: read/write everything

-- Enable RLS on all tables
alter table assessments enable row level security;
alter table assessment_scores enable row level security;

-- Employee policy
create policy "employee_own" on assessments
  for all using (employee_id = auth.uid());

-- Manager policy  
create policy "manager_reports" on assessments
  for select using (
    employee_id in (
      select id from users where manager_id = auth.uid()
    )
  );

-- HR policy
create policy "hr_all" on assessments
  for all using (
    (select role from users where id = auth.uid()) = 'hr'
  );
```

---

### GAP LOGIC
```
gap = final_score - required_level (from skill_standards)

gap > 0  → "Above standard"  → green
gap = 0  → "Meeting standard" → gray  
gap < 0  → "Below standard"  → red
```

Gap visible to: Employee (own), Manager (own + direct reports), HR (everyone).

---

### SCREENS & FEATURES

#### Auth
- `/login` — Email + password (Supabase Auth)
- Redirect by role after login: `/employee`, `/manager`, `/hr`

#### Employee `/employee`
- Header: name, function, job level
- Assessment form: list of skills for their function
- Each skill: name, definition, 4 radio options, each option a row with level descriptions
- Auto-save on change (draft)
- Submit button → locks form, shows confirmation
- After submit: results page with message wait for line manager reivew.  
- After line manager submit final, display gap table + simple bar/radar chart

#### Manager `/manager`
- **Tab 1 — My Assessment:** same as Employee flow
- **Tab 2 — My Team:** table of direct reports
  - Columns: Name, Job Level, Self-assessment status, Manager review status
  - Click row → Employee detail view
- **Employee detail view:**
  - Each skill: name, definition, 4 radio options, with level descriptions. 
  - Table: Self Score | Manager Score (editable, pre-filled = self score)
  - Save draft, if score different notify manager to discuss with employee before submit.  
  - Submit review button
  - After manager submit → locked, gap finalized, display gap table + simple bar/radar chart

#### HR Admin `/hr`
- **Dashboard tab:**
  - Completion stats: total submitted / total employees, by function
  - Skill gap heatmap: avg gap per skill per function
  - Drill-down: click function → see individual employees + gaps
- **Cycle tab:**
  - Show cycle status (open/closed)
  - Open / Close button
- **Users tab:**
  - Table of all users with filter by function/role
  - Inline edit: change manager assignment
- **Skills tab:**
  - List skills by function
  - Click on skill show 4 different proficiency level being hide
  - Set required level per job level (skill standards matrix)
- **Export button:** Download full report as Excel
  - Columns: Employee, Function, Job Level, Skill, Self Score, Manager Score, Final Score, Standard, Gap

---

### PROJECT STRUCTURE
```
/app
  /login          → login page
  /employee       → employee dashboard + assessment
  /manager        → manager dashboard (tabs)
  /hr             → hr dashboard (tabs)
  /api            → Next.js API routes (if needed beyond Supabase)

/components
  /assessment     → AssessmentForm, SkillRow, ScoreRadio
  /gap            → GapTable, GapChart, GapBadge
  /manager        → TeamTable, EmployeeReviewForm
  /hr             → Dashboard, HeatMap, UserTable, SkillLibrary, CycleControl
  /shared         → Layout, Navbar, Button, Badge, Modal

/lib
  supabase.ts     → Supabase client
  types.ts        → TypeScript interfaces
  utils.ts        → gap calculation, score helpers

/hooks
  useAssessment.ts
  useTeam.ts
  useHRData.ts
```

---

### POC DEPLOY PLAN
```
1. Supabase: tạo free project tại supabase.com
   → Run schema SQL above
   → Enable Email auth
   → Tạo tay test accounts:
      hr@vnggames.test       | role: hr
      manager1@vnggames.test | role: manager, function: MKT
      emp1@vnggames.test     | role: employee, function: MKT, manager: manager1
      emp2@vnggames.test     | role: employee, function: MKT, manager: manager1

2. Vercel: connect GitHub repo → auto deploy
   → Add env vars: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY

3. Khi POC approved → swap auth:
   → Supabase dashboard: Authentication → Providers → Enable Microsoft
   → Update 1 env var: SUPABASE_SSO_DOMAIN
   → Không cần sửa application code
