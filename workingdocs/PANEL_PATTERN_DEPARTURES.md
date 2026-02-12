# Panel Pattern Fidelity Audit

**Date:** 2026-02-03  
**Scope:** All CRUD panels in pbx3spa (Tenants, Extensions, Trunks, Queues, Agents, Routes, IVRs, Inbound Routes).  
**Reference:** `workingdocs/PANEL_PATTERN.md`

This document records departures from the standardized panel pattern. Items marked **MUST FIX** should be corrected for full pattern compliance; others are optional or acceptable exceptions.

---

## Summary

| Panel | List | Create | Edit/Detail | Main departures |
|-------|------|--------|-------------|-----------------|
| Tenants | ✓ | ✓ | ✓ | None |
| Extensions | ✓ | ✓ | ✓ | Runtime subsection view/edit toggle; Identity labels differ (Ext, SIP Identity) |
| Trunks | ✓ | ✓ | ✓ | None |
| Queues | ✓ | ✓ | ✓ | None |
| Agents | ✓ | ✓ | ⚠ | **Tenant resolution missing in Edit** |
| Routes | ✓ | ✓ | ✓ | None |
| IVRs | ✓ | ✓ | ✓ | IVR destination grid uses raw `<label>`/`<select>`/`<input>` |
| Inbound Routes | ✓ | ✓ | ✓ | None |

---

## 1. Tenant (cluster) resolution in Edit views

**Pattern:** When loading a resource in the Edit panel, resolve `resource.cluster` (which may be tenant **shortuid**) to tenant **pkey** via a shortuid→pkey map before setting the form value. Options for the Tenant dropdown must be tenant **pkey** only. Do not set `editCluster = resource.cluster` directly.

| View | Compliant? | Notes |
|------|------------|--------|
| QueueDetailView | ✓ | Uses `tenantShortuidToPkey` and `editCluster.value = tenantShortuidToPkey.value[clusterRaw] ?? clusterRaw` |
| IvrDetailView | ✓ | Uses `tenantShortuidToPkey` and resolves on load |
| ExtensionDetailView | ✓ | Uses `clusterToTenantPkey` Map and `tenantPkeyDisplay(ext?.cluster)` |
| TrunkDetailView | ✓ | Uses `clusterToTenantPkey` and `tenantPkeyDisplay(trunk.value?.cluster)` |
| RouteDetailView | ✓ | Uses `clusterToTenantPkey` and `tenantPkeyDisplay(r.cluster)` |
| InboundRouteDetailView | ✓ | Uses `clusterToTenantPkey` and `tenantPkeyDisplay(r.cluster)` |
| **AgentDetailView** | **✗** | **Departure:** Sets `editCluster.value = agent.value?.cluster ?? 'default'` with no resolution. If the API returns `cluster` as shortuid, the Tenant dropdown will show shortuid instead of tenant pkey. **MUST FIX:** Add `tenantShortuidToPkey` (or equivalent) and resolve on load: `editCluster.value = tenantShortuidToPkey.value[clusterRaw] ?? clusterRaw`. |
| TenantDetailView | N/A | No tenant dropdown (resource is the tenant) |

---

## 2. List view: primary key / name column and Edit link

**Pattern:** The primary key or name column must be **plain text** (not a link). Only the **Edit action** (icon/button in the Edit column) must link to the Edit panel.

| View | Name column | Edit link only |
|------|-------------|-----------------|
| All List views | ✓ | ✓ First column is `{{ item.pkey }}` or similar (plain text); Edit column has sole `router-link` to `*-detail` |

No departures.

---

## 3. List view: normalizeList and DeleteConfirmModal

**Pattern:** Use shared `normalizeList` from `@/utils/listResponse.js` for list fetches. Use shared `<DeleteConfirmModal>` for delete confirmation; no inline Teleport/modal markup.

| View | normalizeList | DeleteConfirmModal |
|------|---------------|--------------------|
| All List views | ✓ Import and use shared | ✓ Used |
| All Detail views with Delete | — | ✓ Used |

No departures. (No local `normalizeList` in any view.)

---

## 4. Create panel: heading and action buttons

**Pattern:** Heading = "Create {resource}" (singular, lowercase, e.g. "Create queue"). Action buttons (Create, Cancel) at **both** top and bottom of form.

| View | Heading | Top + bottom actions |
|------|---------|----------------------|
| TenantCreateView | "Create tenant" | ✓ |
| ExtensionCreateView | "Create extension" | ✓ |
| TrunkCreateView | "Create trunk" | ✓ |
| QueueCreateView | "Create queue" | ✓ |
| AgentCreateView | "Create agent" | ✓ |
| RouteCreateView | "Create route" | ✓ |
| IvrCreateView | "Create IVR" | ✓ (IVR is acronym) |
| InboundRouteCreateView | "Create inbound route" | ✓ |

No departures.

---

## 5. Edit panel: heading and action buttons

**Pattern:** Heading = "Edit {Resource} {displayName}". Three buttons (Save, Cancel, Delete) at **both** top and bottom. Delete uses class `action-delete` (red). Use DeleteConfirmModal for delete confirmation.

