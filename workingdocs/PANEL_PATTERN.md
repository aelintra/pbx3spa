# Panel pattern (List / Create / Detail)

Reusable structure for admin resource panels (Extensions, Trunks, Queues, Agents, Routes, IVRs, Inbound routes, Tenants). Use this so all panels behave and look the same; then apply the pattern when adding or refactoring panels.

---

## 1. Routes and views

| Route shape | Name | View | Purpose |
|-------------|------|------|---------|
| `/{resource}` | `{resource}` | `{Resource}ListView.vue` | List all items (table). |
| `/{resource}/new` | `{resource}-create` | `{Resource}CreateView.vue` | Create form; on success → detail. |
| `/{resource}/:pkey` | `{resource}-detail` | `{Resource}DetailView.vue` | Single item: read-only + Edit/Delete. |

- **Resource** = plural noun (extensions, trunks, queues, …). **pkey** = human-facing key (extension number, trunk name, etc.); used in URL for detail.
- List has a **Create** button linking to `/{resource}/new`. Detail has a "← {Resource}" back button to list.

---

## 2. List view

- **Title:** `<h1>{Resource}</h1>` (e.g. “Extensions”, “Trunks”).
- **Toolbar:** One row with primary action: `<router-link :to="{ name: '{resource}-create' }" class="add-btn">Create</router-link>`. Wrap in `<p class="toolbar">`.
- **States:** Loading message; error message (single line); empty message (“No {resource}. (API returned an empty list.)”); else **table**.
- **Table:** `<table class="table">`. Header row with column headers; body: one `<tr>` per item, first column usually a `<router-link>` to detail (`{ name: '{resource}-detail', params: { pkey: item.pkey } }`), class `cell-link`. Columns = key fields (e.g. pkey, **Tenant** (cluster pkey — see §5.1), technology, active).
- **Sortable columns:** Give users a clear visual cue that columns are sortable (“don’t make me think”). Use class `th-sortable` on sortable `<th>` elements and: (1) show a **neutral sort icon** (e.g. ⇅) in every sortable header via CSS `::before`, so at a glance all sortable columns are obvious; (2) when a column is the active sort, show ↑ or ↓ (e.g. via `::after` and `.sort-asc` / `.sort-desc`); (3) add `title="Click to sort"` on sortable headers for hover. Non-sortable columns (e.g. Edit, Delete) use `.th-actions` with no icon.
- **Optional:** Simple client-side filter (e.g. by pkey or cluster) for larger lists (e.g. Extensions).

**List row actions (see §2.1):** Every row that **can be edited** has an **Edit** link; every row that **can be deleted** has a **Delete** link, with delete guarded by a **confirmation modal** (not browser confirm, not in-row confirmation).

**CSS classes (scoped):** `.toolbar`, `.add-btn`, `.loading`, `.error`, `.empty`, `.table`, `.table th`, `.table td`, `.cell-link`, `.th-actions`, `.th-sortable` (cursor pointer; `::before` neutral sort icon ⇅; `.sort-asc` / `.sort-desc` for active direction ↑/↓).

---

## 2.2 List view: template blocks

Split the list template into **named blocks** so structure is consistent and layout is predictable. Use semantic wrappers and conditional sections:

- **Root:** `<div class="list-view">` — flex column with `gap: 1rem` so blocks are visually separated.
- **Header block:** `<header class="list-header">` — contains the title `<h1>{Resource}</h1>` and the toolbar `<p class="toolbar">` (add-btn + optional filter input). Always visible.
- **States block:** `<section class="list-states">` — shown **only when** `loading || error || deleteError || items.length === 0`. Contains: loading message (`<p class="loading">`), or error (`<p class="error">`), or deleteError, or empty message (`<div class="empty">No {resource}. (API returned an empty list.)</div>`). Use `v-if="loading || error || deleteError || items.length === 0"` on this section.
- **Body block:** `<section class="list-body">` — shown **only when** there is data (`v-else` after list-states). Contains: either “No items match the filter” (`<p class="empty">`) when filter is active and filtered list is empty, or the **table** (`<table class="table">`).
- **Modal:** `<Teleport to="body">` for the delete confirmation modal (unchanged).

