# Project plan: PBX3 admin frontend (Vue stack)

Discrete job steps. Each step is **testable**, **sign-off-able**, and **committable** before moving to the next. No big bang; one step at a time so we don’t carry multiple untested issues forward.

---

## Current state (for the next chat)

**See SESSION_HANDOFF.md** for done, next steps, and TODO. It is the single source of current state. Primary branch: **`main`** (pbx3spa, pbx3api). Schema yardstick: **pbx3/full_schema.sql**. **Git:** SPA commits live in the **`pbx3spa`** repo only (`pbx3-master` is not a git root).

**User guides (MkDocs):** Operator/installer how-tos are **out of scope** for this plan and for **`workingdocs/`** as published content. Target: separate **`pbx3-docs`** site (MkDocs Material + GitHub Pages). **Content map:** **pbx3/workingdocs/USER_GUIDES_MKDOCS_CONTENT_MAP.md**; tracked in **pbx3/workingdocs/TODO.md**.

**Done – Panel navigation + Asterisk editor UX:** **`PanelBackLink.vue`** provides the top **`← {Parent}`** link on resource detail/create panels, user create, Asterisk file detail, system globals, and network settings (see **SESSION_HANDOFF** § Done). **Asterisk file** Save/Cancel use the same **`.edit-actions`** button styling as other detail forms.

**Parked:** Backups — review after first CRUD set; behaviour may depend on PBX3 internals.

**Later (API-dependent):** Admin user management panel (admins only; API needs stronger user/privilege support first). Pattern: **workingdocs/ADMIN_PANELS_AND_PERMISSIONS.md**. Minimal rollout: **workingdocs/PERMISSIONS_MINIMAL_DEPLOY_PLAN.md** (Phase 0: SPA `can('admin')`, route guard, optional nav gate; Phase 1 later). **Auth rules for agents:** **workingdocs/AUTH_PATTERNS.md** — follow when touching login, tokens, whoami, or guards; preserves 2FA, self-service, and centralized auth options. **Help messages:** Done — API exposes tt_help_core (helpcore resource); SPA has list/create/detail panel under "Help messages" in nav.

**To-do (Extensions – defer for now):** Allow changing extension number (pkey). Can wait for now but we’ll need to do it at some point. API needs to support pkey update (e.g. add to updateable columns or dedicated rename flow) before enabling.

**To-do (IVR → trunk / PSTN – defer for now):** Same as Extensions: can wait, but we’ll need it at some point. When we do, add trunk (and/or PSTN-number) as a valid IVR destination in API and SPA.

**To-do (Phone images – defer until storage):** API hosts the phone image library; SPA consumes URLs. **Defer until we hook up to MinIO or S3.** Then: API store/sync images, expose URLs; frontend uses them in `<img>`.

**To-do (Tenants – masteroclo – can wait):** API can return null for tenant `masteroclo`. Needs doing but it’s a single case; can wait. Fix: Tenant model accessor `masteroclo ?? 'AUTO'` or DB default + backfill.

**Done – Per-field / contextual help:** Admin layout prefetches `GET helpcore`; **`useHelp`** + **`FieldHelpIcon`** (and static `hint` on form components) supply in-context text from **tt_help_core** by pkey. **Optional later:** Dedicated `GET /help/{resource}/{field}` for resource-scoped URLs or i18n — see **UX_IMPROVEMENTS_IVR.md** § Help Text API & Internationalization.

**Done – Field mutability (API):** API exposes GET /schemas (read_only, updateable, defaults per resource). Frontend uses useSchema composable (cache, no Pinia); all nine detail views (including Custom Apps) derive read_only from schema; all nine create views preset from schema.defaults. See **FIELD_MUTABILITY_API_PLAN.md** and **pbx3api/docs/SCHEMAS_ENDPOINT.md**.

