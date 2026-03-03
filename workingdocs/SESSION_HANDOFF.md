# Session handoff — where we left off

**Start here:** Read **PROJECT_PLAN.md** § Current state and **PANEL_PATTERN.md** (single-screen panels, cascaded sections, table alignment, toast API) to see what’s done and what’s left. **Branch:** `spanel` (pbx3spa, pbx3api).

**Extensions:** Complete (create/update, extension type derivation, live IP/Status from Asterisk AMI, SIP password display). Structure is sound; some TODOs remain (regenerate password, allow pkey change, PJSIP config edit). See **EXTENSIONS_LIVE_DATA.md** for live data behaviour and gotchas.

**Single-screen panels:** Firewall (IPv4 + IPv6) and **Backup/restore (Backups + Snapshots)** are complete. See **SINGLE_PANEL_SCREENS.md** for the full list; **PANEL_PATTERN.md** § Single-screen panels with cascaded sections and § Table column alignment for layout rules.

**Repos:** **pbx3-master** is not a git repo; it is a placeholder folder containing the four repos: **pbx3**, **pbx3api**, **pbx3cagi**, **pbx3spa**. Commit in the relevant repo.

---

## Done

### Latest session (Extension harmonisation + SIP password + docs)

- **Extension harmonisation (pbx3api):** ExtensionController::update uses **Request + Validator** only; ExtensionRequest deprecated. Validation and pkey-uniqueness (per cluster when pkey changed) run in the controller. Same pattern as Trunk. **PLAN_MODELS_AND_VALIDATION_HARMONISATION.md** Task 2 deliverables marked done; TENANT_SCOPED_PATTERN.md and .cursor/rules/tenant-scoped-panels.mdc updated.
- **Extension create – SIP password (pbx3api):** On every extension create (save, mailbox, unprovisioned, webrtc, provisioned), **passwd** is set to a 12-char auto-generated value via **ret_password(12)** (Helper.php). Not returned after create. **Extension detail only:** GET extensions/{id} includes passwd (show() returns makeVisible('passwd')); list/index do not. SPA ExtensionDetailView already had read-only "SIP Password" in the edit form; it now displays the value from the API.
- **Extension edit (pbx3spa):** PJSIP user field is a **textarea** (multiline, 8 rows) in ExtensionDetailView.
- **API docs (pbx3api docs/general.md):** Removed **carrier**, **sipiaxpeer**, **sipiaxuser** from trunk and inbound-route request examples. Trunk create uses **technology** (SIP or IAX2) only.
- **Branch:** `spanel` (pbx3api, pbx3spa). Commit from each repo separately (pbx3-master is not a git repo).

### Previous session (Queue audit + SPA/API alignment + move_request_to_model)

- **Queue audit (pbx3api):** Queue model uses `$fillable` (no `$guarded`); controller `updateableColumns` include pkey, cname, outcome; pkey = **Queue Dial**, **3–5 digits**, unique per tenant; create sets id/shortuid; update uses Validator + `validator->after()` for pkey uniqueness when changed; update by `id` only (tenant-safe). Same pattern as Trunk/Extension. **pbx3api/workingdocs/QUEUE_AUDIT_PROTOTYPE.md** has the column audit.
- **Queue SPA (pbx3spa):** Create and detail use label **"Queue Dial"**; validation 3–5 digits (frontend + API); cname (Common name) always sent in create/update body (null when empty). Detail has editable pkey, cname, outcome; create has cname. All updateable fields from audit are in the panels.
- **Extension & Trunk SPA aligned with audits:** Extension detail/create: cname, description, callmax, extalert, provision, provisionwith, pjsipuser, technology, dvrvmail added where applicable. Trunk detail: editable pkey, cname, callback, closeroute, openroute, privileged, technology, iaxreg, pjsipreg; create: cname, description. See **EXTENSION_AUDIT_PROTOTYPE.md**, **TRUNK_AUDIT_PROTOTYPE.md** in pbx3api/workingdocs.
- **move_request_to_model (pbx3api Helper.php):** No longer iterates `$request->all()`; now iterates **updateable column keys** and sets each from `$request->input($key)`. So every updateable field is applied the same way and JSON PUT body is read correctly (fixes cname and other fields that were missing when `all()` didn’t include body on some configs). All controllers using this helper benefit.
- **Plan (pbx3api):** **PLAN_MODELS_AND_VALIDATION_HARMONISATION.md** updated: when converting each table (audit → fix), **you must update both the API and the SPA** so create/detail views follow the schema; no field left out of scope.
- **For next agent:** Continue table-by-table audit per plan (Agent, Route, IVR, Inbound route, etc.); for each, update API (model, controller, validation) and SPA (create + detail views) in the same pass. Branch: `spanel` (pbx3api, pbx3spa).

