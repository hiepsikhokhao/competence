# SCREENS & FEATURES SPEC
## Competency Assessment Tool — VNGGames POC

---

### Auth
- `/login` — Email + password (Supabase Auth)
- Redirect by role after login: `/employee`, `/manager`, `/hr`

---

### Employee `/employee`
- Header: name, function, job level
- Assessment form: list of skills for their function
- Each skill: name, definition, 4 radio options, each option a row with level descriptions
- Auto-save on change (draft)
- Submit button → locks form, shows confirmation
- After submit: results page with message "Awaiting line manager review"
- After line manager submits final → display gap table + simple bar/radar chart

---

### Manager `/manager`

**Tab 1 — My Assessment:**
- Same as Employee flow

**Tab 2 — My Team:**
- Table of direct reports
- Columns: Name, Job Level, Self-assessment status, Manager review status
- Click row → Employee detail view

**Employee detail view:**
- Each skill: name, definition, 4 radio options with level descriptions
- Self Score (read-only) | Manager Score (editable, pre-filled = self score)
- Save draft button
- If any manager score differs from self score → show warning banner:
  "You have adjusted scores. Please discuss with employee before submitting."
- After manager clicks Submit review → lock all inputs
- Then display on the same page:
-  1. Gap table
    COLUMNS: Skill | Self Score | Manager Score | Standard | Importance | Standard Score | Actual Score | Gap

    CALCULATIONS:
    - Standard = required_level from skill_standards (based on employee's job_level)
    - Importance = importance column from skills table (1, 2, or 3)
    - Standard Score = required_level × importance
    - Actual Score = final_score × importance  
      (final_score = manager_score if set, else self_score)
    - Gap = Actual Score - Standard Score
    - Last row: show totals for Standard Score, Actual Score, Gap columns only

  COLOR CODE the Gap cell:
  - Gap > 0 → green
  - Gap = 0 → grey
  - Gap < 0 → red

- 2. RADAR CHART (recharts RadarChart):
    Show 2 lines: "Standard" (required_level) vs "Actual" (final_score)
    One point per skill on the radar axes
    Keep it simple, no importance weighting on chart

Apply this gap table to:
1. Employee results page (shown after manager_status = 'reviewed')
2. Manager employee detail view (shown after manager submits review)
---

### HR Admin `/hr`

**Dashboard tab:**
- Completion stats: total submitted / total employees, by function
- Skill gap heatmap: avg gap per skill per function
- Drill-down: click function → see individual employees + gaps

**Cycle tab:**
- Show cycle status (open/closed)
- Open / Close button

**Users tab:**
- Table of all users with filter by function/role
- Inline edit: change manager assignment

**Skills tab:**
- List skills by function
- Click skill → expand to show 4 proficiency level descriptions (collapsed by default)
- Set required level per job level (skill standards matrix)

**Export button:**
- Download full report as Excel
- Columns: Employee, Function, Job Level, Skill, Self Score, Manager Score, Final Score, Standard, Gap

---

### Business Logic

- `gap = final_score - required_level` (from skill_standards table)
- `final_score = manager_score` if set, else `self_score`
- Lock employee form after `self_status = 'submitted'`
- Lock manager form after `manager_status = 'reviewed'`
- Show gap table to employee only after `manager_status = 'reviewed'`
- Warning banner on manager screen when any `manager_score != self_score`