**To-do (Inbound route / DDI – table review):** Connection and Advanced sections (and their fields) have been removed from the DDI edit panel. Review the underlying inbound-route table (and API model) and decide whether those columns (host, username, password, peername, register, iaxreg, pjsipreg, callback, callerid, match) should be physically removed from the schema or retained for future use.

**To-do (pbx3api – Middleware on remote):** Investigate why `app/Http/Middleware/ValidateClusterAccess.php` does not appear on the remote test instance after pull. (Unclear; deployment path / branch / Sanctum history to be checked.)

**To-do (SPA – size / maintainability, defer until functionality complete):** Runs fine on **LAN/golden** today (~**743 kB** JS / ~**183 kB** gzip, single chunk). **Do not divert effort** until core product work is done (**S8**, **R1** recordings, permissions, etc.). Then, in order:

1. **Route lazy loading** — replace eager imports in **`src/router/index.js`** with **`() => import('@/views/…vue')`** per route (or heaviest views first). Quick bundle win before **GitHub Pages / cloud** deploy. Detail: **PBX3SPA_CODEBASE_ANALYSIS.md** § Phase H.
2. **Shared list/detail extraction** — many views are **600–1,600 lines** (`BackupView`, `ExtensionDetailView`, …); only **~20** shared components. When adding panels (e.g. **R1 recordings**), extract reusable list/detail patterns instead of copying another monolith. Detail: **PBX3SPA_CODEBASE_ANALYSIS.md** § Phase H2.

See **SESSION_HANDOFF** § Other to-dos for earlier “watch in cloud” note.

**Inline edit (pattern in place):** List views can support inline edits for fields that users often change without opening detail (e.g. **Active** YES/NO). Use **FormToggle** or **FormSelect** with **hideLabel** in the table cell; on change call the update API immediately; show toast on success. Pattern documented in PANEL_PATTERN.md § "Inline edits in list views"; it works. It was tried on the Queues list and reverted for now—we may revisit the look/UX when we add it again. Other lists (Trunks, Routes, IVRs, Inbound routes, etc.) can add the same when desired.

**Done (create panels §3):** All create panels (Extension, Trunk, Route, Queue, Agent, IVR, Tenant, Inbound route) are standardized per PANEL_PATTERN.md §3: Identity / Settings / optional Advanced; defaults preset; FormToggle for booleans, FormSegmentedPill for 2–3 options, FormSelect for 4+. See CREATE_PANELS_STANDARDIZATION.md. **Done (field mutability):** API GET /schemas; useSchema composable; detail and create views use schema for read_only and defaults. **Next frontend priorities:** Complex create refinements per COMPLEX_CREATE_PLAN.md, or other follow-ups.

**Complex create flows:** See **workingdocs/COMPLEX_CREATE_PLAN.md**. **Trunk create: done** (SIP-only; **IAX2** refinements deferred). **DDI (Inbound routes): done** (create + edit aligned to legacy; Connection/Advanced removed from edit). **Extension create** and **IVR create: done.** Remaining create-flow follow-ups: trunk IAX2 (§ ToDo in COMPLEX_CREATE_PLAN), optional extension bulk create.

**Scope note:** Legacy dump/restore routines (pbx3 tree: dumper.php, dumpInstances.php, etc.) convert SARK → PBX3 and work on old and new DB versions. Ignore them for day-to-day work; focus on pbx3api, pbx3spa, and db_sql schemas. See **SYSTEM_CONTEXT.md** § "Scope: legacy dump/restore".

**Next chat:** Read **workingdocs/PROJECT_PLAN.md** (§ Current state), **workingdocs/SESSION_HANDOFF.md** (latest done/left), **workingdocs/SYSTEM_CONTEXT.md**, and **workingdocs/README.md**. Schema yardstick: **pbx3/full_schema.sql**; API models/controllers must match. For trunk ownership, allocation, or tenant migration, read **workingdocs/TRUNK_ROUTE_MULTITENANCY.md**. **Auth:** When touching login, tokens, whoami, or route guards, read **workingdocs/AUTH_PATTERNS.md** — do not freelance; patterns preserve 2FA, self-service, and centralized auth options. Create panels §3 and Field mutability (GET /schemas, useSchema) are done; next: complex create refinements (COMPLEX_CREATE_PLAN.md) or other follow-ups. Boolean standardisation: **BOOLEAN_STANDARDISATION.md** (plan + migration; run when ready).