| View | Heading | Save/Cancel/Delete top+bottom | DeleteConfirmModal |
|------|----------|-------------------------------|--------------------|
| All Detail views | ✓ | ✓ | ✓ |

No departures.

---

## 6. Form components and layout

**Pattern:** Use FormField, FormSelect, FormToggle, FormReadonly for all fields. Use class `form-fields` and one row per field. No raw `<label>` + `<input>` / `<select>` for fields that the shared components can represent. No table-based form layout.

| View | Departure |
|------|-----------|
| **IvrDetailView** (and IvrCreateView) | **Departure:** The IVR **destination grid** (key → action/tag/alert) uses raw `<label>`, `<select>`, and `<input>` instead of FormField/FormSelect. Pattern says use shared form components for every field. This is a special-case grid layout (many rows keyed by option key); refactoring to FormField/FormSelect per row would need a consistent grid and may be deferred. |
| All other Create/Detail views | ✓ Use FormField, FormSelect, FormToggle, FormReadonly |

---

## 7. Edit panel: Identity section and optional fields

**Pattern:** Identity order: (1) Primary identifier (FormReadonly), (2) Local UID if API returns it, (3) KSUID if API returns it, (4) other read-only-at-edit fields, (5) Tenant, (6) Description, etc. Use `readonly-identity` class for low-light. Show shortuid/id only if the API returns them.

| View | Notes |
|------|--------|
| ExtensionDetailView | Uses labels "Ext", "SIP Identity" instead of "Primary identifier", "Local UID" — acceptable resource-specific labels. Shows MAC address, Device as readonly identity (API-specific). |
| IvrDetailView | Identity FormReadonly components do not use class `readonly-identity` on pkey/shortuid/id in snippet checked; verify all immutable identity fields have the class. |
| Others | Compliant or resource-specific (e.g. Queue "Queue name", Agent "Agent number") |

No mandatory fixes; optional consistency pass for `readonly-identity` and label wording.

---

## 8. Extension Detail: Runtime subsection

**Pattern:** Single always-edit form. No separate "view" mode or extra Edit button for the main form.

| View | Departure |
|------|-----------|
| **ExtensionDetailView** | **Departure:** Contains a **Runtime** section (cfim, cfbs, ringdelay) with its own view/edit toggle: when not editing, a dl is shown and an "Edit runtime" button toggles to a small form. Pattern prefers one always-edit form. This is a secondary edit area on the same page (same panel), not a fourth panel. Acceptable as a documented exception: Runtime is a separate API surface and is edited in-place with its own Save/Cancel. |

---

## 9. API field parity

**Pattern:** Every field the API accepts (controller updateableColumns / validation rules) must have a form control on Create and/or Edit. No omitted fields.

Audit was not re-run per-controller for this document. Assumption: panels recently refactored (Tenants, IVRs, Routes, Inbound Routes, Trunks, Extensions, Queues, Agents) were checked for field parity during refactor. For any new or changed API, run the Field parity checklist in PANEL_PATTERN.md.

---

## 10. List view: filter and sort

**Pattern:** List toolbar includes Create button and filter. Sortable columns are optional but used in refactored lists.

| View | Filter | Sort |
|------|--------|------|
| All 8 List views | ✓ | ✓ (where implemented) |

No departures.

---

## Action items

1. **MUST FIX — AgentDetailView tenant resolution:** Add `tenantShortuidToPkey` (or reuse a Map from tenants: shortuid→pkey, pkey→pkey). When loading the agent, set `editCluster.value = tenantShortuidToPkey.value[clusterRaw] ?? clusterRaw` instead of `agent.value?.cluster ?? 'default'`. Ensures Tenant dropdown shows tenant pkey when API returns shortuid.
2. **Optional — IvrDetailView / IvrCreateView:** Replace raw `<label>`, `<select>`, `<input>` in the destination grid with FormField/FormSelect (or document the grid as an accepted exception in the pattern).
3. **Optional — ExtensionDetailView Runtime:** Document in pattern that a Detail panel may contain a secondary edit subsection (e.g. Runtime) with its own view/edit toggle when the API surface is separate.
4. **Optional — Identity labels:** Standardise Identity section labels (e.g. "Primary identifier" vs "Queue name", "Ext", "Agent number") if product wants strict consistency; pattern allows display name for the resource.

---

## Compliance checklist (per panel, for future refactors)

- [ ] List: normalizeList, DeleteConfirmModal, filter, sort; name column plain text; Edit link only in Edit column.
- [ ] Create: "Create {resource}" heading; Create/Cancel at top and bottom; FormField/FormSelect/FormToggle; all API fields; useFormValidation where needed; tenant options from API (pkey).
- [ ] Edit: "Edit {Resource} {name}" heading; Save/Cancel/Delete at top and bottom; DeleteConfirmModal; action-delete class; Identity (pkey, shortuid if present, id if present, Tenant with **resolution**, then editable); Tenant dropdown options = pkey only; **resolve** resource.cluster to pkey when loading; form-fields, no raw label+input for standard fields.
