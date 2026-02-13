# Standardized Panel Design Pattern

**Last Updated**: 2026-02-12  
**Based on**: IVR CRUD panels implementation (refactored with reusable components)  
**Status**: Pattern established and documented, ready for application to all panels

**Important**: 
- **You must use the reusable form components** for all form fields: `FormField`, `FormSelect`, `FormToggle`, `FormReadonly` (from `src/components/forms/`). Do not use raw `<label>` + `<input>` / `<select>` for fields that these components can represent. Use them so that layout, accessibility, and behaviour stay consistent across panels.
- **Editable fields must match the API:** Create and Edit panels must expose **every** field the API accepts. Do not omit fields. Before building or refactoring a panel, **cross-reference with the API**: list all fields from the backend controller’s create/update validation (e.g. `updateableColumns` in PHP, or request rules) and optionally the resource’s schema (e.g. `full_schema.sql`). For each field, add a corresponding FormField, FormSelect, or FormToggle (editable), or FormReadonly (read-only on Edit). See **API field parity (editable fields)** and **Field parity checklist** below.
- This pattern also uses the `useFormValidation` composable where validation is needed.
- Do NOT use the old table-based approach for form fields.
- Always declare refs BEFORE validation composables.
- Use CSS Grid layout (not tables) for form fields.
- **Use shared list normalization:** Import `normalizeList` from `@/utils/listResponse.js` for any list fetch (list views, and Create/Edit views that load lists e.g. tenants). Do **not** define a local `normalizeList` in the view.
- **Use shared delete modal:** Use the `<DeleteConfirmModal>` component from `@/components/DeleteConfirmModal.vue` for delete confirmation in list and detail views. Do **not** copy inline Teleport + modal markup and modal CSS into the view.
- **Tenant (cluster) dropdown:** Do **not** assume the API returns tenant pkey. The API may return `cluster` as tenant **shortuid**. Follow the **Tenant Resolution Pattern** (see Common Patterns & Helpers): (1) options = tenant **pkey** only; (2) in **Edit** view when loading the resource, **resolve** `resource.cluster` to tenant pkey via a shortuid→pkey map before setting the form value; (3) in **List** view resolve cluster to pkey for display. No assumptions.

---

## Overview

This document defines the standardized pattern for all CRUD panels in the application. The pattern was established through the IVR panel implementation and should be applied consistently across all resources (Tenants, Extensions, Trunks, Routes, Queues, Agents, InboundRoutes, etc.).

**This is a complete guide** - follow it step-by-step to build a new panel from scratch.

---

## Panel structure (three panels only)

Every resource has **exactly three panels**. Use the same structure as the IVR panels unless a resource explicitly overrides.

### The three panels

1. **Main list** (`{Resource}ListView.vue`) – Table (or list) of all items. Toolbar: Create button, filter. Rows: columns + Edit action + Delete action.
2. **Create** (`{Resource}CreateView.vue`) – Single form to create one item. No top-level back link; use Cancel in the form to return to the list. **Action buttons (Create, Cancel) must appear at both the top and bottom of the form.**
3. **Edit** (`{Resource}DetailView.vue`) – Single form to view and edit one item (immutable fields with FormReadonly, editable with FormField/FormSelect/FormToggle). **All edit panels must have three buttons (Save, Cancel, Delete) at both the top and bottom of the form.** Delete is placed alongside Save and Cancel in `.edit-actions`, not in a toolbar at the top. No separate "view" panel; no link from the list that goes to a different "item list" panel.

There is **no fourth panel** (e.g. no "item list" or intermediate list). Navigation is: **List ↔ Create** and **List ↔ Edit** only.

### Create panel: heading

The Create panel main heading must be **"Create {resource}"** in singular, lowercase (e.g. **"Create route"**, **"Create tenant"**, **"Create IVR"**). Do not add extra parentheticals (e.g. avoid "Create route (ring group)"); keep it short.

### Edit panel: heading

The Edit panel main heading must be **"Edit {Panel name} {Object name}"**.

- **Panel name**: The resource type in singular, with capitalisation matching the app (e.g. "IVR", "Tenant", "Extension").
- **Object name**: A display name for the item if the API provides one (e.g. `cname` for IVR), otherwise the primary key (e.g. `pkey`). Examples: "Edit IVR 1234", "Edit IVR My Menu", "Edit Tenant default".

Use a single `<h1>`; e.g. `Edit {Resource} {{ displayName || pkey }}` where `displayName` is the optional display field (e.g. `resource?.cname?.trim() ?? ''`).

### Edit panel: Save, Cancel, and Delete buttons (all required)

**All edit panels must include exactly three buttons** at the bottom of the form (in `.edit-actions`): **Save**, **Cancel**, and **Delete**. Do not omit the Delete button; if delete is not allowed for a specific item (e.g. the default tenant), disable the Delete button and show an error message when the user clicks it, or open the confirmation modal with a message that the item cannot be deleted.

- **Placement**: All three buttons sit in the same row at the **bottom** of the form (inside `.edit-actions`). Do not put Delete in a toolbar at the top.
- **Top and bottom**: **Repeat the same action row at the top of the form** (e.g. immediately after the form-level error message, before the first section heading). Use the same class `.edit-actions` and add `.edit-actions-top` so the row appears both above the form content and at the bottom. This way the user always sees Save/Cancel/Delete without scrolling.
- **Labels**: Save / "Saving…"; Cancel; Delete / "Deleting…". Use exactly **"Delete"** (not resource-specific text like "Delete tenant" or "Delete IVR").
- **Delete style**: Red filled button: **red background** (e.g. `#dc2626`), **white text**, no border; hover a darker red (e.g. `#b91c1c`). Same visual weight as the Save button but red to indicate a destructive action. Use class `action-delete` for the Delete button.

### List panel: heading

The list panel main heading is typically the resource name plural (e.g. **"Tenants"**, **"IVRs"**). When the app has similar resources that need disambiguation, add it in parentheses (e.g. **"Routes (Outbound)"** to distinguish from inbound routes; **"Inbound routes"** for the other). Use a single `<h1>`.

### List view: links to Edit only via the Edit action

- The **primary key / name column** in the list must **not** be a link. Show the value as plain text (e.g. `{{ item.pkey }}`).
- **Only the Edit action** (icon or button in the Edit column) must link to the Edit panel (`{resource}-detail`). Do not link the row item name to the edit panel.
- Reference: `IvrsListView.vue` (name column is plain text; Edit icon is the only link to `ivr-detail`).

### API field parity (editable fields)

- **Every field the API accepts must have a form control** in the Create and/or Edit panels. **Create an editable form control (FormField / FormSelect / FormToggle) for every editable field in the API object;** do not omit fields.
- **Field parity checklist (mandatory when adding or refactoring a panel):**
  1. **List all API-accepted fields** from the backend: controller’s `updateableColumns` (or equivalent) and/or FormRequest validation rules for create (POST) and update (PUT). Optionally cross-check with the resource’s database schema (e.g. `full_schema.sql`) to catch columns that exist but might be missing from the controller’s list.
  2. **For each field**, decide:
     - **Editable on Create:** FormField / FormSelect / FormToggle; include in POST body.
     - **Editable on Edit:** FormField / FormSelect / FormToggle; include in PUT body.
     - **Set at create only (read-only on Edit):** On Create, include in POST body. On Edit, show with **FormReadonly** in the Identity section (with other non-updateable fields) and **do not** include in the PUT body. Style with low-light (e.g. class `readonly-identity`).
     - **Immutable (never editable):** e.g. pkey, id, shortuid — **only for fields the API actually returns**. Not every resource has `id` or `shortuid`; show FormReadonly in the Identity section only for fields present on the resource (e.g. Agent has `pkey` but no `shortuid`/`id`). On Edit only: FormReadonly in Identity section with low-light styling.
  3. **Verify:** No field in the API list is missing from the UI; no extra field is sent on PUT that the API does not accept (or that the product explicitly keeps read-only on edit).
- **Edit panel completeness:** Edit panels must expose **every** updateable field from the controller/schema. Do not leave an edit panel "short" on fields (e.g. only a few fields when the API accepts many). Group fields into logical sections (Identity, Settings/Options, Connection, Timing & limits, Advanced) as appropriate for the resource so the form remains scannable.
- **Required fields that affect behaviour:** If a field is required for the resource to work (e.g. a dialplan pattern without which the route will not function), mark it **required** in the UI, add a validator in `src/utils/validation.js`, and validate on Create (and block save on Edit if empty). Use the **placeholder** and **hint** to show an example value (e.g. `_XXXXXX` for dialplan). Do not label such fields as optional.

### Fields set at create only (read-only on Edit)

Some fields are updateable in the API but should **not** be changeable after create (e.g. transport on Trunks). For those:

- **Create panel:** Expose the field (FormField/FormSelect/FormToggle) and include it in the POST body.
- **Edit panel:** Show the value as **FormReadonly** in the **Identity** section, below the other non-updateable fields (e.g. Name, Local UID, KSUID). Use the same low-light styling as other identity readonly fields (e.g. class `readonly-identity` on the FormReadonly component). **Do not** include the field in the PUT (save) payload.
- **Styling:** Apply a muted colour to label and value (e.g. `#94a3b8`) and a light background (e.g. `#f1f5f9`) so it is visually grouped with Name, Local UID, KSUID. Example: `TrunkDetailView.vue` (Transport).

### Form layout: one row per field (same as IVR)

- All form fields must use the shared form components and **one row per field** layout:
  - Put fields in a container with class **`form-fields`**.
  - Use **`FormField`**, **`FormSelect`**, **`FormToggle`**, **`FormReadonly`** so each field renders as one row (label | input), with the same grid layout as IVR.
- Do **not** use a table for form layout. Do **not** use raw `<label>` + `<input>` in a different layout (e.g. stacked label above input without the shared grid). Every field row should look like the IVR Create/Edit panels.

### Reusable form components (required)

All form fields must be implemented with the shared components from `src/components/forms/`:

- **FormField** – text/number inputs (with optional hint, error, required).
- **FormSelect** – dropdowns (single value from options or option groups). When using **optionGroups**, all groups are rendered; groups with no options show a "—" placeholder so the full list of types is always visible.
- **FormToggle** – YES/NO (or two-value) toggle (checkbox-style).
- **FormReadonly** – display-only value (e.g. immutable identity fields on Edit).

Use these for every field that fits (text, number, select, boolean/toggle, readonly). Do not replace them with raw HTML form elements for the same purpose.

### Destination dropdowns (FormSelect with optionGroups)

When a form has fields that select a **destination** (e.g. open route, closed route, or similar “send call to” targets), use **FormSelect** with both **options** (flat choices like "None", "Operator") and **optionGroups** (grouped choices by type). Ensure **all** valid destination types are included:

- **Data sources:** Call the destinations API (`GET /destinations?cluster={tenant}`) for Queues, Extensions, IVRs, CustomApps. If the backend also accepts **Routes** (outbound ring groups) as targets, fetch routes (`GET /routes`) and filter by the same tenant/cluster, then add a **Routes** group to the optionGroups object. Do not rely on the destinations API alone if routes are valid targets.
- **Normalize the API response:** Destinations may be returned with different key casing (e.g. `Queues` vs `queues`). When building the optionGroups object, accept both shapes so the dropdown is populated regardless of server response format.
- **Show all groups:** FormSelect renders all optgroups in optionGroups; groups with no items show a "—" placeholder so the user always sees the full set of destination types (Queues, Extensions, IVRs, CustomApps, Routes). Do not hide or omit a group just because it is empty.
- **Reference:** InboundRouteCreateView and InboundRouteDetailView: `destinationGroups` computed from destinations + routes, passed as `option-groups` to FormSelect for open route and closed route.

### Fixed-choice fields (FormSelect, not free text)

When the API or schema defines a **fixed set of allowed values** (e.g. validation rule `in:YES,NO` or a known enum), use **FormSelect** with that exact list. Do **not** use a free-text FormField with a placeholder listing the options.

- **Examples:** `devicerec`, `strategy` (queue), `active` (YES/NO), `disa`, `iaxreg`, `pjsipreg`.
- **Source of truth:** Cross-check the backend controller’s validation (e.g. `updateableColumns`) and/or schema comments to get the exact allowed values. Keep the SPA option list in sync with the API so validation never fails due to a typo or extra option.