- **Repo rename completed:** frontend repo/component naming is now `pbx3spa` (was `pbx3-frontend`); cross-repo docs in pbx3 and pbx3api were updated accordingly.
- **Integration test milestone:** frontend sign-in to pbx3api was validated after nginx/php-fpm installer hardening in pbx3api. Current dev workflow uses LAN HTTP temporarily to avoid self-signed cert trust friction; see pbx3 TODO for HTTPS/LE completion before release.
- Steps 1–17+; full CRUD for Tenants, Extensions, Trunks, Queues, Agents, Routes, IVRs, Inbound routes, **Custom Apps** (list/detail/create per PANEL_PATTERN).
- List blocks (§2.2), detail Identity/Settings/Advanced (§4.1), edit-from-list, delete confirmation modal, toasts.
- Create wording: list toolbar = “Create”, create form submit = “Create” / “Creating…”.
- Home dashboard (PBX status, Commit/Start/Stop/Reboot); auth with sessionStorage, route guard, whoami.
- **Create panels fully aligned with §3:** Tenant, Inbound route (use as reference).

### Latest session (Help messages panel + docs for next agent)

- **Help messages (tt_help_core) CRUD done:** API: HelpCore model, HelpCoreController (index, show, save, update, delete), routes GET/POST /helpcore, GET/PUT/DELETE /helpcore/{pkey}, schema entry for `helpcore`. SPA: HelpMessagesListView, HelpMessageCreateView, HelpMessageDetailView at `/help-messages`, `/help-messages/new`, `/help-messages/:pkey`; nav "Help messages"; sticky filter `useStickyFilter('help-messages')`; validation `validateHelpCorePkey`. Instance-scoped, pkey-only (no id/shortuid). Fields: pkey, displayname, cname, htext (name deprecated, not exposed).
- **Docs updated:** SESSION_HANDOFF, PROJECT_PLAN, EDIT_PANEL_FIELD_PARITY_AUDIT, HOLISTIC_ASSESSMENT, UX_IMPROVEMENTS_IVR — Help messages marked done; per-field hint To-do and help-text UX approach added.
- **For next agent:** Optional later phase: per-field hint API (e.g. GET /help/{resource}/{field}) for in-context hints in IVR/Extension etc. UX approach is in PROJECT_PLAN To-do: prefer **always-visible short hints** (one line under field) for 2–3 non-obvious fields; **on-demand** (tooltip / “?”) for long text. See **PROJECT_PLAN.md** To-do “Help text – per-field hints” and **UX_IMPROVEMENTS_IVR.md** § Help Text API & Internationalization.

### Previous session (Custom Apps panel + learnings for next agent)

- **Custom Apps CRUD done:** Three-panel (list/create/detail) at `/customapps`, `/customapps/new`, `/customapps/:pkey`. API: CustomAppController (tenant table `appl`); create sets `id` (KSUID) and `shortuid`; update by `id` with fallback to `pkey` for legacy rows. SPA: list filter/sort, create with schema defaults, detail with Identity (pkey/shortuid/id readonly), Settings, Code; v-model for all edit fields; validation for pkey (letters, numbers, underscore, hyphen). Docs updated: general.md, SCHEMAS_ENDPOINT, EDIT_PANEL_FIELD_PARITY_AUDIT, PANEL_PATTERN (customapps + route path), PROJECT_PLAN, TENANT_SCOPED_PATTERN (Controller create + CustomAppController reference).
- **Learnings for next agent:**
  1. **Detail view edit fields must use `v-model`.** If you use `:model-value` + `@update:modelValue` on FormField/FormSelect/FormToggle, the ref can be out of sync when building the save payload and the API may receive `null` for changed fields. Use `v-model="editFoo"` (same as Extension detail) so the ref always has the current value when the user clicks Save.
  2. **Tenant-scoped create must set `id` and `shortuid` before `$model->save()`.** The `appl` (and other tenant) tables have `id` as PRIMARY KEY; if you don’t set them on create, new rows have null `id` and later updates (which use `WHERE id = ?`) won’t persist. Pattern is now explicit in **pbx3api/docs/TENANT_SCOPED_PATTERN.md** (§ Controller create). When adding a new tenant-scoped resource, add the two lines and add the controller to the reference list.
  3. **Update fallback for legacy rows:** If a tenant-scoped resource has rows created before id/shortuid were set, the update path can fall back to `WHERE pkey = ?` when `id` is null so those rows can still be updated (CustomAppController does this).
  4. **Single DB:** All tables (instance + tenant) live in one database; no tenant-specific connection switching.

