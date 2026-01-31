# Project plan: PBX3 admin frontend (Vue stack)

Discrete job steps. Each step is **testable**, **sign-off-able**, and **committable** before moving to the next. No big bang; one step at a time so we don’t carry multiple untested issues forward.

---

## Current state (for the next chat)

**Last session:** UI standardization: list panels use a single **Create** button (no “Add {object}”); create-form submit buttons use **Create** / **Creating…** (no “Create {object}”). All create views updated (Extension, Trunk, Route, Queue, Agent, IVR, Tenant, Inbound route). Branch **extensions-buildout** was merged into **main** (fast-forward); **extensions-buildout** deleted locally. User was to run `git push origin main` and `git push origin --delete extensions-buildout` from their machine (credentials required). Work is on **main**.

**Done:** Steps 1–17 plus Steps 18+ (Tenants, Extensions, Trunks, Queues, Agents, Routes, IVRs, Inbound routes — full CRUD where applicable; list/detail/create refactored per PANEL_PATTERN.md: list blocks, detail Identity/Settings/Advanced, edit-from-list, delete confirmation modal, toasts). Create-button wording standardized: list toolbar = “Create”, create form submit = “Create” / “Creating…”. Default after login is **Home** (dashboard): PBX status via `GET syscommands/pbxrunstate` + Refresh, and actions Commit / Start / Stop / Reboot with confirmations. Auth: login, sessionStorage persist, route guard, whoami in layout.

**Parked:** Backups — review after first CRUD set; behaviour may depend on PBX3 internals.

**Later (API-dependent):** Admin user management panel (admins only; API needs stronger user/privilege support first). Help messages — API to expose tt_help_core (sqlite_message.sql data) for display in admin panels; then frontend consumes.

**To-do (Extensions):** Allow changing extension number (pkey). In SARK pkey was immutable; frontend already has an editable Ext field and redirect-on-save — API needs to support pkey update (e.g. add to updateable columns or dedicated rename flow) before enabling this behaviour.

**To-do (Phone images):** API hosts the phone image library; SPA consumes URLs. API: store images on disk (or storage), sync from upstream (script/cron), expose e.g. `GET /api/phone-images/{filename}` or device-model → image URL; frontend uses those URLs in `<img>` (no library bundled in SPA).

**To-do (Tenants – Timer status / masteroclo):** API can return null for tenant `masteroclo` (DB column has no DEFAULT; existing rows may be NULL). Frontend currently shows "AUTO" when null (sloppy but works). Prefer API fix: e.g. Tenant model accessor that returns `masteroclo ?? 'AUTO'`, or DB default + backfill, so the API always sends a value and the list doesn’t have to guess.

**To-do (Field mutability):** Immutable-field treatment (lowlight in list/detail/edit) is currently hard-coded per resource in the frontend (e.g. Extensions: pkey, shortuid, id, macaddr, device, devicemodel). Prefer moving mutability to the API later (e.g. per-resource schema or field metadata like `read_only` / `immutable`) so the frontend can derive which fields to lowlight without per-panel lists in code.

**Review later (UX – inline edit):** Consider inline edit for list rows *after* the system runs nicely on the current list → detail/edit pattern. The old system had inline edit in some areas; on bigger rows it looked clunky and took extra real estate on busy screens. Revisit only when the main pattern is stable and we want to optimise for high-frequency small edits.

**To-do (create panels):** Standardize remaining create panels per PANEL_PATTERN.md §3: **Extension**, **Trunk**, **Route**, **Queue**, **Agent**, **IVR**. For each: (a) preset create-form fields from DB SQL DEFAULTs and model `$attributes`; (b) group fields into Identity, Settings (or Transport), and optional Advanced; (c) use segmented pills for boolean and short fixed-choice fields instead of `<select>`. Tenant and Inbound route create are already done; use them as reference.

**Next chat:** Read **workingdocs/PROJECT_PLAN.md** (§ Current state), **workingdocs/SYSTEM_CONTEXT.md**, and **workingdocs/README.md**. Pick up from here; next steps could be e.g. create-panel standardization (see to-do above), push/pull if needed, revisit Backups, or API work for user management or tt_help_core.

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
| **Deliverable** | New Vue 3 project in `pbx3-frontend` with Vite, Vue Router, and Pinia. Default Vite/Vue welcome page runs. |
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
- Extension CRUD (create via POST extensions/mailbox, edit, delete).
- Agents, Routes (ring groups), IVRs, Inbound routes: full CRUD (list, detail, create, edit, delete).
- Backups page (list, create new, download, delete) — **parked** (see Parked section); review after first CRUD set.
- **Landing dashboard:** Default route after login is now **Home** (dashboard). Shows PBX status (GET syscommands/pbxrunstate) with Refresh, and actions: Commit config, Start PBX, Stop PBX, Reboot instance (GET syscommands/{command}), with confirmations. This position will hold the main landing screen and can be extended with more controls later.

---

## Verify later

- **Extension create (mailbox):** The UI “Create extension” flow uses **POST /extensions/mailbox**. Verify whether this endpoint is still used in practice; it may no longer be the preferred way to create extensions. If the API has changed, update the frontend to use the correct create endpoint(s).

---

## Parked / review after first CRUD set

- **Backups:** Backups page (list, create new, download, delete) is implemented but does not work as expected; behaviour may be due to hidden functionality in PBX3 that is not visible in the API docs. Park Backups for now. **Review after this first set of CRUD panels is complete** — re-test against live PBX3 and adjust or fix as needed.

---

## Later steps / sub-projects (API-dependent)

- **Admin user management panel (admins only):** A management panel that allows admins to add, change, and delete users and manage user privileges. This is a **sub-project in its own right**. The API has some user-management endpoints today (e.g. auth/users) but they are not as strong as desired for privilege management. **API changes to support user privileges and admin-only access will likely be required before we implement this in the admin frontend.** Plan this as a later step: first strengthen the API (user privileges, admin-only operations), then add the panel to the frontend (list users, create/edit/delete, assign privileges), with appropriate access control so only admins can see and use it.

- **Help messages (tt_help_core):** In a later step we will update the API to expose the help/UI messages stored in **tt_help_core** (data loaded from sqlite_message.sql) so the admin frontend can fetch and display them in the admin panels (e.g. field hints, tooltips, or help text). API first (new endpoint or resource), then consume in the frontend.

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