**CSS (scoped):** `.list-view` (e.g. `display: flex; flex-direction: column; gap: 1rem`), `.list-header`, `.list-states`, `.list-body` (e.g. `margin: 0`). Use `margin-top: 0` on `.loading`, `.error`, `.empty`, `.table` so spacing comes from the gap between sections.

Apply this block structure to every list view (Extensions, Tenants, Trunks, Queues, etc.) so panels look and behave the same.

---

## 2.1 List row: Edit link and Delete with confirmation modal

- **Edit link:** For each row that can be edited, add an **Edit** column. The link goes **directly to the detail view in edit mode** so the user does not have to open the item then click Edit. Use: `<router-link :to="{ name: '{resource}-detail', params: { pkey: item.pkey }, query: { edit: '1' } }" class="cell-link">Edit</router-link>`. The detail view must support `query.edit`: after loading the item, if `route.query.edit` is set, call `startEdit()` so the user lands in edit mode.
- **Delete link:** For each row that can be deleted, add a **Delete** column (e.g. a button styled as a link, class `cell-link cell-link-delete`). **Do not** call the delete API on first click. Instead:
  1. On Delete click, open a **confirmation modal** (set state such as `confirmDeletePkey` to the item’s pkey).
  2. Modal: use `<Teleport to="body">` so it renders above the page. Backdrop (fixed overlay) + centered card. Title e.g. “Delete {resource}?” or “Delete extension?”. Body: “{Resource} **{pkey}** will be permanently deleted. This cannot be undone.” Buttons: **Cancel** (closes modal, clears confirm state) and **Delete** (primary/danger).
  3. Only when the user clicks **Delete** in the modal, call the delete API. Show “Deleting…” on the Delete button while the request is in progress. On success: close modal, refresh list. On error: close modal, show error message (e.g. above the table).
  4. Clicking the backdrop should close the modal (cancel). Use `@click.self` on the backdrop.
- **Icons for Edit / Delete:** To save space and keep the table scannable, use **icons** for the Edit and Delete row actions (e.g. pencil for Edit, trash for Delete). Always provide `title="Edit"` / `title="Delete"` (tooltip on hover) and `aria-label` so purpose is clear without text. Column headers for these actions can be the same icons with `title` so hover shows “Edit” / “Delete”. When delete is in progress, show a spinner icon and “Deleting…” in `title` / `aria-label`. Use inline SVG (no icon library required) or your project’s icon set.
- **CSS (scoped):** `.th-actions` for non-sortable action column headers; `.action-icon` for the icon wrapper; `.cell-link-icon` for icon-only links/buttons; `.cell-link-delete` for the Delete control; `.action-icon-spin` for the delete-in-progress spinner; `.modal-backdrop`, `.modal`, `.modal-title`, `.modal-body`, `.modal-actions`, `.modal-btn`, `.modal-btn-cancel`, `.modal-btn-delete` for the confirmation modal.

---

## 3. Create view

- **Back:** `<button type="button" class="back-btn" @click="goBack">← {Resource}</button>` in `<p class="back">`; `goBack` → `router.push({ name: '{resource}' })`.
- **Title:** `<h1>Create {resource}</h1>`.
- **Form:** `<form class="form" @submit="onSubmit">`. Labels + inputs; one line error below fields or above actions (`<p v-if="error" class="error">`). Actions: `<div class="actions">` with submit button and `<button type="button" class="secondary" @click="goBack">Cancel</button>`.
- **On success:** `router.push({ name: '{resource}-detail', params: { pkey: created.pkey } })`.

**Create form: SQL defaults and segmented pills.** When building or refactoring a create form, follow these steps so the form matches the DB and stays consistent with edit forms:

1. **Look at the SQL.** The database create SQL defines table DEFAULTs. **Reference:** `pbx3/pbx3-1/opt/pbx3/db/db_sql/sqlite_create_tenant.sql` (and sibling SQL files in that directory). Find the table for the resource (e.g. **cluster** for tenants, **ipphone** for extensions). Each column’s `DEFAULT` is the value the DB would use when a row is created without that column supplied.
2. **Implement the defaults.** Preset create-form refs from those DEFAULTs (and from pbx3api model `$attributes` when the model overrides, e.g. Tenant model `chanmax` => 30). Initialize every optional field with its SQL/default value so users see and can change the same values the DB would apply. Required fields (e.g. pkey, description) stay user-filled; optional fields start with the default so “submit as-is” behaves like the DB.
3. **Look for pill candidates.** Any field that is a **short fixed-choice list** (2–4 values, e.g. YES/NO, enabled/disabled, on/off, None/In/Out/Both) should use a **segmented pill** (`.switch-toggle.switch-ios` + radio inputs), not a `<select>` dropdown. Same rule as §4.2 for edit forms. In create forms, use pills for booleans and for enum-like fields with few options; reserve `<select>` for long or dynamic lists (e.g. Tenant).

**API create: populate id (ksuid) and shortuid.** For **any** table that uses `id` (ksuid) or `shortuid`, the API create must set them on insert. Check **pbx3/pbx3-1/opt/pbx3/db/db_sql/sqlite_create_tenant.sql** for the resource’s table: if the table has an `"id"` column (27-char ksuid) or a `"shortuid"` column (human-readable key), the corresponding API create action (e.g. `TrunkController::save`, or the save method for that resource) must populate them **before** saving. Use the helpers in **pbx3api/app/Helpers/Helper.php**: `generate_ksuid()` for `id`, `generate_shortuid()` for `shortuid`. Apply this on every create for resources whose tenant-schema table defines these columns (e.g. trunks; extend to inroutes, ipphone, queue, etc. when adding or refactoring those creates).

**CSS classes (scoped):** `.back`, `.back-btn`, `.form`, `.form label`, `.form input` (or select), `.error`, `.actions`, `.actions button`, `.secondary`.

---

## 4. Detail view

- **Back:** Same as create: “← {Resource}” `back-btn`, `goBack` → list.
- **Title:** `<h1>{Resource}: {{ pkey }}</h1>`.
- **Edit-from-list:** When the user arrives via the list **Edit** link (see §2.1), the URL includes `query.edit` (e.g. `?edit=1`). After loading the item, if `route.query.edit` is set, call `startEdit()` so the user lands in edit mode without clicking Edit.
- **States:** Loading; error; else content.
- **Content (when not editing):** Wrap all content (toolbar, form when editing, read-only sections when not) in `<div class="detail-content">`. **Toolbar:** `<p class="toolbar">` with Edit and Delete buttons. Show delete error below if any. **Read-only content** must use the **detail content blocks** (see §4.1).
- **Edit mode:** `<form class="edit-form" @submit="saveEdit">` with fields for all editable API attributes; save error; `<div class="edit-actions">` with Submit and Cancel. Cancel clears edit state and optionally refetches. On save success, refetch and exit edit mode.
- **Delete:** Confirm dialog (modal); on success redirect to list. Show `deleteError` if delete fails.

**CSS classes (scoped):** `.back`, `.back-btn`, `.toolbar`, `.edit-btn`, `.delete-btn`, `.detail-list`, `.detail-list dt`, `.detail-list dd`, `.edit-form`, `.edit-input`, `.edit-actions`, `.error`, `.secondary`.

---

## 4.1 Detail view: content blocks (Identity, second section, Advanced)

**Displayed field list derived from the API.** The fields shown in the detail view (read-only blocks) and in the edit form must be **derived from the API**: the same fields the API returns for the resource should appear in the detail view and edit form, grouped into Identity, second section (e.g. Settings or Transport), and Advanced. Do not hard-code an arbitrary subset; if the API returns a field, show it (read-only if immutable, editable if the API allows update). The list view columns and detail Identity/Settings should align with the API shape for that resource.