### Previous session (Backup/restore panel + single-panel patterns)

- **Backup/restore panel done:** Single view at `/backup` with two cascaded sections: **Backups** (create, upload, download, restore with options, delete) and **Snapshots** (create, upload, download, restore DB only, delete). View: `BackupView.vue`; nav link "Backup". API: `backups` and `snapshots`; pbx3api uses **syshelper** for all privileged file operations (create, move, delete, chown/chmod). Laravel **Storage disks** `backups` and `snapshots` must be configured in `config/filesystems.php` (root `/opt/pbx3/bkup` and `/opt/pbx3/snap`) or download returns "Disk(backup) does not have a configured driver".
- **Single-screen patterns (for next agent):**
  - **Cascaded sections:** When a panel has two sub-sections (e.g. Backups + Snapshots), wrap each in the same container class (e.g. `<section class="backup-section">`) and keep structure identical (header → buttons → messages → table). See PANEL_PATTERN.md § Single-screen panels with cascaded sections.
  - **Table alignment:** If two tables must align (e.g. Backups and Snapshots tables), use `table-layout: fixed` and explicit column widths (e.g. `:nth-child(1)` width 40%, etc.). Otherwise the Filename column width differs by content and Date/Size columns misalign. See PANEL_PATTERN.md § Single-screen panels: table column alignment.
  - **Toast API:** Use `toast.show(message, variant)` with `variant` `'success'` or `'error'`. Do not use `toast.success()` or `toast.error()` — they do not exist. See PANEL_PATTERN.md § Toast API.
- **File uploads (SPA):** API client has `postFile(path, formData)` for multipart uploads (e.g. backup/snapshot upload). Use `FormData` and append the file under the key the API expects (e.g. `uploadzip`, `uploadsnap`).

### Previous session (extensions completion)

- **Extensions marked complete:** Full CRUD implemented with extension type derivation, live IP/Status from Asterisk AMI, SIP password display, and improved UX (spinner loading state, fixed empty state flash). Structure is sound; some TODOs remain (regenerate password button, allow pkey change, PJSIP config edit) but core functionality is production-ready.
- **Extension type (no DB column):** We derive **extension_type** (SIP | WebRTC | MAILBOX) from **device** in code. Extension model has `getExtensionTypeAttribute()` and `$appends = ['extension_type']`, so every API response includes it. List has a **Type** column; detail Identity shows readonly **Extension type**. Single source of truth remains `device`; WebRTC ⇒ no vendor/MAC, SIP ⇒ vendor or General SIP.
- **Live IP and Status from Asterisk:** List and detail show **IP** (endpoint address) and **Status** (RTT, e.g. "OK (5 ms)") from Asterisk AMI. **API:** GET **/api/extensions/live** returns an object keyed by pkey `{ "1000": { "ip", "latency" }, ... }`; GET **extensions/{id}/runtime** includes ip/latency for SIP. **Helper** `pjsip_endpoint_live($amiHandle, $pkey)` uses AMI `PJSIPShowEndpoint` and collects all key-value pairs from multi-event response (matches old system approach); parses URI/Match for IP, RoundtripUsec for latency; returns "Unknown" when no data. **Ami** `amiQueryUntilComplete()` reads until blank line so we don’t block on socket timeout (fixes 504 on extensions/live). **Frontend:** List fetches extensions + extensions/live in parallel; IP/Status columns use `liveValueDisplay()` so that API "—" or empty is shown as **Unknown** (matches old system). Detail Runtime section shows IP and Status when present. Loading state shows spinner + text. **Doc:** **EXTENSIONS_LIVE_DATA.md** (key files, gotchas, API/frontend behaviour).
- **SIP password display:** Added readonly `passwd` field to extension detail Identity section (after SIP Identity) for manual phone/WebRTC setup. TODO: Add "Regenerate SIP password" button (low priority).
- **UX improvements:** Added spinner to loading state (replaces text-only); fixed empty state flash (only shows when loading complete).
- **Branch merge:** All extension work merged to `main` in pbx3api, pbx3spa, and pbx3 repos. Local `extensions` branches deleted.

