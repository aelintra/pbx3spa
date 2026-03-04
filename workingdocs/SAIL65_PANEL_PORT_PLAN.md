# Sail65 → PBX3 Panel Port Plan

**Purpose:** Plan ports of panels from the legacy SARK UI (sail65 repo) into pbx3 SPA + pbx3api, following established patterns.

**Source repo:** `/Users/jeffstokoe/GiT/sail65` (sail-6 = package under `opt/sark`).

**Data source of truth:** The **pbx3** database schema is the authority for what tables and columns exist. Sail65 is reference only for UI and behaviour; schema may have changed in the new system. When planning or implementing a panel port, **begin by reading the pbx3 SQL files** in `pbx3/pbx3-1/opt/pbx3/db/db_sql/` to establish the data model. See § **Source of truth: pbx3 DB schema** below.

**Not porting:** Panels that will not be ported (e.g. sarkcallback, sarkreception, sarkphone) are excluded from the candidate list in §6; they remain in the full panel list (§4) marked as excluded for reference.

---

## 1. Sail65 (old system) – how panels work

- **Entry:** `www/index.php` → loads `php/sarksplash/main.php` (dashboard). All other panels are loaded via **URL** `/php/{classname}` (e.g. `/php/sarkqueue`).
- **Dispatch:** `srkmain.php` runs for every panel request: parses `SCRIPT_URL` → `$url[2]` = panel class name (e.g. `sarkqueue`), then `require 'view.php'` from that panel’s directory and instantiates `new $url[2]` and calls `$Panel->showForm()`.
- **Per-panel layout:** Each panel is a directory under `php/`:
  - `main.php` – minimal; just requires `srkmain.php` (which does the dispatch).
  - `view.php` – **PHP class** (e.g. `class sarkqueue`) with:
    - `showForm()` – branches on `$_POST`/`$_GET`: new, edit, save, update, commit.
    - `showMain()` – list table + action bar (New, Commit).
    - `showNew()` / `showEdit()` – create/edit forms.
    - `saveNew()` / `saveEdit()` – write to DB via helper/validator.
  - Often: `update.php`, `delete.php`, `javascript.js`, and sometimes `search.php`, `ajaxchannels.php`, etc.
- **Navigation:** Menu is **DB-driven**: `user` ↔ `UserPanel` ↔ `panel` ↔ `panelgrouppanel` ↔ `panelgroup`. Each panel has `classname` (e.g. `sarkqueue`), `displayname`, and optional visibility rules (e.g. hide sarkpci on ARM, sarkmcast when VCL).
- **Tech:** PHP server-rendered HTML, W3.CSS, jQuery, DataTables-style tables; forms POST to self; “Commit” runs generator/apply.

---

## 2. PBX3 (target) – established patterns

**SPA (pbx3spa):**

- **Panel structure:** Per PANEL_PATTERN.md – for CRUD resources use **exactly three panels**: **List**, **Create**, **Edit (Detail)**. Exceptions: singleton (e.g. Sysglobals = one edit-only panel); two-panel list + detail (e.g. Asterisk Files, no Create).
- **Naming:** `{Resource}ListView.vue`, `{Resource}CreateView.vue`, `{Resource}DetailView.vue`. Routes: e.g. `queues`, `queues/new`, `queues/:shortuid`.
- **Components:** Use `FormField`, `FormSelect`, `FormToggle`, `FormReadonly` from `@/components/forms/`. No raw `<input>`/`<select>` for standard fields. Use `DeleteConfirmModal`, `normalizeList()` from `@/utils/listResponse`, `firstErrorMessage()` from `@/utils/formErrors`.
- **Schema:** `useSchema` composable: `ensureFetched()` in onMounted, `getSchema(resource)` for read-only vs editable; create views use schema defaults where applicable.
- **API calls:** `getApiClient()` from `@/api/client` – `get()`, `post()`, `put()`, `delete()`. List: `GET /resource`; detail: `GET /resource/{id}`; create: `POST /resource`; update: `PUT /resource/{id}`; delete: `DELETE /resource/{id}`.
- **Tenant (cluster):** Tenant resolution pattern: options = tenant pkey; resolve API `cluster` (may be shortuid) to pkey for dropdowns; never assume API returns pkey.
- **Nav:** Sidebar in `AppLayout.vue` – add `router-link` for each new list route. Heading conventions: List = plural (“Queues”); Create = “Create {resource}”; Edit = “Edit {Resource} {displayName|pkey}”.

