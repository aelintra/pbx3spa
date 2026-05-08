# pbx3spa codebase analysis — weaknesses, dead code, technical debt

**Purpose:** Pass over the Vue 3 SPA for risk areas, leftover noise, and structural debt. Use with **HOLISTIC_ASSESSMENT.md**, **AGENT_HANDOFF_TECHNICAL_DEBT.md**, and **PANEL_PATTERN.md**. (A second independent review was merged into this document on 2026-04-04; there is no separate second-opinion file.)

**Scope:** `pbx3spa/` only (Vue + Vite + Pinia + Vue Router). API behaviour is out of scope except where the SPA depends on it.

**Date:** 2026-04-04 (amalgamated)

---

## Executive summary

The SPA is a **large, consistent CRUD shell** around the PBX3 API: shared list/create/detail patterns, `normalizeList`, schema-driven mutability (`useSchema`), sticky list filters, and a central API client. **Strengths** are cohesion of patterns, pragmatic **sessionStorage** for token and tenant context, and a **small runtime dependency surface** (low supply-chain noise).

**Main gaps:** no TypeScript (**by design** for now), **coarse-grained authorisation** in the router (binary `admin` gate), **inherent duplication** across many similar Vue files (mitigated by shared utils, not eliminated), **no component tests** yet, and **production build shape** (single large JS chunk; **lazy loading deferred** until needed — see **Phase H**). **App shell (`AppLayout.vue`):** sidebar **`15.75rem`** + **`--pbx-shell-sidebar-width`**, top bar three-zone layout, **viewport-centered** **`SessionContextChips`** (see **SESSION_HANDOFF** § Shell / topbar, **SPA_SHELL_ROADMAP**). **Phase A** removed dead **`HomeView` / `counter`**, list-view debug **`console.log`**, and **`debugReset`** on form components; optional **`console.error`** remains on some list error paths. **Phase B** centralised **401** handling in **`api/client.js`** via **`clearSessionAndGoLogin()`** (`request`, **`getBlob`**, **`postFile`**). **Phase C** added **ESLint** (flat config, `eslint-plugin-vue` recommended + **`vue/multi-word-component-names` off**), **Prettier** (`.prettierrc.json`), **`npm run lint`** / **`lint:fix`**, **`format`** / **`format:check`**, and formatted **`src/`**; small lint-driven fixes (unused imports, **`DeleteConfirmModal`** `defineProps`, **`HolidayTimersListView`** sort numeric guard, etc.). **Firewall** view toggles use named handlers so Prettier does not emit invalid multi-statement **`@click`** fragments. **Phase D** added **Vitest** (**`vitest.config.js`**, **`npm run test`** / **`test:watch`**) and unit tests for **`formErrors`**, **`listResponse`**, and **`validation`** (`src/utils/*.test.js`, Node environment). **Users** list uses **sticky filter + sort** (Phase E); **user detail/edit** route is still outstanding when the API supports it. **Phase I** added **`ConfirmModal.vue`** (primary / danger variants) and replaced **`window.confirm()`** in **DashboardView**, **CommitButton**, **FirewallView**, and **BackupView**; list deletes still use **`DeleteConfirmModal`**. **Phase J** (applied): **Node 24** LTS pinned via **`.nvmrc`** and **`package.json` `engines`**; **README** updated; **`npm audit fix`** cleared prior **picomatch** / **rollup** advisories (lockfile updated). Several topics are already tracked in workingdocs (permissions roadmap, panel parity, extension provisioning).

**Project stance (2026):** The app is expected to stay **relatively small** (a few more panels at most). **Phase F** (granular SPA permissions) is **deferred until the wider permissions upgrade** with **pbx3api** — do not start Phase F in isolation. **Phase G** (**TypeScript** / strict **`checkJs`**) is **not a near-term goal**: the stack stays **plain JavaScript** so the code stays **easy to read and tinker with**; revisit TS only if maintenance pain justifies it. **Phase H** (**route lazy loading**) is **deferred**: real-world impact (e.g. **cloud** hosting) is unknown until measured; the bundle is **acceptable for now** — add **`import()`** routes when profiling or UX shows it is **worth the complexity**.

---

## 1. Tooling and quality gates