When **not editing**, the read-only content must be split into **named blocks** so every detail panel has the same structure. Use this pattern for Extensions, Tenants, Trunks, Queues, Agents, Routes, IVRs, Inbound routes, etc.

1. **Identity block:** `<section class="detail-section">` with `<h2 class="detail-heading">Identity</h2>` and a `<dl class="detail-list">` of identity fields. Define an `identityFields` computed (array of `{ label, value }`) with the resource’s core identity: e.g. pkey/name, shortuid/Local UID, description, and any primary identifiers. Examples: Extension = Ext, SIP Identity, Tenant, User, Device, …; Tenant = name, Local UID, description.

2. **Second section:** `<section class="detail-section">` with a heading that fits the resource and a `<dl class="detail-list">`. Content is resource-specific:
   - **Transport** — for resources that have location/transport (e.g. Extensions: Location, Transport).
   - **Settings** or **Limits** — for resources that have config like CLID, timeouts, limits (e.g. Tenants: CLID, Abstime, ChanMax, Timer status).
   - Use a `settingsFields` or `transportFields` (or similar) computed for this section.

3. **Advanced block (reveal):** `<section class="detail-section">` with a **reveal button** and a list of all other API fields. Use a ref `advancedOpen` (boolean). Button: `<button type="button" class="collapse-trigger" :aria-expanded="advancedOpen" @click="advancedOpen = !advancedOpen">` with text `{{ advancedOpen ? '▼' : '▶' }} Advanced`. Below it: `<dl v-show="advancedOpen" class="detail-list detail-list-other">` with `<template v-for="[key, value] in otherFields">` — `otherFields` is a computed that returns all API keys **not** in Identity or the second section (e.g. exclude identity keys and transport/settings keys), sorted. This keeps the main view scannable and puts the rest in a single expandable block.

4. **Optional per-resource section:** If the resource has a sub-resource (e.g. Extensions have **Runtime**), add an extra `<section class="detail-section">` with its own heading and content between the second section and Advanced.

**CSS classes (scoped):** `.detail-content` (e.g. `max-width: 36rem`), `.detail-section` (e.g. `margin-top: 1.5rem`; first-of-type `margin-top: 1rem`), `.detail-heading` (e.g. `font-size: 1rem; font-weight: 600; margin: 0 0 0.5rem 0`), `.detail-list-other` (e.g. `margin-top: 0.5rem`), `.collapse-trigger` (block button, full width, padding, border-bottom, cursor pointer, text-align left; hover style). Copy from Extensions or Tenants detail view when upgrading other panels.

---

## 4.2 Edit form: boolean and short choice lists (segmented pill)

For **boolean** (e.g. Active? YES/NO) and **short choice lists** (e.g. Location: local/remote; Transport: udp/tcp/tls/wss) in the detail **edit form**, do **not** use a `<select>` dropdown. Use a **segmented pill** (radio group styled as a single control) so the pattern is consistent and scannable.

- **Label:** Use `class="edit-label-block"` on the label so it displays as a block above the control (e.g. `<label class="edit-label-block">Active?</label>`).
- **Control:** Wrap the options in `<div class="switch-toggle switch-ios">`. Use **radio inputs** (not select): one `<input type="radio">` per option with a visible `<label for="...">` that shows the option text. The radios are visually hidden; the labels look like segments. Example (Active? YES/NO):
  - `<label class="edit-label-block">Active?</label>`
  - `<div class="switch-toggle switch-ios">`
  - `<input id="edit-active-yes" type="radio" value="YES" v-model="editActive" />` + `<label for="edit-active-yes">YES</label>`
  - `<input id="edit-active-no" type="radio" value="NO" v-model="editActive" />` + `<label for="edit-active-no">NO</label>`
  - `</div>`
