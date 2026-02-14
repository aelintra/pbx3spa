# Field mutability (API) — implementation plan

**Goal:** Single source of truth for (1) which fields are read-only vs editable, and (2) column defaults. No duplicated metadata in the frontend; no generated or copied schema files. DB is the source for schema/defaults; API code is the source for update rules.

**Principles (from discussion):**
- Read schema (defaults, types) from the **running database** at request time (e.g. `PRAGMA table_info`). No cache, no file. SQLite is fast; admin usage is low.
- read_only / updateable derived from existing controller **updateableColumns** in code.
- Frontend consumes one endpoint and does not hard-code schema metadata per resource.

**Where the schema really lives:** The canonical schema that creates the database is the **four files in pbx3/pbx3-1/opt/pbx3/db/db_sql** (`sqlite_create_instance.sql`, `sqlite_create_tenant.sql`, `sqlite_create_laravel.sql`, `sqlite_message.sql`). Not full_schema.sql (that is a consolidated reference elsewhere). When the API reads from the database with `PRAGMA table_info`, it gets the actual state of the running DB—which reflects those four files (and any migrations applied). So the DB at runtime is the truth; no derived or copied schema file should be used for this feature.

---

## 1. Scope

### 1.1 Resources in scope (first phase)

Include resources that have both:
- A Laravel controller with `$updateableColumns` (or equivalent),
- A corresponding Eloquent model with `$table` pointing at a SQLite table.

**Initial set (main CRUD panels in SPA):**

| API resource (URL segment) | Controller        | Model     | SQLite table |
|----------------------------|-------------------|-----------|--------------|
| extensions                 | ExtensionController | Extension | ipphone       |
| queues                     | QueueController   | Queue     | queue        |
| agents                     | AgentController   | Agent     | agent        |
| routes                     | RouteController   | Route     | route        |
| trunks                     | TrunkController   | Trunk     | trunks       |
| ivrs                       | IvrController     | Ivr       | ivrmenu      |
| inroutes                   | InboundRouteController | (model) | inroutes     |
| tenants                    | TenantController  | Tenant    | cluster      |

Additional resources (Sysglobal, HolidayTimer, DayTimer, CustomApp, CosOpen, CosClose, ClassOfService, etc.) can be added later using the same mechanism.

### 1.2 Out of scope (for this plan)

- Caching (per decision: no cache; keep it simple).
- Exposing “widget” or “component type” (dropdown vs toggle) from the API; frontend continues to choose component per field.
- Changing validation rules or update behaviour; only **exposing** existing metadata.

---

## 2. API side

### 2.1 Endpoint

- **Method/URL:** `GET /schemas` (or `GET /schemas/{resource}` if you prefer per-resource later).
- **Auth:** Same as other admin read endpoints (e.g. `auth:sanctum`, `abilities:admin`).
- **Response shape (per resource):**

```json
{
  "extensions": {
    "read_only": ["id", "shortuid", "pkey", "device", "macaddr", ...],
    "updateable": ["cluster", "desc", "active", "transport", ...],
    "defaults": {
      "cluster": "default",
      "active": "YES",
      "transport": "udp",
      ...
    },
    "columns": {
      "pkey": { "type": "TEXT", "default": null, "notnull": 1 },
      "cluster": { "type": "TEXT", "default": "default", "notnull": 0 },
      ...
    }
  },
  "queues": { ... },
  ...
}
```

- **read_only:** List of column names that must not be edited. Derived from: all columns for that table minus updateable, plus always `id`, `shortuid` (and any other system-set keys).
- **updateable:** List of keys that appear in the controller’s updateableColumns (for update); can be omitted if frontend only needs read_only.
- **defaults:** Map of column name → default value for create forms. From DB only (see 2.3).
- **columns:** Optional; full column info (type, default, notnull) from DB for future use. Can be omitted in v1 and only expose **defaults** if that’s enough.

### 2.2 Where it lives