**API (pbx3api):**

- **Pattern:** Laravel 11, REST. Controllers under `app/Http/Controllers/`. Routes in `routes/api.php` under `auth:sanctum` + `abilities:admin`. Standard: index, show, save (POST), update (PUT), delete (DELETE).
- **Validation:** Request + Validator in controller (or FormRequest); no deprecated *Request model classes for new work. See PLAN_MODELS_AND_VALIDATION_HARMONISATION.md.
- **IDs:** Many resources use `shortuid` (KSUID) for route binding; some use `pkey` (e.g. agents, devices, helpcore). Match existing resource (e.g. queues use shortuid).

**References:**

- **pbx3spa:** `workingdocs/PANEL_PATTERN.md`, `CREATE_PANELS_STANDARDIZATION.md`, `SINGLE_PANEL_SCREENS.md`, `ADMIN_PANELS_AND_PERMISSIONS.md`.
- **pbx3api:** `docs/general.md`, `docs/api.md`, `docs/auth.md`; controller + model per resource.

---

## 3. Source of truth: pbx3 DB schema

**The data model for panel ports comes from pbx3, not sail65.** Before designing or implementing any panel, read the relevant SQL in:

| File | Scope | Tables (examples) |
|------|--------|-------------------|
| **sqlite_create_instance.sql** | Instance-level (one per node; not tenant-backed up) | `globals`, `tt_help_core`, `device`, `trunks` |
| **sqlite_create_tenant.sql** | Tenant-level (per cluster) | `cluster`, `agent`, `appl`, `cos`, `ipphone`, `ipphonecosopen`, `ipphonecosclosed`, `queue`, `route`, `ivrmenu`, `inroutes`, `greeting`, `holiday`, `dateseg`, `meetme`, `page`, … |
| **sqlite_create_laravel.sql** | Laravel/auth | `users`, `sessions`, `personal_access_tokens`, … |

- **Instance tables** (e.g. globals, device, trunks): live in `pbx3-1/opt/pbx3/db/db_sql/sqlite_create_instance.sql`. Trunks are instance-owned; see TRUNK_ROUTE_MULTITENANCY.md.
- **Tenant tables** (e.g. queue, agent, ipphone, meetme, cos, greeting, holiday, dateseg): live in `sqlite_create_tenant.sql`. Use these definitions for API models, validation, and SPA field parity.
- Sail65 `view.php` and DB usage are **reference only** for screens and flows; column names, defaults, and presence may differ in pbx3. Always align with the pbx3 SQL (and existing pbx3api models/controllers) when implementing.

---

## 4. Sail65 panel list (all sark* directories)

From `php/` in sail65 (sail-6/opt/sark/php):

