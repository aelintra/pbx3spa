# System context (memory for AI)

Quick reference for new chats. See **PLAN.md** for full plan and design.

---

## PBX3 in one paragraph

**PBX3** is essentially a **vanilla Asterisk PBX** with an **API in front**. It uses a **SQLite3** database for persistent storage and a **generator** that reads the DB and builds the files Asterisk needs to run. The **API (pbx3api)** is colocated on each PBX3 instance and is the only management interface — the frontend never touches SQLite or the generator; it only talks to the API.

**PBX3 holds all of its structured data in SQLite3.** The main schema is defined by SQL create scripts under **pbx3/pbx3-1/opt/pbx3/db/db_sql/**:

- **sqlite_create_instance.sql** — Main instance schema (globals, trunks, and other PBX tables; system-level, not per-tenant).
- **sqlite_create_laravel.sql** — Laravel/auth schema (users, personal_access_tokens/Sanctum, migrations, sessions, cache, jobs, etc.).
- **sqlite_create_tenant.sql** — Tenant (cluster) schema; per-tenant data.
- **sqlite_message.sql** — Actual data loaded into table **tt_help_core** (help/UI strings; INSERTs into tt_help_core, not DDL).

Other files in that folder (e.g. sqlite_device.sql, sqlite_create_legacy.sql, sqlite_fix_*.sql) are additional DDL or fix scripts.

---

## Data table keys (id, pkey, shortuid)

Most PBX3 data tables (e.g. cluster/tenant, extension/ipphone, trunk/lineio) use **three keys**:

- **id** — A regular **KSUID** (K-sortable unique identifier).
- **pkey** — **Human-friendly key**; it may or may not be unique except **within a particular cluster (tenant)**. This is what users and the admin UI typically see and use (e.g. extension number 1001, trunk name).
- **shortuid** — A randomly generated **8-character key**; **always unique within an instance**. It is used to **uniquely define SIP users** in Asterisk. This allows, for example, two tenants each to have an extension number **1001**: the user/customer always sees "1001", but underneath each has a different shortuid so SIP treats them as distinct endpoints.

So: **pkey** = what humans see (and may repeat per tenant); **shortuid** = what the system uses for uniqueness (e.g. SIP identity) within the instance.

---

## What we're building

**pbx3-frontend** = admin UI to manage PBX3 instances: connect to an instance (API base URL), authenticate (login → Bearer token), then perform CRUD on data (tenants, extensions, trunks, queues, IVRs, firewall rules, etc.) and run operational commands (backups, snapshots, syscommands, firewall restart, live state). See **pbx3api/docs/routes-data-vs-operational.md** for data vs operational split.

---

## Users (API / DB)

pbx3api **users** table (SQLite): `id`, `cluster`, `name`, `email`, `email_verified_at`, `password`, `role`, `remember_token`, `created_at`, `updated_at`. Sample: `id=1`, `cluster=default`, `name=admin`, `email=admin@pbx3.com`, `role=isAdmin`. **whoami** and login responses can expose `name`, `email`, `role` for "Logged in as X" and admin-only UI. Sanctum tokens live in **personal_access_tokens**.

---

## Key references

- **pbx3api/docs/** — api.md, auth.md, general.md (full API).
- **pbx3api/docs/routes-data-vs-operational.md** — Data vs operational routes; firewall = list + add/change/delete rules via POST, PUT = restart.
- **pbx3api/test/ENDPOINT_RESULTS.md** — Live test results.
- **pbx3-frontend/workingdocs/PLAN.md** — Full plan, design, phases, next steps.
