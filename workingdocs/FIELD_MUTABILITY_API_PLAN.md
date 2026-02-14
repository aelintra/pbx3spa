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

### 1.2 Many panels / scaling (recommended approach)

Many more panels will be built before the application is finished. The schema approach scales without redesign:

- **New panels use schema from day one.** When you add a new resource (e.g. Sysglobal, HolidayTimer): (1) add it to the API mapping and expose updateable columns on its controller, (2) build the SPA detail/create view using the composable for read_only and defaults. No hard-coded readonly or default lists in the new panel.
- **Mapping grows with the app.** Extend the SchemaService mapping (and controller getter) when you add each new panel; no need to support every future resource in the first release.
- **Recommended rollout:** Complete **A1–A7** (API) and **F1 + F4** (composable + fallback) first. Then build **new** panels schema-first. Migrate the **existing eight** detail views (F2–F3) when convenient—either in one pass or as you touch each view. This keeps momentum on new panels while still reaching a single source of truth for all.

If payload or performance ever becomes an issue with many resources, add `GET /schemas/{resource}` later and have the composable fetch per resource; not required up front.

### 1.3 Out of scope (for this plan)

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

### 3.1 Fetching and storing schema (Option B: composable + cache, no Pinia)

- **Decision:** Fetch schema data **when a view needs it** (e.g. when opening a detail or create view). Use a **composable** (e.g. `useSchema()` or `useSchema(resource)`) that calls `GET /schemas` via the existing API client. **No Pinia store.** Cache the result in the composable (e.g. module-level ref) so the first view that needs schema triggers one fetch, and subsequent views reuse that result for the session—no duplicate requests when navigating between panels.
- **When:** First time any view that uses the composable runs; then reuse cached result until page reload.
- **Where:** Composable returns e.g. `{ schema, loading, error }` (or per-resource slice). In-memory cache only; no persistence.
- **Auth:** Same as other API calls (Bearer token). If 401/403, composable exposes error; views fall back to current hard-coded behaviour until schema is available.

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

1. **Phase 1:** Add schema composable (fetch on first use, module-level cache); no view changes. Confirm `/schemas` response and composable return shape.
2. **Phase 2:** Switch **one** detail view (e.g. ExtensionDetailView) to use schema for read_only. Remove hard-coded FormReadonly list for that view; derive from schema. Test thoroughly.
3. **Phase 3:** Switch remaining detail views (Queue, Agent, Route, Trunk, IVR, InboundRoute, Tenant) to schema-driven read_only. Remove all hard-coded read-only lists.
4. **Phase 4 (optional):** Use schema.defaults in create views to preset initial values; remove duplicated default constants where they match the schema.

---

## 4. Testable steps (check each before proceeding)

Do one step; verify the “Done when” criteria; then proceed. Do not start the next step until the current one is signed off.

**Recommended order when many panels remain to build:** Do **A1–A7** (full API), then **F1** (composable) and **F4** (fallback). After that, build new panels schema-first. Do **F2–F3** (migrate existing eight detail views) in one pass or as you touch each view.

### API (pbx3api)

| Step | What to do | Done when |
|------|------------|-----------|
| **A1** | Add a **mapping** (array or config): resource key → [Controller class, Model class] for extensions, queues, agents, routes, trunks, ivrs, inroutes, tenants. No route or controller yet; just the mapping (e.g. inside a new SchemaService stub or a config file). | You have one place that defines the eight resources and their controller/model pairs. Code that reads this mapping runs without error. |
| **A2** | On each in-scope **controller**, add a way for SchemaService to get updateable column names (e.g. public `getUpdateableColumns()` or a trait). Use the existing `$updateableColumns` (or equivalent) as the source. | SchemaService (or a small test script) can call each controller’s getter and receive the list of updateable column names for all eight resources. |
| **A3** | In **SchemaService**: for one resource (e.g. extensions), given the model’s `$table`, run `PRAGMA table_info('table_name')` on the API’s DB connection. Build a small array: column names + `dflt_value` for that table. | Running the service for “extensions” returns column names and default values that match the running DB (spot-check 2–3 columns and defaults). |
| **A4** | In **SchemaService**: for that same resource, combine (a) all column names from PRAGMA, (b) updateable list from the controller, (c) defaults from PRAGMA. Output shape: `read_only` (all columns − updateable; id/shortuid always in read_only), `updateable`, `defaults`. | For “extensions”, you get read_only, updateable, and defaults with no errors; read_only and updateable are consistent with each other and the DB. |
| **A5** | Extend SchemaService to **all eight resources** in the mapping. Loop over the mapping; for each, run PRAGMA, get updateable, build read_only/updateable/defaults. Return one object keyed by resource (e.g. `extensions`, `queues`, …). Handle missing table or missing controller gracefully (empty or omit that resource). | Calling `getSchemas()` returns an object with all eight keys; each key has read_only, updateable, defaults; no fatal errors. |
| **A6** | Add **SchemaController** with one method (e.g. `index`) that returns `SchemaService->getSchemas()`. Register **GET /schemas** in `routes/api.php` inside the admin middleware group. | With valid admin auth, `GET /schemas` returns 200 and JSON with the same shape as A5. Without auth, 401/403. |
| **A7** | **Manual test:** Call GET /schemas; inspect JSON. For at least **extensions** and **queues**: (1) read_only contains id, shortuid, pkey and other non-updateable columns; (2) updateable matches the controller; (3) defaults for 2–3 columns match PRAGMA (e.g. cluster = "default", active = "YES"). | You have confirmed the response shape and that at least two resources have correct read_only, updateable, and defaults. **Checkpoint: API is done for this feature.** |

