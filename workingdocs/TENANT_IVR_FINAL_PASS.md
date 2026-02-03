# Tenant & IVR Panels: Final Pass (Remaining Technical Debt)

**Date:** 2026-02-03  
**Scope:** TenantsListView, TenantCreateView, TenantDetailView, IvrsListView, IvrCreateView, IvrDetailView  
**Purpose:** Identify any remaining technical debt after Steps 1–7.

---

## Summary

Tenant and IVR panels are in good shape: shared `normalizeList`, `DeleteConfirmModal`, `tenantAdvanced.js`, `ivrDestinations.js`, toolbar layout, form components, and Edit Save/Cancel/Delete are all in place. The items below are **optional or minor** — nothing blocking.

---

## 1. ~~Optional: Shared `fieldErrors(err)` (Phase 1.3)~~ ✅ Done

**Done (2026-02-03):** Added `src/utils/formErrors.js` with `fieldErrors(err)` and `firstErrorMessage(err, fallback)`. TenantCreateView, TenantDetailView, IvrCreateView, and IvrDetailView now import and use it; local copies removed. Other Create views (InboundRoute, Extension, Trunk, Agent, Queue, Route) still have local `fieldErrors` — migrate when touching those panels.

---

## 2. ~~Minor: TenantCreateView unused class~~ ✅ Done

**Done (2026-02-03):** Removed unused `advanced-fields` from the Advanced section class list; it now uses `class="form-fields"` only.

---

## 3. Minor: TenantDetailView save error handling

**What:** `saveEdit` in TenantDetailView builds the error message with a long chain of `err.data?.description?.[0] ?? err.data?.clusterclid?.[0] ?? ...`. It works but is verbose and doesn’t reuse the same pattern as Create (which uses `fieldErrors` and then picks the first message).

**Recommendation:** If/when shared `fieldErrors(err)` exists, Detail could use it and then pick the first message (e.g. `Object.values(fieldErrors(err)).flat()[0]`) for consistency. Optional.

---

## 4. Minor: List column header casing

**What:** TenantsListView uses lowercase for some headers (`name`, `description`); IvrsListView has `description` lowercase and others title-case (`IVR Direct Dial`, `Local UID`, etc.). Pattern doc suggests consistent column naming.

**Recommendation:** Optional consistency pass: align to title-case (e.g. "Name", "Description") across list views when touching them.

---

## 5. Keystroke section: raw inputs (IVR Create/Detail)

**What:** The IVR “Keystroke options” table uses raw `<select>` and `<input>` for destination, tag, and alert. The rest of the app uses FormField/FormSelect/FormToggle.

**Recommendation:** Leave as-is for now. The table layout (Key | Action | Tag | Alert) is a custom grid; converting to FormField/FormSelect would need layout adjustments. Treat as acceptable deviation unless you standardize all table-in-form layouts later.

---

## Checklist (Tenant & IVR) — All satisfied

- [x] Shared `normalizeList` from `@/utils/listResponse`
- [x] Shared `DeleteConfirmModal`
- [x] List: name column plain text; only Edit action links to detail
- [x] List toolbar: `justify-content: space-between` (Tenants + IVRs)
- [x] Tenant: shared `tenantAdvanced.js` (no duplicate advanced config)
- [x] IVR: shared `ivrDestinations.js` (no duplicate optionEntries/ivrPayload)
- [x] Create/Edit: form components (FormField, FormSelect, FormToggle, FormReadonly where applicable)
- [x] Edit: Save, Cancel, Delete at bottom; Delete opens modal
- [x] No inline modal markup/CSS
- [x] No duplicate `.advanced-fields` CSS (removed in Step 7)

---

**Conclusion:** No remaining *required* debt for Tenant and IVR. Optional improvements: shared `fieldErrors`, small cleanups (unused class, error message pattern, header casing), and optionally standardizing IVR keystroke inputs later.
