# SCREENS & FEATURES SPEC
## Competency Assessment Tool — VNGGames POC v1.2

---

### Auth
- `/login` — Email + password (Supabase Auth)
- Redirect by role after login: `/employee`, `/manager`, `/hr`

---

### Language Switcher

- **Placement:** top-right of the page header, next to Sign out button — on Employee and Manager screens only
- **Options:** `VI` (default) | `EN`
- **Persistence:** saved to `localStorage` key `lang`, restored on page load
- **Scope of effect:** skill content only —
  - Skill definition: `definition_vi` / `definition_en`
  - Proficiency level descriptions: `description_vi` / `description_en`
  - Skill name always stays in English (no translation)
  - UI labels, buttons, navigation remain in Vietnamese regardless of setting
- **Applies to:**
  - Employee: My Assessment form (skill cards + level description cards)
  - Employee: My Result gap table (skill definition tooltip, if present)
  - Manager: My Assessment form
  - Manager: My Team → Employee detail view (skill cards + level descriptions)
- **Database:** both language columns already exist:
  - `skills.definition_en` / `skills.definition_vi`
  - `skill_levels.description_en` / `skill_levels.description_vi`

---

### Employee `/employee`

**Header:** name, function, job level + language toggle (EN / VI)

**Tabs:** My Assessment | My Result

---

#### Tab: My Assessment

- Title: **"Game Publishing Functional Competency — Self-Assessment"**
- Instruction block (always visible at top):
  > Read each competency and its proficiency levels, select the level that best reflects your performance in recent months (typically 3–6 months).
  > Rate based on your consistent performance (not occasional or best-case situations).
  > If your capability falls between two levels, select the lower level.

- Assessment form: list of skills for their function
- Each skill:
  - Skill name + definition
  - 4 radio options (rows), each row shows level number + label + description
  - **Evidence / Example text field (optional)** — 1–2 lines, below the 4 options
  - **If employee selects a level HIGHER than the required standard for their job level → Evidence field becomes MANDATORY before submit**

- Auto-save on every change (draft)
- Submit button → locks entire form (read-only), shows confirmation
- After submit: form stays visible as **read-only** (no edits allowed), tab remains accessible

---

#### Tab: My Result

- Visible after `self_status = 'submitted'` (no longer gated on manager review)
- Always shows a **status banner** + **gap table** + **radar chart** once submitted

**Status banner** (top of tab):
- `manager_status = 'pending'` → amber/grey: *"Awaiting line manager review. Results below are based on your self-assessment."*
- `manager_status = 'reviewed'` → green: *"Review complete"*