### Frontend (pbx3spa)

| Step | What to do | Done when |
|------|------------|-----------|
| **F1** | Add **useSchema** composable: on first call, `GET /schemas` via API client; store result in a module-level ref; return `{ schema, getSchema(resource), loading, error }`. No Pinia. | In a view or dev harness, calling the composable once populates `schema`; calling again does not trigger a second request (cache). getSchema('extensions') returns the extensions slice. |
| **F2** | **ExtensionDetailView:** Use composable to get schema for ‘extensions’. For each displayed field, if `getSchema('extensions').read_only.includes(fieldKey)` render FormReadonly, else render editable control. Remove any hard-coded list of readonly field names for extensions. | Opening Extension detail: identity/system fields are readonly, others editable. Behaviour matches or improves on current. No console errors. |
| **F3** | **Remaining detail views** (Queue, Agent, Route, Trunk, IVR, InboundRoute, Tenant): same as F2—use schema from composable for read_only; remove hard-coded readonly lists. | All eight detail views derive read_only from schema. No view has a hard-coded readonly list for this feature. |
| **F4** | **Fallback (deferred):** If schema is missing, views use schema-only read_only (no schema ⇒ no read_only list ⇒ fields render as disabled inputs). No fallback message or retry in UI. *Future:* If a need arises (e.g. schema on a different path from data), add fallback readonly list per resource and/or retry + message. | Simpler implementation; schema and data share the same API so “no schema” typically means “no data” too. |
| **F5** | **(Optional)** Create views: when opening a create form, preset form refs from `getSchema(resource).defaults` where the key exists. | Create form (e.g. Queue or Extension) shows default values in fields that have schema.defaults; no regression on create submit. |

### After implementation

| Step | What to do | Done when |
|------|------------|-----------|
| **D1** | Add short doc in pbx3api (e.g. `docs/SCHEMAS_ENDPOINT.md`): GET /schemas purpose, response shape, that read_only/defaults come from DB and controller. | Doc exists and is accurate. |
| **D2** | Update SESSION_HANDOFF and PROJECT_PLAN: field mutability is API-driven; frontend uses GET /schemas (composable, Option B). Mark “Field mutability (API)” to-do done or updated. | Handoff and project plan reflect current state. |

---

## 4b. Implementation order (high-level reference)

| Step | Where   | What |
|------|---------|------|
| 1    | pbx3api | Add resource → controller/model → table mapping (config or SchemaService). |
| 2    | pbx3api | Add SchemaService: for each resource, run PRAGMA table_info(table), get updateable from controller, compute read_only and defaults. |
| 3    | pbx3api | Expose updateableColumns (trait or getUpdateableColumns() on each controller). |
| 4    | pbx3api | Add SchemaController (or single method), GET /schemas, call SchemaService, return JSON. Register route. |
| 5    | pbx3api | Manual test: GET /schemas returns expected shape for extensions, queues, etc. |
| 6    | pbx3spa | Add schema composable (fetch GET /schemas on first use, module-level cache; no Pinia). |
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

- [ ] `src/composables/useSchema.js` (or `.ts`) — composable: fetch GET /schemas on first use, cache in module-level ref; return e.g. `{ schema, getSchema(resource), loading, error }`. No Pinia.
- [ ] `src/api/client.js` (or equivalent) — no change if fetch is just get('schemas').
- [ ] Detail views (Extension, Queue, Agent, Route, Trunk, Ivr, InboundRoute, Tenant): use schema (from composable) to decide FormReadonly vs editable; remove hard-coded readonly lists.
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
