# pbx3spa codebase analysis — weaknesses, dead code, technical debt

**Purpose:** Pass over the Vue 3 SPA for risk areas, leftover noise, and structural debt. Use with **HOLISTIC_ASSESSMENT.md**, **AGENT_HANDOFF_TECHNICAL_DEBT.md**, and **PANEL_PATTERN.md**. (A second independent review was merged into this document on 2026-04-04; there is no separate second-opinion file.)

**Scope:** `pbx3spa/` only (Vue + Vite + Pinia + Vue Router). API behaviour is out of scope except where the SPA depends on it.

**Date:** 2026-04-04 (amalgamated)

---

## Executive summary

The SPA is a **large, consistent CRUD shell** around the PBX3 API: shared list/create/detail patterns, `normalizeList`, schema-driven mutability (`useSchema`), sticky list filters, and a central API client. **Strengths** are cohesion of patterns, pragmatic **sessionStorage** for token and tenant context, and a **small runtime dependency surface** (low supply-chain noise).

**Main gaps:** no automated tests, no ESLint/TypeScript, **coarse-grained authorisation** in the router (binary `admin` gate), **inherent duplication** across many similar Vue files (mitigated by shared utils, not eliminated), and **production build shape** (single large JS chunk; no route lazy loading). **Phase A** removed dead **`HomeView` / `counter`**, list-view debug **`console.log`**, and **`debugReset`** on form components; optional **`console.error`** remains on some list error paths. **Phase B** centralised **401** handling in **`api/client.js`** via **`clearSessionAndGoLogin()`** (`request`, **`getBlob`**, **`postFile`**). **Users** area lacks a detail/edit route and sticky list filters. **Native `window.confirm()`** is used in several flows while lists often use **`DeleteConfirmModal`** — inconsistent UX. Several topics are already tracked in workingdocs (permissions roadmap, panel parity, extension provisioning).

---

## 1. Tooling and quality gates

| Area | Finding |
|------|---------|
| **TypeScript** | Not used. JSDoc appears in places (`client.js`, `useSchema.js`) but most code is untyped JS. Refactors and API shape drift are catch-at-runtime only. |
| **Lint / format** | No ESLint, Prettier, or Stylelint in `package.json`. Style relies on convention and manual review. |
| **Tests** | No `*.test.*` / `*.spec.*` files; no Vitest/Jest script. Regressions are manual. |
| **Build** | Vite 6 + `@vitejs/plugin-vue` — modern and appropriate. **`npm run build`** emits a **single main JS chunk** on the order of **~650 kB** minified (~**150 kB** gzip); Vite warns about the 500 kB threshold. There is **no route-based lazy loading** (`() => import(...)`) yet. Acceptable on a LAN admin app; optional improvement for slow links. |

**Debt level:** High for a growing admin surface; lowest-cost wins would be ESLint (Vue essential rules) + Prettier, then optional gradual TS or `vue-tsc` on `.vue` + JSDoc.

---

## 2. Security and auth (SPA-side)

**Strengths**

- Bearer token and base URL live in **sessionStorage** (`stores/auth.js`), limiting persistence vs `localStorage`.
- API client sets `Accept: application/json` and clears credentials on **401**, redirecting to `/login`.
- **`FieldHelpIcon`** renders help `htext` with **text interpolation** (`{{ help?.htext }}`), not `v-html`, which avoids HTML injection from help content if the API ever stored markup.

**Weaknesses / notes**