- **CSS (scoped):** `.edit-label-block` (display: block; margin-bottom: 0.25rem). `.switch-toggle.switch-ios`: flex container, background #e2e8f0, border-radius 0.5rem, padding 0.25rem. Hide the radio inputs (position: absolute; opacity: 0; width: 0; height: 0). Style the labels as segments: flex: 1, padding, text-align center, cursor pointer; default color #64748b; hover #334155; **checked** (input:checked + label): background white, color #0f172a, subtle box-shadow. Copy from ExtensionDetailView when adding to other panels.

Apply this to every **detail edit form** and **create form** that has a boolean or a small fixed set of choices (e.g. Active?, Location, Transport, Timer status, Allow hash xfer, CFWD extern rule, LDAP TLS). Use `<select>` only for long or dynamic lists (e.g. Tenant from API list).

---

## 5. Shared conventions

- **API code location:** The backend API lives in **pbx3api** (sibling directory to pbx3-frontend in the workspace). When adding or refactoring panels, **always check the API** so list columns, detail fields, and edit forms match what the API returns and accepts.
  - **Controllers:** `pbx3api/app/Http/Controllers/` — e.g. `InboundRouteController.php` defines `$updateableColumns` (PUT body) and request handling.
  - **Models:** `pbx3api/app/Models/` — e.g. `InboundRoute.php` defines table, guarded/hidden columns.
  - **API docs:** `pbx3api/docs/general.md` — request/response bodies per resource (GET/POST/PUT/DELETE).
  - **Routes:** `pbx3api/routes/api.php` — endpoint paths and controller methods.
  Use the controller’s updateable columns and the docs to ensure the detail edit form includes every API-updateable field (and that list/detail read-only blocks show the same fields).
- **API client:** `getApiClient()` from `@/api/client`; all requests use it (base URL and token from auth store).
- **List normalization:** Handle various API list shapes (array, `response.data`, `response.{resource}`, numeric keys) in a small `normalizeList(response)` so the view always gets an array.
- **Detail fetch:** `GET {resource}/{pkey}` with `encodeURIComponent(pkey)`; refetch on route param change (`watch(pkey, fetchItem)`).
- **Errors:** Show one main error message per view (load error, save error, delete error). Prefer API validation message (e.g. `err.data?.field?.[0]`) then `err.data?.message` then `err.message`.

---

## 5.1 Tenant (cluster) display — always show pkey

Internally, tenants are **clusters** (cluster table); data rows often store a cluster reference as **id** (KSUID) or **shortuid** (8-char). In the UI we **never** show id or shortuid for “tenant”; we always show the **tenant pkey** (human-facing, e.g. `default`, `duns`, `affcot`).

- **List columns:** If the list has a tenant/cluster column, label it **“Tenant”** and display the **tenant pkey**, not the raw `cluster` value from the API. **Make the tenant value clickable:** when the resolved tenant pkey is present (not empty/—), render it as a `<router-link>` to the tenant detail view (`{ name: 'tenant-detail', params: { pkey: tenantPkey } }`), class `cell-link`, so the user can go directly to the tenant detail panel. When there is no tenant (e.g. empty or —), show plain text.
- **Detail / forms:** Label the field **“Tenant”**; show or edit the tenant pkey (API still sends/receives `cluster` as pkey or as id/shortuid depending on the backend).
- **How to resolve:**  
  - **Preferred:** API resolves cluster id/shortuid → tenant pkey and returns a **`tenant_pkey`** (or `cluster_pkey`) field on each item (e.g. Extensions index). Frontend displays `item.tenant_pkey ?? item.cluster`.  
  - **Fallback:** Frontend fetches `GET tenants`, builds a map (cluster id/shortuid/pkey → tenant pkey), and resolves for display. Use when the API does not yet expose `tenant_pkey`. **The map must include tenant id, shortuid, and pkey → tenant pkey** (e.g. for each tenant: `map.set(id, pkey)`, `map.set(shortuid, pkey)`, `map.set(pkey, pkey)`). Then when the API returns `item.cluster` as tenant id, shortuid, or pkey, the column shows **tenant pkey** (never shortuid or id) and the link to tenant detail uses that pkey.
