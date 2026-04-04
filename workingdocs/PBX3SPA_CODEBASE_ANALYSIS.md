# pbx3spa codebase analysis — weaknesses, dead code, technical debt

**Purpose:** Independent pass over the Vue 3 SPA for risk areas, leftover noise, and structural debt. Use with existing docs (**HOLISTIC_ASSESSMENT.md**, **AGENT_HANDOFF_TECHNICAL_DEBT.md**, **PANEL_PATTERN.md**).

**Scope:** `pbx3spa/` only (Vue + Vite + Pinia + Vue Router). API behaviour is out of scope except where the SPA depends on it.

**Date:** 2026-04-04

---

## Executive summary

The SPA is a **large, consistent CRUD shell** around the PBX3 API: shared list/create/detail patterns, `normalizeList`, schema-driven mutability (`useSchema`), sticky list filters, and a central API client. **Strengths** are cohesion of patterns and pragmatic use of sessionStorage for token and tenant context.

**Main gaps:** no automated tests, no ESLint/TypeScript, **coarse-grained authorisation in the router** (binary `admin` gate), **residual debug logging** in a few views, and **inherent duplication** across many similar Vue files (mitigated by shared utils, not eliminated). Several topics are already tracked in workingdocs (permissions roadmap, panel parity, extension provisioning).

---

## 1. Tooling and quality gates

| Area | Finding |
|------|---------|
| **TypeScript** | Not used. JSDoc appears in places (`client.js`, `useSchema.js`) but most code is untyped JS. Refactors and API shape drift are catch-at-runtime only. |
| **Lint / format** | No ESLint, Prettier, or Stylelint in `package.json`. Style relies on convention and manual review. |
| **Tests** | No `*.test.*` / `*.spec.*` files; no Vitest/Jest script. Regressions are manual. |
| **Build** | Vite 6 + `@vitejs/plugin-vue` — modern and appropriate. |

**Debt level:** High for a growing admin surface; lowest-cost wins would be ESLint (Vue essential rules) + Prettier, then optional gradual TS or `vue-tsc` on `.vue` + JSDoc.

---

## 2. Security and auth (SPA-side)

**Strengths**

- Bearer token and base URL live in **sessionStorage** (`stores/auth.js`), limiting persistence vs `localStorage`.
- API client sets `Accept: application/json` and clears credentials on **401**, redirecting to `/login`.

**Weaknesses / notes**

1. **Single ability gate:** `router/index.js` allows all non-public routes only if `auth.can('admin')`. Non-admin users hit `/no-access`. There is **no per-route or per-resource ability** in the SPA yet; future `view_*` / `edit_*` abilities need nav + route guards (see **PERMISSIONS_MINIMAL_DEPLOY_PLAN.md** — Phase 1+).
2. **Full reload on 401:** `window.location.replace('/login')` in `api/client.js` clears Vue state abruptly; acceptable for admin tools but harsh for in-flight edits (user loses unsaved work unless the app adds “dirty” warnings later).
3. **Login uses unauthenticated client:** `LoginView` correctly uses `createApiClient(baseUrl, '')` for `auth/login`; no token leak there.
4. **Dev-only globals:** `main.js` exposes `createApiClient`, `getApiClient`, `useAuthStore` on `window` when `import.meta.env.DEV` — useful for debugging; must never ship enabled in production builds (current guard is correct).

**XSS:** No `v-html` / `innerHTML` usage found in `src/`; user-controlled rich HTML is not a current pattern in this scan.

---

## 3. API client and data layer

**Observations**

- `getApiClient()` ties requests to Pinia auth — correct for post-login usage.
- **GET with query params** is supported via `get(path, { params })` in `request()`; callers must stay consistent.
- Error objects attach `status`, `response` text, and parsed `data` when JSON — aligns with `formErrors.js`.

**Minor debt**

- Duplicated 401 handling across `request`, `getBlob`, and `postFile` in `client.js` — three similar blocks; could be one internal `handleUnauthorized()` helper (cosmetic/maintainability).

---

## 4. State, schema, and caching

- **`useSchema`:** Schema for `/schemas` is cached in a **module-level ref** with a single fetch per session. If the API changes schema without reload, the SPA will not see updates until refresh. Low probability in normal ops; document if operators expect hot schema updates.

---

## 5. UI patterns and duplication (technical debt)

**Already documented elsewhere**