| Area | Finding |
|------|---------|
| **TypeScript** | **Not used — intentional.** Plain JS + Vue SFCs for contributor accessibility. JSDoc appears in places (`client.js`, `useSchema.js`); most code is untyped. **Phase G** (TS / `checkJs`) is **deferred** unless needs change. |
| **Lint / format** | **ESLint 10** + **`eslint-plugin-vue`** (flat **`eslint.config.js`**) + **`eslint-config-prettier`**. **Prettier** with **`.prettierrc.json`** (`semi: false`, `singleQuote: true`). Scripts: **`npm run lint`**, **`lint:fix`**, **`format`**, **`format:check`**. No Stylelint. |
| **Tests** | **Vitest** + **`npm run test`** / **`test:watch`**. **`src/utils/*.test.js`** cover **`formErrors`**, **`listResponse`**, **`validation`**. No Vue component / E2E tests yet. |
| **Build** | Vite 6 + `@vitejs/plugin-vue` — modern and appropriate. **`npm run build`** emits a **single main JS chunk** on the order of **~650 kB** minified (~**150 kB** gzip); Vite warns about the 500 kB threshold. **Route lazy loading** (**Phase H**) is **deferred** until **cloud / real-world** behaviour shows it is needed. Fine for current LAN-style use. |

**Debt level:** Lint/format (Phase C) and **utils** unit tests (Phase D) are in place. Next low-cost wins: more **`src/utils`** or composable tests, optional **`@vue/test-utils`**. **No TS migration planned** for now (see **Project stance** above).

---

## 2. Security and auth (SPA-side)

**Strengths**

- Bearer token and base URL live in **sessionStorage** (`stores/auth.js`), limiting persistence vs `localStorage`.
- API client sets `Accept: application/json` and clears credentials on **401**, redirecting to `/login`.
- **`FieldHelpIcon`** renders help `htext` with **text interpolation** (`{{ help?.htext }}`), not `v-html`, which avoids HTML injection from help content if the API ever stored markup.

**Weaknesses / notes**

1. **Single ability gate:** `router/index.js` allows all non-public routes only if `auth.can('admin')`. Non-admin users hit `/no-access`. Abilities exist on the user object but are **not** used per route or per nav item. **Granular SPA permissions are Phase F** — **deferred until the wider permissions upgrade** with **pbx3api** (see **PERMISSIONS_MINIMAL_DEPLOY_PLAN.md** / **ADMIN_PANELS_AND_PERMISSIONS.md**); do not implement Phase F alone.
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
3. **Confirm vs modal (Phase I applied):** **`ConfirmModal.vue`** covers **DashboardView** (PBX commands), **CommitButton**, **FirewallView** restarts, and **BackupView** create/restore flows; **`DeleteConfirmModal`** remains for list delete confirmations.
4. **Users feature parity:** **`UsersListView`** uses **`useStickyFilter('users')`**, **`useStickySort`** (name / email / abilities), **`ListViewMeta`**, and filter-empty messaging — aligned with other lists. Routes remain **`/users`** and **`/users/new`** only — **no** `users/:id` detail/edit or **`UserDetailView.vue`** until the API exposes stable GET/PUT for a single admin user.

---

## 6. Dead code, debug noise, and unreachable paths

**Phase A cleanup (applied):** Removed `HomeView.vue`, `stores/counter.js`, noisy `console.log` / `console.warn` in `AgentsListView.vue` and `LogsListView.vue`, and the **`debugReset`** prop plus `watch` + `console.log` paths in **`FormField.vue`** and **`FormSelect.vue`**.

**Phase B cleanup (applied):** **`clearSessionAndGoLogin()`** in **`src/api/client.js`**; used for **401** on **`request`**, **`getBlob`**, and **`postFile`**.

**Phase C cleanup (applied):** ESLint + Prettier tooling, **`src/`** formatted, lint-clean tree. **`HolidayTimerDetailView`:** removed unused **`isReadOnly`** helper (was not referenced in the template).

**Phase D cleanup (applied):** **Vitest** with **`vitest.config.js`** (`environment: 'node'`, `include: ['src/**/*.test.js']`, `@` alias). Tests: **`formErrors.test.js`**, **`listResponse.test.js`**, **`validation.test.js`**.

**Phase E cleanup (partial):** **`UsersListView`** — sticky filter + sort + **`ListViewMeta`**; user **detail/edit** route still **not** implemented (API-dependent).

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
| `eslint`, `@eslint/js`, `eslint-plugin-vue`, `eslint-config-prettier`, `globals` | Lint (dev). |
| `prettier` | Format (dev). |
| `vitest` | Unit tests for **`src/utils`** (dev). |

**Runtime dependency surface remains small.** Dev tooling: ESLint, Prettier, Vitest.

---

## 8. Product / roadmap alignment (not code defects)