### Device recording (devicerec)

**Always use a dropdown (FormSelect), never a text field.** Options must match the API validation (e.g. Trunk/Extension/Inbound Route: `None`, `OTR`, `OTRR`, `Inbound`, `Outbound`, `Both`; Queue may add `default`). Use a **normalize** helper when loading: map unknown or empty API values to the first option (e.g. `'None'`) so the dropdown always shows a valid selection. On save, send the selected value (or `'None'` when empty). Do not use a single option like `"Inbound.Outbound"` with a period—if the API expects two choices, use two options: `Inbound` and `Outbound`.

### Registration fields (iaxreg, pjsipreg)

Use **FormSelect** with options `['', 'SND', 'RCV']` and `empty-text="—"`. Schema comment is typically "SND/RCV/NULL". Do **not** use a free-text field or comma-separated string. When loading, normalize unknown values to `''` (empty). On save, send the selected value or omit/undefined when empty.

### Toggle values must match API (YES/NO vs ON/OFF)

Use the values the **API and schema expect**. For example: `active` and `moh` are often validated as `in:YES,NO`; use **YES/NO** in FormToggle (`yes-value="YES"` `no-value="NO"`), not ON/OFF. Check the controller’s validation rules and schema defaults so the payload never sends a value the API rejects.

### Advanced sections

- **Prefer showing all fields.** If a form has extra settings (e.g. "Advanced" options), show them inline under an **"Advanced"** section heading (`<h2 class="detail-heading">Advanced</h2>`) with the same one-row-per-field layout. Do **not** use a hide/reveal (collapsible) for these fields unless there is a strong reason—showing everything reduces cognitive load ("Don't make me think").
- **On Create**: Every field in the Advanced section must use **FormField** / **FormSelect** / **FormToggle** as appropriate. No custom pill/switch markup; use the form components so the layout matches the rest of the form.
- **On Edit**: The Edit panel should match the Create panel for the same resource. Same Advanced fields, also editable (using FormField/FormSelect/FormToggle), populated from the loaded item and included in the update payload. Only use a read-only block when the API does not support updating those fields.

---

## File Naming Conventions

### View Files

- **List View**: `{Resource}ListView.vue` (e.g., `TenantsListView.vue`, `IvrsListView.vue`)
- **Create View**: `{Resource}CreateView.vue` (e.g., `TenantCreateView.vue`, `IvrCreateView.vue`)
- **Edit View**: `{Resource}DetailView.vue` (e.g., `TenantDetailView.vue`, `IvrDetailView.vue`)

**Note**: Use singular form for resource name in file names (e.g., `Ivr`, not `Ivr`). Plural is only used in the List view filename.

### Component Files

- **Form Components**: `src/components/forms/FormField.vue`, `FormSelect.vue`, `FormToggle.vue`, `FormReadonly.vue`
- **DeleteConfirmModal**: `src/components/DeleteConfirmModal.vue` — use for delete confirmation in list and detail views (do not copy inline modal markup).
- **List normalization**: `src/utils/listResponse.js` — export `normalizeList`; use for all list fetches (do not define local normalizeList).
- **Validation Composable**: `src/composables/useFormValidation.js`
- **Validation Rules**: `src/utils/validation.js`

---

## Route Naming Conventions

### Route Names

- **List**: `{resource}s` (plural, lowercase, e.g., `ivrs`, `tenants`, `extensions`)
- **Create**: `{resource}-create` (singular, lowercase, hyphenated, e.g., `ivr-create`, `tenant-create`)
- **Detail/Edit**: `{resource}-detail` (singular, lowercase, hyphenated, e.g., `ivr-detail`, `tenant-detail`)

### Route Paths

- **List**: `/{resource}s` (e.g., `/ivrs`, `/tenants`)
- **Create**: `/{resource}s/new` (e.g., `/ivrs/new`, `/tenants/new`)
- **Detail**: `/{resource}s/:pkey` (e.g., `/ivrs/:pkey`, `/tenants/:pkey`)

### Router Configuration

Add routes to `src/router/index.js`:

```javascript
import {Resource}ListView from '../views/{Resource}ListView.vue'
import {Resource}CreateView from '../views/{Resource}CreateView.vue'
import {Resource}DetailView from '../views/{Resource}DetailView.vue'

// Inside routes array:
{ path: '{resources}', name: '{resources}', component: {Resource}ListView },
{ path: '{resources}/new', name: '{resource}-create', component: {Resource}CreateView },
{ path: '{resources}/:pkey', name: '{resource}-detail', component: {Resource}DetailView },
```

**Example**:
```javascript
{ path: 'ivrs', name: 'ivrs', component: IvrsListView },
{ path: 'ivrs/new', name: 'ivr-create', component: IvrCreateView },
{ path: 'ivrs/:pkey', name: 'ivr-detail', component: IvrDetailView },
```

---

## API Endpoint Patterns

### Endpoints

- **List**: `GET /{resources}` (e.g., `GET /ivrs`, `GET /tenants`)
- **Get One**: `GET /{resources}/{pkey}` (e.g., `GET /ivrs/1234`)
- **Create**: `POST /{resources}` (e.g., `POST /ivrs`)
- **Update**: `PUT /{resources}/{pkey}` (e.g., `PUT /ivrs/1234`)
- **Delete**: `DELETE /{resources}/{pkey}` (e.g., `DELETE /ivrs/1234`)

### Response Formats

**List Response** (may vary):
```javascript
// Option 1: Direct array
[{ pkey: '1234', ... }, { pkey: '5678', ... }]

// Option 2: Wrapped in data
{ data: [{ pkey: '1234', ... }] }

// Option 3: Wrapped in resource name
{ ivrs: [{ pkey: '1234', ... }] }

// Option 4: Numeric keys object
{ 0: { pkey: '1234', ... }, 1: { pkey: '5678', ... } }
```

**Single Resource Response**:
```javascript
{ pkey: '1234', shortuid: 'abc123', id: 'ksuid...', cluster: 'default', ... }
```

**Error Response**:
```javascript
{
  data: {
    field: ['Error message'],
    field2: ['Another error']
  },
  message: 'General error message'
}
```

### Using API Client

```javascript
import { getApiClient } from '@/api/client'

// GET request
const response = await getApiClient().get('resources')
const resource = await getApiClient().get(`resources/${encodeURIComponent(pkey)}`)

// POST request
const created = await getApiClient().post('resources', { pkey: '1234', ... })

// PUT request
await getApiClient().put(`resources/${encodeURIComponent(pkey)}`, { ... })

// DELETE request
await getApiClient().delete(`resources/${encodeURIComponent(pkey)}`)

// With query params
const response = await getApiClient().get('destinations', { params: { cluster: 'default' } })
```

---

## Common Patterns & Helpers

### Tenant Resolution Pattern

**Mandatory** for any panel that has a tenant (cluster) dropdown. Do not assume the API returns pkey; follow this pattern.

**Problem**: API may return tenant `shortuid` in `cluster` field, but dropdowns must display and store tenant **pkey**.

**Checklist (follow every time):**
1. **Options:** Tenant dropdown options = tenant **pkey** only (e.g. `tenants.value.map((t) => t.pkey)`).
2. **Edit view — load:** When syncing the loaded resource into the form, resolve `resource.cluster` (may be shortuid or pkey) to tenant **pkey** using a shortuid→pkey map; set the form cluster ref to that pkey. Do not set `editCluster = resource.cluster` directly.
3. **List view — display:** When showing cluster/tenant in the list, resolve `item.cluster` to tenant pkey using the same map for display.
4. **Save:** Send tenant **pkey** in create/update payloads (the form value is already pkey).

**Solution**: Create a computed map to resolve shortuid → pkey, then use it when loading the Edit form and when displaying in the List.

```javascript
// Load tenants
const tenants = ref([])
async function loadTenants() {
  try {
    const response = await getApiClient().get('tenants')
    tenants.value = normalizeList(response)
  } catch {
    tenants.value = []
  }
}

// Map shortuid → pkey for resolution
const tenantShortuidToPkey = computed(() => {
  const map = {}
  for (const t of tenants.value) {
    if (t.shortuid) map[String(t.shortuid)] = t.pkey
    if (t.pkey) map[String(t.pkey)] = t.pkey  // Also map pkey to itself
  }
  return map
})

// Tenant options for dropdown (always use pkey)
const tenantOptions = computed(() => {
  const list = tenants.value.map((t) => t.pkey).filter(Boolean)
  return [...new Set(list)].sort((a, b) => String(a).localeCompare(String(b)))
})

// Include current value if not in list (for edit view)
const tenantOptionsForSelect = computed(() => {
  const list = tenantOptions.value
  const cur = cluster.value  // or editCluster.value
  if (cur && !list.includes(cur)) {
    return [cur, ...list].sort((a, b) => String(a).localeCompare(String(b)))
  }
  return list
})

// In Edit view: Resolve cluster from API (may be shortuid) to pkey
function syncEditFromResource() {
  if (!resource.value) return
  const clusterRaw = resource.value.cluster ?? 'default'
  // Resolve shortuid to pkey for dropdown
  editCluster.value = tenantShortuidToPkey.value[clusterRaw] ?? clusterRaw
  // ... other fields
}

// In List view: Display tenant pkey (resolve shortuid)
function tenantDisplay(item) {
  const c = item.cluster
  if (c == null || c === '') return '—'
  return tenantShortuidToPkey.value[String(c)] ?? c
}
```

### Tenant resolution for queue dropdowns (e.g. Agents)

**Problem**: The agent (or similar resource) stores tenant as `cluster` (often the tenant **pkey**). Queues are scoped by `queue.cluster`, which is the tenant **shortuid**. So when building queue options for an agent's tenant, you must filter queues by the tenant's **shortuid**, not pkey.

**Solution**: Resolve the current tenant (pkey from the form) to that tenant's shortuid, then filter queues by `String(q.cluster).trim() === tenantShortuid`.

```javascript
// In Agent Create/Edit: cluster (or editCluster) is tenant pkey
const tenantShortuid = computed(() => {
  const p = cluster.value  // or editCluster.value
  if (!p) return ''
  const t = tenants.value.find((x) => String(x.pkey) === String(p) || String(x.shortuid) === String(p))
  return t?.shortuid ? String(t.shortuid).trim() : (String(p).trim() === p ? p : '')
})

const queueOptionsForTenant = computed(() => {
  const sid = tenantShortuid.value
  if (!sid) return []
  const list = queues.value.filter((q) => String(q.cluster || '').trim() === sid)
  return [...new Set(list.map((q) => q.pkey).filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b)))
})
```

Use `queueOptionsForTenant` for queue dropdowns and `empty-text="None"` so a single "None" option appears when the user clears the selection.

### Empty queue / optional choice normalization

When a resource has optional queue (or similar) fields that can be "none":

- **Display (list or readonly):** Show `'None'` for `null`, `''`, or `'-'` (not em dash '—'). Use a helper, e.g. `displayQueue(v) => (v == null || v === '' || v === '-' ? 'None' : String(v).trim())`.
- **Load (Edit form):** Normalize API values to form empty string: `null`, `''`, `'-'`, `'None'` → `''` so the dropdown shows "None".
- **Save (Create/Edit payload):** Normalize form empty to API: `''`, `'-'`, `'None'` → `null` (or omit) so the API receives a clear "no selection" value.

Example helpers:

```javascript
function displayQueue(v) {
  if (v == null || v === '' || v === '-') return 'None'
  return String(v).trim()
}
function normalizeQueueFromApi(v) {
  if (v == null || v === '' || v === '-' || String(v).trim().toLowerCase() === 'none') return ''
  return String(v).trim()
}
function normalizeQueueForSave(v) {
  const s = String(v ?? '').trim()
  if (s === '' || s === '-' || s.toLowerCase() === 'none') return null
  return s
}
```

### Destinations Loading Pattern

**Purpose**: Load destinations (Queues, Extensions, IVRs, CustomApps) for dropdowns.

