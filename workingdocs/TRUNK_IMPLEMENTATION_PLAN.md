# Trunks panel implementation plan (TRUNK_ROUTE_MULTITENANCY)

**Purpose:** Concrete implementation and modification steps to align the trunks panel and outbound routes with [TRUNK_ROUTE_MULTITENANCY.md](TRUNK_ROUTE_MULTITENANCY.md). Policy is in that doc; this plan is the checklist for the **first cut** (default tenant, schema placement, route dropdown). The **later phase** (virtual trunks) is out of scope here.

---

## Current state (brief)

- **Trunk create (SPA):** [TrunkCreateView.vue](pbx3spa/src/views/TrunkCreateView.vue) — has `cluster` ref, loads tenants, sends `cluster` in create body; user can pick any tenant.
- **Trunk create (API):** [TrunkController::save](pbx3api/app/Http/Controllers/TrunkController.php) — validates `cluster` (required, exists:cluster); accepts request `cluster`.
- **Trunk index (API):** `TrunkController::index()` — returns all trunks (SIP or IAX2); no cluster filter.
- **Route panel (SPA):** [RouteCreateView.vue](pbx3spa/src/views/RouteCreateView.vue), [RouteDetailView.vue](pbx3spa/src/views/RouteDetailView.vue) — load trunks via `GET trunks`, use them for path1–path4 options; no filter by cluster.
- **Schema:** `trunks` table is in [sqlite_create_tenant.sql](pbx3/pbx3-1/opt/pbx3/db/db_sql/sqlite_create_tenant.sql); target is [sqlite_create_instance.sql](pbx3/pbx3-1/opt/pbx3/db/db_sql/sqlite_create_instance.sql).

---

## Phase 1 — First cut (align with TRUNK_ROUTE_MULTITENANCY §4)

### 1.1 Force new trunks to default tenant (API)

**Repo:** pbx3api

- In **TrunkController::save()**: After validation, **overwrite** `$request->cluster` or set `$trunk->cluster = 'default'` before `move_request_to_model` so that the created trunk always has `cluster = 'default'` regardless of request body. Optionally keep validating that `cluster` if present equals `'default'` for create, or ignore request `cluster` and always set default.
- **File:** [pbx3api/app/Http/Controllers/TrunkController.php](pbx3api/app/Http/Controllers/TrunkController.php)

**Acceptance:** POST to create a trunk with any `cluster` in body results in a trunk row with `cluster = 'default'`.

---

### 1.2 Force new trunks to default tenant (frontend)

**Repo:** pbx3spa

- In **TrunkCreateView.vue**: **Hide** the trunk cluster (tenant) field from the user in this first cut—do not show a tenant dropdown or cluster field on the create form. Always set `cluster = 'default'` in code and send it in the create body; the user does not see or choose it.
- Ensure **applySchemaDefaults** or initial values use `'default'` for cluster; resetForm already sets `cluster.value = 'default'`.
- **File:** [pbx3spa/src/views/TrunkCreateView.vue](pbx3spa/src/views/TrunkCreateView.vue)

**Acceptance:** Create trunk form does not show cluster/tenant; new trunks are always created in the default tenant.

---

### 1.3 Move trunks table to instance SQL (schema placement)

**Repo:** pbx3

- **Remove** the `CREATE TABLE IF NOT EXISTS trunks (...)` block (and any trailing comma/comment) from **sqlite_create_tenant.sql**.
- **Add** the same `CREATE TABLE IF NOT EXISTS trunks (...)` block to **sqlite_create_instance.sql** (e.g. after the existing tables, before COMMIT). Preserve the full column list and `UNIQUE("cluster", "pkey")`.
- The **canonical** definition of the DB is in **pbx3/pbx3-1/opt/pbx3/db/db_sql** (these create scripts). Ignore full_schema.sql and running_schema.sql for this change.
- **Files:**  
  - [pbx3/pbx3-1/opt/pbx3/db/db_sql/sqlite_create_tenant.sql](pbx3/pbx3-1/opt/pbx3/db/db_sql/sqlite_create_tenant.sql)  
  - [pbx3/pbx3-1/opt/pbx3/db/db_sql/sqlite_create_instance.sql](pbx3/pbx3-1/opt/pbx3/db/db_sql/sqlite_create_instance.sql)

**Acceptance:** Trunks table is defined only in instance SQL; tenant SQL no longer defines it. New DBs provisioned from these scripts reflect that. Existing single-DB deployments already have the table; no runtime migration needed (same physical DB).

---

### 1.4 Outbound routes: trunk list from default tenant only

**Repo:** pbx3spa (and optionally pbx3api)

**Option A — Frontend filter (minimal change):**  
In **RouteCreateView.vue** and **RouteDetailView.vue**, after loading trunks via `GET trunks`, filter the list to rows where `cluster === 'default'` (or `t.cluster === 'default'`) before using it for path1–path4 options. So the dropdown only shows default-tenant trunks.

**Option B — API query param:**  
Add optional query support to **TrunkController::index()**, e.g. `?cluster=default`. When present, add `->where('cluster', $request->query('cluster'))` to the query. Frontend calls `GET trunks?cluster=default` when loading trunks for the route panel. List view and other callers can omit the param to get all trunks if needed.

Recommendation: **Option A** for first cut (no API change); Option B if you want the API to enforce “trunks for route panel = default only” and keep index generic.

- **Files:**  
  - [pbx3spa/src/views/RouteCreateView.vue](pbx3spa/src/views/RouteCreateView.vue) — in `loadTrunks()` or the computed options, filter to `cluster === 'default'`.  
  - [pbx3spa/src/views/RouteDetailView.vue](pbx3spa/src/views/RouteDetailView.vue) — same.

**Acceptance:** When building or editing an outbound route, the trunk dropdown(s) only list trunks in the default tenant.

---

## Phase 2 — Later (out of scope for this plan)

- Virtual trunks: schema (e.g. virtual trunk table or allocation table), API (map standard names to real trunks), admin UI to assign real trunks to Primary/Secondary/International/Failover.
- Outbound routes: store reference to virtual trunk (name or id) instead of raw real-trunk id where applicable; resolve to real trunk at runtime.
- Migration tooling: “Land tenant on this instance” and “map Primary → …, Secondary → …” as part of tenant migration.
- Access control: Restrict trunk management to system admin when role-based access is implemented.

See TRUNK_ROUTE_MULTITENANCY §5 and §2.

---

## Order of work (suggested)

1. **1.1 + 1.2** — Force default tenant on create (API + frontend). Test: create trunk, confirm cluster is default; UI does not allow choosing another tenant for new trunks.
2. **1.4** — Route panel: filter trunk dropdown to default tenant. Test: create/edit route, confirm only default-tenant trunks appear in path dropdowns.
3. **1.3** — Move trunks table from tenant SQL to instance SQL (canonical scripts in db_sql only). Test: provisioning or schema checks; existing DB unchanged at runtime.

---

## References

- [TRUNK_ROUTE_MULTITENANCY.md](TRUNK_ROUTE_MULTITENANCY.md) — ownership, first cut, migration, later phase.
- [COMPLEX_CREATE_PLAN.md](COMPLEX_CREATE_PLAN.md) — trunk create (type chooser, API).
- [.cursor/rules/trunk-route-multitenancy.mdc](../../.cursor/rules/trunk-route-multitenancy.mdc) — Cursor rule to read TRUNK_ROUTE_MULTITENANCY when editing trunk/route/schema files.