### Previous session (permissions Phase 0 + trunk/DDI completion)

- **Permissions Phase 0 (minimal rollout):** Done. Auth store: getters `abilities` and `can(ability)` (e.g. `auth.can('admin')`). Router: PUBLIC_ROUTES allow-list (`['/login']`), require `can('admin')` for panel routes, `/no-access` route and view. Layout: nav gated by `can('admin')` (full nav for admins, Home only for others). **Users panel:** List (GET `auth/users`), Create (POST `auth/register` with optional abilities), Delete, Revoke tokens; nav "Users" link gated by `can('admin')`. API: docs comments in `config/abilities.php` and `routes/api.php` pointing to ADMIN_PANELS_AND_PERMISSIONS.md for expansion. **Workingdocs:** ADMIN_PANELS_AND_PERMISSIONS.md (pattern), AUTH_PATTERNS.md (rules for agents), PERMISSIONS_MINIMAL_DEPLOY_PLAN.md (rollout). See **PERMISSIONS_MINIMAL_DEPLOY_PLAN.md** for full Phase 0 details; Phase 1 (granular abilities, admin vs tenant route groups) is later. Committed on branch `trunks` in pbx3spa and pbx3api.

- **Trunk create:** Done. IAX2 removed from type chooser (deferred; effectively unusable). SIP-only chooser (send/accept/trusted registration) with conditional fields. Marked complete in COMPLEX_CREATE_PLAN.md; IAX2 refinements deferred (see ToDo section).

- **DDI (Inbound routes):** Done. Edit panel simplified: Connection and Advanced sections removed; Identity + Settings only (matches legacy). To-do added: review underlying inbound-route table to decide whether removed columns (host, username, password, peername, register, iaxreg, pjsipreg, callback, callerid, match) should be physically removed from schema or retained. Marked complete in COMPLEX_CREATE_PLAN.md and PROJECT_PLAN.md.

- **Extension create / provisioning:** Complete. API and frontend for create/update (extensionType, MAC, Device, provision, Save vs Commit) are implemented. **Extension type** is derived from device (no DB column); list/detail show Type and Extension type. **Live IP/Status** from Asterisk AMI (GET extensions/live, runtime ip/latency) are implemented. **SIP password** displayed in detail view. See **EXTENSIONS_LIVE_DATA.md**.

### Previous session (field mutability – API-driven schema)

- **Field mutability (API-driven):** Done. API exposes **GET /schemas** (SchemaService + SchemaController) with `read_only`, `updateable`, and `defaults` per resource (extensions, queues, agents, routes, trunks, ivrs, inroutes, tenants, customapps). Frontend uses **useSchema** composable (fetch on first use, module-level cache; no Pinia): `ensureFetched()`, `getSchema(resource)`, `applySchemaDefaults(resource, refsByKey)`. All **nine detail views** (including Custom Apps) derive read_only from schema (no hard-coded readonly lists). All **nine create views** preset form fields from `schema.defaults` where the key exists. Fallback when schema is missing was deferred (Occam’s razor). See **FIELD_MUTABILITY_API_PLAN.md** and **pbx3api/docs/SCHEMAS_ENDPOINT.md**. PANEL_PATTERN.md updated: useSchema is required for edit views; schema composable in shared components list.

### Previous session (create-panel standardization + UX)

