# Agent Handoff: Technical Debt & Panel Pattern Conversion

**Purpose:** Let a new agent (or new session) pick up and continue technical debt reduction and panel conversion without redoing work or losing context.

**Repo:** All work below is in **`pbx3spa`**. This is its own git repo (root is `pbx3spa/`, not the parent `pbx3-master/`).

**Last updated:** 2026-02-03

---

## 1. What is the “pattern”?

The target pattern for every CRUD resource is documented in:

- **`workingdocs/PANEL_PATTERN.md`** — Full panel design pattern: three panels per resource (List, Create, Edit), file/route/API naming, form components (FormField, FormSelect, FormToggle, FormReadonly), validation (useFormValidation), layout (CSS Grid, one row per field), Edit panel must have Save + Cancel + Delete at bottom, DeleteConfirmModal for delete, shared normalizeList for list responses, etc. **Read this first** when converting or adding a panel.

Key rules:

- **List:** Name column is **not** a link; only the Edit action links to detail. Toolbar: Create (left), filter (right), `justify-content: space-between`. Use shared `normalizeList` and `<DeleteConfirmModal>`.
- **Create:** Uses form components and shared `normalizeList` for any list fetch (e.g. tenants). Cancel returns to list.
- **Edit:** Heading "Edit {Resource} {Object name}". Save, Cancel, and **Delete** in `.edit-actions` at bottom. Delete button red filled (`action-delete`). Use `<DeleteConfirmModal>`.

---

## 2. Technical debt plan (where we are)

The plan is in **`workingdocs/PANEL_REFACTOR_STRATEGY.md`**. Summary:

### Phase 1: App-wide shared pieces

| Item | Status | Notes |
|------|--------|--------|
| **1.1** `normalizeList` in `src/utils/listResponse.js` | ✅ Exists | **Not all views use it yet** — see Panel conversion status below. |
| **1.2** `DeleteConfirmModal` in `src/components/DeleteConfirmModal.vue` | ✅ Done | All list/detail views that have delete now use it; inline modal/CSS removed. |
| **1.3** (Optional) `fieldErrors(err)` in e.g. `formErrors.js` | ✅ Done | `src/utils/formErrors.js` exports `fieldErrors`, `firstErrorMessage`; Tenant and IVR Create/Detail use it. Other Create views still have local `fieldErrors` — migrate when touching. |

### Phase 2: Resource-specific shared config

| Item | Status | Notes |
|------|--------|--------|
| **2.1** Tenant advanced fields → `src/constants/tenantAdvanced.js` | ✅ Done | ADVANCED_KEYS, ADVANCED_FIELDS, CLUSTER_CREATE_DEFAULTS, buildAdvancedPayload, buildInitialFormAdvanced, parseNum; TenantCreateView + TenantDetailView refactored to use it. |
| **2.2** IVR destinations/keystrokes → `src/constants/ivrDestinations.js` | ✅ Done | OPTION_ENTRIES, buildIvrPayload; IvrCreateView + IvrDetailView refactored to use it. |
| **2.3** Other resources | As needed | Add shared module only when Create and Detail duplicate a large block. |

### Phase 3 & 4

- **Phase 3:** Refactor panels to use shared pieces (ongoing; see panel status below).
- **Phase 4:** Checklist in the strategy doc — use it when adding or refactoring any panel so debt doesn’t return.

### Suggested order (from strategy doc)

- Steps **1–6:** Done (listResponse, DeleteConfirmModal, tenantAdvanced.js, ivrDestinations.js; Tenant and IVR Create/Detail refactored).
- **Step 7:** ✅ Quick fixes — TenantsListView toolbar `justify-content: space-between`; TenantCreateView duplicate `.advanced-fields` CSS removed.
- **Step 8:** Apply pattern to next resource (e.g. Extensions) using shared list + modal; repeat for remaining resources.

---

## 3. Panel conversion status

**Reference implementations (already on pattern):**

- **List:** `src/views/IvrsListView.vue`, `src/views/TenantsListView.vue`, `src/views/RoutesListView.vue`, `src/views/InboundRoutesListView.vue`, `src/views/TrunksListView.vue`, `src/views/ExtensionsListView.vue`, `src/views/AgentsListView.vue`, `src/views/QueuesListView.vue`
- **Create:** `src/views/IvrCreateView.vue`, `src/views/TenantCreateView.vue`, `src/views/RouteCreateView.vue`, `src/views/InboundRouteCreateView.vue`, `src/views/TrunkCreateView.vue`, `src/views/ExtensionCreateView.vue`, `src/views/AgentCreateView.vue`, `src/views/QueueCreateView.vue`
- **Edit:** `src/views/IvrDetailView.vue`, `src/views/TenantDetailView.vue`, `src/views/RouteDetailView.vue`, `src/views/InboundRouteDetailView.vue`, `src/views/TrunkDetailView.vue`, `src/views/ExtensionDetailView.vue`, `src/views/AgentDetailView.vue`, `src/views/QueueDetailView.vue`

### Shared `normalizeList` (from `@/utils/listResponse.js`)

**Using shared:** TenantsListView, IvrsListView, IvrCreateView, IvrDetailView, RoutesListView, RouteCreateView, RouteDetailView, InboundRoutesListView, InboundRouteCreateView, InboundRouteDetailView, TrunksListView, TrunkCreateView, TrunkDetailView, ExtensionsListView, ExtensionCreateView, ExtensionDetailView, AgentsListView, AgentCreateView, AgentDetailView, QueuesListView, QueueCreateView, QueueDetailView.

**Still using local `normalizeList` (candidate for migration):**  
None. (Backups panel was removed/parked; no BackupsListView in codebase.)

