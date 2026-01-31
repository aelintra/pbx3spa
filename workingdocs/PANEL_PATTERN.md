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
- List has an “Add …” button linking to `/{resource}/new`. Detail has a “← {Resource}” back button to list.

---

## 2. List view

- **Title:** `<h1>{Resource}</h1>` (e.g. “Extensions”, “Trunks”).
- **Toolbar:** One row with primary action: `<router-link :to="{ name: '{resource}-create' }" class="add-btn">Add {resource}</router-link>`. Wrap in `<p class="toolbar">`.
- **States:** Loading message; error message (single line); empty message (“No {resource}. (API returned an empty list.)”); else **table**.
- **Table:** `<table class="table">`. Header row with column headers; body: one `<tr>` per item, first column usually a `<router-link>` to detail (`{ name: '{resource}-detail', params: { pkey: item.pkey } }`), class `cell-link`. Columns = key fields (e.g. pkey, **Tenant** (cluster pkey — see §5.1), technology, active).
- **Sortable columns:** Give users a clear visual cue that columns are sortable (“don’t make me think”). Use class `th-sortable` on sortable `<th>` elements and: (1) show a **neutral sort icon** (e.g. ⇅) in every sortable header via CSS `::before`, so at a glance all sortable columns are obvious; (2) when a column is the active sort, show ↑ or ↓ (e.g. via `::after` and `.sort-asc` / `.sort-desc`); (3) add `title="Click to sort"` on sortable headers for hover. Non-sortable columns (e.g. Edit, Delete) use `.th-actions` with no icon.
- **Optional:** Simple client-side filter (e.g. by pkey or cluster) for larger lists (e.g. Extensions).

**List row actions (see §2.1):** Every row that **can be edited** has an **Edit** link; every row that **can be deleted** has a **Delete** link, with delete guarded by a **confirmation modal** (not browser confirm, not in-row confirmation).

**CSS classes (scoped):** `.toolbar`, `.add-btn`, `.loading`, `.error`, `.empty`, `.table`, `.table th`, `.table td`, `.cell-link`, `.th-actions`, `.th-sortable` (cursor pointer; `::before` neutral sort icon ⇅; `.sort-asc` / `.sort-desc` for active direction ↑/↓).

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

**CSS classes (scoped):** `.back`, `.back-btn`, `.form`, `.form label`, `.form input` (or select), `.error`, `.actions`, `.actions button`, `.secondary`.

---

## 4. Detail view

- **Back:** Same as create: “← {Resource}” `back-btn`, `goBack` → list.
- **Title:** `<h1>{Resource}: {{ pkey }}</h1>`.
- **Edit-from-list:** When the user arrives via the list **Edit** link (see §2.1), the URL includes `query.edit` (e.g. `?edit=1`). After loading the item, if `route.query.edit` is set, call `startEdit()` so the user lands in edit mode without clicking Edit.
- **States:** Loading; error; else content.
- **Content (when not editing):**
  - **Toolbar:** `<p class="toolbar">` with `<button class="edit-btn" @click="startEdit">Edit</button>` and `<button class="delete-btn" @click="doDelete">…</button>`. Show delete error below if any.
  - **Read-only block:** Key identity first (e.g. pkey), then other fields in a sensible order. Use `<dl class="detail-list">` with `<dt>`/`<dd>` pairs, or grouped sections. Prefer **ordered, labelled fields** over a raw alphabetical dump so the same pattern works across panels.
- **Edit mode:** `<form class="edit-form" @submit="saveEdit">` with fields for all editable API attributes; save error; `<div class="edit-actions">` with Submit and Cancel. Cancel clears edit state and optionally refetches. On save success, refetch and exit edit mode.
- **Delete:** Confirm dialog; on success redirect to list. Show `deleteError` if delete fails.

**CSS classes (scoped):** `.back`, `.back-btn`, `.toolbar`, `.edit-btn`, `.delete-btn`, `.detail-list`, `.detail-list dt`, `.detail-list dd`, `.edit-form`, `.edit-input`, `.edit-actions`, `.error`, `.secondary`.

---

## 5. Shared conventions

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
  - **Fallback:** Frontend fetches `GET tenants`, builds a map (cluster id/shortuid/pkey → tenant pkey), and resolves for display. Use when the API does not yet expose `tenant_pkey`.
- **Sort/filter:** When sorting or filtering by tenant, use the **resolved pkey** (so “Tenant” column sort/filter is by tenant name, not by id/shortuid).

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

## 6. Optional per-resource extras

- **Runtime or live state:** If the API has a separate endpoint (e.g. `GET extensions/{id}/runtime`), add a small section or tab on the detail view: fetch on load, display read-only; optional edit form for `PUT .../runtime` fields.
- **Filter/search:** For large lists (e.g. Extensions), add a single filter input (by pkey or cluster) and filter the displayed array client-side.
- **Pagination:** If we add it later, keep it consistent (e.g. “Show 50 / 100 / all” or page buttons); document in this file.

---

## 7. Applying to other panels

When adding a new resource panel (or refactoring an existing one):

1. Add the three routes and three view files following the names above.
2. Implement List: toolbar + add-btn, table, loading/error/empty. **Per §2.1:** add an **Edit** column (link to detail with `query: { edit: '1' }`) for rows that can be edited; add a **Delete** column with a **confirmation modal** (not browser confirm) for rows that can be deleted.
3. Implement Create: back, form, actions, success → detail.
4. Implement Detail: back, toolbar (Edit / Delete), read-only block with ordered fields, edit form with all editable API fields, delete with confirm. **Per §4:** when `route.query.edit` is set after load, call `startEdit()` so list Edit links land in edit mode.
5. Reuse the CSS class names from this doc so styling stays consistent (copy from an existing panel, e.g. Trunks or Extensions, then adjust for fields).
6. **Tenant column:** If the resource has a cluster/tenant, show **Tenant** (tenant pkey) per §5.1 — API returns `tenant_pkey` or frontend resolves from GET tenants.
7. **Success toasts:** After successful save or delete, call `useToastStore().show(message)` per §5.2 so the user gets positive confirmation.

---

## 8. Reference implementation

**Extensions** (after buildout) is the reference: list with toolbar/add-btn and optional filter; create with back/form/actions; detail with ordered fields, full edit form, and optional runtime section. Trunks and Queues already follow the same structure; minor naming (e.g. `btn-primary` → `add-btn`) can be aligned when touching those files.