These are **known follow-ups**, not bugs in the SPA alone:

- **Extension provisioning** (MAC, Save vs Commit): documented under **EXTENSION_PROVISIONING_*.md**.
- **Commit / generator bridge:** **CommitButton** calls `syscommands/commit` and `commitstatus` — wiring to instance generator is a system concern; **HOLISTIC_ASSESSMENT.md** discusses operational strain.
- **Certificates / HTTPS:** **pbx3** `workingdocs/TLS_AND_CERTIFICATES.md` (index), `CERTIFICATES_PANEL_AND_API.md` (panel/API).

---

## 9. Prioritised recommendations

1. **Users (remaining):** when API allows, add **`users/:id`** route and **user detail/edit** view.
2. **Phase H (lazy routes):** **Defer.** Revisit after **cloud** (or other) deployment and **measurement**; adopt **`import()`** when the benefit is **obvious**.
3. **Permissions / Phase F:** **Defer** until the **wider permissions upgrade** (SPA + **pbx3api** together). Then extend router + nav with granular **`can()`** per **PERMISSIONS_MINIMAL_DEPLOY_PLAN.md** / **ADMIN_PANELS_AND_PERMISSIONS.md**.
4. ~~**Optional UX:** shared confirm modal~~ **Done (Phase I):** **`ConfirmModal.vue`** + migrations above.
5. **Optional hygiene:** Remove or dev-gate remaining **`console.error`** in **Agents** / **Logs** list catch blocks if you want a silent console in production.
6. **Expand tests:** more **`utils`** / composables; optional **`@vue/test-utils`** for components.
7. **Phase J (final toolchain pass):** Align **Node.js** with tool **`engines`** (e.g. **`.nvmrc`** + **`package.json` `engines`**) and review **`npm audit`** / upgrades on a schedule (see **Phase J** below).
8. **TypeScript / Phase G:** **No action** unless the codebase or team outgrows plain JS; optional light **JSDoc** on new tricky modules is enough.

---

## 10. Step-by-step worklist (proposed changes)

Work through in order unless you skip an entire phase. **Phase F** is **on hold** until the **wider permissions upgrade** — treat it as one coordinated **pbx3api + pbx3spa** effort, not a standalone SPA task. **Phase G** (**TypeScript**) is **out of scope for now** (stay on plain JS). **Phase H** (**lazy-loaded routes**) is **deferred** until real-world performance (e.g. **cloud**) justifies it. **Phase J** is an optional **final** pass: **Node** alignment and **`npm audit`** hygiene (do after **Phase C** or whenever devDependencies change materially).

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

1. Add devDependencies: `eslint`, `@eslint/js`, `eslint-plugin-vue`, `prettier`, `eslint-config-prettier`, `globals` (flat config; `vue-eslint-parser` is pulled in by the plugin).
2. Add **`eslint.config.js`**: `js.configs.recommended`, `pluginVue.configs['flat/recommended']`, browser **`globals`**, Node **`globals`** for `vite.config.js` / `scripts/`, **`vue/multi-word-component-names`: `off`**, **`eslint-config-prettier`** last; **`ignores`**: `dist`, `node_modules`.
3. Add **`.prettierrc.json`** and **`.prettierignore`** (`dist`, `node_modules`, lockfile).
4. Add scripts: **`lint`** / **`lint:fix`** (`eslint .`), **`format`** / **`format:check`** on `src/**/*.{js,vue,css}`.
5. Run **`npm run format`**, then **`npm run lint`** / **`lint:fix`**, fix remaining errors (unused vars, invalid template expressions if Prettier splits multi-statement `@click`).
6. **`npm run build`** must stay green.
7. Short **Contributing** note in **README** (lint + format before PR).
8. **Commit** e.g. `chore: add eslint and prettier`.

### Phase D — Vitest (optional but valuable)

**Baseline applied:** **`vitest`**, **`vitest.config.js`** (Node env, **`src/**/*.test.js`**, `@` alias), **`npm run test`** / **`test:watch`**, tests for **`formErrors`**, **`listResponse`**, **`validation`**.

1. Add **`vitest`**; for pure-utils tests, **`@vue/test-utils`** is not required.
2. Add **`vitest.config.js`** (e.g. **`environment: 'node'`** for utils-only; merge Vite **`resolve.alias`** if tests import **`@/`**).
3. Add **`"test": "vitest run"`** and **`"test:watch": "vitest"`**.
4. Extend **`src/utils/*.test.js`** or add composable tests as behaviour grows.
5. When you need **component** tests, add **`@vue/test-utils`** and switch or add a Vitest **`environment`** / **`jsdom`** project as appropriate.
6. **Commit** e.g. `test: add vitest and utils tests`.

