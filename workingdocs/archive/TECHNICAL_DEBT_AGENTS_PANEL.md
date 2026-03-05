# Technical Debt: Agents Panel

**Scope:** `AgentsListView.vue`, `AgentCreateView.vue`, `AgentDetailView.vue`  
**Date:** 2026-02-03

---

## Summary

The Agents panel is largely aligned with the pattern (shared `normalizeList`, `DeleteConfirmModal`, form components, stay-on-create-and-reset, queue normalization). Remaining debt is **validation and error handling in Detail**, **optional cluster resolution in Detail**, **debug leftovers in Create**, **duplication between Create and Detail**, and **minor consistency nits**.

---

## 1. AgentDetailView – Validation & error handling

### 1.1 No validation composable on edit fields

**Pattern:** Edit panels should use `useFormValidation` for editable fields and pass `:error`, `:touched`, `@blur` to form components so validation and focus work consistently.

**Current:** Only inline validation in `saveEdit()` for password (1001–9999). Tenant (cluster), Name, and Password have no `useFormValidation`, no `:error`/`:touched`, no `@blur`.

**Debt:**

- No blur-time validation on Edit.
- No field-level error display from composable.
- Submit can send invalid data until the single inline check runs.

**Recommendation:** Add `useFormValidation(editCluster, validateTenant)`, `useFormValidation(editName, validateAgentName)`, `useFormValidation(editPasswd, validateAgentPasswd)`. In the template, pass `:error`, `:touched`, `@blur` to the Tenant, Name, and Password controls. In `saveEdit`, call `validateAll(...)` and use `focusFirstError` before submitting; remove or keep the inline passwd check as a second guard if desired.

### 1.2 API errors not mapped to fields

**Pattern:** When the API returns field-level validation errors, map them to the validation composables and use `focusFirstError` so the user sees which field failed.

**Current:** In `saveEdit` catch we only set `saveError.value = firstErrorMessage(err, '...')`. We do not call `fieldErrors(err)` or set `*Validation.touched.value` / `*Validation.error.value`, and we do not call `focusFirstError`.

**Recommendation:** In the catch block, call `fieldErrors(err)`; for each key (`cluster`, `name`, `passwd`, `queue1`, …) set the corresponding validation’s `touched` and `error`; then `await nextTick()` and `focusFirstError(validations, ...)` so the first invalid field is focused and shows the message.

---

## 2. AgentDetailView – Cluster (tenant) resolution on load

**Pattern:** When the API may return tenant as `shortuid` (or mixed), resolve it to tenant **pkey** before setting the tenant dropdown, so the dropdown always shows pkey (e.g. "default") and not raw shortuid.

**Current:** We set `editCluster.value = agent.value?.cluster ?? 'default'` with no resolution. The Agent API validates `cluster` as `exists:cluster,pkey`, so today the stored value is usually tenant pkey. If the API or a join ever returns shortuid, the dropdown would show shortuid.

**Debt:** Inconsistency with other panels (e.g. ExtensionDetailView), which resolve cluster/shortuid to pkey when loading. No resolution makes the panel fragile if the API shape changes.

**Recommendation:** In Detail, add a `clusterToTenantPkey` (or `tenantShortuidToPkey`) computed map from tenants (shortuid/id → pkey), same as in List and other Detail views. When loading the agent, set:

```js
const clusterRaw = agent.value?.cluster ?? 'default'
editCluster.value = clusterToTenantPkey.value.get(String(clusterRaw)) ?? clusterRaw
```

(Or equivalent with a plain object map.) Then the dropdown always shows tenant pkey.

---

## 3. AgentCreateView – Debug / reset leftovers

**Current:**

- `DEBUG_AGENT_RESET = false` and `debug()` used only when that flag is true.
- Form components receive `:debug-reset="DEBUG_AGENT_RESET"` and `:input-key="fieldsKey"`.

**Debt:** Debug code and props are harmless when the flag is false but add noise and are agent-specific. `inputKey` is a legitimate pattern for forcing re-mount on reset; `debugReset` is only for tracing.

**Recommendation:**