- **Route:** Register `GET /schemas` in `routes/api.php` inside the admin middleware group, pointing at a new controller (e.g. `SchemaController`) or a single method on an existing “meta” controller.
- **Controller:** One method that returns the merged schema for all in-scope resources (or for a single resource if you add `GET /schemas/{resource}`).
- **Service (recommended):** A small `SchemaService` (or similar) that:
  - Knows the mapping: resource key → [Controller class, Model class].
  - For each resource: (a) gets updateable list from controller’s updateableColumns, (b) gets table name from model’s `$table`, (c) runs DB query for column info (see 2.3), (d) builds read_only, updateable, defaults (and optionally columns).
  - No cache; run fresh each request.

### 2.3 Reading from the database

- Use the **same DB connection** the API already uses (SQLite).
- For each table (from model `$table`), run:
  - **SQLite:** `PRAGMA table_info('table_name');`
  - Returns: `cid`, `name`, `type`, `notnull`, `dflt_value`, `pk`.
- **Table name:** Use the model’s `$table` (e.g. `ipphone`, `queue`, `cluster`). Watch for case: SQLite table names may be mixed case (e.g. `IPphoneCOSopen`); use the value from the model.
- **defaults:** From `dflt_value`. Normalise for JSON (e.g. SQLite may return integers or quoted strings; convert to a JSON-friendly value so the SPA can preset form fields).
- **columns:** If exposed, map `name`, `type`, `dflt_value`, `notnull` into the response. Optionally omit in v1.

### 2.4 Deriving read_only and updateable

- **updateable:** From the controller’s `$updateableColumns`: the keys of that array (optionally filtered to those that are “real” columns, not validation-only).
- **read_only:**
  - All column names from `PRAGMA table_info` for that table,
  - minus the updateable keys,
  - with `id` and `shortuid` (and any other system identifiers) always included in read_only.
- If a column appears in the DB but not in updateableColumns, it is read_only. Single source of truth: DB for “what columns exist”, code for “what is updateable”.

### 2.5 Resource → controller / model mapping

- Central mapping in the SchemaService (or config) from resource key to controller and model, e.g.:
  - `extensions` → ExtensionController, Extension (table `ipphone`)
  - `queues` → QueueController, Queue (table `queue`)
  - … (see table in 1.1).
- Controllers must expose their updateable columns (e.g. via a public method or a shared trait) so the SchemaService can read them without duplicating the list. Options:
  - Add a public method on each controller, e.g. `getUpdateableColumns()`, or
  - Use a trait that holds updateableColumns and a static or instance method to return them, or
  - One-off registration array in SchemaService that imports each controller’s updateable list (if PHP allows reading private property from a known class). Prefer the trait or getter for clarity.

### 2.6 Error handling

- If a table does not exist (e.g. PRAGMA returns empty), return that resource with empty read_only/updateable/defaults or omit it and log. Do not fail the whole /schemas response.
- If a controller has no updateableColumns, treat all columns as read_only (or only expose defaults from DB).

---

## 3. Frontend (SPA) side

### 3.1 Fetching and storing schema

- **When:** On first need (e.g. when user first opens a detail or create view that uses schema), or on app init after login. One fetch per session is enough.
- **Where:** Call `GET /schemas` via existing API client. Store result in Pinia (e.g. `useSchemaStore()` with `schemas: {}` or `schemasByResource`). No persistence; in-memory only.
- **Auth:** Use same auth as other API calls (Bearer token). If 401/403, do not store schema; views can fall back to current hard-coded behaviour until schema is available.

### 3.2 Using schema in detail (edit) views

- For each field displayed, check `schema.read_only.includes(fieldKey)`.
  - If true → render **FormReadonly** with the current value.
  - If false → render the appropriate editable control (FormField, FormSelect, FormToggle) as today; widget choice stays in the frontend.
- **Order and grouping:** Keep current layout (Identity / Settings / Advanced, etc.). Only the decision “read-only vs editable” comes from the schema. Field order and sectioning remain in the view/template.
- **Fallback:** If schema for that resource is missing (e.g. API error or resource not in schema), keep current hard-coded read-only list for that view so behaviour does not regress.

### 3.3 Using schema in create views

- Use `schema.defaults` to preset form refs when the create form loads. For each field that has a key in `defaults`, set initial value from `defaults[key]` (with normalisation if needed, e.g. string vs number for inputs).
- Optional: use `schema.columns` in a later phase for type hints (e.g. number vs text). Not required for v1.