1. **Single ability gate:** `router/index.js` allows all non-public routes only if `auth.can('admin')`. Non-admin users hit `/no-access`. Abilities exist on the user object but are **not** used per route or per nav item. Future `view_*` / `edit_*` abilities need nav + route guards (see **PERMISSIONS_MINIMAL_DEPLOY_PLAN.md** — Phase 1+). Introducing non-admin roles will require a coordinated sweep of **router meta**, **AppLayout** `navGroups`, and **pbx3api** unless phased deliberately.
2. **Full reload on 401:** `clearSessionAndGoLogin()` in `api/client.js` clears credentials and uses `window.location.replace('/login')`, which drops SPA state abruptly; acceptable for admin tools but harsh for in-flight edits (user loses unsaved work unless the app adds “dirty” warnings later).
3. **Login / whoami:** `LoginView` uses `createApiClient(baseUrl, '')` for `auth/login` (correct). After login it loads **`auth/whoami`** in a try/catch where failure is ignored. If whoami fails transiently, the user can be **logged in without `user` populated** until navigation triggers another fetch — edge case worth knowing when debugging “half-empty” auth state.
4. **Dev-only globals:** `main.js` exposes `createApiClient`, `getApiClient`, `useAuthStore` on `window` when `import.meta.env.DEV` — useful for debugging; must never ship enabled in production builds (current guard is correct).

**XSS:** No `v-html` / `innerHTML` usage found in `src/` in this scan; user-controlled rich HTML is not a current pattern.

---

## 3. API client and data layer

**Observations**

- `getApiClient()` ties requests to Pinia auth — correct for post-login usage.
- **GET with query params** is supported via `get(path, { params })` in `request()`; callers must stay consistent.
- Error objects attach `status`, `response` text, and parsed `data` when JSON — aligns with `formErrors.js`.
- **401:** Module-level **`clearSessionAndGoLogin()`** is used from **`request`**, **`getBlob`**, and **`postFile`** (Phase B).

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
3. **Confirm vs modal:** **`window.confirm()`** is used in **DashboardView** (PBX commands), **CommitButton**, **FirewallView**, and **BackupView**, while destructive list actions often use **`DeleteConfirmModal`**. Inconsistent affordance; harder to style, a11y-test, or theme than a shared confirmation component.
4. **Users feature parity:** Routes exist for **`/users`** and **`/users/new`** only — **no** `users/:id` detail/edit route and **no** `UserDetailView.vue` (when the API supports editing a single user beyond create, add route + view). **UsersListView** does not use **`useStickyFilter`** / **`useStickySort`**, unlike most other list views — inconsistent list UX and weaker behaviour on large user tables.

---

## 6. Dead code, debug noise, and unreachable paths

**Phase A cleanup (applied):** Removed `HomeView.vue`, `stores/counter.js`, noisy `console.log` / `console.warn` in `AgentsListView.vue` and `LogsListView.vue`, and the **`debugReset`** prop plus `watch` + `console.log` paths in **`FormField.vue`** and **`FormSelect.vue`**.

**Phase B cleanup (applied):** **`clearSessionAndGoLogin()`** in **`src/api/client.js`**; used for **401** on **`request`**, **`getBlob`**, and **`postFile`**.

| Item | Location | Note |
|------|----------|------|
| **Console on error paths** | `AgentsListView.vue`, `LogsListView.vue` | `console.error` in catch blocks — optional to remove or dev-gate; UI already surfaces errors via `error` / toast patterns. |
| **TODO/FIXME markers** | `src/` | No standalone `TODO`/`FIXME` comments found in a repo scan (placeholders like `_XXXXXX` in copy/validation matched greps only). |

All routed views are imported explicitly from **`router/index.js`**. No other orphaned views were identified without a full bundler unused-export pass.

---

## 7. Dependencies

| Package | Role |
|---------|------|
| `vue`, `vue-router`, `pinia` | Core — appropriate. |
| `vite`, `@vitejs/plugin-vue` | Build — appropriate. |
| `marked` | **Dev-only** usage: `scripts/render-panel-inventory-html.mjs` — not in runtime bundle. Correct as devDependency. |

**Dependency surface is small** — low supply-chain noise; upside is simplicity, downside is no testing/lint stack in the repo today.

---

## 8. Product / roadmap alignment (not code defects)