- **List and detail both:** Use the same resolution (and the same full map: id, shortuid, pkey) in **both** the list view and the detail view for that resource. It is easy to add the map only in the list and forget the detail view; if the detail view also displays Tenant (e.g. Trunk detail, Extension detail), it must build and use the same map so the Tenant field shows pkey there too.
- **Sort/filter:** When sorting or filtering by tenant, use the **resolved pkey** (so “Tenant” column sort/filter is by tenant name, not by id/shortuid).

- **Detail edit form — Tenant dropdown:** When the detail view has an **edit form** and the resource has a cluster/tenant field, use a **dropdown** (`<select>`), not a text input, so the user picks from existing tenants. (You already fetch `GET tenants` for the resolution map.) Build **tenantOptions** = sorted list of tenant pkeys from the fetched list (e.g. `tenants.value.map(t => t.pkey).filter(Boolean)`, dedupe, sort). Build **tenantOptionsForSelect** = tenantOptions, but if the current edit value (e.g. `editCluster`) is not in the list (e.g. API returned a tenant not in the fetched list), prepend it so the dropdown can show and submit it. Use `<label for="edit-tenant">Tenant</label>` and `<select id="edit-tenant" v-model="editCluster" class="edit-input" required>` with `<option v-for="opt in tenantOptionsForSelect" :key="opt" :value="opt">{{ opt }}</option>`. Apply to every panel that edits cluster/tenant (Extensions, Trunks, Routes, etc.).

Apply this to every data panel that has a cluster/tenant column (Extensions, Trunks, Queues, Agents, Routes, IVRs, Inbound routes, etc.).

---

## 5.2 Success feedback (toast)

After a successful **create**, **update**, or **delete**, show a short **toast** so the user gets positive confirmation without blocking the UI.

- **Implementation:** Use the shared toast store (`useToastStore()` from `@/stores/toast`). Call `toast.show(message, variant)` after a successful API call. `variant` is `'success'` (default) or `'error'` (for optional error toasts). Toasts auto-dismiss after a few seconds; the user can dismiss manually. The app mounts `<ToastContainer />` in `App.vue` so toasts appear globally (e.g. bottom-right).
- **When to show:**
  - **Detail save (update):** After a successful PUT/PATCH, e.g. `toast.show('Extension 1000 saved')` or `toast.show(\`${resource} ${pkey} saved\`)`.
  - **Detail sub-form (e.g. runtime):** After a successful sub-resource save, e.g. `toast.show('Runtime settings saved')`.
  - **List delete:** After a successful DELETE from the list (and list refresh), e.g. `toast.show('Extension 1000 deleted')`.
  - **Create:** After a successful POST and redirect to detail, e.g. `toast.show('Extension 1001 created')` (optional; redirect is already strong feedback).
- **Message style:** Short and specific (e.g. “Extension 1000 saved”, “Trunk SIP-01 deleted”). Avoid generic “Saved” unless the context is obvious.
- **Do not** use toasts for errors; keep errors inline (form error message, list error message, modal).

---

## 5.3 List panels: minimum viewport (no compromise)

There is **no explicit min-width** in code for list tables. Layout uses: sidebar **12rem** (~192px), main content padding **1.5rem** each side (~48px total), and table **width: 100%**. So the table gets whatever width remains (viewport − ~240px). On narrow viewports the table will overflow and the main area will show horizontal scroll.

- **Practical minimum for “without compromise”** (no horizontal scroll, readable columns): **1280px viewport width**. The Extensions list (widest: 10 columns) needs roughly 1000–1100px of content width; 1280px viewport leaves enough room after sidebar and padding. At 1024px the list will typically scroll horizontally.
- **Design target:** List panels are built for **1280px and up**. Smaller viewports (e.g. tablets, phones) are not guaranteed without responsive changes. Admins typically use laptops or desktops; tablet/phone use is out of scope for now except in emergencies (scroll or compromise acceptable).
- If you add a supported minimum, set it in the pattern (e.g. “Minimum 1280px”) or add a `min-width` on the table wrapper and document it here.

