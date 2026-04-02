# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

- `npm run dev` — Start dev server on port 3012
- `npm run build` — Production build
- `npm run start` — Start production server on port 3012
- `npm run lint` — ESLint

## Tech Stack

- **Next.js 16.2.1** (App Router, React Server Components, React Compiler enabled)
- **React 19.2.4** with TypeScript 5
- **Supabase** — PostgreSQL database + auth (via `@supabase/ssr`)
- **Tailwind CSS 4** with PostCSS plugin (not legacy config file)
- **shadcn/ui** components (Radix UI primitives) in `components/ui/`
- **Recharts** for data visualization
- **XLSX** for Excel export

## Architecture

### Routing & Auth
Middleware in `proxy.ts` handles auth and role-based routing. Three roles: `employee`, `manager`, `hr` — each gets a dedicated route (`/employee`, `/manager`, `/hr`). Auth uses Supabase JWT in cookies with role cached in `user-role` cookie.

### Data Layer
- **Server Components** fetch data directly from Supabase (no client-side fetching)
- **Server Actions** in `app/actions/` handle all mutations (assessment, manager review, HR admin)
- **Single API route:** `GET /api/export` generates XLSX reports
- Supabase clients: `createClient()` for browser, `createServerSupabaseClient()` for server — both in `lib/supabase.ts`
- All database types defined in `lib/types.ts` with a full `Database` interface

### Key Domain Concepts
- **Skills** are function-specific (UA, MKT, LiveOps) with importance weights (1-3)
- **Proficiency levels** 1-4: Basic, Developing, Proficient, Expert
- **Job levels**: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 3.1
- **Gap** = `final_score - required_level` (DB column `final_score` is GENERATED ALWAYS as `COALESCE(manager_score, self_score)`)
- **Assessment flow**: Employee self-rates → Manager reviews → Gap analysis visible
- One assessment cycle open at a time

### Component Organization
- `components/ui/` — shadcn/ui primitives (button, card, table, input, badge)
- `components/assessment/` — Employee self-assessment (auto-save pattern with `useTransition`)
- `components/manager/` — Manager review forms and team table
- `components/gap/` — Gap analysis table and badges
- `components/hr/` — Dashboard, cycle/user/skill management, CSV import, export

### i18n
Custom context-based (no library). `LangProvider` in `lib/lang-context.tsx`, hook via `lib/hooks/useLang.ts`. Supports `vi` and `en`. Skill definitions and level descriptions have `_en`/`_vi` suffixed columns in the database.

### Utility Functions
`lib/utils.ts` contains `cn()` (Tailwind class merge), `calcGap()`, `gapStatus()`, `GAP_COLORS`, `PROFICIENCY_LABELS`, `JOB_LEVELS`.

## Conventions

- Path alias: `@/*` maps to project root
- Functions and job levels are hardcoded constants, not dynamic
- CSV import updates existing users only (does not create new accounts)
- All server actions include ownership/role authorization checks
- `revalidatePath()` is called after mutations to refresh RSC data