These are **known follow-ups**, not bugs in the SPA alone:

- **Extension provisioning** (MAC, Save vs Commit): documented under **EXTENSION_PROVISIONING_*.md**.
- **Commit / generator bridge:** **CommitButton** calls `syscommands/commit` and `commitstatus` — wiring to instance generator is a system concern; **HOLISTIC_ASSESSMENT.md** discusses operational strain.
- **Certificates / HTTPS:** SPA cert UI plans live in **CERTIFICATES_ADOPTION_PLAN.md**; aligns with pbx3/pbx3api TLS work.

---

## 9. Prioritised recommendations

1. **Add ESLint** (`eslint-plugin-vue`) + **Prettier**; optional **Vitest** for `utils/formErrors.js`, `listResponse.js`, `validation.js`.
2. **Users:** add **sticky filter** (and sort if desired) to **UsersListView**; when API allows, add **user detail/edit** route and view.
3. **Optional:** Vue Router **lazy imports** per route to shrink initial JS and silence chunk-size warnings.
4. **When adding non-admin roles:** extend router + nav with granular `can()` checks per **PERMISSIONS_MINIMAL_DEPLOY_PLAN.md** / **ADMIN_PANELS_AND_PERMISSIONS.md**.
5. **Longer term:** TypeScript or strict JSDoc + `checkJs`; optional **shared confirm modal** to replace scattered `window.confirm()`.
6. **Optional hygiene:** Remove or dev-gate remaining **`console.error`** in **Agents** / **Logs** list catch blocks if you want a silent console in production.

---

## 10. Step-by-step worklist (proposed changes)

Work through in order unless you skip an entire phase. All steps are **pbx3spa-only** except **Phase F**, which requires **pbx3api** (and possibly policy docs) in lockstep.

### Phase A — Quick hygiene (same day)

1. **Remove dead starter code**
   - Delete `src/views/HomeView.vue` and `src/stores/counter.js` (nothing in the router references them; authenticated home is `DashboardView`).
   - Run `npm run build` and smoke-test login → dashboard.
2. **Remove debug logging**
   - In `src/views/AgentsListView.vue`, remove or wrap in `if (import.meta.env.DEV)` the `console.log` lines and consider downgrading or removing the tenant-load `console.warn` (or replace with user-visible toast only if the product needs it).
   - In `src/views/LogsListView.vue`, remove the `console.log` for the API response.
3. **Optional grep:** `rg "console\.(log|debug)" src/` and confirm remaining calls are intentional or dev-gated.
4. **Commit** e.g. `chore: remove dead starter views and debug logging`.

### Phase B — API client tidy-up

1. Open `src/api/client.js`.
2. Extract a single internal helper (e.g. `function clearSessionAndGoLogin()`) that performs the repeated **401** behaviour: `useAuthStore().clearCredentials()` and `window.location.replace('/login')`.
3. Call that helper from `request`, `getBlob`, and `postFile` wherever `res.status === 401`.
4. Run `npm run build` and smoke-test login + one authenticated API call + forced 401 (e.g. revoke token server-side or use expired token) if feasible.
5. **Commit** e.g. `refactor(api): dedupe 401 handling in client`.

### Phase C — ESLint + Prettier

1. Add devDependencies: `eslint`, `eslint-plugin-vue`, `vue-eslint-parser`, `prettier`, and optionally `eslint-config-prettier` to avoid rule clashes.
2. Add `eslint.config.js` (flat config) or `.eslintrc.cjs` with Vue 3 recommended rules and `parserOptions` for ESM; set `env` / `globals` for browser if needed.
3. Add `.prettierrc` (or `prettier` key in `package.json`) matching project style (semicolons, quotes — match existing files).
4. Add scripts to `package.json`: e.g. `"lint": "eslint src --ext .vue,.js"`, `"format": "prettier --write ."` (scope to `src` if you prefer).
5. Run `npm run lint`, fix issues in batches (or `--fix` where safe).
6. Add a short **Contributing** note in **README** or this doc: run lint before PR (optional).
7. **Commit** e.g. `chore: add eslint and prettier`.