→ If a new list view is added later, use `import { normalizeList } from '@/utils/listResponse'` and call `normalizeList(response)` or `normalizeList(response, { resourceKey: '…' })` as needed (see `listResponse.js` for signature).

### DeleteConfirmModal

**Using shared:** All list and detail views that have delete: TenantsListView, TenantDetailView, IvrsListView, IvrDetailView, RoutesListView, RouteDetailView, InboundRoutesListView, InboundRouteDetailView, TrunksListView, TrunkDetailView, ExtensionsListView, AgentsListView, AgentDetailView, QueuesListView, QueueDetailView. (Backups panel removed/parked.)

### Full pattern (list + create + edit)

- **Tenant:** List/Create/Edit refactored; **tenantAdvanced.js** in use — no duplicate advanced config. **IVR:** List/Create/Edit refactored; **ivrDestinations.js** in use — no duplicate optionEntries/ivrPayload.
- **Routes:** List/Create/Edit refactored; use shared normalizeList, form components, DeleteConfirmModal, firstErrorMessage.
- **Inbound Routes:** List/Create/Edit refactored; shared normalizeList, form components, DeleteConfirmModal, firstErrorMessage; always-edit Detail; validation (validateInboundRoutePkey, validateInboundCarrier).
- **Trunks:** List/Create/Edit refactored; shared normalizeList, form components, DeleteConfirmModal, firstErrorMessage; always-edit Detail; validation (validateTrunkPkey, validateTenant).
- **Extensions:** List/Create/Edit refactored; shared normalizeList, form components, DeleteConfirmModal, firstErrorMessage; always-edit Detail with Save/Cancel/Delete; validation (validateExtensionPkey, validateTenant); Detail exposes all API updateable fields (Identity, Transport, Advanced, Runtime).
- **Agents:** List/Create/Edit refactored; shared normalizeList, form components, DeleteConfirmModal, firstErrorMessage; always-edit Detail with Save/Cancel/Delete; validation (validateAgentPkey, validateTenant, validateAgentName, validateAgentPasswd); Detail exposes cluster, name, passwd, queue1–6.
- **Queues:** List/Create/Edit refactored; use shared normalizeList, form components, DeleteConfirmModal, firstErrorMessage; schema compliance (no `conf` field).
- **Backups:** Removed/parked — no Backups view or route in codebase. See PROJECT_PLAN.md (Parked).

---

## 4. Key files and docs

| Document / file | Purpose |
|-----------------|--------|
| `workingdocs/PANEL_PATTERN.md` | **Canonical panel pattern** — layout, components, validation, Edit buttons, naming. |
| `workingdocs/PANEL_REFACTOR_STRATEGY.md` | **Technical debt plan** — Phases 1–4, suggested order, checklist. |
| `workingdocs/TECHNICAL_DEBT_TENANT_PANELS.md` | Tenant-specific debt (advanced fields duplication, toolbar, CSS, etc.). |
| `workingdocs/TECHNICAL_DEBT_ANALYSIS.md` | Broader technical debt notes. |
| `src/utils/listResponse.js` | Shared `normalizeList(response, resourceKey?)`. |
| `src/components/DeleteConfirmModal.vue` | Shared delete confirmation modal; use in list and detail views. |
| `src/constants/tenantAdvanced.js` | Tenant advanced fields: ADVANCED_KEYS, ADVANCED_FIELDS, CLUSTER_CREATE_DEFAULTS, buildAdvancedPayload, buildInitialFormAdvanced, parseNum. |
| `src/constants/ivrDestinations.js` | IVR keystroke options: OPTION_ENTRIES, buildIvrPayload. |
| `src/utils/formErrors.js` | Shared `fieldErrors(err)`, `firstErrorMessage(err, fallback)` for API validation errors. |
| `src/components/forms/` | FormField, FormSelect, FormToggle, FormReadonly — use these for all form fields. |
| `src/composables/useFormValidation.js` | Validation composable; use with validators from `src/utils/validation.js`. |

---

## 5. Recommended next steps for a new agent

1. **Read** `workingdocs/PANEL_PATTERN.md` (sections on List/Create/Edit and the checklist).
2. **Read** `workingdocs/PANEL_REFACTOR_STRATEGY.md` (Phases 1–2 and suggested order).
3. **Optional:** When adding a new list view, use shared `normalizeList` from `listResponse.js` from the start (no Backups panel; all current panels already use it).
4. **When touching any panel:** Use the Phase 4 checklist in the strategy doc so the same debt doesn’t come back.

---

## 5a. To debug / TODO

- **Extension runtime (API):** Extension detail panel’s Runtime section (GET/PUT `extensions/{pkey}/runtime` for cfim, cfbs, ringdelay) is not working; issue appears to be in the API. Debug and fix later.

---

## 6. Conventions and gotchas

- **Repo:** Work only in `pbx3spa`; run `git status` / `git add` / `git commit` from `pbx3spa/`.
- **Edit panels:** Every Edit panel must have **three** buttons at bottom: Save, Cancel, Delete (pattern doc is explicit). Delete opens DeleteConfirmModal; label "Delete" / "Deleting…", red style.
- **List view:** Primary key/name column is plain text, **not** a link; only the Edit action (icon/button) links to the Edit panel.
- **Validation:** Refs must be declared **before** `useFormValidation(...)` in script setup.
- **normalizeList:** Current signature in `listResponse.js` is `normalizeList(response, resourceKey)` where `resourceKey` is optional (e.g. `'tenants'`, `'ivrs'`). Handles array, `{ data: [] }`, `{ [resourceKey]: [] }`, numeric-keyed object.

---

*This handoff is intended to give a new agent everything needed to continue technical debt reduction and panel conversion without re-reading the full conversation history.*