---

## Stack (locked)

- **Vue 3** (Composition API)
- **Vite** (build tool)
- **Vue Router** (client-side routing)
- **Pinia** (state: auth, instance URL, token)
- **No TypeScript** initially (can add later as a step if needed)

---

## Auth (Laravel Sanctum)

pbx3api uses **Laravel Sanctum** (token-based). Flow:

- **Login:** `POST {baseUrl}/auth/login` with body `{ email, password }`. Response: `{ accessToken, token_type: "Bearer" }`. Store **`accessToken`** as the Bearer token for all subsequent requests. **Each login generates a new token** (and the API invalidates the user’s previous tokens), so only the latest token is valid.
- **Whoami:** `GET {baseUrl}/auth/whoami` with Bearer token returns the current user (optional for “Logged in as X”).
- **Logout:** `GET {baseUrl}/auth/logout` with Bearer token **revokes the token on the server**. On Logout in the UI: call this endpoint (so Sanctum invalidates the token), then clear the auth store and redirect to `/login`. If the logout request fails (e.g. network), still clear the store and redirect.
- **CORS:** Frontend and API are different origins (e.g. localhost:5173 vs instance:44300). pbx3api must allow the frontend origin in Laravel CORS config.

Steps 5 (Login) and 7 (Layout / Logout) implement this.

---

## Principles

1. **One step at a time** — Finish, test, sign off, commit. Then move on.
2. **Deliverable per step** — Each step has a clear “done” (artifact + behaviour).
3. **Test before next** — Manual test (or simple automated check) that the step works; fix before proceeding.
4. **No scope creep in a step** — If a step grows (“and add Tenants edit too”), split it into a new step.

---

## Job steps (in order)

### Step 1: Scaffold — Vue 3 + Vite + Vue Router + Pinia

| | |
|---|---|
| **Deliverable** | New Vue 3 project in `pbx3spa` with Vite, Vue Router, and Pinia. Default Vite/Vue welcome page runs. |
| **Test** | `npm install` then `npm run dev`; open app in browser; see default Vue/Vite page. `npm run build` succeeds. |
| **Sign-off** | App runs locally; build passes. |
| **Commit** | `chore: initial Vue 3 + Vite + Vue Router + Pinia scaffold` |

---

### Step 2: API client module

| | |
|---|---|
| **Deliverable** | A small API client (e.g. `src/api/client.js` or composable) that: (1) accepts base URL and Bearer token, (2) provides `get(path)`, `post(path, body)`, etc., (3) sends `Authorization: Bearer <token>` and `Accept: application/json`. No UI yet. |
| **Test** | From browser console or a minimal test page: call client with test instance URL + token, `get('auth/whoami')` → 200 and user object. |
| **Sign-off** | API client can call pbx3api and return JSON. |
| **Commit** | `feat: add API client (base URL, Bearer token, get/post/put/delete)` |

---

### Step 3: Auth store (Pinia)

| | |
|---|---|
| **Deliverable** | Pinia store (e.g. `useAuthStore`) holding: `baseUrl`, `token`, `user` (optional). Methods: `setCredentials(baseUrl, token)`, `clearCredentials()`, maybe `isLoggedIn` (computed). No persistence yet (or optional sessionStorage in same step). |
| **Test** | In dev: set store with test baseUrl + token; read back; clear; read again. |
| **Sign-off** | Store holds and clears credentials; usable by login and API client. |
| **Commit** | `feat: add auth store (Pinia) for baseUrl, token, user` |

---

### Step 4: Wire API client to auth store