### 3.4 Phased rollout (frontend)

1. **Phase 1:** Add schema fetch and Pinia store; no view changes. Confirm `/schemas` response and store shape.
2. **Phase 2:** Switch **one** detail view (e.g. ExtensionDetailView) to use schema for read_only. Remove hard-coded FormReadonly list for that view; derive from schema. Test thoroughly.
3. **Phase 3:** Switch remaining detail views (Queue, Agent, Route, Trunk, IVR, InboundRoute, Tenant) to schema-driven read_only. Remove all hard-coded read-only lists.
4. **Phase 4 (optional):** Use schema.defaults in create views to preset initial values; remove duplicated default constants where they match the schema.

---

## 4. Implementation order (high level)

| Step | Where   | What |
|------|---------|------|
| 1    | pbx3api | Add resource → controller/model → table mapping (config or SchemaService). |
| 2    | pbx3api | Add SchemaService: for each resource, run PRAGMA table_info(table), get updateable from controller, compute read_only and defaults. |
| 3    | pbx3api | Expose updateableColumns (trait or getUpdateableColumns() on each controller). |
| 4    | pbx3api | Add SchemaController (or single method), GET /schemas, call SchemaService, return JSON. Register route. |
| 5    | pbx3api | Manual test: GET /schemas returns expected shape for extensions, queues, etc. |
| 6    | pbx3spa | Add Pinia store for schema; fetch GET /schemas on first use or app init. |
| 7    | pbx3spa | ExtensionDetailView: use schema to decide FormReadonly vs editable; remove hard-coded readonly list. |
| 8    | pbx3spa | Remaining detail views: same as step 7. |
| 9    | pbx3spa | (Optional) Create views: preset form defaults from schema.defaults. |

---

## 5. Files to add or touch (checklist)

### pbx3api

- [ ] `app/Services/SchemaService.php` (or `app/Http/Services/`) — build schema from DB + controllers.
- [ ] `app/Http/Controllers/SchemaController.php` — GET index, return SchemaService->getSchemas().
- [ ] `routes/api.php` — register `Route::get('schemas', [SchemaController::class, 'index'])` in admin group.
- [ ] Controllers (Extension, Queue, Agent, Route, Trunk, Ivr, InboundRoute, Tenant): add public method or trait to expose updateable column names for SchemaService.

### pbx3spa

- [ ] `src/stores/schemaStore.js` (or `.ts`) — state: schemas; action: fetchSchemas(); getter: getSchema(resource).
- [ ] `src/api/client.js` (or equivalent) — no change if fetch is just get('schemas').
- [ ] Detail views (Extension, Queue, Agent, Route, Trunk, Ivr, InboundRoute, Tenant): use schema store to decide FormReadonly vs editable; remove hard-coded readonly lists.
- [ ] (Optional) Create views: use schema.defaults to set initial form values.

---

## 6. Testing

- **API:** Call GET /schemas; assert structure and that read_only/defaults match expectations for at least one resource (e.g. extensions). Assert defaults match SQLite PRAGMA for that table.
- **SPA:** With schema loaded, open Extension edit; assert identity fields are readonly and others editable. Repeat for one other resource. Then assert create form (e.g. Queue) shows default values when schema.defaults is used (if implemented).

---

## 7. Docs and handoff

- **pbx3api:** Add a short doc (e.g. in `docs/`) describing GET /schemas: purpose, response shape, that read_only/defaults come from DB and controller (no cached file). Point to this plan for rationale.
- **SESSION_HANDOFF / PROJECT_PLAN:** After implementation, note that field mutability is API-driven and frontend uses GET /schemas; remove or update “Field mutability (API)” to-do.

---

## 8. Summary

- **Single source of truth:** DB for column list and defaults; API code (updateableColumns) for what is editable.
- **No duplication:** No generated schema file; no cache; frontend does not hard-code read_only or defaults per resource.
- **Simplicity:** One endpoint, one service that loops over resources and PRAGMA; frontend fetches once and uses the result for all views.