---

## 5.4 Immutable values: display treatment

Some fields are **immutable** (set by the system or at create, not editable later). Give them a consistent visual treatment so users can see at a glance which values cannot be changed.

**Recommendation: lowlight (muted), not highlight.** Treat immutable values as secondary/reference info: muted text color and optionally a very subtle background. This reads as "fixed / system" without drawing undue attention. Avoid "highlight" (bright or strong background) so users don't assume they can edit them.

**Where to apply:**

- **Detail view (read-only):** In Identity and other blocks, wrap or class the **value** of immutable fields. Use a class on the `<dd>` (e.g. `<dd class="value-immutable">`) for fields that are immutable: **KSUID** (id), **Local UID** (shortuid), **SIP Identity** (shortuid), and any other API-immutable identifiers. Editable fields stay default styling.
- **Edit form:** For immutable fields shown in the form, use the same class on read-only text (e.g. `<p class="detail-readonly value-immutable">`) or on a disabled input. Existing `.detail-readonly` can be combined with or replaced by `.value-immutable` for consistency.
- **List table (optional):** For columns that are always immutable (e.g. KSUID, Local UID), you may apply a muted cell class (e.g. `.cell-immutable`) so those columns read as "system" data. Primary columns (name/pkey, Tenant) stay default.

**CSS (scoped):** Use a single class (e.g. `.value-immutable`) with:

- **Muted text:** `color: #64748b` (or similar slate-500) so the value is clearly secondary but still readable. Do not go lighter than WCAG AA contrast on the page background.
- **Optional subtle background:** `background: #f8fafc` (or similar) on the cell/block to reinforce "not editable" without looking disabled. Prefer no border so it doesn't compete with actual form inputs.

**Which fields are immutable:** Typically **id** (KSUID), **shortuid** (Local UID / SIP Identity). **pkey** may be immutable for some resources (e.g. extension number change not yet supported). Per resource, mark only fields that the API does not allow updating.

**Accessibility:** Keep contrast sufficient. Optionally add `title="Immutable"` or `aria-describedby` on the value so assistive tech can explain that the field is not editable.

Apply this treatment consistently across list/detail/edit so immutable values are recognizable in every panel.

---

## 5.5 KSUID and shortuid (Local UID) — same treatment everywhere

For resources whose table has `id` (27-char KSUID) and `shortuid` (8-char Local UID), use the **same** approach in every such panel (Tenant, Trunk, Inbound route, IVR, etc.) so behaviour and UI are consistent.

**API (pbx3api):**

- **Create:** Populate `id` and `shortuid` on insert (see §3: use `generate_ksuid()` and `generate_shortuid()` from Helper.php before `$model->save()`).
- **Serialization:** Do **not** hide `id` or `shortuid` in the model’s `$hidden`; the list and detail views need them. Do **not** use `$appends` for these; they are normal DB columns.

**List view:**

- Add **one** column: **Local UID** (label "Local UID"), after the name/pkey column. Use a `localUidDisplay(item)` helper that returns `item.shortuid` or `'—'` when missing. Apply `.cell-immutable` and `title="Immutable"` to the cell. Include `shortuid` in filter and sort.
- **Do not** add a separate KSUID column in the list; only Local UID is shown in the table (same as Tenant, Trunk, Inbound route).

**Detail view:**

- **Identity:** Include both **Local UID** and **KSUID** in `identityFields`: `{ label: 'Local UID', value: r.shortuid ?? '—', immutable: true }` and `{ label: 'KSUID', value: r.id ?? '—', immutable: true }`. Show them in the read-only Identity `<dl>` and in the **edit form** as read-only: `<label>Local UID</label>` + `<p class="detail-readonly value-immutable">{{ resource.shortuid ?? '—' }}</p>`, and the same for KSUID with `resource.id ?? '—'`. No extra helper; use direct `?? '—'` like Trunk/Tenant/InboundRoute detail.
- Exclude `id` and `shortuid` from the Advanced block (add them to the exclude set for `otherFields`) so they are not repeated.