### Phase D — Vitest (optional but valuable)

1. Add `vitest` and `@vue/test-utils` only if you plan component tests later; for pure-utils tests, `vitest` alone is enough.
2. Add `vitest.config.js` with Vue/Vite alignment (or reuse Vite config via `vitest/config`).
3. Add `"test": "vitest run"` and optionally `"test:watch": "vitest"`.
4. Write first tests for **`src/utils/formErrors.js`** (`fieldErrors`, `firstErrorMessage`) and **`src/utils/listResponse.js`** (`normalizeList`) — highest ROI, no DOM.
5. Optionally add tests for **`src/utils/validation.js`** spot-checks.
6. **Commit** e.g. `test: add vitest and utils tests`.

### Phase E — Users panel parity (optional)

1. Open `src/views/UsersListView.vue`.
2. Import `useStickyFilter` (and `useStickySort` if the table should match other lists) from `@/composables/useStickyFilter.js`, using a stable id such as `'users'`.
3. Wire filter UI to the same toolbar pattern as other list views (see e.g. `AgentsListView.vue`).
4. Manual test: filter persists across navigation and refresh behaviour matches other lists.
5. **Later (API-dependent):** Add `users/:id` route, `UserDetailView.vue` (or edit view), and API wiring when **pbx3api** exposes stable GET/PUT for a single admin user.
6. **Commit** in logical chunks e.g. `feat(users): sticky filter on users list` then user detail when ready.

### Phase F — Granular permissions (later; cross-repo)

1. Read **PERMISSIONS_MINIMAL_DEPLOY_PLAN.md** and **ADMIN_PANELS_AND_PERMISSIONS.md** in `pbx3spa/workingdocs/`.
2. **pbx3api:** Add or confirm abilities in `config/abilities.php`, middleware on route groups, and `whoami` payload.
3. **pbx3spa:** Extend `auth.can()` usage — router `beforeEach`, `AppLayout` nav groups, and per-route meta as needed.
4. Add or adjust **NoAccess** / limited home UX for users without panel abilities.
5. **Commit** in each repo with linked messages or a short cross-repo note in workingdocs.

### Phase G — Type safety (longer term)

1. Enable **`// @ts-check`** or migrate `src` to TypeScript incrementally (rename files, add `vue-tsc`).
2. Start with **`api/client.js`** and **`utils/*.js`** where API contracts matter most.
3. Keep scope small per PR to avoid a Big Bang migration.

### Phase H — Route lazy loading (optional)

1. In `src/router/index.js`, replace static component imports with `() => import('@/views/...vue')` for list/create/detail routes (or at least for heavier views) to split chunks and reduce initial parse time.
2. Run `npm run build` and confirm chunk layout and that all routes still load.
3. **Commit** e.g. `perf: lazy-load route components`.

### Phase I — Confirm dialog consistency (optional, later)

1. Introduce a small reusable **confirm modal** composable or component (match **DeleteConfirmModal** patterns).
2. Replace **`window.confirm()`** in **DashboardView**, **CommitButton**, **FirewallView**, and **BackupView** incrementally; keep copy and danger styling per action.
3. **Commit** in small PRs per area to ease review.

### Verification per phase

Run commands from the **`pbx3spa`** directory. Until **Phase C** (lint) and **Phase D** (Vitest) exist, **`npm run build`** plus **browser smoke** against a running API are the main gates.

**Any change under `src/`**

| Check | Command / action |
|--------|-------------------|
| Production build | `npm run build` (must succeed, no Rollup errors) |
| Dev boot (optional) | `npm run dev` — app loads; no immediate console errors on first paint |

**Phase A — Quick hygiene**