```javascript
const destinations = ref(null)
const destinationsLoading = ref(false)

async function loadDestinations() {
  const c = cluster.value  // or editCluster.value
  if (!c) {
    destinations.value = null
    return
  }
  destinationsLoading.value = true
  try {
    const response = await getApiClient().get('destinations', { params: { cluster: c } })
    destinations.value = response && typeof response === 'object' ? response : null
  } catch {
    destinations.value = null
  } finally {
    destinationsLoading.value = false
  }
}

// Group destinations for optgroups
const destinationGroups = computed(() => {
  const d = destinations.value
  if (!d || typeof d !== 'object') return {}
  return {
    Queues: Array.isArray(d.Queues) ? d.Queues : [],
    Extensions: Array.isArray(d.Extensions) ? d.Extensions : [],
    IVRs: Array.isArray(d.IVRs) ? d.IVRs : [],
    CustomApps: Array.isArray(d.CustomApps) ? d.CustomApps : []
  }
})

// Watch cluster changes to reload destinations
watch(cluster, () => {
  loadDestinations()
  if (clusterValidation.touched.value) {
    clusterValidation.validate()
  }
})
```

### Delete Confirmation Modal Pattern

**Use the shared component.** Import and use `<DeleteConfirmModal>` from `@/components/DeleteConfirmModal.vue`. Do **not** copy inline Teleport + modal markup or modal CSS into the view.

**List View** — use one modal instance; pass the item being confirmed (e.g. `confirmDeletePkey`):

```vue
<DeleteConfirmModal
  :show="!!confirmDeletePkey"
  :title="`Delete ${resourceLabel}?`"
  :body-text="confirmDeletePkey ? `${resourceLabel} ${confirmDeletePkey} will be permanently deleted. This cannot be undone.` : ''"
  confirm-label="Delete"
  cancel-label="Cancel"
  loading-label="Deleting…"
  :loading="deletingPkey === confirmDeletePkey"
  @confirm="confirmDeletePkey && confirmAndDelete(confirmDeletePkey)"
  @cancel="cancelConfirmDelete"
/>
```

**Detail/Edit View** — use one modal for the current resource; pass `pkey` (or display name) in body text.

**Script** (same pattern for list or detail): keep `confirmDeletePkey` / `confirmDeleteOpen`, `deletingPkey` / `deleting`, `deleteError`, and the `askConfirmDelete`, `cancelConfirmDelete`, `confirmAndDelete` functions. The shared component handles backdrop, dialog, and button styling; no modal CSS in the view.

### Sorting Pattern (List View)

- **sortValue(item, key):** For display keys (e.g. `cluster`), return the display string (e.g. tenant pkey); for others return `item[key]` as string, or for numeric columns a comparable value.
- **Numeric columns:** For keys like `timeout`, sort by number so 10 comes after 9. In the sort comparator, detect numeric columns and use `Number(a[key])` vs `Number(b[key])`, with NaN treated as lowest.

```javascript
const sortKey = ref('pkey')
const sortOrder = ref('asc')  // 'asc' | 'desc'

function sortValue(item, key) {
  if (key === 'cluster') return tenantPkeyDisplay(item)  // if applicable
  const v = item[key]
  return v == null ? '' : String(v)
}

const sortedItems = computed(() => {
  const list = [...filteredItems.value]
  const key = sortKey.value
  const order = sortOrder.value
  const isNumeric = key === 'timeout' || key === 'maxlen'  // add other numeric keys
  list.sort((a, b) => {
    let cmp = 0
    if (isNumeric) {
      const na = Number(a[key])
      const nb = Number(b[key])
      const va = Number.isNaN(na) ? -Infinity : na
      const vb = Number.isNaN(nb) ? -Infinity : nb
      if (va < vb) cmp = -1
      else if (va > vb) cmp = 1
    } else {
      const va = sortValue(a, key).toLowerCase()
      const vb = sortValue(b, key).toLowerCase()
      if (va < vb) cmp = -1
      else if (va > vb) cmp = 1
    }
    return order === 'asc' ? cmp : -cmp
  })
  return list
})

function setSort(key) {
  if (sortKey.value === key) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortOrder.value = 'asc'
  }
}

function sortClass(key) {
  if (sortKey.value !== key) return ''
  return sortOrder.value === 'asc' ? 'sort-asc' : 'sort-desc'
}
```

**Template**:
```vue
<th class="th-sortable" title="Click to sort" :class="sortClass('pkey')" @click="setSort('pkey')">
  Column Name
</th>
```

### Filtering Pattern (List View)

```javascript
const filterText = ref('')

const filteredItems = computed(() => {
  const list = items.value
  const q = (filterText.value || '').trim().toLowerCase()
  if (!q) return list
  return list.filter((item) => {
    const pkey = (item.pkey ?? '').toString().toLowerCase()
    const shortuid = (item.shortuid ?? '').toString().toLowerCase()
    const desc = (item.description ?? '').toString().toLowerCase()
    // Add other searchable fields
    return pkey.includes(q) || shortuid.includes(q) || desc.includes(q)
  })
})
```

**Template**:
```vue
<input
  v-model="filterText"
  type="search"
  class="filter-input"
  placeholder="Filter by name, Local UID, tenant, or description"
  aria-label="Filter {Resources}"
/>
```

### Handling Optional Fields in API Payload

**Pattern**: Only include fields in payload if they have values, or explicitly set to `null` if clearing.

```javascript
const body = {
  pkey: pkey.value.trim(),
  cluster: cluster.value.trim(),
  active: active.value
}

// Optional string fields: include if trimmed value exists, else set to null
if (cname.value.trim()) body.cname = cname.value.trim()
else body.cname = null

// Optional number fields: include if value exists and is valid
if (greetnum.value !== '' && greetnum.value != null) {
  body.greetnum = parseInt(greetnum.value, 10)
}

// Optional empty strings: include if trimmed value exists
if (description.value.trim()) body.description = description.value.trim()
```

### Loading Related Data (Greetings, etc.)

**Pattern**: Load related data for dropdowns (e.g., greetings for IVR).

```javascript
const greetings = ref([])
const greetingsLoading = ref(false)

async function loadGreetings() {
  greetingsLoading.value = true
  try {
    const response = await getApiClient().get('greetings')
    greetings.value = Array.isArray(response) ? response : (response?.data ?? [])
  } catch {
    greetings.value = []
  } finally {
    greetingsLoading.value = false
  }
}

// Process greetings to extract numbers
const greetingOptions = computed(() => {
  const list = greetings.value
  if (!Array.isArray(list)) return []
  const nums = list
    .map((name) => {
      const m = String(name).match(/usergreeting(\d+)/i)
      return m ? parseInt(m[1], 10) : null
    })
    .filter((n) => n != null)
  return [...new Set(nums)].sort((a, b) => a - b)
})

// Use in FormSelect
<FormSelect
  :options="greetingOptions.map(n => String(n))"
  :loading="greetingsLoading"
/>
```

### Normalize List Response Pattern

**Use the shared util.** Import `normalizeList` from `@/utils/listResponse.js`. Do **not** define a local `normalizeList` in the view.

**Signature** (in `listResponse.js`): `normalizeList(response, options?)` where `options` may include `{ resourceKey: 'tenants' }` (or `'ivrs'`, `'extensions'`, etc.) when the API wraps the list in a resource key.

**Usage**:
```javascript
import { normalizeList } from '@/utils/listResponse'

// List view or any list fetch
const response = await getApiClient().get('resources')
resources.value = normalizeList(response)
// If API returns { tenants: [...] }:
tenants.value = normalizeList(response, { resourceKey: 'tenants' })
```

### Handling Empty/Null Values

**Display Pattern**: Use `?? '—'` for empty values in display.

```vue
<!-- In templates -->
<td>{{ resource.description ?? '—' }}</td>
<td>{{ resource.greetnum != null ? String(resource.greetnum) : '—' }}</td>

<!-- In FormReadonly -->
<FormReadonly :value="resource.pkey ?? '—'" />
```

**API Payload Pattern**: Handle optional fields correctly.

```javascript
const body = {
  requiredField: field.value.trim(),
  // Optional string: include if trimmed, else null
  optionalString: optionalString.value.trim() || null,
  // Optional number: include if valid, else omit
  ...(optionalNumber.value !== '' && optionalNumber.value != null && {
    optionalNumber: parseInt(optionalNumber.value, 10)
  })
}
```

### Complex Field Patterns (e.g., Keystroke Options)

