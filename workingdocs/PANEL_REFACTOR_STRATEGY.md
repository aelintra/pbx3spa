# Panel Refactor Strategy: Avoid Repeating Technical Debt

**Goal:** Bring all panels (Tenant, IVR, Extensions, Trunks, Routes, Queues, Agents, InboundRoutes, etc.) up to the latest pattern **without** re-copying the same duplication (normalizeList, modal markup/styles, resource-specific config between Create and Detail).

**Approach:** Extract shared pieces **first**, then use them everywhere. New or refactored panels import shared utilities and components instead of pasting the same code.

---

## Phase 1: App-wide shared pieces (do once)

Do these extractions first. Once they exist, **every** list and detail view should use them.

### 1.1 `normalizeList(response)` → shared util

- **Add:** `src/utils/listResponse.js` (or `src/utils/api.js`).
- **Export:** `normalizeList(response)` and optionally `normalizeListForResource(response, resourceKey)` if different resources wrap in different keys (`tenants`, `ivrs`, `extensions`, etc.).
- **Use in:** Every view that fetches a list: all `*ListView.vue`, and any Create/Detail that loads a list (e.g. tenants for dropdown). Remove the local `normalizeList` from each file.

**Signature (current pattern):**
```javascript
// Handles: array, { data: [] }, { resourceKey: [] }, numeric-keyed object
export function normalizeList(response, options = {}) {
  const { dataKey, resourceKey } = options
  if (Array.isArray(response)) return response
  if (response && typeof response === 'object') {
    if (Array.isArray(response.data)) return response.data
    if (resourceKey && Array.isArray(response[resourceKey])) return response[resourceKey]
    if (Object.keys(response).every((k) => /^\d+$/.test(k))) return Object.values(response)
  }
  return []
}
```

Call sites: `normalizeList(res)` or `normalizeList(res, { resourceKey: 'tenants' })` etc.

### 1.2 Delete confirmation modal → shared component ✅

- **Added:** `src/components/DeleteConfirmModal.vue`.
- **Props:** `show`, `title`, `bodyText` (or `#body` slot), `confirmLabel` ("Delete"), `cancelLabel` ("Cancel"), `loadingLabel` ("Deleting…"), `loading`.
- **Events:** `@confirm`, `@cancel`.
- **Refactored:** All list views (Tenants, IVRs, Routes, InboundRoutes, Trunks, Extensions) and all detail views (Tenant, IVR, Trunk, InboundRoute, Route) now use `<DeleteConfirmModal>`; inline Teleport + modal CSS removed.

**Benefits:** One place to fix a11y, styling, or behavior; no more copy-paste of 40+ lines of modal HTML + CSS per panel.

### 1.3 (Optional) `fieldErrors(err)` → shared util

- **Add:** to `src/utils/formErrors.js` or extend `src/composables/useFormValidation.js`.
- **Export:** `fieldErrors(err)` that returns `{ fieldName: string[] }` or null from `err.data`.
- **Use in:** Create/Edit views that need to map API validation errors to fields or a generic message. IVR and Tenant Create already have similar logic; Detail can use it for field-level errors.

---

## Phase 2: Resource-specific shared config (per resource)

Extract only where the **same** config or logic is duplicated between that resource’s Create and Detail views.

### 2.1 Tenant: advanced fields

- **Add:** `src/constants/tenantAdvanced.js` (or `src/utils/tenantAdvanced.js`).
- **Export:** `ADVANCED_KEYS`, `ADVANCED_FIELDS`, `CLUSTER_CREATE_DEFAULTS`, `buildAdvancedPayload(formAdvanced)`, and a small `parseNum` if not already shared.
- **Use in:** TenantCreateView and TenantDetailView. Both import and use; Create initializes form from CLUSTER_CREATE_DEFAULTS, Detail from API.

### 2.2 IVR: destinations / keystroke options

- **Add:** `src/constants/ivrDestinations.js` (or `src/utils/ivrDestinations.js`).
- **Export:** `OPTION_ENTRIES` (the 12 key/tag/alert rows), `buildIvrPayload(options, tags, alerts, timeout)` (current `ivrPayload`).
- **Use in:** IvrCreateView and IvrDetailView. Remove local `optionEntries` and `ivrPayload` from both.

### 2.3 Other resources