| Panel           | Typical files              | Notes (brief)                    |
|-----------------|----------------------------|----------------------------------|
| sark3pcerts     | main, view                 | 3rd-party certs                  |
| sarkagent       | main, view, update, delete | Agents                           |
| sarkapp         | main, view, update, delete | Custom apps                      |
| sarkbackup      | main, view                 | Backup/restore                   |
| sarkcallback    | main, view, update, delete | **Not porting** (excluded)        |
| sarkcallgroup   | main, view, update, delete | Call groups                      |
| sarkcert        | main, view, javascript     | Certificates                     |
| sarkcluster     | main, view, update, delete | Tenants/clusters                 |
| sarkconference  | main, view, update, delete | Conference rooms                 |
| sarkcos         | main, view, update, delete | Class of service                  |
| sarkddi         | main, view, update, delete | DDI / inbound                    |
| sarkdevice      | main, view, update, delete | Devices (templates)              |
| sarkdiscover    | main, view                 | Discovery (hidden when VCL)      |
| sarkedit        | main, view                 | Generic edit                     |
| sarkedsw/sarkedsw6 | main, view, update, delete | EDSW hardware                 |
| sarkextension   | main, view                 | Extensions                       |
| sarkfqdnwlist   | main, view, update, delete  | FQDN whitelist                   |
| sarkfreset      | main, view                 | Factory reset                    |
| sarkglobal      | main, view                 | System globals                   |
| sarkgreeting    | main, view, update, delete | Greetings                        |
| sarkholiday     | main, view, update, delete | Holiday timers                   |
| sarkipblacklist | main, view, update, delete | IP blacklist                     |
| sarkivr         | main, view, update, delete | IVRs                             |
| sarkldap        | main, view                 | LDAP                             |
| sarklog         | main, view                 | Logs                             |
| sarklogin       | main, view                 | Login                            |
| sarkmcast       | main, view, update, delete | Multicast (hidden when VCL)     |
| sarknetwork     | main, view                 | Network                          |
| sarkpasswd      | main, view                 | Password change                  |
| sarkpcap        | main, view                 | Packet capture                   |
| sarkpci         | main, view                  | PCI/DAHDI (conditional)          |
| sarkphone       | main, view, update, etc.  | **Not porting** (excluded)        |
| sarkqueue       | main, view, update, delete | Queues                           |
| sarkreception   | main, view, search         | Reception (search)               |
| sarkrecordings  | main, view                 | Recordings                       |
| sarkreport      | main, view, javascript     | Reports                          |
| sarkroute       | main, view, update, delete | Outbound routes                  |
| sarkshell       | main, view, iframe         | Shell                            |
| sarksplash      | main, view, etc.           | Dashboard                        |
| sarksupt        | main, view                 | Support                          |
| sarktimer       | main, view, update, delete | Day timers                      |
| sarktrunk       | main, view, update, delete | Trunks                           |
| sarkuser        | main, view, update, delete | Users                            |
| sarkwallboard   | main, view, ajax, iframe   | Wallboard                        |

---

## 5. Mapping: Sail65 → PBX3 (existing coverage)

| Sail65 panel   | PBX3 SPA panel(s)        | PBX3 API (exists?) | Notes |
|----------------|--------------------------|--------------------|-------|
| sarkagent      | Agents (list/create/detail) | agents (index/show/save/update/delete) | ✓ |
| sarkapp        | Custom Apps              | customapps         | ✓ |
| sarkbackup     | Backup                   | backups            | ✓ |
| sarkcluster    | Tenants                  | tenants            | ✓ |
| sarkcos        | —                        | cosrules, cosopens, coscloses | API only; no SPA panels yet |
| sarkdevice     | Devices                  | devices            | ✓ |
| sarkextension  | Extensions               | extensions         | ✓ |
| sarkglobal     | System Globals           | sysglobals         | ✓ |
| sarkgreeting   | Greetings (list/create/detail) | greetingrecords    | ✓ Done  |
| sarkholiday    | —                        | holidaytimers      | API only |
| sarkivr        | IVRs                     | ivrs               | ✓ |
| sarklog        | Logs                     | (logs)            | ✓ |
| sarklogin      | Login                    | auth               | ✓ |
| sarkqueue      | Queues                   | queues             | ✓ |
| sarkroute      | Routes                   | routes             | ✓ |
| sarksplash     | Dashboard (Home)          | —                  | ✓ |
| sarktimer      | —                        | daytimers          | API only |
| sarktrunk      | Trunks                   | trunks             | ✓ |
| sarkuser       | Users                    | auth/users         | ✓ |
| sarkddi        | Inbound routes           | inboundroutes      | ✓ (likely) |

---

## 6. Candidate panels to port (no or partial PBX3 equivalent)

These sail65 panels do **not** currently have a full SPA + API CRUD (or single-screen) equivalent in pbx3. They are candidates for new panels.

**Higher value / common features**