- **Create-panel standardization (§3):** Route, Queue, Agent, and IVR create panels now use consistent **Identity / Settings / optional Advanced** grouping. Identity = name/identifiers/description; Settings = tenant (cluster), active, and main behaviour; then resource-specific sections (Dialplan, Paths, Queues, Timing, Keystroke options, Advanced). Extension and Trunk create were already aligned. See **CREATE_PANELS_STANDARDIZATION.md** status.
- **UX – no selectable "-" in dropdowns:** FormSelect default `emptyText` is now `''`; all dropdowns use a concrete default and a real option (e.g. "None") instead of `empty-text`. Route path1–4, Agent queue1–6, IVR greetnum, Trunk type, InboundRoute open/closed default to "None" or first option; submit maps "None" to omit/null. PANEL_PATTERN rule added.
- **UX – toggles for booleans:** Tenant Advanced two-option pill fields (enabled/disabled, YES/NO, on/off) now use **FormToggle** instead of FormSelect. FormSegmentedPill used for 2–3 option primary fields; 4+ options stay FormSelect (per PILLS_RETROFIT_LIST).

### Previous session (tenant-scoped panels – id vs pkey)

- **Tenant-scoped panels – identity and uniqueness (pbx3api):** Fixed cross-tenant update bug (e.g. editing extension 1000 in tenant A was updating extension 1000 in tenant B). **Pattern:** use **id** (KSUID) for identity (which row to update/delete); use **pkey + cluster** for uniqueness (same pkey in different clusters is allowed). All tenant-scoped controllers (Extension, Queue, Agent, Route, Trunk, IVR, Inbound route) now do explicit `Model::where('id', $id)->update($dirty)` and `$model->syncOriginal()` instead of `$model->save()`. ExtensionRequest and TrunkRequest: pkey unique per cluster, ignore current row by id, and skip unique check when pkey is unchanged on update (avoids 422 when only toggling e.g. Active). **Docs:** **pbx3api/docs/TENANT_SCOPED_PATTERN.md** (full reference); **pbx3api/.cursor/rules/tenant-scoped-panels.mdc** (Cursor rule when editing API controllers/models/requests). Applies to future tenant-scoped resources (e.g. Custom apps); not to Tenants (cluster) themselves.

### Previous session (IVR edit completeness + name TODO)

- **IVR id/shortuid fix (pbx3api):** Ivr model had `id` and `shortuid` in `$attributes` (default null), which prevented Eloquent from hydrating them from the DB. Removed those defaults so IVR behaves like Tenant/Trunk/Extension; IvrController index/show now return model/collection directly (no DB workaround). Committed in pbx3api.
- **IVR edit panel – all editable items (pbx3api + pbx3spa):** API `updateableColumns` now include **active** (YES/NO), **cname** (Display name), **name** (legacy). Edit and create panels: Active toggle, Display name (cname), Name (optional), plus existing description, tenant, greeting, listenforext, timeout, keystroke options (option/tag/alert). Identity read view shows Name, Display name, Description; Settings shows Active?, Tenant, Greeting, Listen for extension dial?, Timeout.
- **IVR `name` field – TODO:** Schema marks ivrmenu **name** as deprecated (use cname). Added **pbx3api/docs/TODO_IVR_NAME.md**: research whether name is still required anywhere; then decide to remove from API/UI, keep for legacy, or other. Name is currently editable in both panels until that decision is made.
- **Boolean convention:** Listen for extension dial and Active are YES/NO booleans; no code change needed (user confirmed current implementation is fine).

### Previous session (Inbound routes + schema + booleans)

- **Inbound route create (pbx3api):** Destinations API uses `$request->all()` in `move_request_to_model` (Helper.php) so JSON POST body is read; pkey set from request; Asterisk extension validation for pkey (digits, _XZN.! pattern, s/i/t); reject single "0"; validation message for invalid extension.
- **Inbound route detail (pbx3spa):** Open/Close route are **destination dropdowns** (None, Operator, Queues/Extensions/IVRs/CustomApps) loaded from `GET /destinations?cluster=<tenant>`; MOH value **NO** mapped to **OFF** so the pill slider shows the correct selection.
- **Schema yardstick:** **pbx3/full_schema.sql** is the single source of truth for table columns. API models and controllers were aligned to it (inroutes, trunks, route, queue, appl, dateseg; removed faxdetect, lcl, monitor, routeable, carrier→technology, desc→description where schema has description, etc.). ipphone keeps **desc** (SIP username; Asterisk generator uses it); TODO rename to sip_username later.
- **Boolean standardisation (documented only):** **BOOLEAN_STANDARDISATION.md** describes the plan and fixer logic to migrate existing DBs to YES/NO. No migration file is in the repo (removed to avoid unplanned runs); create it when ready per the doc.