- When a resource has a **large repeated structure** between Create and Detail (e.g. many fields, complex payload), consider a small `constants/<resource>.js` or `utils/<resource>.js` **before** refactoring that resource’s second panel. Don’t copy-paste the same block into the second view.

---

## Phase 3: Refactor existing panels to use shared pieces

Order can be:

1. **Introduce shared app-wide pieces** (Phase 1): add `listResponse.js`, `DeleteConfirmModal.vue`, and optionally `formErrors.js`.
2. **Refactor Tenant and IVR** to use them: replace inline `normalizeList`, modal, and (Phase 2) tenant advanced / IVR destinations with imports. Fix Tenant list toolbar and duplicate `.advanced-fields` CSS while touching the files.
3. **Then** use the same shared pieces as the default when bringing **remaining** panels (Extensions, Trunks, Routes, etc.) up to the pattern.

This way Tenant and IVR become the reference implementation **using** the shared layer, and no new panel needs to re-invent normalizeList or the modal.

---

## Phase 4: Checklist when adding or refactoring a panel

When you add a new resource or refactor a panel to the latest pattern, use this so the same debt doesn’t come back:

**List view**

- [ ] Uses **shared** `normalizeList` from `@/utils/listResponse.js` (or equivalent). No local `normalizeList`.
- [ ] Uses **shared** `<DeleteConfirmModal>` (or equivalent). No inline Teleport + modal markup/styles.
- [ ] Toolbar has `justify-content: space-between` (Create left, filter right).
- [ ] Name column is **not** a link; only Edit action links to detail.

**Create view**

- [ ] Uses shared `normalizeList` for any list fetch (e.g. tenants).
- [ ] If this resource has a **large shared config** with Detail (e.g. many advanced fields, key/tag tables), that config lives in a **shared** module; Create imports it.
- [ ] Extra/advanced settings: show them **inline** under an "Advanced" heading; do **not** use a hide/reveal (collapsible) unless there’s a strong reason.
- [ ] All form fields use **FormField / FormSelect / FormToggle / FormReadonly**. No raw label+input tables.
- [ ] Validation uses **useFormValidation** and shared validators where applicable.

**Detail view**

- [ ] Uses shared **DeleteConfirmModal** for delete confirmation. No inline modal.
- [ ] Delete button: bottom row with Save/Cancel, label "Delete", red filled style.
- [ ] Heading: "Edit {Panel name} {Object name}".
- [ ] Same shared config as Create for this resource (if any): import from same module; no duplicate optionEntries / ADVANCED_FIELDS / etc.
- [ ] If API returns field-level errors, map them to validation state and use **focusFirstError** (like IVR Detail), instead of only a generic message.

**General**

- [ ] No duplicate modal CSS in the view.
- [ ] No duplicate “normalize list” or “build payload” logic between Create and Detail for the same resource.

---

## Suggested order of work

| Step | Action | Outcome |
|------|--------|---------|
| 1 | Add `src/utils/listResponse.js` with `normalizeList` | One place for list normalization |
| 2 | Add `src/components/DeleteConfirmModal.vue` | One delete modal component |
| 3 | Refactor TenantsListView + TenantDetailView to use both | Tenant uses shared pieces |
| 4 | Refactor IvrsListView + IvrCreateView + IvrDetailView to use both | IVR uses shared pieces |
| 5 | Add `src/constants/tenantAdvanced.js`, refactor Tenant Create/Detail to use it | No duplicate advanced config for Tenant |
| 6 | Add `src/constants/ivrDestinations.js`, refactor IVR Create/Detail to use it | No duplicate optionEntries/ivrPayload |
| 7 | Quick fixes: Tenant list toolbar, Tenant Create duplicate `.advanced-fields` CSS | Consistency and clean CSS |
| 8 | Apply pattern to next resource (e.g. Extensions) **using** shared list + modal + any new resource-specific module | New panels stay debt-free |

After step 8, repeat for each remaining resource: use shared list + modal from the start; add a small shared config only when that resource has Create+Detail duplication.

---

## Summary

- **Do shared extractions first** (normalizeList, DeleteConfirmModal, then resource-specific config where duplication already exists).
- **Refactor Tenant and IVR** to consume those shared pieces so they are the reference.
- **For every other panel**, use the checklist and the shared layer from the start so we don’t repeat the same issues.

This keeps the pattern consistent and avoids re-introducing technical debt as the rest of the panels are brought up to the latest pattern.