- **sarkconference** – Conference rooms (list + create/edit/delete). Confirm table in pbx3: `sqlite_create_tenant.sql` has `meetme` (conference). API/SPA to be added or confirmed.
- **sarkrecordings** – Recordings list/browse/play. May be read-only list + detail or single-screen; origrecs in www is separate app.
- **sarkreport** – Reports. Likely single-screen or list of report types + output.

**CoS / Timers (API exists, SPA missing); Greetings done**

- **sarkcos** – Class of Service: cosrules + cosopens + coscloses. API exists; add SPA list/create/detail for each or one combined view.
- **sarktimer** – Day timers. API: daytimers. Add DayTimersListView, Create, Detail.
- **sarkholiday** – Holiday timers. API: holidaytimers. Add HolidayTimersListView, Create, Detail.
- ~~**sarkgreeting**~~ – **Done.** Greetings panel: list/create/detail using greetingrecords API; tenant-scoped, wav/mp3 upload, download, replace, delete.

**Certificates / Security / Network**

- **sarkcert** – Certificates (TLS). Overlap with pbx3 LETSENCRYPT_PLAN; may be single-screen or list+detail.
- **sark3pcerts** – 3rd-party certs. Similar.
- **sarknetwork** – Network config. Single-screen; may overlap with pbx3 setip/globals.

**Operational / Niche**

- **sarkwallboard** – Wallboard (channels/status). Real-time or polling; may need new API endpoints.
- **sarkshell** – Shell access. High risk; optional or admin-only single-screen.
- **sarkldap** – LDAP. Single-screen or list+detail; see AGENT_HANDOFF LDAP note (globals vs tenant).
- **sarkpcap** – Packet capture. Niche; single-screen.
- **sarkfreset** – Factory reset. Dangerous; single-screen, guarded.

---

## 7. Port workflow (per panel)

For each chosen sail65 panel:

1. **Establish data model from pbx3:** Read **pbx3/pbx3-1/opt/pbx3/db/db_sql/** — start with **sqlite_create_instance.sql** for instance-level tables (`globals`, `tt_help_core`, `device`, `trunks`), and **sqlite_create_tenant.sql** for tenant-level tables (e.g. `agent`, `appl`, `cos`, `cluster`, `ipphone`, `queue`, `route`, `ivrmenu`, `inroutes`, `greeting`, `holiday`, `dateseg`, `meetme`, `page`). Use these definitions as the source of truth for columns, types, and defaults. Sail65 schema is not authoritative.
2. **Inspect sail65 (UI/behaviour only):** Read sail65 `view.php` (and update/delete if any) to list: which tables/columns it *used*, actions (list/new/edit/save/update/delete/commit), and any special behaviour (ajax, iframe, file upload). Map to pbx3 tables/columns from step 1.
3. **Check pbx3 backend:** Confirm whether pbx3api already has the resource (model, controller, routes). If not, add model + controller + routes following existing API patterns and the pbx3 SQL; document in pbx3api/docs/general.md.
4. **Design SPA:** Decide List / Create / Detail (or singleton, or two-panel, or single-screen) per PANEL_PATTERN.md. List API fields from the pbx3 schema and map to form sections (Identity, Settings, etc.).
5. **Implement API (if new):** Controller with index, show, save, update, delete; validation aligned with pbx3 SQL; model and table. Follow PLAN_MODELS_AND_VALIDATION_HARMONISATION.md.
6. **Implement SPA:** Add List/Create/Detail views (or single-screen), use FormField/FormSelect/FormToggle/FormReadonly, useSchema, getApiClient, normalizeList, firstErrorMessage, DeleteConfirmModal; add routes and sidebar link.
7. **Test:** Create, edit, delete, list filter; tenant resolution if applicable; schema read-only vs editable.

---

## 8. Next step

**Decide which panels to port first** (e.g. Conferences, CoS SPA, Day/Holiday timers SPA, Greetings SPA, Recordings, or Certificates). Then for each:

- Open the corresponding sail65 `view.php` (and related files).
- Confirm or add pbx3 DB + API.
- Implement SPA following PANEL_PATTERN.md and this plan.