---

## Left to do

### Complex create flows (create exercise)

**Approach:** One create view per resource + type chooser + conditional fields + one polymorphic create API per resource. See **workingdocs/COMPLEX_CREATE_PLAN.md**.

**Status:** **Trunk create: done** (SIP-only chooser; IAX2 deferred). **DDI (Inbound routes): done** (create + edit aligned to legacy; Connection/Advanced removed from edit). **Extensions: complete** (full CRUD, extension type derivation, live IP/Status from AMI, SIP password display; structure sound; some TODOs remain). **IVR:** Deferred (complex UX; do later). See COMPLEX_CREATE_PLAN.md for other create flows. 

### Create-panel standardization (PANEL_PATTERN §3 + §8)

**Done:** All six create panels (Extension, Trunk, Route, Queue, Agent, IVR) now match §3: Identity / Settings / optional Advanced grouping; defaults preset where applicable; FormToggle for booleans, FormSegmentedPill for 2–3 option fields, FormSelect for 4+. See **CREATE_PANELS_STANDARDIZATION.md** for status. Trunk type-chooser and conditional fields remain per COMPLEX_CREATE_PLAN.md.

### Future project: data-driven list policy

- **Doc:** **DATA_DRIVEN_LIST_POLICY_PROJECT.md**. Replace hardcoded allow/deny or read-only lists (e.g. Asterisk files, log files) with a general, data-driven policy store. One mechanism, multiple scopes (e.g. `asterisk_files`, `log_files`), with per-scope inclusive vs exclusive semantics. Not implemented now; Asterisk Files and Logs can use hardcoded or simple logic until this project is done.

### Boolean pill style (to decide)

- **Segmented pill vs slider toggle:** Pattern says “all booleans as pills.” We currently use (a) **segmented pill** (YES | NO, two segments) for form booleans (e.g. “Listen for extension dial?”, “Register this trunk?”) and (b) **slider toggle** (left/right, single pill) for per-item on/off (e.g. “activate this key” in the IVR hide/reveal card layout). Decide whether to standardise on one style, or keep both (e.g. segmented for form booleans, slider for inline toggles). Deferred; document decision in PANEL_PATTERN or BOOLEAN_STANDARDISATION when decided.

### Other to-dos (from PROJECT_PLAN § Current state)

- **pbx3api – Middleware on remote:** Investigate why `ValidateClusterAccess.php` doesn’t appear on remote after pull (newpanels in use, file tracked); may be from old Sanctum experiment or deploy path.

- **Commit button on every panel:** Save vs Commit is implemented (dirty in globals.mycommit; Commit on Dashboard). **TODO:** Add Commit button (or link) to app layout or to every panel that can save/update the DB (Extensions, Trunks, Queues, Agents, Routes, IVRs, Inbound routes, Tenants) so users can commit without going to Home. Reuse GET syscommands/commitstatus and same red/green behaviour.
- **Extensions:** Allow changing extension number (pkey) — needs API support first.
- **Extensions:** Add "Regenerate SIP password" button — allow users to regenerate passwd (for compromised/periodic refresh) without allowing manual password creation. Low priority.
- **Phone images:** API hosts library; SPA consumes URLs.
- **Tenants – Timer status / masteroclo:** API null handling; prefer API fix (e.g. model accessor or DB default).
- **Field mutability:** Done — API-driven; frontend uses GET /schemas (useSchema composable). See FIELD_MUTABILITY_API_PLAN.md.
- **Review later (UX):** Inline edit for list rows — revisit when main pattern is stable.
- **Sticky list filter/sort:** Composable `useStickyFilter(listId)` with 5-min expiry (refreshed on re-enter). Rolled out to all list panels with a filter. **ToDo:** Sticky sort (persist sortKey/sortOrder) — see **STICKY_LIST_UI.md**.
- **Help text (per-field hints – later phase):** To-do in PROJECT_PLAN: add per-field hint API so panels can show inline/tooltip help from tt_help_core. UX: always-visible short hint for key fields; on-demand for long text. See PROJECT_PLAN § To-do and **UX_IMPROVEMENTS_IVR.md**.

