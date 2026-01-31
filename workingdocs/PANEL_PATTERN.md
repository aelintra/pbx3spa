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
- **Optional:** Simple client-side filter (e.g. by pkey or cluster) for larger lists (e.g. Extensions).

**CSS classes (scoped):** `.toolbar`, `.add-btn`, `.loading`, `.error`, `.empty`, `.table`, `.table th`, `.table td`, `.cell-link`.

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

- **List columns:** If the list has a tenant/cluster column, label it **“Tenant”** and display the **tenant pkey**, not the raw `cluster` value from the API.
- **Detail / forms:** Label the field **“Tenant”**; show or edit the tenant pkey (API still sends/receives `cluster` as pkey or as id/shortuid depending on the backend).
- **How to resolve:**  
  - **Preferred:** API resolves cluster id/shortuid → tenant pkey and returns a **`tenant_pkey`** (or `cluster_pkey`) field on each item (e.g. Extensions index). Frontend displays `item.tenant_pkey ?? item.cluster`.  
  - **Fallback:** Frontend fetches `GET tenants`, builds a map (cluster id/shortuid/pkey → tenant pkey), and resolves for display. Use when the API does not yet expose `tenant_pkey`.
- **Sort/filter:** When sorting or filtering by tenant, use the **resolved pkey** (so “Tenant” column sort/filter is by tenant name, not by id/shortuid).

Apply this to every data panel that has a cluster/tenant column (Extensions, Trunks, Queues, Agents, Routes, IVRs, Inbound routes, etc.).

---

## 6. Optional per-resource extras

- **Runtime or live state:** If the API has a separate endpoint (e.g. `GET extensions/{id}/runtime`), add a small section or tab on the detail view: fetch on load, display read-only; optional edit form for `PUT .../runtime` fields.
- **Filter/search:** For large lists (e.g. Extensions), add a single filter input (by pkey or cluster) and filter the displayed array client-side.
- **Pagination:** If we add it later, keep it consistent (e.g. “Show 50 / 100 / all” or page buttons); document in this file.

---

## 7. Applying to other panels

When adding a new resource panel (or refactoring an existing one):

1. Add the three routes and three view files following the names above.
2. Implement List: toolbar + add-btn, table, loading/error/empty.
3. Implement Create: back, form, actions, success → detail.
4. Implement Detail: back, toolbar (Edit / Delete), read-only block with ordered fields, edit form with all editable API fields, delete with confirm.
5. Reuse the CSS class names from this doc so styling stays consistent (copy from an existing panel, e.g. Trunks or Extensions, then adjust for fields).
6. **Tenant column:** If the resource has a cluster/tenant, show **Tenant** (tenant pkey) per §5.1 — API returns `tenant_pkey` or frontend resolves from GET tenants.

---

## 8. Reference implementation

**Extensions** (after buildout) is the reference: list with toolbar/add-btn and optional filter; create with back/form/actions; detail with ordered fields, full edit form, and optional runtime section. Trunks and Queues already follow the same structure; minor naming (e.g. `btn-primary` → `add-btn`) can be aligned when touching those files.
