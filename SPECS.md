# Competency Tool — Product Specs

> **Mục đích tài liệu này:** Mô tả đầy đủ flow và tính năng hiện tại của dự án.
> Chỉnh sửa trực tiếp file này trước khi đưa vào Claude Code để implement.

---

## 1. Tổng quan

Ứng dụng web đánh giá năng lực nhân viên (Competency Assessment Tool) cho nội bộ công ty.
- **Tech stack:** Next.js (App Router) + Supabase (auth + DB) + Tailwind CSS
- **Deployment:** Single Next.js app, multi-role, server-side rendering

---

## 2. Roles & Routing

| Role | Route | Mô tả |
|------|-------|--------|
| `employee` | `/employee` | Tự đánh giá kỹ năng |
| `manager` | `/manager` | Tự đánh giá + review team |
| `hr` | `/hr` | Admin toàn bộ hệ thống |

**Auth flow:**
- `/` → redirect `/login`
- Sau login → `proxy.ts` redirect về route theo `role` của user
- Mỗi route server-side kiểm tra role, nếu sai → redirect `/login`

---

## 3. Data Model (Supabase)

### Bảng `users`
| Column | Type | Ghi chú |
|--------|------|---------|
| `id` | uuid | Supabase Auth UID |
| `name` | text | |
| `email` | text | |
| `username` | text \| null | |
| `role` | enum | `employee` \| `manager` \| `hr` |
| `dept` | text \| null | Phòng ban |
| `function` | enum \| null | `UA` \| `MKT` \| `LiveOps` |
| `job_level` | text \| null | `1.1` \| `1.2` \| `1.3` \| `2.1` \| `2.2` \| `2.3` \| `3.1` |
| `manager_id` | uuid \| null | FK → users.id |
| `created_at` | timestamptz | |

### Bảng `skills`
| Column | Type | Ghi chú |
|--------|------|---------|
| `id` | uuid | |
| `name` | text | |
| `definition` | text \| null | Mô tả skill |
| `function` | enum | `UA` \| `MKT` \| `LiveOps` — skill thuộc về function nào |
| `importance` | int \| null | `1` = Low, `2` = Medium, `3` = High |

### Bảng `skill_levels`
Mô tả từng mức proficiency của skill (có thể tùy chỉnh per-skill).
| Column | Type |
|--------|------|
| `id` | uuid |
| `skill_id` | uuid FK |
| `level` | int (1–4) |
| `label` | text \| null | ví dụ: "Basic", "Developing", "Proficient", "Expert" |
| `description` | text \| null | Mô tả hành vi cụ thể ở level đó |

### Bảng `skill_standards`
Yêu cầu level tối thiểu của từng skill theo job_level.
| Column | Type |
|--------|------|
| `skill_id` | uuid FK |
| `job_level` | text |
| `required_level` | int (1–4) |
| *(PK: skill_id + job_level)* | |

### Bảng `cycle`
Chu kỳ đánh giá (chỉ 1 cycle open tại một thời điểm).
| Column | Type |
|--------|------|
| `id` | uuid |
| `name` | text |
| `status` | enum | `open` \| `closed` |
| `opened_at` | timestamptz \| null |
| `closed_at` | timestamptz \| null |

### Bảng `assessments`
Một assessment = 1 nhân viên × 1 cycle.
| Column | Type | Ghi chú |
|--------|------|---------|
| `id` | uuid | |
| `cycle_id` | uuid FK | |
| `employee_id` | uuid FK → users.id | |
| `self_status` | enum | `not_started` → `draft` → `submitted` |
| `manager_status` | enum | `pending` → `reviewed` |
| `self_submitted_at` | timestamptz \| null | |
| `manager_reviewed_at` | timestamptz \| null | |

### Bảng `assessment_scores`
| Column | Type | Ghi chú |
|--------|------|---------|
| `assessment_id` | uuid FK | |
| `skill_id` | uuid FK | |
| `self_score` | int \| null | 1–4 |
| `manager_score` | int \| null | 1–4 |
| `final_score` | int \| null | **GENERATED**: `COALESCE(manager_score, self_score)` |
| *(PK: assessment_id + skill_id)* | | |