### Panel pattern audit (for when we come back)

**Fully implement pattern (read: Identity + Settings/Transport + Advanced; edit: all API-updateable fields):** Trunk, Inbound route only.

**Do not fully implement:** Tenant (edit: 5 of 50+ fields), Extension (edit: core fields implemented; structure sound; some advanced fields deferred), Route (edit: 3 of 9), Agent (no read structure + edit: 3 of 7), Queue (no read structure + edit: 2 of 5). **IVR:** read structure (Identity/Settings/Advanced) and edit now include all API-updateable fields (active, cname, name, description, cluster, greetnum, listenforext, timeout, option/tag/alert 0–11); see TODO_IVR_NAME for name deprecation decision. See full audit in chat history; standardize remaining panels later.

### Layout alternatives (parked)

- **IVR create — pill-per-key layout:** Alternative to the current inline horizontal table: one pill (toggle) per telephone key that activates/deactivates keypress listen; when activated, the panel expands vertically to show Action on KeyPress (dropdown), Tag (text), Alert (text). Matches the original SARK IVR edit UI. Reverted in favour of the horizontal table; can be reintroduced if preferred (see chat/session history for implementation).

### Parked / later

- **Backups** — review after first CRUD set.
- **Admin user management** — API needs stronger user/privilege support first.

---

## References

- **PROJECT_PLAN.md** § Current state — full “next chat” instructions, stack, principles, job steps.
- **EXTENSION_PROVISIONING_QUICKSTART.md** — start here for extension provisioning (read order, key files, implementation order).
- **EXTENSION_PROVISIONING_DEPLOYMENT_PLAN.md** — full plan; §8 Build readiness, §5 Implementation order.
- **EXTENSIONS_LIVE_DATA.md** — live IP/Status from Asterisk (extensions/live, runtime, amiQueryUntilComplete, key-value collection approach matching old system, frontend Unknown/— handling; gotchas for next agent).
- **DATABASE_CHANGES_FOR_PROVISIONING.md** — DB changes list (user applies manually; PBX3 has no Laravel migrations).
- **COMPLEX_CREATE_PLAN.md** — complex create flows: Trunk done, DDI done, Extensions complete, IVR deferred.
- **PERMISSIONS_MINIMAL_DEPLOY_PLAN.md** — Phase 0 rollout (abilities, can(), route guard, Users panel); Phase 1 later.
- **ADMIN_PANELS_AND_PERMISSIONS.md** — Pattern: abilities, admin vs tenant areas, row-level scope.
- **AUTH_PATTERNS.md** — Auth contract and rules for agents (2FA, self-service, centralized auth); follow when touching login/tokens/whoami/guards.
- **PANEL_PATTERN.md** §8 — reference implementation status; §3 for create-form rules; §2.2 list blocks; §4.1 detail blocks.
- **BOOLEAN_STANDARDISATION.md** — plan and fixer for standardising boolean columns to YES/NO; migration in pbx3api (run when ready).
- **pbx3api/docs/TODO_IVR_NAME.md** — IVR ivrmenu `name` field: research usage and decide whether to remove from API/UI (schema marks name deprecated in favour of cname).
- **pbx3api/docs/TENANT_SCOPED_PATTERN.md** — Tenant-scoped panels: id for identity, pkey+cluster for uniqueness; controller update by id; Form Request pkey rules. **pbx3api/.cursor/rules/tenant-scoped-panels.mdc** — Cursor rule for same (when editing API controllers/models/requests).
- **pbx3/full_schema.sql** — schema yardstick; API models/controllers must match column set (see SYSTEM_CONTEXT.md).
- **TRUNK_ROUTE_MULTITENANCY.md** — Trunk/route ownership (collective vs private), allocation, migration mechanics; read when working on trunks, outbound routes, or tenant migration.
- **wizardnotes/** — add-wizard.md, agent-brief-spa.md per resource (DDI, extension, trunk, ivr).
- **SYSTEM_CONTEXT.md**, **README.md** — context and setup.