**Gap table** (always shown after submit):
- When pending: treat `self_score` as the effective score (manager hasn't scored yet)
- When reviewed: use `final_score` (= `manager_score` if set, else `self_score`)
- When pending: show a subtle note below the table: *"* Scores may be adjusted after manager review"*

**Radar chart** (always shown after submit):
- Same score logic as gap table: `self_score` when pending, `final_score` when reviewed

---

### Manager `/manager`

**Header:** name, function + language toggle (EN / VI)

**Tabs:** My Assessment | My Team | My Result

---

#### Tab: My Assessment
- Same as Employee My Assessment flow (same title, same instruction block, same Evidence field logic)

---

#### Tab: My Result
- Same as Employee My Result (gap table + radar chart for manager's own self-assessment)
- Visible after manager's own `self_status = 'submitted'`; same pending/reviewed banner logic

---

#### Tab: My Team

**Title when on this tab:** "Game Publishing Functional Competency — Line Manager Assessment"

**Instruction block (always visible):**
> Review each competency and assess based on the employee's performance in recent months (typically 3–6 months).
> The displayed ratings reflect the employee's self-assessment for your reference.
> Rate based on consistent performance; if between two levels, select the lower level.

**Team table:**
- Columns: Name | Job Level | Self-assessment status | Manager review status
- Click row → Employee detail view

**Employee detail view:**
- Header: employee name, function, job level
- "← Back to team" link
- Each skill:
  - Skill name + definition
  - "Employee self-score: X — Label" (plain text, NO yellow highlight)
  - If the employee filled in evidence: show it below the self-score line, before the radio options
    - Label: "Employee's evidence:" in muted text, italic
    - If empty, show nothing (don't render the label either)
  - 4 radio options (rows) with level descriptions
  - Card for employee's self-score shows "Self" badge (no duplicate highlight)
  - Manager selects their score (pre-filled = self score)
- **Gap Analysis table shown ALONGSIDE the review form** (before submit, for calibration reference)
- Save draft button
- If any manager score differs from self score → warning banner: "You have adjusted scores. Please discuss with employee before submitting."
- Submit review button → locks form
- After submit: form locked, Gap Analysis table + Radar chart displayed

---

### Gap Table Spec

**Columns:** Skill | Self Score | Manager Score | Standard | Importance | Standard Score | Actual Score | Gap

**Calculations:**
- **Standard** = `required_level` from `skill_standards` (based on employee's job_level)
- **Importance** = `importance` from `skills` table (1, 2, or 3)
- **Standard Score** = `required_level × importance`
- **Actual Score** = `final_score × importance`
  - `final_score` = `manager_score` if set, else `self_score`
- **Gap** = `Actual Score − Standard Score`
- **Total row**: sum of Standard Score, Actual Score, Gap columns

**Gap cell color coding:**
- Gap > 0 → green
- Gap = 0 → grey
- Gap < 0 → red

---

### Radar Chart Spec

- Library: recharts RadarChart
- 2 lines:
  - **"Standard"** = `required_level × importance` per skill (weighted)
  - **"Actual"** = `final_score × importance` per skill (weighted)
- One axis per skill
- Note: chart uses weighted scores (×importance), not raw scores

---

### HR Admin `/hr`

**Tabs:** Dashboard | Users | Skills | Export

> **POC note:** Cycle management is hidden from the UI. The system treats the cycle as always open — no cycle status checks block any flow. Cycle data remains in the DB for future use.

---

#### Dashboard tab

**Completion stats:**
- Cards by function: show `X% — Y/Z submitted · N reviewed`
- Click function card → drill-down to individual employees + gaps

**Gap Heatmap:**
- Rows = skills, Columns = job levels
- Cell value = avg weighted GAP = avg(`actual_score - standard_score`) per skill per job level
- Color: green (positive), grey (zero), red (negative)
- Uses weighted formula: `GAP = (final_score × importance) - (required_level × importance)`

---

#### Users tab

**Search:** search box to find user by domain name (username)

**Table columns:** Name | Email | Role | Function | Level | Dept | Manager (inline edit dropdown) | Self status | Review status

**Actions per row:**
- Inline edit: change manager assignment
- **Revert button:** HR can revert assessment stage backwards:
  - If `manager_status = 'reviewed'` → revert to `pending` (unlocks manager form)
  - If `self_status = 'submitted'` → revert to `draft` (unlocks employee form)
  - Show confirmation dialog before reverting

---

#### Skills tab

**Sub-tabs:** Skills | Standards Matrix

**Skills sub-tab:**
- List skills grouped by function
- Click skill → expand to show 4 proficiency level descriptions (collapsed by default)
- **Edit skill:** only allows editing **definition** (skill name is not editable)
- **Edit level descriptions:** HR can edit description text for each of the 4 levels per skill
- Delete skill button

**Standards Matrix sub-tab:**
- Grid: rows = skills, columns = job levels
- Each cell = required_level (editable, 1–4)

---

#### Export tab / button

- Export full report as Excel
- **Include ALL employees** regardless of submission status
- Columns: Name | Email | Function | Job Level | Department | Self Status | Manager Status | Skill | Self Score | Manager Score | Final Score | Standard | Importance | Standard Score | Actual Score | Gap
- Employees who have not started: show their info with empty score columns and status = "not_started"

---

### Business Logic

- `final_score = manager_score` if set, else `self_score` (generated column in DB)
- `weighted_gap = (final_score × importance) - (required_level × importance)`
- `standard_score = required_level × importance`
- `actual_score = final_score × importance`
- **Cycle is always treated as open** — no cycle status check gates any flow (POC)
- Lock employee form after `self_status = 'submitted'` (read-only, still visible)
- Lock manager form after `manager_status = 'reviewed'`
- Employee sees My Result tab after `self_status = 'submitted'` (no longer gated on manager review)
  - Pending state: gap table uses `self_score` as effective score, shows pending banner + disclaimer note
  - Reviewed state: gap table uses `final_score`, shows "Review complete" banner
- Evidence/Example field is **mandatory** if employee self-score > required_level for that skill
- Gap Analysis shown to manager **during** review (not only after submit)
- HR revert: changes status back one stage, unlocks the corresponding form
