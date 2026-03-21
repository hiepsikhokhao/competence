-- ─────────────────────────────────────────────────────────────────────────────
-- Competency Assessment Tool — VNGGames POC
-- Run against a fresh Supabase project (SQL Editor → Run, or supabase db reset).
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Enums ─────────────────────────────────────────────────────────────────────

create type public.user_role     as enum ('employee', 'manager', 'hr');
create type public.function_type as enum ('UA', 'MKT', 'LiveOps');
create type public.self_status   as enum ('not_started', 'draft', 'submitted');
create type public.manager_status as enum ('pending', 'reviewed');
create type public.cycle_status  as enum ('open', 'closed');

-- ── Helper: current user role ─────────────────────────────────────────────────
-- Security-definer so policies don't need a per-row sub-select.

create or replace function public.current_user_role()
returns public.user_role
language sql stable security definer
set search_path = public
as $$
  select role from public.users where id = auth.uid();
$$;

-- ── users ─────────────────────────────────────────────────────────────────────
-- Mirrors auth.users; one row per authenticated user.
-- Note: job_level is nullable here to allow the auth trigger to insert without it;
-- HR sets it via CSV import or the Users tab.

create table public.users (
  id         uuid primary key references auth.users (id) on delete cascade,
  name       text not null,
  email      text not null unique,
  role       public.user_role     not null default 'employee',
  dept       text,
  function   public.function_type,
  job_level  text,
  manager_id uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now()
);

-- Auto-create a users row when someone signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS
alter table public.users enable row level security;

create policy "users: authenticated can read all"
  on public.users for select
  to authenticated
  using (true);

create policy "users: own row update"
  on public.users for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "users: hr full access"
  on public.users for all
  to authenticated
  using  (public.current_user_role() = 'hr')
  with check (public.current_user_role() = 'hr');

-- ── skills ────────────────────────────────────────────────────────────────────

create table public.skills (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  definition text,
  function   public.function_type not null
);

alter table public.skills enable row level security;

create policy "skills: authenticated can read"
  on public.skills for select
  to authenticated using (true);

create policy "skills: hr full access"
  on public.skills for all
  to authenticated
  using  (public.current_user_role() = 'hr')
  with check (public.current_user_role() = 'hr');

-- ── skill_levels ──────────────────────────────────────────────────────────────
-- Describes what each of the 4 proficiency levels means for a given skill.

create table public.skill_levels (
  id          uuid primary key default gen_random_uuid(),
  skill_id    uuid not null references public.skills (id) on delete cascade,
  level       int  not null check (level in (1, 2, 3, 4)),
  label       text,            -- e.g. 'Basic', 'Developing', 'Proficient', 'Expert'
  description text,
  unique (skill_id, level)
);

alter table public.skill_levels enable row level security;

create policy "skill_levels: authenticated can read"
  on public.skill_levels for select
  to authenticated using (true);

create policy "skill_levels: hr full access"
  on public.skill_levels for all
  to authenticated
  using  (public.current_user_role() = 'hr')
  with check (public.current_user_role() = 'hr');

-- ── skill_standards ───────────────────────────────────────────────────────────
-- Required proficiency level per skill per job level.
-- Gap = final_score - required_level.

create table public.skill_standards (
  skill_id       uuid not null references public.skills (id) on delete cascade,
  job_level      text not null,
  required_level int  not null check (required_level in (1, 2, 3, 4)),
  primary key (skill_id, job_level)
);

alter table public.skill_standards enable row level security;

create policy "skill_standards: authenticated can read"
  on public.skill_standards for select
  to authenticated using (true);

create policy "skill_standards: hr full access"
  on public.skill_standards for all
  to authenticated
  using  (public.current_user_role() = 'hr')
  with check (public.current_user_role() = 'hr');

-- ── cycle ─────────────────────────────────────────────────────────────────────
-- Single assessment cycle for this POC; HR opens and closes it.

create table public.cycle (
  id        uuid primary key default gen_random_uuid(),
  name      text                not null default 'POC 2026',
  status    public.cycle_status not null default 'closed',
  opened_at timestamptz,
  closed_at timestamptz
);

alter table public.cycle enable row level security;

create policy "cycle: authenticated can read"
  on public.cycle for select
  to authenticated using (true);

