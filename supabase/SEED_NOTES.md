# Seed & Import Notes

## username column

The `users.username` column is auto-populated by the `handle_new_user()` trigger
whenever a new user signs up via Supabase Auth:

```
username = split_part(email, '@', 1)
```

Examples:
- `annv@vng.com.vn`      → `annv`
- `john.doe@vng.com.vn`  → `john.doe`
- `manager1@vng.com.vn`  → `manager1`

**No extra step is needed during CSV import.** When HR imports users via the
Users tab, the `username` field is already set from the signup trigger.
The CSV import only updates profile fields (`name`, `role`, `dept`, `function`,
`job_level`, `manager_email`) — it does not touch `username`.

If a username needs to be changed after signup, users can update their own row
(covered by the `"users: own row update"` RLS policy).

## CSV import format

```
name,email,role,dept,function,job_level,manager_email
An Nguyen,annv@vng.com.vn,employee,Marketing,MKT,2.1,manager@vng.com.vn
```

- `email` is the match key — the account must already exist in Supabase Auth
- `manager_email` is resolved to `manager_id` server-side
- Rows with unrecognised emails are skipped and reported as warnings

## Running the schema

Paste the full contents of `schema.sql` into the Supabase SQL Editor and click
**Run**. The script is idempotent for functions (`create or replace`) but not
for tables — run against a fresh project or drop existing tables first.