| Automated | Manual |
|-----------|--------|
| `npm run build` | After login, land on **dashboard** (`/`). DevTools: no failed dynamic imports / missing chunks. |
| Optional: `rg "console\.(log\|debug)" src/` | Expect **no matches** in `src/` after Phase A hygiene (unless new debug is added). |

**Phase B — API client 401 dedupe**

| Automated | Manual |
|-----------|--------|
| `npm run build` | Log in; open a panel that fetches data (e.g. tenants). |
| | **401:** force an unauthenticated response (revoke tokens for current user, clear `sessionStorage` token, or use an expired token) and trigger **JSON** `get`/`post`/`put`/`delete` — expect **clear credentials** and redirect to **`/login`**. |
| | If the app uses them, repeat for a path that hits **`getBlob`** or **`postFile`** so all three 401 branches are exercised. |

**Phase C — ESLint + Prettier**

| Automated | Manual |
|-----------|--------|
| `npm run lint` — exit code **0** | Spot-check formatted files match team expectations. |
| `npm run build` | — |
| Optional: add `"format:check": "prettier --check src"` (or equivalent) and run it | — |

**Phase D — Vitest (optional)**

| Automated | Manual |
|-----------|--------|
| `npm run test` / `vitest run` — all tests pass | — |
| `npm run build` | — |

**Phase E — Users panel parity**

| Automated | Manual |
|-----------|--------|
| `npm run build` | **Sticky filter:** set filter → navigate to another route → return to **Users** — filter matches behaviour of lists that already use `useStickyFilter` (e.g. Agents). |
| | **Sort:** if added, persistence matches other sorted lists. |
| **User detail/edit (when implemented):** `npm run build` | Open **`/users/:id`** from list; save/cancel; no router errors. |

**Phase F — Granular permissions (cross-repo)**

| Automated | Manual |
|-----------|--------|
| `npm run build` (SPA) | **API:** `GET auth/whoami` (or equivalent) returns **abilities** consistent with policy. |
| | **SPA:** user with **`admin`** (or full ability set) sees expected nav and routes; limited user sees **`/no-access`** or trimmed nav per design. |
| | Run **pbx3api** (and any other service) test/CI suites if the repo defines them. |

**Phase G — Type safety**

| Automated | Manual |
|-----------|--------|
| Whatever you adopt: e.g. `vue-tsc --noEmit`, `tsc --noEmit`, or build with **`checkJs`** | Fix reported diagnostics until clean (or document suppressions). |
| `npm run build` | — |

**Phase H — Route lazy loading**

| Automated | Manual |
|-----------|--------|
| `npm run build` — inspect **`dist/assets/`**: **multiple** JS chunks (not a single monolithic app bundle only). | Hard refresh, log in, visit several **different** routes; Network tab shows lazy chunks loading; no blank views. |

**Phase I — Confirm dialog consistency**

| Automated | Manual |
|-----------|--------|
| `npm run build` | After each migrated surface: **Dashboard** (PBX commands), **Commit**, **Firewall** restarts, **Backup** restore/confirm flows — in-app modal **Cancel** / **OK** behave correctly; no remaining **`window.confirm`** for those flows. |

### Checkpoint checklist

| Phase | Done when |
|-------|-----------|
| A | Dead `HomeView` / `counter` removed; no stray debug `console.log` in those views; build green |
| B | Single 401 path in `client.js`; manual auth smoke OK |
| C | `npm run lint` clean (or documented exceptions) |
| D | `npm run test` green (if adopted) |
| E | Users list matches sticky-filter pattern; user detail when API + route exist (if done) |
| F | API + SPA aligned on abilities (when you start non-admin users) |
| G | Policy decided: TS vs JSDoc + checkJs |
| H | Smaller initial chunk or acceptable chunk map (if adopted) |
| I | Critical actions use in-app confirm (if adopted) |

---

## 11. Related workingdocs

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