**Reference:** Trunk, Tenant, InboundRoute list and detail views implement this; IVR and any other resource with id/shortuid should match.

---

## 6. Optional per-resource extras

- **Runtime or live state:** If the API has a separate endpoint (e.g. `GET extensions/{id}/runtime`), add a small section or tab on the detail view: fetch on load, display read-only; optional edit form for `PUT .../runtime` fields.
- **Filter/search:** For large lists (e.g. Extensions), add a single filter input (by pkey or cluster) and filter the displayed array client-side.
- **Pagination:** If we add it later, keep it consistent (e.g. “Show 50 / 100 / all” or page buttons); document in this file.

---

## 7. Applying to other panels

When adding a new resource panel (or refactoring an existing one):

1. Add the three routes and three view files following the names above.
2. Implement List: **Per §2.2** use the **list template blocks** (root `list-view`, `list-header`, `list-states`, `list-body`). Toolbar + add-btn, table, loading/error/empty. **Per §2.1:** add an **Edit** column (link to detail with `query: { edit: '1' }`) for rows that can be edited; add a **Delete** column with a **confirmation modal** (not browser confirm) for rows that can be deleted.
3. Implement Create: back, form, actions, success → detail. **Per §3:** (a) Look at the database create SQL for the resource’s table and (b) preset create-form fields from the SQL DEFAULTs (and model `$attributes`). (c) Use **segmented pills** for any short fixed-choice fields (boolean or 2–4 options); do not use `<select>` for those.
4. Implement Detail: back, toolbar (Edit / Delete), **Per §4.1** use the **detail content blocks** (Identity, second section e.g. Transport or Settings, Advanced reveal). Edit form with all editable API fields; **Per §4.2** use **segmented pill** (switch-toggle switch-ios + radio) for boolean and short choice lists (e.g. Active?), not `<select>`. Delete with confirm. **Per §4:** when `route.query.edit` is set after load, call `startEdit()` so list Edit links land in edit mode.
5. Reuse the CSS class names from this doc so styling stays consistent (copy from an existing panel, e.g. Extensions or Tenants, then adjust for fields).
6. **Tenant column:** If the resource has a cluster/tenant, show **Tenant** (tenant pkey) per §5.1 — API returns `tenant_pkey` or frontend resolves from GET tenants. **Use the same resolution in both list and detail:** build the map (id, shortuid, pkey → tenant pkey) and use it in the list view and in the detail view so the Tenant field always shows pkey everywhere.
7. **KSUID/shortuid:** If the resource table has `id` and `shortuid`, follow **§5.5** so list (Local UID column only), detail (Identity + edit form), and API (visible, no $appends) match Tenant/Trunk/InboundRoute.
8. **Success toasts:** After successful save or delete, call `useToastStore().show(message)` per §5.2 so the user gets positive confirmation.

---

## 8. Reference implementation

**Extensions** and **Tenants** are the reference implementations. **List:** Use list template blocks (§2.2): `list-view`, `list-header`, `list-states`, `list-body`; toolbar/add-btn and optional filter; sortable columns; Edit/Delete icons with confirmation modal. **Detail:** Use detail content blocks (§4.1): Identity section, second section (Transport for Extensions, Settings for Tenants), Advanced reveal; full edit form; delete with confirmation modal. When upgrading other panels (Trunks, Queues, Agents, Routes, IVRs, Inbound routes), apply §2.2 and §4.1 so list and detail match this structure.

**Create panel status:** List toolbar and create-form submit button are standardized to **Create** / **Creating…** everywhere. Create forms fully aligned with §3 (SQL defaults, Identity/Settings/Advanced, segmented pills): **Tenant**, **Inbound route**. Still to align: **Extension**, **Trunk**, **Route**, **Queue**, **Agent**, **IVR** — see PROJECT_PLAN.md § Current state → To-do (create panels).