- Remove `DEBUG_AGENT_RESET`, `debug()`, and all `:debug-reset` bindings for a cleaner production view; or keep them and document that they are for debugging form-reset only.
- Keep `:input-key="fieldsKey"`; it is part of the documented “stay on create and reset” pattern.

---

## 4. Duplication between Create and Detail

**Current:** Both views implement:

- **Tenant → shortuid:** `tenantShortuid` computed (resolve selected tenant pkey to shortuid for queue filtering).
- **Queue options:** `queueOptionsForTenant` (filter queues by `q.cluster === tenantShortuid`).
- **Queue normalization:** Detail has `normalizeQueueFromApi` and `normalizeQueueForSave`; Create uses ad hoc `queue1.value?.trim() || null` (and does not normalize `'-'`/`'None'` to `null`).

**Debt:** Logic is duplicated and could drift (e.g. Create not normalizing `'-'`/`'None'` on submit).

**Recommendation:**

- Extract shared helpers (and optionally a small composable), e.g.:
  - `displayQueue(v)` (list/readonly)
  - `normalizeQueueFromApi(v)`
  - `normalizeQueueForSave(v)`
  - Optionally: `useAgentQueues(tenantRef, tenants, queues)` returning `tenantShortuid`, `queueOptionsForTenant`.
- Use the same `normalizeQueueForSave` in Create when building the POST body so empty/`'-'`/`'None'` consistently become `null`.

---

## 5. Minor consistency items

### 5.1 List: tenant map shape

**Current:** `clusterToTenantPkey` is a `Map` and we use `.get(String(c))`.

**Pattern doc:** Uses a plain object and `map[key]`.

**Debt:** Purely stylistic; both are correct.

**Recommendation:** Optional: switch to a plain object and bracket notation to match the pattern doc and some other list views.

### 5.2 List: `normalizeList(tenantsRes, 'tenants')`

**Current:** Second argument is string `'tenants'`.

**API:** `listResponse.js` accepts `normalizeList(response, resourceKey)` with `resourceKey` as a string. So this is correct.

**Debt:** None.

### 5.3 DeleteConfirmModal props

**Current:** List and Detail use `title="Delete agent?"` and a `#body` slot; they do not pass `body-text`, `confirm-label`, `cancel-label`, `loading-label`.

**Pattern:** Doc shows both `body-text` and slot; other panels may pass the full set of labels.

**Debt:** If the shared component has defaults, this is fine; only a small inconsistency in how props are used across panels.

**Recommendation:** Optional: pass the same set of props as other panels for consistency (e.g. `confirm-label="Delete"`, `loading-label="Deleting…"`).

---

## 6. What is already in good shape

- **List:** Uses shared `normalizeList`, `firstErrorMessage`, `DeleteConfirmModal`; toolbar with Create + filter and `justify-content: space-between`; name column not a link; only Edit action links to detail; filter and sort; `displayQueue` for Q1/Q2.
- **Create:** Uses form components, `useFormValidation` for pkey/cluster/name/passwd, `validateAll` + `focusFirstError`, `fieldErrors` + `firstErrorMessage`, stay-on-create with reset and `fieldsKey`, queue section with tenant-scoped options and `empty-text="None"`, Cancel to list.
- **Detail:** Uses form components, Save/Cancel/Delete in `.edit-actions`, red Delete button, `DeleteConfirmModal`, Identity (readonly pkey + editable cluster/name/passwd), Queues section with tenant-scoped options and `normalizeQueueFromApi` / `normalizeQueueForSave`, no shortuid/id in Identity (correct for Agent).

---

## 7. Priority order for cleanup

1. **High:** Add validation composables and API error mapping in AgentDetailView (validation + focusFirstError).
2. **Medium:** Resolve cluster to tenant pkey when loading agent in Detail (defensive and consistent with other panels).
3. **Medium:** Use shared queue normalization in Create (and optionally extract shared queue helpers/composable).
4. **Low:** Remove or document debug props and `DEBUG_AGENT_RESET` in Create.
5. **Low:** Optional consistency: List tenant map style, DeleteConfirmModal prop set.