---

## 4. Hệ thống tính điểm

- **Proficiency levels:** `1` Basic · `2` Developing · `3` Proficient · `4` Expert
- **Job levels:** `1.1`, `1.2`, `1.3`, `2.1`, `2.2`, `2.3`, `3.1`
- **Gap = final_score − required_level** (trước khi nhân importance)
- **Weighted gap:** `(final_score × importance) − (required_level × importance)`
  - `gap > 0` → Above standard (xanh)
  - `gap = 0` → Meeting standard (xám)
  - `gap < 0` → Below standard (đỏ)
- **final_score** = `manager_score` nếu có, ngược lại dùng `self_score`

---

## 5. Flows chi tiết

### 5.1 Employee Flow (`/employee`)

**Trạng thái assessment:**

```
not_started → [rate any skill] → draft → [rate all + submit] → submitted
                                                                    ↓
                                                         [manager reviews]
                                                                    ↓
                                                            reviewed (hiện kết quả)
```

**Chi tiết từng state:**

| State | UI hiển thị |
|-------|-------------|
| `not_started` / `draft` | Form đánh giá kỹ năng (auto-save khi chọn score) |
| `submitted`, manager chưa review | Màn hình "Awaiting line manager review" |
| `submitted` + manager `reviewed` | GapTable + Radar chart |

**Điều kiện:**
- Cycle phải `open`
- User phải có `function` được set
- Function phải có skills
- Nút Submit chỉ active khi **tất cả skills** đã được rate

**Auto-save:** Mỗi lần chọn score một skill → gọi `saveScore()` server action ngay lập tức, status tự chuyển sang `draft`.

---

### 5.2 Manager Flow (`/manager`)

**2 tabs:**

#### Tab "My Assessment"
- Giống hệt Employee flow — manager cũng tự đánh giá năng lực bản thân

#### Tab "My Team"
- Hiển thị danh sách direct reports (users có `manager_id = manager.id`)
- Mỗi row: tên, email, function, job_level, trạng thái self-assessment, trạng thái review
- Chỉ hiển thị link review khi employee đã `submitted`

**Review flow cho từng employee:**
- URL: `/manager?tab=team&employee=<employee_id>`
- Hiển thị `ReviewForm` với từng skill:
  - Cột: Skill name, Definition, Self Score, Manager Score (editable), Required Level, Gap
- Manager chọn `manager_score` cho từng skill (auto-save)
- Nút "Submit Review" → `manager_status = reviewed`, lock form
- Sau khi review, employee có thể thấy kết quả

---

### 5.3 HR Flow (`/hr`)

**5 tabs:**

#### Tab "Dashboard"
- **Completion cards:** 3 cards (UA, MKT, LiveOps) — hiện % submitted, số submitted/total, số reviewed
  - Click vào card → drill-down: bảng từng employee trong function đó với gap per skill
- **Gap Heatmap (per function):** Bảng skill × job_level, mỗi cell = avg gap của nhóm đó
  - Màu: đỏ (gap < -1) → vàng → xám → xanh nhạt → xanh đậm (gap > +1)
  - Chỉ hiển thị khi có assessments đã submitted

#### Tab "Cycle"
- Xem danh sách cycles, trạng thái
- Tạo cycle mới (chỉ cần đặt tên)
- Open / Close cycle

#### Tab "Users"
- Bảng tất cả users: name, email, role, function, job_level, dept, manager
- Có thể assign/thay đổi manager cho từng user (dropdown)
- **CSV Import:** Upload file CSV để batch update thông tin users
  - Columns: `name`, `email`, `role`, `dept`, `function`, `job_level`, `manager_email`
  - User phải đã có tài khoản (match theo email), không tạo mới
  - Báo cáo: updated / skipped / errors