### Phase E — Users panel parity (optional)

**Baseline applied:** **`UsersListView`** — **`useStickyFilter('users')`**, **`useStickySort`** (default **name**; columns **name**, **email**, **abilities**), **`ListViewMeta`**, filter matches **name / email / abilities / id**, “no match” empty state.

1. **Remaining (API-dependent):** Add **`users/:id`** route, **`UserDetailView.vue`** (or edit view), and API wiring when **pbx3api** exposes stable GET/PUT for a single admin user.
2. **Commit** user detail in a separate change when ready; list parity commit e.g. `feat(users): sticky filter and sort on users list`.

### Phase F — Granular permissions (cross-repo) — **deferred**

**Do not start until** the **wider permissions upgrade** is scheduled; **pbx3api** and **pbx3spa** should move together (abilities, `whoami`, middleware, router, nav).

1. Read **PERMISSIONS_MINIMAL_DEPLOY_PLAN.md** and **ADMIN_PANELS_AND_PERMISSIONS.md** in `pbx3spa/workingdocs/`.
2. **pbx3api:** Add or confirm abilities in `config/abilities.php`, middleware on route groups, and `whoami` payload.
3. **pbx3spa:** Extend `auth.can()` usage — router `beforeEach`, `AppLayout` nav groups, and per-route meta as needed.
4. Add or adjust **NoAccess** / limited home UX for users without panel abilities.
5. **Commit** in each repo with linked messages or a short cross-repo note in workingdocs.

### Phase G — Type safety — **deferred / not planned (plain JS policy)**

**Current decision:** Keep **JavaScript** (no **TypeScript**, no mandatory **`checkJs`**) so the repo stays approachable for contributors and casual tinkerers. The app is not expected to grow into a large front-end codebase.

1. **Optional later:** Revisit only if types would clearly reduce bugs or onboarding cost.
2. If revisiting: prefer incremental **`// @ts-check`** or **`vue-tsc`** on a **small** subset (e.g. **`api/client.js`**) rather than a full migration.
3. Until then, occasional **JSDoc** on public helpers is enough.

### Phase H — Route lazy loading — **deferred**

**Current decision:** Keep **eager** route imports until **cloud** (or other) deployment and **profiling** show that a **~650 kB** (gz **~150 kB**) initial JS payload is a **real problem**. Lazy loading adds **complexity** (chunk boundaries, loading states); it will be **obvious** when operators or metrics need it.

1. When triggered: in **`src/router/index.js`**, replace static component imports with **`() => import('@/views/...vue')`** for routes (or heaviest views first).
2. Run **`npm run build`**, confirm **multiple chunks** and that every route still loads.
3. **Commit** e.g. `perf: lazy-load route components`.

### Phase I — Confirm dialog consistency — **applied**

1. **`src/components/ConfirmModal.vue`** — Teleport, **`useId`** for **`aria-labelledby`**, **`variant`** `primary` | `danger`, optional **`loading`** / slot body (same layout cues as **`DeleteConfirmModal`**).
2. Replaced **`window.confirm()`** in **DashboardView**, **CommitButton**, **FirewallView** (IPv4/IPv6 restart), and **BackupView** (create backup/snapshot, restore backup/snapshot); copy and danger vs primary actions preserved.
3. **BackupView** uses a small **`openGenericConfirm`** helper for the shared modal instance; other views wire **`ConfirmModal`** directly or via local state.

### Phase J — Node engines and dependency audit (final toolchain hygiene)

**Goal:** Remove **`EBADENGINE`** noise from **`npm install`**, align dev/CI on a **supported Node LTS**, and **review or clear** **`npm audit`** findings (especially after adding ESLint/Prettier). This phase does not change product behaviour; it hardens the **developer and CI** story.

