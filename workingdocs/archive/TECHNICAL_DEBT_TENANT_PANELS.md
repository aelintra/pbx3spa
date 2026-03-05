# Technical Debt Inspection: Tenant Panels

**Date**: 2026-02-02  
**Scope**: TenantsListView, TenantCreateView, TenantDetailView  
**Purpose**: Identify potential technical debt and inconsistencies

---

## Executive Summary

The tenant panels follow the standardized panel pattern (three panels, reusable form components, one row per field, Delete at bottom, Edit heading format). Several items could be improved to reduce duplication, align with IVR/list pattern details, and fix minor inconsistencies.

**Risk Level**: **Low–Medium**  
**Impact**: Mostly maintainability and consistency; no critical functional gaps.

---

## Cross-panel summary: IVR vs Tenant

| # | Issue | Tenant | IVR |
|---|--------|--------|-----|
| 1 | Duplicate config/logic (Create + Detail) | ✅ ADVANCED_KEYS/FIELDS, buildAdvancedPayload, parseNum | ✅ optionEntries, ivrPayload, normalizeList, destinationGroups pattern |
| 2 | Toolbar missing `justify-content: space-between` | ✅ TenantsListView | ❌ IvrsListView already has it |
| 3 | Duplicate / redundant CSS in one file | ✅ .advanced-fields twice in Create | ❌ No equivalent (no Advanced section) |
| 4 | Delete on “default” with no feedback | ✅ List: default tenant | N/A (no default IVR) |
| 5 | normalizeList and modal styles duplicated app-wide | ✅ | ✅ Same: IvrsListView, IvrCreateView, IvrDetailView all have normalizeList; list and detail have modal styles |
| 6 | Edit save: no field-level server error mapping | ✅ Tenant Detail: one generic message | ❌ IVR Detail maps cluster/greetnum to validation and focusFirstError |
| 7 | Required field without validation composable | ✅ Description on Create | Similar: optional fields (cname, name, description) not validated on Create |

So **1, 5, and 7** apply to both; **2, 3, 4** are tenant-only; **6** is tenant-only (IVR does it better).

---

## 1. Duplication: Advanced Fields Config and Logic (Create + Detail)

**Problem**

- `ADVANCED_KEYS`, `ADVANCED_FIELDS`, and the logic that uses them are duplicated between **TenantCreateView** and **TenantDetailView** (~90 lines of identical field config plus `buildAdvancedPayload` / `parseNum`).
- **TenantCreateView** also has `CLUSTER_CREATE_DEFAULTS` and form init; **TenantDetailView** has `syncEditFromTenant` populating the same keys from the API.
- Any change to advanced fields (add/remove/rename, or payload shape) must be done in two places.

**Impact**

- Risk of Create and Edit drifting out of sync (e.g. new API field added only in one view).
- More code to test and maintain.

**Recommendation**

- Extract to a shared module, e.g. `src/constants/tenantAdvanced.js` (or `src/utils/tenantAdvanced.js`):
  - Export `ADVANCED_KEYS`, `ADVANCED_FIELDS`, `CLUSTER_CREATE_DEFAULTS`.
  - Export `buildAdvancedPayload(formAdvanced, ADVANCED_FIELDS)` and a small `parseNum` (or use a shared form util).
- Create and Detail both import from that module; Create uses defaults for initial state, Detail uses API response to fill the same structure.

**IVR equivalent:** IvrCreateView and IvrDetailView duplicate **optionEntries** (the 12 key/tag/alert rows), **ivrPayload()**, **normalizeList()**, and the **destinationGroups** pattern. Same refactor idea: shared `src/constants/ivrDestinations.js` (or similar) for optionEntries and ivrPayload; normalizeList in a shared list/util module.

---

## 2. List View: Toolbar Layout vs IVR / Pattern

**Problem**

- **IvrsListView** uses `justify-content: space-between` on the toolbar so “Create” and the filter input sit at opposite ends.
- **TenantsListView** toolbar only uses `gap: 0.75rem` (no `justify-content: space-between`), so Create and filter stay grouped on the left.
- Pattern doc says toolbar: “Create button (left) + Filter input (right, same line, with `justify-content: space-between`)”.

**Impact**

- Minor UX inconsistency between Tenants and IVRs list headers.

**Recommendation**

- In **TenantsListView.vue**, add `justify-content: space-between` to `.toolbar` so it matches IVR and the pattern.

---

## 3. TenantCreateView: Duplicate `.advanced-fields` CSS

**Problem**

- In **TenantCreateView.vue**, `.advanced-fields` is defined twice in the same `<style scoped>` block:
  - First: `margin-top: 0.5rem;`
  - Second: `display: flex; flex-direction: column; gap: 0.5rem; margin-top: 0.75rem;`
- The second rule overrides the first. The first block is redundant and the differing `margin-top` values are confusing.

**Impact**

- Redundant and confusing styles; possible mistakes if someone edits only the first block.

**Recommendation**

