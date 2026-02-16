# Database changes for extension provisioning (manual)

PBX3 is not Laravel; these changes are done manually to schema files and (for existing DBs) by running migration SQL.

---

## 1. Add two columns to the `ipphone` table

| Column         | Type    | Default | Purpose |
|----------------|---------|---------|--------|
| `provision`    | TEXT    | (none)  | Provisioning string with #INCLUDE directives (e.g. `#INCLUDE Yealink`, transport/protocol includes). |
| `provisionwith`| TEXT    | `'IP'`  | How to provision: `'IP'` or `'FQDN'` (from globals.FQDNPROV). |

**Placement:** Add **after** `pjsipuser` and **before** `stealtime` in every place the `ipphone` table is defined.

**Exact lines to add (use your editor; keep existing indentation/style):**
```sql
    "provision" TEXT,                        -- provisioning string with #INCLUDE directives
    "provisionwith" TEXT DEFAULT 'IP',      -- how to provision: IP or FQDN
```

---

## 2. Files to edit (build routines / schema source of truth)

Update each file that defines the `ipphone` table so new database builds include the two columns.

| # | File | Where to add the two lines |
|---|------|----------------------------|
| 1 | **pbx3/pbx3-1/opt/pbx3/db/db_sql/sqlite_create_tenant.sql** | After line 227 (`"pjsipuser" TEXT,...`) and before line 228 (`"stealtime" INTEGER,...`). |
| 2 | **pbx3/full_schema.sql** | After line 378 (`"pjsipuser" TEXT,...`) and before line 379 (`"stealtime" INTEGER,...`). |

If your build or tooling also uses either of these, update them the same way (add after `pjsipuser`, before `stealtime`):

| # | File | Note |
|---|------|------|
| 3 | **pbx3/running_schema.sql** | After `"pjsipuser" TEXT,...`, before `"stealtime" INTEGER,...`. |
| 4 | **pbx3/pbx3-1/opt/pbx3/db/db_mysql/mysql_create_catalog.sql** | Add `provision` and `provisionwith` in the same place in the ipphone definition (after pjsipuser). |
| 5 | **pbx3/pbx3-1/opt/pbx3/db/db_legacy_sql/sqlite_create_legacy.sql** | Same placement if this file is still used for builds. |

**Do not edit** `pbx3/pbx3-1/opt/pbx3/db/db_database_dumps/last_create.sql` by hand; it is likely generated. Regenerate it from your updated schema/build if needed.

---

## 3. Migration SQL (for existing databases only)

Run this against **each existing** database that already has an `ipphone` table but does not yet have these columns (e.g. before or when deploying the API changes).

**Option A – run via sqlite3:**
```bash
sqlite3 /path/to/your/sqlite.db << 'EOF'
ALTER TABLE ipphone ADD COLUMN "provision" TEXT;
ALTER TABLE ipphone ADD COLUMN "provisionwith" TEXT DEFAULT 'IP';
EOF
```

**Option B – save as a migration file and run when ready:**

Create file: **pbx3/pbx3-1/opt/pbx3/db/db_sql/migrations/add_provisioning_columns.sql** (or your preferred path):

```sql
-- Add provisioning columns to existing ipphone tables
-- Run manually against each existing DB (PBX3 has no Laravel migrations).
ALTER TABLE ipphone ADD COLUMN "provision" TEXT;
ALTER TABLE ipphone ADD COLUMN "provisionwith" TEXT DEFAULT 'IP';
```

Then run it when you’re ready, e.g.:
```bash
sqlite3 /path/to/instance/sqlite.db < pbx3/pbx3-1/opt/pbx3/db/db_sql/migrations/add_provisioning_columns.sql
```

---

## 4. Checklist

- [ ] **sqlite_create_tenant.sql** – added `provision` and `provisionwith` after `pjsipuser`, before `stealtime`.
- [ ] **full_schema.sql** – same two columns in same place.
- [ ] **running_schema.sql** (if used) – same.
- [ ] **mysql_create_catalog.sql** (if used) – same.
- [ ] **sqlite_create_legacy.sql** (if used) – same.
- [ ] **Migration SQL** – created and/or run against existing DB(s) when ready.

No changes are required to the **Device** table or data; it already exists in the instance schema with the columns the API needs (`pkey`, `sipiaxfriend`, `technology`, etc.).