| | |
|---|---|
| **Deliverable** | API client reads base URL and token from the auth store (or is configured from it). One place to “get current request options” from store. |
| **Test** | Set store with valid credentials; call API client `get('auth/whoami')` → 200 and user. Clear store; call fails or returns 401. |
| **Sign-off** | All API calls use store’s baseUrl + token automatically. |
| **Commit** | `feat: wire API client to auth store` |

---

### Step 5: Login page (UI only)

| | |
|---|---|
| **Deliverable** | Login page (route e.g. `/login`): form with fields **API base URL**, **Email**, **Password**. Submit button. On submit: call `POST {baseUrl}/auth/login` with email/password; on success, store token and baseUrl in auth store, optionally store user from response or call whoami. Redirect to a “home” or “dashboard” route. On failure, show error message. |
| **Test** | Enter test instance URL + valid credentials → submit → redirect and store has token. Invalid credentials → error message, no redirect. |
| **Sign-off** | User can log in and is redirected with credentials stored. |
| **Commit** | `feat: add login page (base URL, email, password) and redirect on success` |

---

### Step 6: Route guard — require auth

| | |
|---|---|
| **Deliverable** | Vue Router beforeEach (or similar): if route is not `/login` and store has no token, redirect to `/login`. After login, redirect to a default route (e.g. `/tenants` or `/dashboard`). |
| **Test** | Open app, go to `/tenants` (or any protected path) with no token → redirect to `/login`. Log in → redirect to default route; navigate to `/tenants` → stay. Log out (clear store), navigate → redirect to login. |
| **Sign-off** | Protected routes are inaccessible without login; login flow redirects correctly. |
| **Commit** | `feat: add route guard to require auth, redirect to login when not logged in` |

---

### Step 7: App layout and navigation shell

| | |
|---|---|
| **Deliverable** | After login, main app shows a layout: e.g. sidebar or top bar with links **Tenants**, **Extensions**, and **Logout**. Clicking Logout clears auth store and redirects to `/login`. Placeholder views for Tenants and Extensions (e.g. “Tenants” / “Extensions” heading only, no data yet). Default route after login goes to one of these (e.g. Tenants). |
| **Test** | Log in → see layout with nav; click Tenants → see Tenants placeholder; click Extensions → see Extensions placeholder; click Logout → back to login. |
| **Sign-off** | Navigation works; logout works; no data yet. |
| **Commit** | `feat: add app layout with nav (Tenants, Extensions, Logout) and placeholder views` |

---

### Step 8: Tenants list page (read-only)

| | |
|---|---|
| **Deliverable** | Tenants view: on mount, call `GET /tenants` (via API client). Display result in a simple table or list (e.g. pkey, description, key columns). Loading state while fetching; error message on failure. |
| **Test** | Log in to test instance; go to Tenants; see list of tenants. Disconnect or invalid token → error shown. |
| **Sign-off** | Tenants list loads and displays from API. |
| **Commit** | `feat: add Tenants list page (read-only, from API)` |

---

### Step 9: Extensions list page (read-only)

| | |
|---|---|
| **Deliverable** | Extensions view: on mount, call `GET /extensions`. Display in a table or list (e.g. pkey, cluster, type). Loading and error handling as in Tenants. |
| **Test** | Go to Extensions; see list from API. |
| **Sign-off** | Extensions list loads and displays from API. |
| **Commit** | `feat: add Extensions list page (read-only, from API)` |

---

### Step 10: (Optional) Persist instance URL and token

| | |
|---|---|
| **Deliverable** | On login success, persist baseUrl and token (e.g. sessionStorage) so refresh keeps user “logged in”. On app load, restore from sessionStorage into store. Logout clears storage. |
| **Test** | Log in; refresh page; still “in” app (no redirect to login). Log out; refresh; redirect to login. |
| **Sign-off** | Session survives refresh; logout clears it. |
| **Commit** | `feat: persist auth in sessionStorage, restore on load` |

---

## Steps after the first 10 (outline only)