- Remove the first `.advanced-fields` block and keep a single rule with the intended layout and spacing (e.g. `margin-top: 0.5rem` plus flex/gap, consistent with Detail).

---

## 4. List View: Delete on “default” Tenant (No Feedback)

**Problem**

- In **TenantsListView**, `askConfirmDelete('default')` returns early and does nothing: no modal, no toast, no message.
- In **TenantDetailView**, clicking Delete when `isDefault` shows “Cannot delete the default tenant.” in the form.
- So in the list, clicking Delete on the default tenant has no visible feedback.

**Impact**

- User might think Delete is broken for that row.

**Recommendation**

- Option A: In the list, keep the Delete button hidden for the default tenant (already the case), and add a short `aria-label` or tooltip like “Default tenant cannot be deleted” on the “—” cell if desired.
- Option B: If the default tenant ever shows a Delete control, show a toast (e.g. “Default tenant cannot be deleted”) when `askConfirmDelete('default')` is called, so behavior is consistent with the Detail panel message.

---

## 5. Shared Utilities: normalizeList and Modal Styles

**Problem**

- **normalizeList(response)** is implemented in multiple list views (e.g. TenantsListView, IvrsListView) with the same logic. Not tenant-specific but repeated across the app.
- Modal markup and styles (backdrop, dialog, title, body, actions, buttons) are duplicated across TenantsListView, TenantDetailView, and other panels.

**Impact**

- Changes to list response shape or modal design require edits in many files.
- Same pattern as in the IVR technical debt analysis (app-wide).

**Recommendation**

- **normalizeList**: Move to a shared util (e.g. `src/utils/api.js` or `src/utils/listResponse.js`) and use from all list views.
- **Modal**: Consider a shared `DeleteConfirmModal.vue` (or similar) used by list and detail views, with props for title, body text, and confirm/cancel handlers; optionally a shared modal stylesheet or design tokens.

**IVR:** IvrsListView, IvrCreateView, and IvrDetailView each define `normalizeList` and (list/detail) full modal markup and styles. Same duplication.

---

## 6. Edit Panel: Server Error Handling

**Problem**

- **TenantDetailView** `saveEdit` uses a long chain of `err.data?.description?.[0] ?? err.data?.clusterclid?.[0] ?? ...` to pick the first server error. It does not map errors onto specific fields (e.g. show under the Description or CLID field).
- **TenantCreateView** uses `fieldErrors(err)` and maps `errors.pkey` to `pkeyValidation` and shows a general `error` message.

**Impact**

- On edit, user sees one generic save error message, not field-level errors. Acceptable but less consistent with Create if we later add more field-level validation on edit.

**Recommendation**

- Optional improvement: add a small `fieldErrors(err)`-style helper and, for known fields (description, clusterclid, etc.), set field-level error state or show inline errors when the API returns field keys. Lower priority than the items above.
- **IVR does this:** IvrDetailView maps `errors.cluster` and `errors.greetnum` to the validation composables and calls `focusFirstError`. Tenant Detail could follow the same pattern for its editable fields.

---

## 7. Create Panel: Description Required Without Validation Composable

**Problem**

- In **TenantCreateView**, the Description field is required in the template (e.g. `required` on the form or component) but there is no `useFormValidation(description, ...)` and no client-side validation message before submit.
- Submit relies on server validation; if the API returns `description` in the error payload, it’s shown in the general error message but not as a dedicated field error.

**Impact**

- Slight inconsistency with the pkey field (which has validation composable + focus). Low risk.

**Recommendation**

- Either add a minimal validation (e.g. “Description is required”) and use `useFormValidation` for description so behavior matches pkey, or document that only pkey is client-validated and the rest are server-driven. No critical debt.

---

## Summary Table

| # | Issue | Severity | Effort | Panel(s) |
|---|--------|----------|--------|----------|
| 1 | Duplicate ADVANCED_KEYS/FIELDS and payload logic (Create + Detail) | Medium | Medium | Create, Detail |
| 2 | Toolbar missing `justify-content: space-between` | Low | Trivial | List |
| 3 | Duplicate `.advanced-fields` CSS in Create | Low | Trivial | Create |
| 4 | No user feedback when Delete on default tenant (list) | Low | Trivial | List |
| 5 | normalizeList and modal styles duplicated app-wide | Medium | Medium | List, Detail, app |
| 6 | Edit save: no field-level server error mapping | Low | Small | Detail |
| 7 | Description required but no validation composable on Create | Low | Small | Create |

---

## Recommended Order of Work

1. **Quick wins**: Fix toolbar (2), consolidate `.advanced-fields` CSS (3), and optionally add feedback for delete-on-default in list (4).
2. **High value**: Extract tenant advanced config and payload helpers (1) to a shared module.
3. **App-wide**: Address normalizeList and modal reuse (5) in a separate pass across list/detail panels.
4. **Nice-to-have**: Field-level errors on edit (6) and description validation on create (7).

---

*Inspection based on current Tenant and IVR panel implementation and the standardized panel pattern.*