For resources with repeated field patterns (like IVR's option0-11, tag0-11, alert0-11):

```javascript
// Define entries array
const optionEntries = [
  { key: 'option0', tagKey: 'tag0', alertKey: 'alert0', label: '0' },
  { key: 'option1', tagKey: 'tag1', alertKey: 'alert1', label: '1' },
  // ... continue for all entries
  { key: 'option10', tagKey: 'tag10', alertKey: 'alert10', label: '*' },
  { key: 'option11', tagKey: 'tag11', alertKey: 'alert11', label: '#' }
]

// Initialize refs
const options = ref({
  option0: 'None', option1: 'None', /* ... */ option11: 'None'
})
const tags = ref({
  tag0: '', tag1: '', /* ... */ tag11: ''
})
const alerts = ref({
  alert0: '', alert1: '', /* ... */ alert11: ''
})

// Payload builder function
function resourcePayload(optionsObj, tagsObj, alertsObj, timeoutVal) {
  const body = {}
  for (let i = 0; i <= 11; i++) {
    const o = optionsObj[`option${i}`]
    body[`option${i}`] = o != null && o !== '' ? String(o) : null
    body[`tag${i}`] = tagsObj[`tag${i}`] != null && tagsObj[`tag${i}`] !== '' ? String(tagsObj[`tag${i}`]) : null
    body[`alert${i}`] = alertsObj[`alert${i}`] != null && alertsObj[`alert${i}`] !== '' ? String(alertsObj[`alert${i}`]) : null
  }
  body.timeout = timeoutVal != null && timeoutVal !== '' ? String(timeoutVal) : null
  return body
}

// Sync from API response
function syncEditFromResource() {
  if (!resource.value) return
  const r = resource.value
  for (let i = 0; i <= 11; i++) {
    options.value[`option${i}`] = r[`option${i}`] ?? 'None'
    tags.value[`tag${i}`] = r[`tag${i}`] ?? ''
    alerts.value[`alert${i}`] = r[`alert${i}`] ?? ''
  }
}
```

---

## Panel Types

### 1. List View (`*ListView.vue`)
**Purpose**: Display all resources in a table with filtering, sorting, and actions

### 2. Create View (`*CreateView.vue`)
**Purpose**: Form to create a new resource

### 3. Edit View (`*DetailView.vue`)
**Purpose**: Form to edit an existing resource (always opens in edit mode)

---

## List View Pattern

### Structure

```
<div class="list-view">
  <header class="list-header">
    <h1>{Resource Name}s</h1>
    <p class="toolbar">
      <router-link :to="{ name: '{resource}-create' }" class="add-btn">Create</router-link>
      <input v-model="filterText" type="search" class="filter-input" ... />
    </p>
  </header>

  <section v-if="loading || error || deleteError || items.length === 0" class="list-states">
    <!-- Loading, error, empty states -->
  </section>

  <section v-else class="list-body">
    <p v-if="filterText && filteredItems.length === 0" class="empty">No items match filter.</p>
    <table v-else class="table">
      <thead>
        <tr>
          <!-- Sortable column headers -->
          <th class="th-sortable" @click="setSort('field')">Column Name</th>
          <th class="th-actions" title="Edit">...</th>
          <th class="th-actions" title="Delete">...</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in sortedItems" :key="item.pkey">
          <td>{{ item.field }}</td>
          <td>
            <router-link :to="{ name: '{resource}-detail', params: { pkey: item.pkey } }" 
                         class="cell-link cell-link-icon" title="Edit">
              <!-- Edit icon -->
            </router-link>
          </td>
          <td>
            <button @click="askConfirmDelete(item.pkey)" class="cell-link cell-link-delete">
              <!-- Delete icon -->
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </section>

  <!-- Delete confirmation: use shared DeleteConfirmModal -->
  <DeleteConfirmModal ... />
</div>
```

### Key Elements

**Header:**
- `<h1>`: Resource plural name (e.g., "IVRs", "Tenants")
- Toolbar: Create button (left) + Filter input (right, same line, with `justify-content: space-between`)

**Table:**
- Sortable columns: `th-sortable` class, click handler, sort indicators
- Action columns: Edit (router-link), Delete (button)
- Immutable fields: `cell-immutable` class with `title="Immutable"`

**Filter:**
- Type: `type="search"`
- Position: Right side of toolbar, same line as Create button
- Placeholder: Describes what can be filtered

**Columns:**
- **Identity:** Primary identifier (pkey/name), Local UID (shortuid) if the resource has it—use immutable styling for shortuid.
- **Tenant** (if applicable)—resolve cluster/shortuid to tenant pkey for display (see Tenant Resolution Pattern).
- **Key display columns** from the resource that users need to scan: cross-reference the schema and controller and include columns such as description, active, strategy, timeout, dialplan, path1, etc., as appropriate for the resource. Do not leave list panels with too few columns; add the ones that match common use (e.g. Queues: Local UID, Active, Strategy, Timeout; Routes: Dialplan, Path 1, Active).
- **Every list column** should be **sortable** (use `th-sortable`, `setSort`, `sortClass`).
- **Include new columns in the filter** so the search box can match them; update the filter computed and the placeholder text (e.g. "Filter by name, Local UID, tenant, description, dialplan, path 1, or active").
- **Numeric columns** (e.g. timeout, maxlen): implement **numeric sort** in the sort comparator (compare `Number(a[key])` vs `Number(b[key])`, treating NaN as lowest) so "10" sorts after "9". For non-numeric columns, string sort is fine.
- Edit action (icon), Delete action (icon)

### CSS Classes

```css
.list-view { ... }
.list-header { ... }
.list-header h1 { margin: 0; }
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
}
.add-btn { /* Primary button styling */ }
.filter-input { /* Search input styling */ }
.table { /* Table styling */ }
.th-sortable { /* Sortable header */ }
.cell-link { /* Link styling */ }
.cell-link-icon { /* Icon button */ }
.cell-link-delete { /* Delete button */ }
.cell-immutable { /* Immutable field styling */ }
```

---

## Create View Pattern

### Structure

```vue
<template>
  <div class="create-view">
    <h1>Create {Resource Name}</h1>

    <form class="form" @submit="onSubmit" @keydown="onKeydown">
      <p v-if="error" id="{resource}-create-error" class="error" role="alert">{{ error }}</p>

      <div class="actions actions-top">
        <button type="submit" :disabled="loading">{{ loading ? 'Creating…' : 'Create' }}</button>
        <button type="button" class="secondary" @click="goBack">Cancel</button>
      </div>

      <h2 class="detail-heading">Identity</h2>
      <div class="form-fields">
        <FormField
          id="pkey"
          ref="pkeyInput"
          v-model="pkey"
          label="Primary Identifier"
          type="text"
          :error="pkeyValidation.error.value"
          :touched="pkeyValidation.touched.value"
          :required="true"
          hint="Hint text explaining the field."
          @blur="pkeyValidation.onBlur"
        />
        <FormSelect
          id="cluster"
          v-model="cluster"
          label="Tenant"
          :options="tenantOptions"
          :error="clusterValidation.error.value"
          :touched="clusterValidation.touched.value"
          :required="true"
          :loading="tenantsLoading"
          hint="The tenant this resource belongs to."
          @blur="clusterValidation.onBlur"
        />
        <!-- More fields -->
      </div>

      <h2 class="detail-heading">Settings</h2>
      <div class="form-fields">
        <FormToggle
          id="active"
          v-model="active"
          label="Active?"
          hint="If off, the resource will not be available."
        />
        <!-- More fields -->
      </div>

      <!-- Optional: Additional sections -->
      <section class="destinations-section" aria-labelledby="...">
        <h2 id="..." class="destinations-heading">Section Name</h2>
        <!-- Section content -->
      </section>

      <div class="actions">
        <button type="submit" :disabled="loading">{{ loading ? 'Creating…' : 'Create' }}</button>
        <button type="button" class="secondary" @click="goBack">Cancel</button>
      </div>
    </form>
  </div>
</template>
```

### Key Elements

**Navigation:**
- Heading: `Create {Resource Name}` (no dynamic name, resource is being created)
- No back button at top (use Cancel button or browser back)

**Form Structure:**
- Always uses `<form>` with `@submit` handler
- Error message at top: `role="alert"`, unique ID
- Sections: Identity → Settings → (optional sections)
- Each section: `<h2 class="detail-heading">` → `<div class="form-fields">` containing form components

**Field Layout:**
- Uses reusable form components: `FormField`, `FormSelect`, `FormToggle`
- CSS Grid layout: Labels and inputs side-by-side (semantic HTML, not tables)
- Components handle validation states, ARIA attributes, and error/hint display automatically

**Validation:**
- Uses `useFormValidation` composable for each field
- Validation rules defined in `@/utils/validation.js`
- Components receive `:error` and `:touched` props from validation composable
- Visual states handled by components (`input-error`, `input-valid` classes)
- ARIA attributes handled by components (`aria-invalid`, `aria-describedby`)

**Actions:**
- Submit button: Primary style, shows loading state ("Creating…")
- Cancel button: Secondary style, navigates back
- **Top and bottom**: **Repeat the same action row (Create, Cancel) at the top of the form** (e.g. immediately after the form-level error message, before the first section heading). Use the same class `.actions` and add `.actions-top`. The same row also appears at the bottom of the form. This way the user always sees Create/Cancel without scrolling.

### Field Order (Identity Section)

1. Primary identifier (e.g., "IVR Direct Dial", "Extension number")
   - Required, validated
   - May have specific format (e.g., numeric, 3-5 digits)
2. Tenant (if applicable)
   - Required dropdown
   - Resolves shortuid to pkey for display
3. Description (optional)
   - Text input
4. Display name / Common name (optional, if applicable)
   - Text input
5. Legacy/Deprecated fields (if applicable)
   - Marked as optional, with hint about deprecation

### Field Order (Settings Section)

1. Active? (boolean toggle)
   - iOS-style sliding pill toggle
   - Default: 'YES'
2. Resource-specific settings
   - Dropdowns, inputs, toggles as needed
   - Ordered by importance/frequency of use
3. Timeout/Action fields (if applicable)
   - Usually last in Settings

### CSS Classes

```css
.create-view { max-width: 52rem; }
.form {
  margin-top: 1rem;  /* Spacing between h1 and form content */
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.detail-heading {
  font-size: 1rem;
  font-weight: 600;
  color: #334155;
  margin: 1.5rem 0 0.5rem 0;
}
.detail-heading:first-of-type {
  margin-top: 0;  /* First heading gets spacing from .form wrapper */
}
.form-fields {
  display: flex;
  flex-direction: column;
  gap: 0;
  margin-top: 0.5rem;  /* Spacing between heading and fields */
}
.edit-input { /* Input styling */ }
.input-error { /* Error state */ }
.input-valid { /* Valid state */ }
.field-error { /* Error message */ }
.form-hint { /* Hint text */ }
.actions { /* Action buttons container */ }
```

---

## Edit View Pattern

### Structure

```
<div class="detail-view" @keydown="onKeydown">
  <h1>Edit {Resource Name} {{ displayName || pkey }}</h1>

  <p v-if="loading" class="loading">Loading…</p>
  <p v-else-if="error" class="error">{{ error }}</p>
  <template v-else-if="resource">
    <div class="detail-content">
      <p v-if="deleteError" class="error">{{ deleteError }}</p>

      <form class="edit-form" @submit="saveEdit">
        <p v-if="saveError" id="{resource}-edit-error" class="error" role="alert">{{ saveError }}</p>

        <h2 class="detail-heading">Identity</h2>
        <div class="form-fields">
          <!-- Immutable fields (readonly) -->
          <FormReadonly
            id="edit-identity-pkey"
            label="Primary Identifier"
            :value="resource.pkey ?? '—'"
          />
          <FormReadonly
            id="edit-identity-shortuid"
            label="Local UID"
            :value="resource.shortuid ?? '—'"
          />
          <FormReadonly
            id="edit-identity-id"
            label="KSUID"
            :value="resource.id ?? '—'"
          />
          <!-- Editable fields -->
          <FormSelect
            id="edit-cluster"
            v-model="editCluster"
            label="Tenant"
            :options="tenantOptions"
            :error="clusterValidation.error.value"
            :touched="clusterValidation.touched.value"
            :required="true"
            hint="The tenant this resource belongs to."
            @blur="clusterValidation.onBlur"
          />
          <FormField
            id="edit-description"
            v-model="editDescription"
            label="Description (optional)"
            type="text"
            placeholder="Freeform description"
          />
        </div>

        <h2 class="detail-heading">Settings</h2>
        <div class="form-fields">
          <FormToggle
            id="edit-active"
            v-model="editActive"
            label="Active?"
          />
          <!-- More fields -->
        </div>

        <!-- Optional sections -->

        <div class="edit-actions">
          <button type="submit" :disabled="saving">{{ saving ? 'Saving…' : 'Save' }}</button>
          <button type="button" class="secondary" @click="cancelEdit">Cancel</button>
          <button type="button" class="action-delete" :disabled="deleting" @click="askConfirmDelete">
            {{ deleting ? 'Deleting…' : 'Delete' }}
          </button>
        </div>
      </form>
    </div>
  </template>
</div>
```

### Key Elements

**Navigation:**
- Heading: `Edit {Resource Name} {displayName || pkey}`
  - Shows display name (cname) if available, falls back to pkey
  - Example: "Edit IVR Main Menu" or "Edit IVR 1234"
- No back button at top (use Cancel button or browser back)

**Always in Edit Mode:**
- No read-only view
- Form is always visible and editable
- Opens directly to edit mode (no intermediate view)

**Field Organization:**
- Identity section: Immutable fields first (pkey, shortuid, id) using `FormReadonly`, then editable fields
- Settings section: All editable settings using form components
- Immutable fields: Use `FormReadonly` component (no italic styling, just visual distinction)

**Validation:**
- Same pattern as Create view
- Field-level errors, visual states, ARIA attributes

**Actions (all three required):**
- **Save** button: Primary style; shows "Saving…" when submitting.
- **Cancel** button: Secondary style; navigates back to list.
- **Delete** button: Red filled (`action-delete`); shows "Deleting…" when in progress; opens confirmation modal. If delete is not allowed for this item (e.g. default tenant), disable the button or show an error on click instead of opening the modal.

### Field Order (Identity Section - Edit)

1. Primary identifier (readonly, immutable) — use class `readonly-identity` for low-light
2. Local UID (readonly, immutable) — `readonly-identity` — **only if the API returns it** (e.g. many resources have it; Agent does not)
3. KSUID (readonly, immutable) — `readonly-identity` — **only if the API returns it**
4. Any other read-only-in-edit fields (e.g. Transport) — `readonly-identity`; do not include in save payload
5. Tenant (editable dropdown)
6. Description (optional, editable)
7. Display name / Common name (optional, editable)
8. Legacy/Deprecated fields (optional, editable)

### Field Order (Settings Section - Edit)

Same as Create view, but may include additional fields that are only editable (not set on create).

### CSS Classes

```css
.detail-view { max-width: 52rem; }
.detail-content {
  margin-top: 1rem;  /* Spacing between h1 and form content */
}
.detail-heading {
  font-size: 1rem;
  font-weight: 600;
  color: #334155;
  margin: 1.5rem 0 0.5rem 0;
}
.detail-heading:first-of-type {
  margin-top: 0;  /* First heading gets spacing from .detail-content wrapper */
}
.form-fields {
  display: flex;
  flex-direction: column;
  gap: 0;
  margin-top: 0.5rem;  /* Spacing between heading and fields */
}
.edit-form {
  margin-bottom: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
```

---

## Form Components

### FormField Component

**Purpose**: Text input fields with validation

**Props:**
- `id` (required): Unique field ID
- `label` (required): Field label text
- `v-model`: Two-way binding to field value
- `type`: Input type (default: "text")
- `placeholder`: Placeholder text
- `hint`: Help text shown below field
- `error`: Error message (from validation composable)
- `touched`: Whether field has been touched (from validation composable)
- `required`: Boolean for required fields
- `disabled`: Boolean to disable field
- `inputmode`: Input mode hint (e.g., "numeric")
- `pattern`: HTML5 pattern attribute
- `autocomplete`: Autocomplete attribute (default: "off")

**Events:**
- `@blur`: Emitted when field loses focus (connect to `validation.onBlur`)

**Example:**
```vue
<FormField
  id="pkey"
  ref="pkeyInput"
  v-model="pkey"
  label="Primary Identifier"
  type="text"
  inputmode="numeric"
  pattern="[0-9]{3,5}"
  placeholder="e.g. 1234"
  :error="pkeyValidation.error.value"
  :touched="pkeyValidation.touched.value"
  :required="true"
  hint="Numeric ID (3-5 digits)."
  @blur="pkeyValidation.onBlur"
/>
```

### FormSelect Component

**Purpose**: Dropdown/select fields with validation

**Props:**
- `id` (required): Unique field ID
- `label` (required): Field label text
- `v-model`: Two-way binding to selected value
- `options` (required): Array of option values (strings)
- `option-groups`: Object with group names as keys, arrays of options as values
- `hint`: Help text shown below field
- `error`: Error message (from validation composable)
- `touched`: Whether field has been touched (from validation composable)
- `required`: Boolean for required fields
- `disabled`: Boolean to disable field
- `loading`: Boolean to show loading state
- `loading-text`: Text shown when loading (default: "Loading…")
- `empty-text`: Text for empty option (default: "—")
- `aria-label`: Accessible label

**Events:**
- `@blur`: Emitted when field loses focus (connect to `validation.onBlur`)

**Example:**
```vue
<FormSelect
  id="cluster"
  v-model="cluster"
  label="Tenant"
  :options="tenantOptions"
  :option-groups="destinationGroups"
  :error="clusterValidation.error.value"
  :touched="clusterValidation.touched.value"
  :required="true"
  :loading="tenantsLoading"
  hint="The tenant this resource belongs to."
  @blur="clusterValidation.onBlur"
/>
```

### FormToggle Component

**Purpose**: iOS-style boolean toggle switches

**Props:**
- `id` (required): Unique field ID
- `label` (required): Field label text
- `v-model`: Two-way binding (expects 'YES'/'NO' strings)
- `yes-value`: Value when checked (default: "YES")
- `no-value`: Value when unchecked (default: "NO")
- `hint`: Help text shown below toggle
- `aria-label`: Accessible label

**Example:**
```vue
<FormToggle
  id="active"
  v-model="active"
  label="Active?"
  hint="If off, the resource will not be available."
/>
```

### FormReadonly Component

**Purpose**: Display readonly/immutable fields (Edit view only)

**Props:**
- `id` (required): Unique field ID
- `label` (required): Field label text
- `value`: Value to display (default: "—")

**Example:**
```vue
<FormReadonly
  id="edit-identity-pkey"
  label="Primary Identifier"
  :value="resource.pkey ?? '—'"
/>
```

---

## Validation Pattern

### Validation Rules

Define validation functions in `src/utils/validation.js`:

```javascript
export function validateFieldName(value) {
  if (!value || !value.trim()) {
    return 'Field is required'
  }
  // Additional validation rules
  return null // Valid
}
```

### Using Validation Composable

```javascript
// IMPORTANT: Declare refs BEFORE validation composables
const field = ref('')
const field2 = ref('')

// Use composable for each field (after refs are declared)
const fieldValidation = useFormValidation(field, validateFieldName)
const field2Validation = useFormValidation(field2, validateField2Name)

// The composable returns:
// - fieldValidation.error (ref)
// - fieldValidation.touched (ref)
// - fieldValidation.validate() (function)
// - fieldValidation.onBlur() (function)
// - fieldValidation.reset() (function)
```

### Template Integration

```vue
<FormField
  id="field-id"
  v-model="field"
  label="Field Label"
  :error="fieldValidation.error.value"
  :touched="fieldValidation.touched.value"
  :required="true"
  hint="Hint text explaining the field."
  @blur="fieldValidation.onBlur"
/>
```

### Validate All on Submit

```javascript
async function onSubmit(e) {
  e.preventDefault()
  error.value = ''
  
  // Validate all fields
  const validations = [
    { ...fieldValidation, fieldId: 'field-id' },
    { ...field2Validation, fieldId: 'field2-id' }
  ]
  
  if (!validateAll(validations)) {
    // Focus first error field
    await nextTick()
    focusFirstError(validations, (id) => {
      if (id === 'field-id' && fieldInput.value) return fieldInput.value
      return document.getElementById(id)
    })
    return
  }
  
  // Submit form...
}
```

### Map API Errors to Fields

```javascript
catch (err) {
  const errors = err?.data
  if (errors && typeof errors === 'object') {
    // Map server errors to field-level errors
    if (errors.field) {
      fieldValidation.touched.value = true
      fieldValidation.error.value = Array.isArray(errors.field) ? errors.field[0] : errors.field
    }
    // ... map other fields
    
    // Focus first error
    await nextTick()
    focusFirstError(validations, (id) => document.getElementById(id))
  }
}
```

---

## Navigation Pattern

### List → Create
- Click "Create" button → Navigate to `{resource}-create` route

### List → Edit
- Click Edit icon → Navigate to `{resource}-detail` route with `pkey` param
- Always opens in edit mode (no read-only view)

### Create/Edit → List
- Click Cancel button → Navigate to `{resource}s` route
- Click Back button (←) → Navigate to `{resource}s` route
- After successful save → Navigate to detail view (edit) or list

### Keyboard Navigation
- `Escape` key: Navigate back to list
- `Enter` on form: Submit form

---

## Spacing & Layout

### Vertical Spacing

- **Main heading to form content**: 
  - Create panel: `.form` wrapper has `margin-top: 1rem`
  - Edit panel: `.detail-content` wrapper has `margin-top: 1rem`
- **Main heading to first section**: First `.detail-heading` has `margin-top: 0` (spacing comes from wrapper above)
- **Between sections**: 1.5rem margin-top on `.detail-heading` (except first)
- **Section heading to form fields**: 0.5rem margin-top on `.form-fields`
- **Between form fields**: No gap (fields stack directly)
- **After last section**: 1.5rem margin-bottom

### Horizontal Layout

- **Form field layout**: CSS Grid (`grid-template-columns: minmax(0, 1fr) 2fr`)
- **Label column**: Fixed width (`minmax(0, 1fr)`), `white-space: nowrap`
- **Value column**: Flexible, takes remaining space (`2fr`)
- **Max width**: Create/Edit views: `max-width: 52rem`
- **Semantic HTML**: Uses `<div>` with CSS Grid, not `<table>` (better for accessibility and responsive design)

---

## Styling Conventions

### Colors

- **Headings**: `#334155` (slate-700)
- **Field labels**: `#475569` (slate-600)
- **Hint text**: `#64748b` (slate-500)
- **Error text**: `#dc2626` (red-600)
- **Valid border**: `#16a34a` (green-600)
- **Immutable fields**: `#64748b` (slate-500) with `#f8fafc` background

### Typography

- **Main heading (h1)**: Default size, bold
- **Section heading (h2)**: `1rem`, `font-weight: 600`
- **Field labels**: `font-weight: 500`
- **Hint text**: `0.8125rem` (13px)
- **Table text**: `0.9375rem` (15px)

### Borders & Shadows

- **Input borders**: `1px solid #e2e8f0` (slate-200)
- **Error borders**: `2px solid #dc2626`
- **Focus**: `border-color: #3b82f6` (blue-500)
- **Focus ring**: `box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1)`

---

## Component Structure (Script)

### Standard Imports

```javascript
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getApiClient } from '@/api/client'
import { useToastStore } from '@/stores/toast'
import { normalizeList } from '@/utils/listResponse'
import { useFormValidation, validateAll, focusFirstError } from '@/composables/useFormValidation'
import { validateIvrPkey, validateTenant, validateGreetnum } from '@/utils/validation'
import FormField from '@/components/forms/FormField.vue'
import FormSelect from '@/components/forms/FormSelect.vue'
import FormToggle from '@/components/forms/FormToggle.vue'
import FormReadonly from '@/components/forms/FormReadonly.vue'  // Edit view only
import DeleteConfirmModal from '@/components/DeleteConfirmModal.vue'  // List and Edit views that have delete
```

### Standard Refs

```javascript
const router = useRouter()
const toast = useToastStore()
const route = useRoute()
const resource = ref(null)
const loading = ref(true)
const error = ref('')
const saveError = ref('')
const saving = ref(false)
const deleteError = ref('')
const deleting = ref(false)
const pkey = computed(() => route.params.pkey)

// Form fields (Create view)
const field = ref('')
const field2 = ref('')

// Edit form fields (Edit view - prefix with "edit")
const editField = ref('')
const editField2 = ref('')

// Field-level validation using composable (must be declared AFTER refs)
const fieldValidation = useFormValidation(field, validateFieldFunction)
const field2Validation = useFormValidation(field2, validateField2Function)
```

### Standard Functions

```javascript
// Navigation
function goBack() {
  router.push({ name: '{resource}s' })
}

// Keyboard handler
function onKeydown(e) {
  if (e.key === 'Escape') {
    e.preventDefault()
    goBack()
  }
}

// Use shared normalizeList from @/utils/listResponse (import at top); no local normalizeList

// Sync form fields from loaded resource (Edit view)
function syncEditFromResource() {
  if (!resource.value) return
  const r = resource.value
  
  // Map resource fields to edit fields
  editField.value = r.field ?? ''
  editCluster.value = r.cluster ?? 'default'
  editActive.value = r.active ?? 'YES'
  editDescription.value = r.description ?? ''
  
  // Reset validation state when loading new data
  fieldValidation.reset()
  clusterValidation.reset()
}

// Fetch resource data (Edit view)
async function fetchResource() {
  if (!pkey.value) return
  loading.value = true
  error.value = ''
  try {
    resource.value = await getApiClient().get(`{resources}/${encodeURIComponent(pkey.value)}`)
    syncEditFromResource()
    if (editCluster.value) loadDestinations()
  } catch (err) {
    error.value = err.data?.message || err.message || 'Failed to load resource'
    resource.value = null
  } finally {
    loading.value = false
  }
}

// Watch for cluster changes (Edit view - to reload destinations)
watch(editCluster, () => {
  if (editing.value) loadDestinations()
  if (clusterValidation.touched.value) {
    clusterValidation.validate()
  }
})
```

---

## Field Naming Conventions

### Database Fields → Display Labels

- `pkey` → "IVR Direct Dial" / "Extension number" / "Tenant name" (resource-specific)
- `shortuid` → "Local UID"
- `id` → "KSUID"
- `cluster` → "Tenant"
- `description` → "Description"
- `cname` → "Display name"
- `name` → "Name" (if not deprecated)
- `active` → "Active?"
- Boolean fields → Use question format: "Active?", "Listen for extension dial?"

### Field Labels in Forms

- Required fields: No "(required)" suffix (use `aria-required` instead)
- Optional fields: Include "(optional)" in label
- Immutable fields: Show with `title="Immutable"` and readonly styling

---

## Error Handling

### Display Hierarchy

1. **Field-level errors**: Show inline below field (highest priority)
2. **Form-level errors**: Show at top of form (`role="alert"`)
3. **Delete errors**: Show above form actions
4. **Loading errors**: Show instead of content

### Error Message Format

- Field errors: Specific to field (e.g., "Must be 3-5 numeric digits")
- Form errors: General or first field error from API
- Delete errors: Specific to delete operation

---

## Loading States

### List View
- Show "Loading {Resource}s from API…" while `loading === true`
- Show empty state if `items.length === 0` after load

### Create/Edit View
- Show "Loading…" while `loading === true`
- Disable form inputs during save (`saving === true`)
- Show "Creating…" / "Saving…" on submit button

### Async Data Loading
- Dropdowns: Show "Loading…" option while loading
- Disable dropdowns while loading (`:disabled="loading"`)
- Show loading indicators for destinations, tenants, etc.

---

## Success Feedback

### After Create
- Show toast: `"{Resource} {pkey} created"`
- **Either:** Navigate to detail view (edit mode), **or** (if the product prefers) **stay on create**: reset the form to defaults, show an advisory (e.g. "{Resource} {pkey} created. Create another or Cancel to exit."), and keep the user on the create panel. Cancel returns to the list. Use a `fieldsKey` ref passed as `:input-key` to form components and increment after reset to force re-mount so all fields clear visually.

### After Edit
- Show toast: `"{Resource} {pkey} saved"`
- Stay on edit view (refresh data if needed)

### After Delete
- Show toast: `"{Resource} {pkey} deleted"`
- Navigate to list view

---

## Accessibility Requirements

### ARIA Attributes

- **Required fields**: `aria-required="true"`
- **Invalid fields**: `aria-invalid="true"`
- **Field descriptions**: `aria-describedby="field-id-hint"` or `"field-id-error"`
- **Error messages**: `role="alert"`
- **Icon buttons**: `aria-label="Action name"`
- **Decorative icons**: `aria-hidden="true"`

### Keyboard Navigation

- All interactive elements must be keyboard accessible
- Logical tab order
- Visible focus indicators
- Escape key returns to list
- Enter submits forms

### Semantic HTML

- Proper heading hierarchy (h1 → h2 → h3)
- Table headers with `scope` attributes
- Form labels properly associated with inputs
- Skip links for form sections (future enhancement)

---

## Responsive Considerations

### Mobile (< 768px)

- Stack label/value vertically in tables
- Adjust toolbar/filter layout
- Increase touch target sizes (min 44x44px)
- Horizontal scroll for wide tables

### Tablet (768px - 1024px)

- May hide less important columns
- Adjust spacing as needed

### Desktop (> 1024px)

- Full layout with all columns visible
- Optimal spacing and readability

---

## Migration Checklist

When applying this pattern to existing panels:

- [ ] **Field parity:** Cross-reference with the API (controller `updateableColumns` / request rules; optionally schema). List every accepted field and ensure each is either editable (Create/Edit) or FormReadonly in Identity (and not in PUT body if read-only on edit). Do not omit API fields.
- [ ] **Use shared `normalizeList`:** Import from `@/utils/listResponse.js`; remove any local `normalizeList` function from the view.
- [ ] **Use shared `DeleteConfirmModal`:** Import and use `<DeleteConfirmModal>` from `@/components/DeleteConfirmModal.vue`; remove inline Teleport + modal markup and modal CSS.
- [ ] Update list view header (Create button + Filter layout, toolbar `justify-content: space-between`)
- [ ] Update list view columns (add resource-specific columns)
- [ ] Remove pkey link from list (name column plain text; navigation via edit icon only)
- [ ] Update create view structure (Identity → Settings using form components)
- [ ] Update edit view heading format ("Edit {Resource} {name}")
- [ ] Ensure edit view has all three buttons: Save, Cancel, and Delete (in `.edit-actions`); **repeat the same action row at the top** (e.g. after saveError, before first section) with `.edit-actions-top`
- [ ] **Create/Edit:** Action buttons (Create/Save, Cancel, and Delete on edit) appear at **both top and bottom** of the form
- [ ] Remove read-only view from edit (always open in edit mode)
- [ ] Replace manual fields with FormField/FormSelect/FormToggle components
- [ ] Use FormReadonly for immutable and "set-at-create-only" fields in edit view (Identity section, low-light `readonly-identity`)
- [ ] Replace manual validation with useFormValidation composable
- [ ] Add validation rules to `@/utils/validation.js`
- [ ] Import form components and validation composable
- [ ] Update spacing and styling
- [ ] Ensure consistent field ordering
- [ ] Add ARIA attributes
- [ ] Test keyboard navigation
- [ ] Test responsive layout

---

## Complete Example: Create View

### Script Setup

```javascript
<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { getApiClient } from '@/api/client'
import { useToastStore } from '@/stores/toast'
import { useFormValidation, validateAll, focusFirstError } from '@/composables/useFormValidation'
import { validateFieldName, validateTenant } from '@/utils/validation'
import FormField from '@/components/forms/FormField.vue'
import FormSelect from '@/components/forms/FormSelect.vue'
import FormToggle from '@/components/forms/FormToggle.vue'

const router = useRouter()
const toast = useToastStore()

// Form field refs (declare BEFORE validation composables)
const field = ref('')
const cluster = ref('default')
const active = ref('YES')
const description = ref('')
const tenants = ref([])
const tenantsLoading = ref(true)
const error = ref('')
const loading = ref(false)
const fieldInput = ref(null)

// Validation composables (after refs are declared)
const fieldValidation = useFormValidation(field, validateFieldName)
const clusterValidation = useFormValidation(cluster, validateTenant)

// Computed properties
const tenantOptions = computed(() => {
  const list = tenants.value.map((t) => t.pkey).filter(Boolean)
  return [...new Set(list)].sort((a, b) => String(a).localeCompare(String(b)))
})

// Load data
async function loadTenants() {
  tenantsLoading.value = true
  try {
    const response = await getApiClient().get('tenants')
    tenants.value = Array.isArray(response) ? response : (response?.data ?? [])
  } catch {
    tenants.value = []
  } finally {
    tenantsLoading.value = false
  }
}

// Form submission
async function onSubmit(e) {
  e.preventDefault()
  error.value = ''
  
  const validations = [
    { ...fieldValidation, fieldId: 'field' },
    { ...clusterValidation, fieldId: 'cluster' }
  ]
  
  if (!validateAll(validations)) {
    await nextTick()
    focusFirstError(validations, (id) => {
      if (id === 'field' && fieldInput.value) return fieldInput.value
      return document.getElementById(id)
    })
    return
  }
  
  loading.value = true
  try {
    const body = {
      field: field.value.trim(),
      cluster: cluster.value.trim(),
      active: active.value,
      description: description.value.trim() || null
    }
    const resource = await getApiClient().post('resources', body)
    toast.show(`Resource ${resource.pkey} created`, 'success')
    router.push({ name: 'resource-detail', params: { pkey: resource.pkey } })
  } catch (err) {
    const errors = err?.data
    if (errors && typeof errors === 'object') {
      if (errors.field) {
        fieldValidation.touched.value = true
        fieldValidation.error.value = Array.isArray(errors.field) ? errors.field[0] : errors.field
      }
      if (errors.cluster) {
        clusterValidation.touched.value = true
        clusterValidation.error.value = Array.isArray(errors.cluster) ? errors.cluster[0] : errors.cluster
      }
      await nextTick()
      focusFirstError(validations, (id) => {
        if (id === 'field' && fieldInput.value) return fieldInput.value
        return document.getElementById(id)
      })
    } else {
      error.value = err.data?.message ?? err.message ?? 'Failed to create resource'
    }
  } finally {
    loading.value = false
  }
}

function goBack() {
  router.push({ name: 'resources' })
}

function onKeydown(e) {
  if (e.key === 'Escape') {
    e.preventDefault()
    goBack()
  }
}

onMounted(async () => {
  await loadTenants()
  await nextTick()
  fieldInput.value?.focus()
})
</script>
```

### Template

```vue
<template>
  <div class="create-view">
    <h1>Create Resource</h1>

    <form class="form" @submit="onSubmit" @keydown="onKeydown">
      <p v-if="error" id="resource-create-error" class="error" role="alert">{{ error }}</p>

      <h2 class="detail-heading">Identity</h2>
      <div class="form-fields">
        <FormField
          id="field"
          ref="fieldInput"
          v-model="field"
          label="Primary Identifier"
          type="text"
          :error="fieldValidation.error.value"
          :touched="fieldValidation.touched.value"
          :required="true"
          hint="Unique identifier for this resource."
          @blur="fieldValidation.onBlur"
        />
        <FormSelect
          id="cluster"
          v-model="cluster"
          label="Tenant"
          :options="tenantOptions"
          :error="clusterValidation.error.value"
          :touched="clusterValidation.touched.value"
          :required="true"
          :loading="tenantsLoading"
          hint="The tenant this resource belongs to."
          @blur="clusterValidation.onBlur"
        />
        <FormField
          id="description"
          v-model="description"
          label="Description (optional)"
          type="text"
          placeholder="Freeform description"
          hint="Optional description."
        />
      </div>

      <h2 class="detail-heading">Settings</h2>
      <div class="form-fields">
        <FormToggle
          id="active"
          v-model="active"
          label="Active?"
          hint="If off, the resource will not be available."
        />
      </div>

      <div class="actions">
        <button type="submit" :disabled="loading || tenantsLoading">
          {{ loading ? 'Creating…' : 'Create' }}
        </button>
        <button type="button" class="secondary" @click="goBack">Cancel</button>
      </div>
    </form>
  </div>
</template>
```

### CSS

```css
<style scoped>
.create-view {
  max-width: 52rem;
}
.form {
  margin-top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.detail-heading {
  font-size: 1rem;
  font-weight: 600;
  color: #334155;
  margin: 1.5rem 0 0.5rem 0;
}
.detail-heading:first-of-type {
  margin-top: 0;
}
.form-fields {
  display: flex;
  flex-direction: column;
  gap: 0;
  margin-top: 0.5rem;
}
.error {
  color: #dc2626;
  font-size: 0.875rem;
  margin: 0;
}
.actions {
  display: flex;
  gap: 0.75rem;
  margin-top: 0.25rem;
}
.actions button {
  padding: 0.5rem 1rem;
  font-size: 0.9375rem;
  font-weight: 500;
  border-radius: 0.375rem;
  cursor: pointer;
}
.actions button[type="submit"] {
  color: #fff;
  background: #2563eb;
  border: none;
}
.actions button[type="submit"]:hover:not(:disabled) {
  background: #1d4ed8;
}
.actions button[type="submit"]:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
.actions button.secondary {
  color: #64748b;
  background: transparent;
  border: 1px solid #e2e8f0;
}
.actions button.secondary:hover {
  background: #f1f5f9;
}
</style>
```

---

## Complete List View Example

### Script Setup

```javascript
<script setup>
import { ref, computed, onMounted } from 'vue'
import { getApiClient } from '@/api/client'
import { useToastStore } from '@/stores/toast'
import { normalizeList } from '@/utils/listResponse'
import DeleteConfirmModal from '@/components/DeleteConfirmModal.vue'

const toast = useToastStore()
const resources = ref([])
const tenants = ref([])
const loading = ref(true)
const error = ref('')
const deleteError = ref('')
const deletingPkey = ref(null)
const confirmDeletePkey = ref(null)
const filterText = ref('')
const sortKey = ref('pkey')
const sortOrder = ref('asc')

// Import normalizeList from '@/utils/listResponse' (do not define locally)
// Tenant resolution for display
const tenantShortuidToPkey = computed(() => {
  const map = {}
  for (const t of tenants.value) {
    if (t.shortuid) map[String(t.shortuid)] = t.pkey
    if (t.pkey) map[String(t.pkey)] = t.pkey
  }
  return map
})

function tenantDisplay(item) {
  const c = item.cluster
  if (c == null || c === '') return '—'
  return tenantShortuidToPkey.value[String(c)] ?? c
}

function localUidDisplay(item) {
  const v = item.shortuid
  return v == null || v === '' ? '—' : String(v)
}

// Filtering
const filteredResources = computed(() => {
  const list = resources.value
  const q = (filterText.value || '').trim().toLowerCase()
  if (!q) return list
  return list.filter((item) => {
    const pkey = (item.pkey ?? '').toString().toLowerCase()
    const shortuid = (item.shortuid ?? '').toString().toLowerCase()
    const desc = (item.description ?? '').toString().toLowerCase()
    return pkey.includes(q) || shortuid.includes(q) || desc.includes(q)
  })
})

// Sorting
function sortValue(item, key) {
  const v = item[key]
  return v == null ? '' : String(v)
}

const sortedResources = computed(() => {
  const list = [...filteredResources.value]
  const key = sortKey.value
  const order = sortOrder.value
  list.sort((a, b) => {
    const va = sortValue(a, key).toLowerCase()
    const vb = sortValue(b, key).toLowerCase()
    let cmp = 0
    if (va < vb) cmp = -1
    else if (va > vb) cmp = 1
    return order === 'asc' ? cmp : -cmp
  })
  return list
})

function setSort(key) {
  if (sortKey.value === key) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortOrder.value = 'asc'
  }
}

function sortClass(key) {
  if (sortKey.value !== key) return ''
  return sortOrder.value === 'asc' ? 'sort-asc' : 'sort-desc'
}

// Load data
async function loadResources() {
  loading.value = true
  error.value = ''
  try {
    const [tenantsRes, resourcesRes] = await Promise.all([
      getApiClient().get('tenants'),
      getApiClient().get('{resources}')
    ])
    tenants.value = normalizeList(tenantsRes)
    resources.value = normalizeList(resourcesRes)
  } catch (err) {
    error.value = err.data?.message || err.message || 'Failed to load {resources}'
  } finally {
    loading.value = false
  }
}

// Delete
function askConfirmDelete(pkey) {
  confirmDeletePkey.value = pkey
  deleteError.value = ''
}

function cancelConfirmDelete() {
  confirmDeletePkey.value = null
}

async function confirmAndDelete(pkey) {
  if (confirmDeletePkey.value !== pkey) return
  deleteError.value = ''
  deletingPkey.value = pkey
  try {
    await getApiClient().delete(`{resources}/${encodeURIComponent(pkey)}`)
    await loadResources()
    toast.show(`{Resource} ${pkey} deleted`)
  } catch (err) {
    deleteError.value = err.data?.message ?? err.message ?? 'Failed to delete {resource}'
  } finally {
    confirmDeletePkey.value = null
    deletingPkey.value = null
  }
}

onMounted(loadResources)
</script>
```

### Template

```vue
<template>
  <div class="list-view">
    <header class="list-header">
      <h1>{Resources}</h1>
      <p class="toolbar">
        <router-link :to="{ name: '{resource}-create' }" class="add-btn">Create</router-link>
        <input
          v-model="filterText"
          type="search"
          class="filter-input"
          placeholder="Filter by name, Local UID, tenant, or description"
          aria-label="Filter {Resources}"
        />
      </p>
    </header>

    <section v-if="loading || error || deleteError || resources.length === 0" class="list-states">
      <p v-if="loading" class="loading">Loading {Resources} from API…</p>
      <p v-else-if="error" class="error">{{ error }}</p>
      <p v-if="deleteError" class="error">{{ deleteError }}</p>
      <div v-else-if="resources.length === 0" class="empty">No {resources}. (API returned an empty list.)</div>
    </section>

    <section v-else class="list-body">
      <p v-if="filterText && filteredResources.length === 0" class="empty">No {resources} match the filter.</p>
      <table v-else class="table">
        <thead>
          <tr>
            <th class="th-sortable" title="Click to sort" :class="sortClass('pkey')" @click="setSort('pkey')">Primary Identifier</th>
            <th class="th-sortable" title="Click to sort" :class="sortClass('shortuid')" @click="setSort('shortuid')">Local UID</th>
            <th class="th-sortable" title="Click to sort" :class="sortClass('cluster')" @click="setSort('cluster')">Tenant</th>
            <th class="th-sortable" title="Click to sort" :class="sortClass('description')" @click="setSort('description')">Description</th>
            <th class="th-actions" title="Edit"><span class="action-icon" aria-hidden="true">✏️</span></th>
            <th class="th-actions" title="Delete"><span class="action-icon" aria-hidden="true">🗑️</span></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="resource in sortedResources" :key="resource.pkey">
            <td>{{ resource.pkey }}</td>
            <td class="cell-immutable" title="Immutable">{{ localUidDisplay(resource) }}</td>
            <td>{{ tenantDisplay(resource) }}</td>
            <td>{{ resource.description ?? '—' }}</td>
            <td>
              <router-link :to="{ name: '{resource}-detail', params: { pkey: resource.pkey } }" 
                           class="cell-link cell-link-icon" title="Edit" aria-label="Edit">
                <span class="action-icon" aria-hidden="true">✏️</span>
              </router-link>
            </td>
            <td>
              <button
                type="button"
                class="cell-link cell-link-delete cell-link-icon"
                :title="deletingPkey === resource.pkey ? 'Deleting…' : 'Delete'"
                :aria-label="deletingPkey === resource.pkey ? 'Deleting…' : 'Delete'"
                :disabled="deletingPkey === resource.pkey"
                @click="askConfirmDelete(resource.pkey)"
              >
                <span class="action-icon" aria-hidden="true">🗑️</span>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <!-- Use shared DeleteConfirmModal; do not copy inline Teleport/modal markup -->
    <DeleteConfirmModal
      :show="!!confirmDeletePkey"
      :title="`Delete ${resourceLabel}?`"
      :body-text="confirmDeletePkey ? `${resourceLabel} ${confirmDeletePkey} will be permanently deleted. This cannot be undone.` : ''"
      confirm-label="Delete"
      cancel-label="Cancel"
      loading-label="Deleting…"
      :loading="deletingPkey === confirmDeletePkey"
      @confirm="confirmDeletePkey && confirmAndDelete(confirmDeletePkey)"
      @cancel="cancelConfirmDelete"
    />
  </div>
</template>
```

---

## Complete Edit View Example

### Script Setup

```javascript
<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getApiClient } from '@/api/client'
import { useToastStore } from '@/stores/toast'
import { useFormValidation, validateAll, focusFirstError } from '@/composables/useFormValidation'
import { validateTenant, validateField } from '@/utils/validation'
import FormField from '@/components/forms/FormField.vue'
import FormSelect from '@/components/forms/FormSelect.vue'
import FormToggle from '@/components/forms/FormToggle.vue'
import FormReadonly from '@/components/forms/FormReadonly.vue'

const route = useRoute()
const router = useRouter()
const toast = useToastStore()
const resource = ref(null)
const tenants = ref([])
const loading = ref(true)
const error = ref('')
const saveError = ref('')
const saving = ref(false)
const deleteError = ref('')
const deleting = ref(false)
const confirmDeleteOpen = ref(false)

// Form fields (declare BEFORE validation composables)
const editField = ref('')
const editCluster = ref('default')
const editActive = ref('YES')
const editDescription = ref('')

// Validation composables (after refs)
const fieldValidation = useFormValidation(editField, validateField)
const clusterValidation = useFormValidation(editCluster, validateTenant)

const pkey = computed(() => route.params.pkey)

// Tenant resolution
const tenantShortuidToPkey = computed(() => {
  const map = {}
  for (const t of tenants.value) {
    if (t.shortuid) map[String(t.shortuid)] = t.pkey
    if (t.pkey) map[String(t.pkey)] = t.pkey
  }
  return map
})

const tenantOptions = computed(() => {
  const list = tenants.value.map((t) => t.pkey).filter(Boolean)
  return [...new Set(list)].sort((a, b) => String(a).localeCompare(String(b)))
})

const tenantOptionsForSelect = computed(() => {
  const list = tenantOptions.value
  const cur = editCluster.value
  if (cur && !list.includes(cur)) return [cur, ...list].sort((a, b) => String(a).localeCompare(String(b)))
  return list
})

// Load data (normalizeList from @/utils/listResponse)
async function loadTenants() {
  try {
    const response = await getApiClient().get('tenants')
    tenants.value = normalizeList(response, { resourceKey: 'tenants' })
  } catch {
    tenants.value = []
  }
}

// Sync form from resource
function syncEditFromResource() {
  if (!resource.value) return
  const r = resource.value
  const clusterRaw = r.cluster ?? 'default'
  editCluster.value = tenantShortuidToPkey.value[clusterRaw] ?? clusterRaw
  editField.value = r.field ?? ''
  editActive.value = r.active ?? 'YES'
  editDescription.value = r.description ?? ''
  
  // Reset validation state
  fieldValidation.reset()
  clusterValidation.reset()
}

// Fetch resource
async function fetchResource() {
  if (!pkey.value) return
  loading.value = true
  error.value = ''
  try {
    resource.value = await getApiClient().get(`{resources}/${encodeURIComponent(pkey.value)}`)
    syncEditFromResource()
  } catch (err) {
    error.value = err.data?.message || err.message || 'Failed to load {resource}'
    resource.value = null
  } finally {
    loading.value = false
  }
}

// Watch for changes
watch(pkey, fetchResource)
watch(tenants, () => {
  if (resource.value && editCluster.value) {
    const resolved = tenantShortuidToPkey.value[editCluster.value]
    if (resolved) editCluster.value = resolved
  }
}, { deep: true })
watch(editCluster, () => {
  if (clusterValidation.touched.value) {
    clusterValidation.validate()
  }
})

// Save
async function saveEdit(e) {
  e.preventDefault()
  saveError.value = ''
  
  const validations = [
    { ...fieldValidation, fieldId: 'edit-field' },
    { ...clusterValidation, fieldId: 'edit-cluster' }
  ]
  
  if (!validateAll(validations)) {
    await nextTick()
    focusFirstError(validations, (id) => document.getElementById(id))
    return
  }
  
  saving.value = true
  try {
    const body = {
      field: editField.value.trim(),
      cluster: editCluster.value.trim(),
      active: editActive.value
    }
    if (editDescription.value.trim()) body.description = editDescription.value.trim()
    
    await getApiClient().put(`{resources}/${encodeURIComponent(pkey.value)}`, body)
    await fetchResource()
    toast.show(`{Resource} ${pkey.value} saved`)
  } catch (err) {
    const errors = err?.data
    if (errors && typeof errors === 'object') {
      if (errors.field) {
        fieldValidation.touched.value = true
        fieldValidation.error.value = Array.isArray(errors.field) ? errors.field[0] : errors.field
      }
      if (errors.cluster) {
        clusterValidation.touched.value = true
        clusterValidation.error.value = Array.isArray(errors.cluster) ? errors.cluster[0] : errors.cluster
      }
      const first = Object.values(errors).flat().find((m) => typeof m === 'string') ?? null
      saveError.value = first ?? err.data?.message ?? err.message ?? 'Failed to update {resource}'
      await nextTick()
      focusFirstError(validations, (id) => document.getElementById(id))
    } else {
      saveError.value = err.data?.message ?? err.message ?? 'Failed to update {resource}'
    }
  } finally {
    saving.value = false
  }
}

// Delete
function askConfirmDelete() {
  deleteError.value = ''
  confirmDeleteOpen.value = true
}

function cancelConfirmDelete() {
  confirmDeleteOpen.value = false
}

async function confirmAndDelete() {
  deleteError.value = ''
  deleting.value = true
  try {
    await getApiClient().delete(`{resources}/${encodeURIComponent(pkey.value)}`)
    toast.show(`{Resource} ${pkey.value} deleted`)
    router.push({ name: '{resources}' })
  } catch (err) {
    deleteError.value = err.data?.message ?? err.message ?? 'Failed to delete {resource}'
  } finally {
    deleting.value = false
    confirmDeleteOpen.value = false
  }
}

function goBack() {
  router.push({ name: '{resources}' })
}

function onKeydown(e) {
  if (e.key === 'Escape') {
    e.preventDefault()
    goBack()
  }
}

onMounted(() => {
  loadTenants()
  fetchResource()
})
</script>
```

### Template

```vue
<template>
  <div class="detail-view" @keydown="onKeydown">
    <h1>Edit {Resource} {{ resource?.cname?.trim() ? resource.cname.trim() : pkey }}</h1>

    <p v-if="loading" class="loading">Loading…</p>
    <p v-else-if="error" class="error">{{ error }}</p>
    <template v-else-if="resource">
      <div class="detail-content">
        <p v-if="deleteError" class="error">{{ deleteError }}</p>

        <form class="edit-form" @submit="saveEdit">
          <p v-if="saveError" id="{resource}-edit-error" class="error" role="alert">{{ saveError }}</p>

          <h2 class="detail-heading">Identity</h2>
          <div class="form-fields">
            <FormReadonly
              id="edit-identity-pkey"
              label="Primary Identifier"
              :value="resource.pkey ?? '—'"
            />
            <FormReadonly
              id="edit-identity-shortuid"
              label="Local UID"
              :value="resource.shortuid ?? '—'"
            />
            <FormReadonly
              id="edit-identity-id"
              label="KSUID"
              :value="resource.id ?? '—'"
            />
            <FormSelect
              id="edit-cluster"
              v-model="editCluster"
              label="Tenant"
              :options="tenantOptionsForSelect"
              :error="clusterValidation.error.value"
              :touched="clusterValidation.touched.value"
              :required="true"
              hint="The tenant this resource belongs to."
              @blur="clusterValidation.onBlur"
            />
            <FormField
              id="edit-description"
              v-model="editDescription"
              label="Description (optional)"
              type="text"
              placeholder="Freeform description"
            />
          </div>

          <h2 class="detail-heading">Settings</h2>
          <div class="form-fields">
            <FormToggle
              id="edit-active"
              v-model="editActive"
              label="Active?"
            />
          </div>

          <div class="edit-actions">
            <button type="submit" :disabled="saving">{{ saving ? 'Saving…' : 'Save' }}</button>
            <button type="button" class="secondary" @click="goBack">Cancel</button>
            <button type="button" class="action-delete" :disabled="deleting" @click="askConfirmDelete">
              {{ deleting ? 'Deleting…' : 'Delete' }}
            </button>
          </div>
        </form>
      </div>
    </template>

    <!-- Use shared DeleteConfirmModal; do not copy inline Teleport/modal markup -->
    <DeleteConfirmModal
      :show="confirmDeleteOpen"
      :title="`Delete ${resourceLabel}?`"
      :body-text="`${resourceLabel} ${pkey} will be permanently deleted. This cannot be undone.`"
      confirm-label="Delete"
      cancel-label="Cancel"
      loading-label="Deleting…"
      :loading="deleting"
      @confirm="confirmAndDelete"
      @cancel="cancelConfirmDelete"
    />
  </div>
</template>
```

---

## Critical Gotchas & Pitfalls

### 1. Ref Declaration Order

**❌ WRONG**: Validation composable before ref declaration
```javascript
const fieldValidation = useFormValidation(field, validateField)  // ERROR: field not defined yet
const field = ref('')
```

**✅ CORRECT**: Declare refs BEFORE validation composables
```javascript
const field = ref('')
const fieldValidation = useFormValidation(field, validateField)
```

### 2. Validation Reset on Data Load

**❌ WRONG**: Forgetting to reset validation when loading new data
```javascript
function syncEditFromResource() {
  editField.value = resource.value.field
  // Missing: fieldValidation.reset()
}
```

**✅ CORRECT**: Always reset validation state when loading data
```javascript
function syncEditFromResource() {
  editField.value = resource.value.field
  fieldValidation.reset()  // Reset touched/error state
}
```

### 3. Tenant shortuid Resolution

**❌ WRONG**: Using cluster value directly in dropdown
```javascript
// API returns cluster as shortuid, but dropdown expects pkey
editCluster.value = resource.value.cluster  // May be shortuid!
```

**✅ CORRECT**: Resolve shortuid to pkey
```javascript
const clusterRaw = resource.value.cluster ?? 'default'
editCluster.value = tenantShortuidToPkey.value[clusterRaw] ?? clusterRaw
```

### 4. Focus Management

**❌ WRONG**: Trying to focus component ref directly
```javascript
pkeyInput.value.focus()  // Component ref, not DOM element
```

**✅ CORRECT**: Use component's exposed focus method
```javascript
pkeyInput.value?.focus()  // Component exposes focus() method
// OR use focusFirstError helper
focusFirstError(validations, (id) => {
  if (id === 'pkey' && pkeyInput.value) return pkeyInput.value
  return document.getElementById(id)
})
```

### 5. API Error Mapping

**❌ WRONG**: Not mapping array errors correctly
```javascript
fieldValidation.error.value = errors.field  // May be array!
```

**✅ CORRECT**: Handle both array and string errors
```javascript
fieldValidation.error.value = Array.isArray(errors.field) ? errors.field[0] : errors.field
```

### 6. Optional Field Handling

**❌ WRONG**: Sending empty strings for optional fields
```javascript
body.description = editDescription.value  // May send empty string
```

**✅ CORRECT**: Only include if value exists, or set to null
```javascript
if (editDescription.value.trim()) body.description = editDescription.value.trim()
// OR explicitly null
body.description = editDescription.value.trim() || null
```

### 7. Loading State Management

**❌ WRONG**: Not disabling form during save
```javascript
<button type="submit">Save</button>  // Can be clicked multiple times
```

**✅ CORRECT**: Disable during save operation
```vue
<button type="submit" :disabled="saving || loading">
  {{ saving ? 'Saving…' : 'Save' }}
</button>
```

### 8. Normalize List Response

**❌ WRONG**: Assuming API always returns array, or defining a local `normalizeList`
```javascript
resources.value = await getApiClient().get('resources')  // May be wrapped!
// OR copying normalizeList into the view
function normalizeList(response) { ... }
```

**✅ CORRECT**: Import shared util and use it
```javascript
import { normalizeList } from '@/utils/listResponse'
const response = await getApiClient().get('resources')
resources.value = normalizeList(response)
```

### 9. Delete Confirmation Modal

**❌ WRONG**: Copying Teleport + modal markup and modal CSS into the view.

**✅ CORRECT**: Use the shared `<DeleteConfirmModal>` from `@/components/DeleteConfirmModal.vue`; pass `show`, `title`, `body-text`, `loading`, and handle `@confirm` / `@cancel`.

---

## Reference Implementations

See these files for complete working examples:
- `src/views/IvrCreateView.vue` - Create view pattern
- `src/views/IvrDetailView.vue` - Edit view pattern  
- `src/views/IvrsListView.vue` - List view pattern
- `src/utils/listResponse.js` - Shared `normalizeList` (use this; do not copy into views)
- `src/components/DeleteConfirmModal.vue` - Shared delete confirmation modal (use this; do not copy inline modal)
- `src/components/forms/FormField.vue` - Form field component
- `src/components/forms/FormSelect.vue` - Form select component
- `src/components/forms/FormToggle.vue` - Form toggle component
- `src/components/forms/FormReadonly.vue` - Form readonly component
- `src/composables/useFormValidation.js` - Validation composable
- `src/utils/validation.js` - Validation rules

---

## List View CSS

```css
<style scoped>
.list-view {
  padding: 1.5rem;
}
.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}
.list-header h1 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
}
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
}
.add-btn {
  padding: 0.5rem 1rem;
  font-size: 0.9375rem;
  font-weight: 500;
  color: #fff;
  background: #2563eb;
  border: none;
  border-radius: 0.375rem;
  text-decoration: none;
  cursor: pointer;
}
.add-btn:hover {
  background: #1d4ed8;
}
.filter-input {
  padding: 0.5rem 0.75rem;
  font-size: 0.9375rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.375rem;
  min-width: 20rem;
}
.filter-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}
.table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9375rem;
}
.th-sortable {
  cursor: pointer;
  user-select: none;
  padding: 0.75rem;
  text-align: left;
  font-weight: 600;
  color: #475569;
  border-bottom: 2px solid #e2e8f0;
}
.th-sortable:hover {
  background: #f8fafc;
}
.th-actions {
  width: 3rem;
  text-align: center;
  padding: 0.75rem;
  border-bottom: 2px solid #e2e8f0;
}
.table tbody tr {
  border-bottom: 1px solid #f1f5f9;
}
.table tbody tr:hover {
  background: #f8fafc;
}
.table td {
  padding: 0.75rem;
  vertical-align: top;
}
.cell-immutable {
  color: #64748b;
  font-style: italic;
}
.cell-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  color: #64748b;
  text-decoration: none;
  border-radius: 0.25rem;
  transition: background-color 0.15s ease;
}
.cell-link:hover {
  background: #f1f5f9;
  color: #0f172a;
}
.cell-link-delete:hover {
  background: #fef2f2;
  color: #dc2626;
}
.action-icon {
  width: 1.25rem;
  height: 1.25rem;
  display: inline-block;
}
.loading,
.error,
.empty {
  padding: 2rem;
  text-align: center;
  color: #64748b;
}
.error {
  color: #dc2626;
}
</style>
```

---

## Quick Start Checklist

When building a new panel:

1. **Create files**: `{Resource}ListView.vue`, `{Resource}CreateView.vue`, `{Resource}DetailView.vue`
2. **Add routes** to `src/router/index.js`:
   - `{ path: '{resources}', name: '{resources}', component: {Resource}ListView }`
   - `{ path: '{resources}/new', name: '{resource}-create', component: {Resource}CreateView }`
   - `{ path: '{resources}/:pkey', name: '{resource}-detail', component: {Resource}DetailView }`
3. **Create validation rules** in `src/utils/validation.js`:
   - Export functions like `validate{Resource}Pkey`, `validateTenant`, etc.
   - Return error message string or `null` if valid
4. **Build List view**:
   - Use sorting/filtering patterns
   - Include tenant resolution if applicable
   - Add delete confirmation modal
5. **Build Create view**:
   - Import form components and validation composable
   - Declare refs BEFORE validation composables
   - Use FormField, FormSelect, FormToggle components
   - Implement validation with useFormValidation
   - Handle API errors and map to field-level errors
6. **Build Edit view**:
   - Use FormReadonly for immutable fields (pkey, shortuid, id)
   - Use form components for editable fields
   - Implement syncEditFromResource function
   - Reset validation state when loading data
   - Handle tenant shortuid → pkey resolution
7. **Test**:
   - Create new resource
   - Edit existing resource
   - Delete resource
   - Validation errors display correctly
   - API errors map to fields
   - Loading states work
   - Navigation works (browser back, Cancel button)
8. **Verify**:
   - Spacing matches pattern (1rem between h1 and form)
   - Styling is consistent
   - Accessibility (ARIA attributes, keyboard navigation)
   - Responsive behavior

---

## Troubleshooting

### Panel Won't Render

**Symptom**: Blank screen, no error in console

**Causes**:
1. Validation composable called before ref declaration
2. Missing import for form component
3. Syntax error in template

**Solution**:
- Check refs are declared BEFORE validation composables
- Verify all imports are correct
- Check browser console for errors

### Validation Not Working

**Symptom**: No error messages, form submits invalid data

**Causes**:
1. Validation composable not connected to component
2. `@blur` event not bound
3. Validation function not imported

**Solution**:
- Ensure `:error` and `:touched` props are bound
- Ensure `@blur="validation.onBlur"` is on component
- Verify validation function is imported and passed to composable

### Fields Not Updating

**Symptom**: Changes to form fields don't persist

**Causes**:
1. `v-model` not bound correctly
2. Ref not reactive
3. Component not emitting update event

**Solution**:
- Verify `v-model="field"` syntax
- Ensure ref is declared with `ref()`
- Check component emits `update:modelValue`

### API Errors Not Showing

**Symptom**: Server returns errors but UI doesn't show them

**Causes**:
1. Error mapping not implemented
2. Error structure different than expected
3. Field names don't match

**Solution**:
- Check error structure: `err.data.field` vs `err.data.field[0]`
- Verify field names match API response
- Add console.log to inspect error structure

### Tenant Dropdown Shows shortuid

**Symptom**: Dropdown displays shortuid instead of pkey

**Causes**:
1. Not resolving shortuid to pkey
2. Using cluster value directly
3. tenantOptionsForSelect not including current value

**Solution**:
- Use `tenantShortuidToPkey` map to resolve
- Ensure `tenantOptionsForSelect` includes current value if not in list

### Focus Not Working

**Symptom**: focusFirstError doesn't focus field

**Causes**:
1. Component ref not exposed correctly
2. Field ID doesn't match
3. Element not in DOM yet

**Solution**:
- Verify component exposes `focus()` method
- Check fieldId matches component id
- Use `await nextTick()` before focusing

---

## Testing Checklist

Before considering a panel complete:

### Functionality
- [ ] Create new resource works
- [ ] Edit existing resource works
- [ ] Delete resource works
- [ ] Cancel button navigates back
- [ ] Browser back button works
- [ ] Escape key navigates back
- [ ] Filter in list view works
- [ ] Sort in list view works
- [ ] Validation errors display correctly
- [ ] API errors map to correct fields
- [ ] Loading states appear/disappear correctly
- [ ] Toast notifications show on success

### Validation
- [ ] Required fields show error when empty
- [ ] Field-level errors show on blur
- [ ] Errors clear when field becomes valid
- [ ] Submit prevents invalid submission
- [ ] First error field receives focus on submit
- [ ] Server errors map to field-level errors

### Data Handling
- [ ] List loads and displays correctly
- [ ] Empty list shows appropriate message
- [ ] Filtered empty list shows message
- [ ] Tenant resolution works (shortuid → pkey)
- [ ] Optional fields handle null/empty correctly
- [ ] Immutable fields display correctly (no editing)

### UI/UX
- [ ] Spacing matches pattern (1rem between h1 and form)
- [ ] Form components render correctly
- [ ] Toggles work (YES/NO)
- [ ] Dropdowns show correct options
- [ ] Loading indicators show during async operations
- [ ] Delete confirmation modal works
- [ ] Responsive layout works (if applicable)

### Accessibility
- [ ] All form fields have labels
- [ ] ARIA attributes present (`aria-invalid`, `aria-describedby`)
- [ ] Error messages have `role="alert"`
- [ ] Keyboard navigation works (Tab, Enter, Escape)
- [ ] Focus indicators visible
- [ ] Screen reader friendly

---

*This pattern should be applied to all CRUD panels for consistency and maintainability.*