create policy "cycle: hr full access"
  on public.cycle for all
  to authenticated
  using  (public.current_user_role() = 'hr')
  with check (public.current_user_role() = 'hr');

-- ── assessments ───────────────────────────────────────────────────────────────
-- One record per employee (unique on employee_id — single-cycle POC).

create table public.assessments (
  id                  uuid primary key default gen_random_uuid(),
  cycle_id            uuid not null references public.cycle (id) on delete cascade,
  employee_id         uuid not null references public.users (id) on delete cascade,
  self_status         public.self_status    not null default 'not_started',
  manager_status      public.manager_status not null default 'pending',
  self_submitted_at   timestamptz,
  manager_reviewed_at timestamptz,
  unique (employee_id)          -- single cycle: one assessment per employee
);

alter table public.assessments enable row level security;

-- Employees: read and write their own assessment
create policy "assessments: employee own"
  on public.assessments for all
  to authenticated
  using  (employee_id = auth.uid())
  with check (employee_id = auth.uid());

-- Managers: read assessments of direct reports
create policy "assessments: manager reads reports"
  on public.assessments for select
  to authenticated
  using (
    employee_id in (
      select id from public.users where manager_id = auth.uid()
    )
  );

-- Managers: update (review) assessments of direct reports
create policy "assessments: manager updates reports"
  on public.assessments for update
  to authenticated
  using (
    employee_id in (
      select id from public.users where manager_id = auth.uid()
    )
  );

-- HR: full access
create policy "assessments: hr full access"
  on public.assessments for all
  to authenticated
  using  (public.current_user_role() = 'hr')
  with check (public.current_user_role() = 'hr');

-- ── assessment_scores ─────────────────────────────────────────────────────────
-- One row per (assessment, skill). final_score is computed: manager_score if set,
-- otherwise self_score. Gap is calculated in application code (final_score - required_level).

create table public.assessment_scores (
  assessment_id uuid not null references public.assessments (id) on delete cascade,
  skill_id      uuid not null references public.skills (id)      on delete cascade,
  self_score    int check (self_score    between 1 and 4),
  manager_score int check (manager_score between 1 and 4),
  final_score   int generated always as (coalesce(manager_score, self_score)) stored,
  primary key (assessment_id, skill_id)
);

alter table public.assessment_scores enable row level security;

-- Employees: read/write own scores while self_status is not submitted
create policy "scores: employee reads own"
  on public.assessment_scores for select
  to authenticated
  using (
    assessment_id in (
      select id from public.assessments where employee_id = auth.uid()
    )
  );

create policy "scores: employee inserts own"
  on public.assessment_scores for insert
  to authenticated
  with check (
    assessment_id in (
      select id from public.assessments
      where employee_id = auth.uid()
        and self_status in ('not_started', 'draft')
    )
  );

create policy "scores: employee updates own"
  on public.assessment_scores for update
  to authenticated
  using (
    assessment_id in (
      select id from public.assessments
      where employee_id = auth.uid()
        and self_status in ('not_started', 'draft')
    )
  );

-- Managers: read, insert, and update scores for direct reports
create policy "scores: manager reads reports"
  on public.assessment_scores for select
  to authenticated
  using (
    assessment_id in (
      select a.id from public.assessments a
      join   public.users u on u.id = a.employee_id
      where  u.manager_id = auth.uid()
    )
  );

create policy "scores: manager inserts reports"
  on public.assessment_scores for insert
  to authenticated
  with check (
    assessment_id in (
      select a.id from public.assessments a
      join   public.users u on u.id = a.employee_id
      where  u.manager_id = auth.uid()
    )
  );

create policy "scores: manager updates reports"
  on public.assessment_scores for update
  to authenticated
  using (
    assessment_id in (
      select a.id from public.assessments a
      join   public.users u on u.id = a.employee_id
      where  u.manager_id = auth.uid()
    )
  );

-- HR: full access
create policy "scores: hr full access"
  on public.assessment_scores for all
  to authenticated
  using  (public.current_user_role() = 'hr')
  with check (public.current_user_role() = 'hr');

-- ── Indexes ───────────────────────────────────────────────────────────────────

create index on public.users (manager_id);
create index on public.users (function);
create index on public.users (job_level);
create index on public.skills (function);
create index on public.skill_standards (job_level);
create index on public.assessments (cycle_id);
create index on public.assessments (employee_id);
create index on public.assessment_scores (assessment_id);