**Node line (applied):** **24.x** (Active LTS **Krypton**; official EOL **2028-04-30** per [Node release schedule](https://github.com/nodejs/Release/blob/master/schedule.json)). Chosen for new systems over **22** (EOL **2027-04-30**) to maximise remaining LTS runway.

1. ~~**Pick a Node line**~~ **Done:** **24.x** LTS.
2. **Done:** **`.nvmrc`** at repo root contains **`24`**.
3. **Done:** **`package.json`** **`engines.node`**: **`>=24.0.0 <25`** (tight major band; bump when moving to **26** LTS later).
4. **Done:** **README** § Development — Node **24**, **`.nvmrc`**, **`nvm use`** / **fnm**, CI alignment.
5. **Audit**
   - Run **`npm audit`** (and optionally **`npm audit --production`** if you only care about runtime deps for the built SPA).
   - **Applied:** **`npm audit fix`** (no **`--force`**) updated the lockfile (**rollup** / **picomatch** transitives). Re-run **`npm audit`** periodically after dependency changes; **`npm run lint`**, **`format:check`**, **`test`**, **`build`** should stay green.
   - For any future findings, **fix** where safe, **document** accepted risk, or **defer** with a tracked issue.
6. Re-run **`rm -rf node_modules && npm install`** on **Node 24** — expect **no** **`EBADENGINE`** vs **`package.json`** **`engines`**.
7. Re-run **`npm run lint`**, **`npm run format:check`**, **`npm run build`** after any lockfile change.
8. **Commit** Node pin and, when run, audit-driven **`package-lock.json`** updates (e.g. `chore: npm audit fix lockfile`).

### Verification per phase

Run commands from the **`pbx3spa`** directory. Use **`npm run lint`**, **`npm run format:check`**, and **`npm run test`** after changes that touch **`src/utils`** or shared behaviour. **`npm run build`** plus **browser smoke** against a running API remain the main **end-to-end** gates (no component/E2E harness yet).

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
| `npm run lint` — exit code **0** | Spot-check a few views after large Prettier passes. |
| `npm run format:check` — exit code **0** | — |
| `npm run build` | — |

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

**Phase F — Granular permissions (cross-repo)** — run **only** when the **permissions upgrade** is active.

| Automated | Manual |
|-----------|--------|
| `npm run build` (SPA) | **API:** `GET auth/whoami` (or equivalent) returns **abilities** consistent with policy. |
| | **SPA:** user with **`admin`** (or full ability set) sees expected nav and routes; limited user sees **`/no-access`** or trimmed nav per design. |
| | Run **pbx3api** (and any other service) test/CI suites if the repo defines them. |

**Phase G — Type safety** — **skipped** under current policy; if policy changes, add checks here (e.g. `vue-tsc --noEmit`).

**Phase H — Route lazy loading** — **deferred**; run verification **only** after adopting lazy routes.

| Automated | Manual |
|-----------|--------|
| `npm run build` — inspect **`dist/assets/`**: **multiple** JS chunks. | Hard refresh, log in, visit several **different** routes; Network tab shows lazy chunks loading; no blank views. |

**Phase I — Confirm dialog consistency**

| Automated | Manual |
|-----------|--------|
| `npm run build` | After each migrated surface: **Dashboard** (PBX commands), **Commit**, **Firewall** restarts, **Backup** restore/confirm flows — in-app modal **Cancel** / **OK** behave correctly; no remaining **`window.confirm`** for those flows. |

**Phase J — Node engines and dependency audit**

| Automated | Manual |
|-----------|--------|
| `node -v` matches **`.nvmrc`** (or documented version). | CI image / developer shells use the same Node. |
| `npm install` | Little or no **`EBADENGINE`** output; if warnings remain, document exception. |
| `npm audit` | Review output; **`npm audit fix`** applied where safe; remaining issues documented or ticketed. |
| `npm run lint` / `npm run format:check` / `npm run build` | All exit **0** after any lockfile changes. |

### Checkpoint checklist

| Phase | Done when |
|-------|-----------|
| A | Dead `HomeView` / `counter` removed; no stray debug `console.log` in those views; build green |
| B | Single 401 path in `client.js`; manual auth smoke OK |
| C | `npm run lint` and `npm run format:check` clean; `npm run build` green |
| D | `npm run test` green; utils tests maintained when changing **`formErrors`** / **`listResponse`** / **`validation`** |
| E | List: sticky filter + sort + meta (**done**); detail route/view when API + route exist (**if done**) |
| F | **Deferred** until wider **permissions** upgrade with **pbx3api**; then API + SPA aligned on abilities |
| G | **N/A (deferred):** staying on **plain JS**; revisit TS only if justified |
| H | **Deferred** until **cloud** / measurement shows need; then smaller initial chunk + chunk map OK |
| I | **`ConfirmModal`** + no **`window.confirm`** on Dashboard / Commit / Firewall / Backup flows (**done**) |
| J | **Node 24** pinned; **`npm audit`** clean after **`npm audit fix`**; lockfile committed; re-audit when deps change |

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