#### Tab "Skills"
- Quản lý skills theo từng function (UA / MKT / LiveOps)
- CRUD: tạo skill, sửa tên/definition, xóa skill
- Set `importance` (1/2/3) cho từng skill
- Set `required_level` per job_level cho từng skill (bảng skill × job_level)

#### Tab "Export"
- Nút download file Excel (`.xlsx`) với 2 sheets:
  - **Summary:** 1 row per assessment (name, email, function, job_level, dept, self_status, manager_status, submitted_at, reviewed_at)
  - **Scores:** 1 row per assessment × skill (name, function, job_level, skill, self_score, manager_score, final_score, required_level, gap)

---

## 6. Components chính

| Component | Mô tả |
|-----------|-------|
| `AssessmentForm` | Client component, chứa tất cả skill rows, auto-save, nút submit |
| `SkillRow` | Một hàng trong form, chọn proficiency level (radio/button) |
| `GapTable` | Bảng kết quả gap + Radar chart (recharts) |
| `ReviewForm` | Form manager chấm điểm từng skill của employee |
| `ReviewGapAnalysis` | Phân tích gap trong context review |
| `TeamTable` | Bảng danh sách team members |
| `TabBar` | Navigation tabs (shared giữa manager và HR) |
| `DashboardTab` | HR dashboard: completion cards + heatmap |
| `CycleTab` | HR cycle management |
| `UsersTab` | HR users table + manager assignment |
| `UsersTableClient` | Client-side phần tương tác của users table |
| `CsvImport` | Upload + parse + import CSV users |
| `SkillsTab` | HR skills management |
| `SkillsManager` | CRUD skills + standards |
| `ExportTab` | Nút download XLSX |

---

## 7. Server Actions

| Action | File | Mô tả |
|--------|------|-------|
| `saveScore` | `actions/assessment.ts` | Auto-save một skill score |
| `submitAssessment` | `actions/assessment.ts` | Submit toàn bộ assessment |
| `saveManagerScore` | `actions/manager.ts` | Auto-save manager score cho một skill |
| `submitManagerReview` | `actions/manager.ts` | Submit review, lock form |
| `createCycle` | `actions/hr.ts` | Tạo cycle mới |
| `openCycle` | `actions/hr.ts` | Mở cycle |
| `closeCycle` | `actions/hr.ts` | Đóng cycle |
| `updateUserManager` | `actions/hr.ts` | Assign manager cho user |
| `importUsers` | `actions/hr.ts` | Batch update users từ CSV |
| `createSkill` | `actions/hr.ts` | Tạo skill |
| `updateSkill` | `actions/hr.ts` | Sửa skill |
| `deleteSkill` | `actions/hr.ts` | Xóa skill |
| `upsertStandard` | `actions/hr.ts` | Set required_level cho skill × job_level |
| `logout` | `actions/auth.ts` | Đăng xuất |

---

## 8. API Routes

| Route | Method | Mô tả |
|-------|--------|-------|
| `/api/export` | GET | Download XLSX report (HR only) |

---

## 9. Những điểm cần lưu ý / Constraints

- Mỗi user chỉ có **1 assessment** tại một thời điểm (không track theo cycle_id khi query, chỉ `maybeSingle`)
- Manager cũng phải đi qua self-assessment flow giống employee
- `final_score` là **GENERATED column** trong DB — không được write trực tiếp
- Cycle status: chỉ 1 cycle `open` hoạt động tại một thời điểm (convention, không enforce bằng DB constraint)
- Functions cố định: `UA`, `MKT`, `LiveOps` (hardcoded trong `lib/types.ts` và nhiều nơi khác)
- Job levels cố định: `1.1` → `3.1` (hardcoded trong `lib/utils.ts`)
- CSV import **không tạo tài khoản mới**, chỉ update existing users (user phải đăng ký trước)

---

## 10. Các thay đổi muốn thực hiện

> ✏️ **Điền vào đây những gì bạn muốn thay đổi:**

### Flow thay đổi
- [ ] ...

### Tính năng mới
- [ ] ...

### Tính năng cần bỏ / sửa
- [ ] ...

### Data model thay đổi
- [ ] ...