Further steps can be added in the same style (one deliverable, test, sign-off, commit per step), for example:

- **Step 11:** Tenant detail view (GET /tenants/:id) — read-only.
- **Step 12:** Extension detail view (GET /extensions/:id) — read-only.
- **Step 13:** Trunks list page (read-only).
- **Step 14:** Queues list page (read-only).
- **Step 15:** System status / whoami in layout (e.g. “Logged in as X”).
- **Step 16:** Tenants create (POST) — form + submit.
- **Step 17:** Tenants edit (PUT) — form + submit.
- … then more CRUD and operational (backups, syscommands, etc.) as discrete steps.

Each new step gets a row: Deliverable, Test, Sign-off, Commit.

### Steps 18+ (completed)

- Tenant delete (DELETE); Trunk and Queue detail views; Trunk CRUD; Queue CRUD.
- Extension CRUD (create via POST extensions — single endpoint; SIP/WebRTC/Mailbox, edit, delete).
- Agents, Queues (call queues + ring groups; Queues panel creates/maintains queue endpoints used in route dropdowns — see SYSTEM_CONTEXT.md “Route panels and queue endpoints”), IVRs, Inbound routes (DDI), Outbound routes (Trunk): full CRUD (list, detail, create, edit, delete).
- Backups page (list, create new, download, delete) — **parked** (see Parked section); review after first CRUD set.
- **Landing dashboard:** Default route after login is now **Home** (dashboard). Shows PBX status (GET syscommands/pbxrunstate) with Refresh, and actions: Commit config, Start PBX, Stop PBX, Reboot instance (GET syscommands/{command}), with confirmations. This position will hold the main landing screen and can be extended with more controls later.

---

## Verify later

- **Extension create:** Resolved. The UI “Create extension” flow uses **POST /extensions** (single endpoint) with protocol (SIP | WebRTC | Mailbox), pkey, cluster, desc, optional macaddr. Old routes (extensions/mailbox, provisioned, vxt, unprovisioned, webrtc) have been removed from the API as redundant.

---

## Parked / review after first CRUD set

- **Backups:** Backups page (list, create new, download, delete) is implemented but does not work as expected; behaviour may be due to hidden functionality in PBX3 that is not visible in the API docs. Park Backups for now. **Review after this first set of CRUD panels is complete** — re-test against live PBX3 and adjust or fix as needed.

---

## Later steps / sub-projects (API-dependent)

- **Admin user management panel (admins only):** A management panel that allows admins to add, change, and delete users and manage user privileges. This is a **sub-project in its own right**. The API has some user-management endpoints today (e.g. auth/users) but they are not as strong as desired for privilege management. **API changes to support user privileges and admin-only access will likely be required before we implement this in the admin frontend.** Plan this as a later step: first strengthen the API (user privileges, admin-only operations), then add the panel to the frontend (list users, create/edit/delete, assign privileges), with appropriate access control so only admins can see and use it.

- **Help messages (tt_help_core):** **Done** — API **helpcore** CRUD; SPA **Help messages** panel; **panels consume hints** via `useHelp` + `FieldHelpIcon` and form `hint` props. Optional future: `GET /help/{resource}/{field}` or i18n layer.

---

## How to use this plan

1. Start with **Step 1**. Do only that step; test; sign off; commit.
2. Move to **Step 2**. Repeat.
3. If a step feels too big, split it (e.g. “Login page” → “Login form UI” then “Login submit and store”).
4. If you find a bug from an earlier step, fix it before adding new scope; optionally add a small “fix” step to the plan.
5. Update this doc when you add steps (e.g. Step 11, 12, …) so the plan stays the single source of truth.

---

## References

- **workingdocs/PLAN.md** — Overall plan, architecture, token security.
- **workingdocs/STACK_CHOICE.md** — Why Vue; Vue 3 + Vue Router + Pinia + Vite.
- **pbx3api/docs/** — API reference; **routes-data-vs-operational.md** for data vs operational.