- **Edit panel field coverage** vs API: many detail panels expose a **subset** of updateable fields — see **HOLISTIC_ASSESSMENT.md** and **SESSION_HANDOFF**-style audits.
- **Panel pattern** standardisation: **AGENT_HANDOFF_TECHNICAL_DEBT.md** tracks `normalizeList`, `DeleteConfirmModal`, shared `fieldErrors` — **Create views** generally import `fieldErrors` / `firstErrorMessage` from `@/utils/formErrors` (shared module is in use).

**Remaining structural debt**

1. **Many large single-file views:** List + Create + Detail per resource multiplies similar `<script setup>` blocks (fetch, save, delete, tenant maps). Shared pieces (`tenantAdvanced.js`, `ivrDestinations.js`, composables) help but **do not remove** the file-per-resource cost.
2. **Validation split:** `utils/validation.js` holds named validators; `composables/useFormValidation.js` wraps refs; some resources duplicate patterns — acceptable but easy to drift.
3. **List UX inconsistency:** Most list views use `useStickyFilter` / `useStickySort`; **UsersListView** does not use the sticky filter pattern (small inconsistency if users expect unified list behaviour).

---

## 6. Dead code, debug noise, and “almost dead” paths

| Item | Location | Note |
|------|----------|------|
| **Console logging** | `AgentsListView.vue` | `console.log` for agents/tenants counts; `console.warn` on tenant load failure — should be removed or gated behind `import.meta.env.DEV`. |
| **Console logging** | `LogsListView.vue` | `console.log('Logs API response:', res) // Debug` — clear debug leftover. |
| **Conditional debug** | `FormField.vue`, `FormSelect.vue` | `debugReset` / `watch` logs when empty/`default` — **only when prop set**; safe in production if no view passes `debugReset`. Worth grep before release. |
| **TODO/FIXME markers** | `src/` | No standalone `TODO`/`FIXME` comments found in a repo scan (placeholders like `_XXXXXX` matched earlier greps). |

No obvious **orphaned components** were fully verified without a bundler unused-export analysis; the router imports a large set of views explicitly — unused views would fail to tree-shake only if never imported (none spotted).

---

## 7. Dependencies

| Package | Role |
|---------|------|
| `vue`, `vue-router`, `pinia` | Core — appropriate. |
| `vite`, `@vitejs/plugin-vue` | Build — appropriate. |
| `marked` | **Dev-only** usage: `scripts/render-panel-inventory-html.mjs` — not in runtime bundle. Correct as devDependency. |

**Dependency surface is small** — low supply-chain noise; upside is simplicity, downside is no testing/lint stack.

---

## 8. Product / roadmap alignment (not code defects)

These are **known follow-ups**, not bugs in the SPA alone:

- **Extension provisioning** (MAC, Save vs Commit): documented under **EXTENSION_PROVISIONING_*.md**.
- **Commit / generator bridge:** **CommitButton** calls `syscommands/commit` and `commitstatus` — wiring to instance generator is a system concern; **HOLISTIC_ASSESSMENT.md** discusses operational strain.
- **Certificates / HTTPS:** SPA cert UI plans live in **CERTIFICATES_ADOPTION_PLAN.md**; aligns with pbx3/pbx3api TLS work.

---

## 9. Prioritised recommendations

1. **Remove or dev-gate** `console.log` / debug lines in `AgentsListView.vue` and `LogsListView.vue`.
2. **Add ESLint** (`eslint-plugin-vue`) + **Prettier**; optional **Vitest** for `utils/formErrors.js`, `listResponse.js`, `validation.js`.
3. **Deduplicate 401 handling** in `api/client.js** (small refactor).
4. **When adding non-admin roles:** extend router + nav with granular `can()` checks per **PERMISSIONS_MINIMAL_DEPLOY_PLAN.md** / **ADMIN_PANELS_AND_PERMISSIONS.md**.
5. **Optional:** Add sticky filter to **UsersListView** for parity with other lists.
6. **Longer term:** TypeScript or strict JSDoc + `checkJs` for new files; incremental migration.

---

## 10. Related workingdocs

| Document | Relevance |
|----------|-----------|
| **AGENT_HANDOFF_TECHNICAL_DEBT.md** | Panel pattern status, shared utilities |
| **HOLISTIC_ASSESSMENT.md** | UX, system fit, generator story |
| **PANEL_PATTERN.md** | Target conventions |
| **PERMISSIONS_MINIMAL_DEPLOY_PLAN.md** | Auth evolution |
| **SPA_SHELL_ROADMAP.md** | Shell/navigation roadmap |
| **workingdocs/archive/TECHNICAL_DEBT_*.md** | Historical audits (may overlap) |

---

*This analysis is a point-in-time snapshot; re-run after major refactors or dependency upgrades.*
