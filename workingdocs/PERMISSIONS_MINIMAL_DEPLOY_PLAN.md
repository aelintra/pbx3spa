# Permissions — minimal deploy plan

**Goal:** Implement the smallest rollout that puts the permissions pattern in place so we can keep shipping panels without tech debt. Includes a minimal Users panel so admins can manage users from the UI instead of Postman. No full role/ability management UI yet; everything ready to expand later.

**Reference:** **ADMIN_PANELS_AND_PERMISSIONS.md** (pattern); this doc is the rollout plan.

---

## Current state

- **API:** Sanctum in use. `whoami` returns `{ ...user, abilities: token.abilities }`. All panel routes are behind `abilities:admin`. `config/abilities.php` has `admin` only. Login returns only `accessToken` / `token_type` (no abilities in login response).
- **SPA:** Auth store keeps `user` from whoami (so `user.abilities` is already present but unused). Route guard only checks `isLoggedIn`. Nav shows all links to any logged-in user. No `can()` or ability-based visibility.

---

## Phase 0 — Minimal rollout (do now)

### 0.1 SPA: Persist and expose abilities

- **Auth store:** Keep storing full whoami response in `user` (already includes `abilities`). Add a getter `abilities: (state) => state.user?.abilities ?? []` so components can read it. Ensure we never overwrite or drop `user.abilities` when we set user.
- **Composable or getter `can(ability)`:** Add `can(ability)` — e.g. `auth.abilities.includes('admin')` for now, or a small composable `useCan()` that reads from auth store and returns `(ability) => auth.abilities.includes(ability)`. Use a single gate for “can use the app” as `can('admin')` until we have more abilities (so we don’t change behaviour today, we just wire the gate).

**Deliverable:** Any component can call `can('admin')`; one place defines “what ability grants app access” (admin).

### 0.2 SPA: Route guard — require admin

- **Router:** After the existing “redirect to login if not logged in” guard, add: “If logged in and route is not in the **public routes** allow-list (e.g. `['/login']`), require `can('admin')`; else redirect to a dedicated ‘no access’ route (e.g. `/no-access`) or to Home with a one-off message.” So: logged-in users without `admin` cannot open panel routes. Today every valid user has `admin`, so no change in behaviour; when we add non-admin users later, they get a clear path (no-access or limited home).
- **Optional:** Ensure whoami is called before this check (layout already fetches whoami when `auth.isLoggedIn && !auth.user`). If the user hits a panel route before whoami returns, either wait for whoami (e.g. show a short “Loading…” in layout) or treat “user not yet loaded” as allow (and let whoami fill in; 403s from API will handle bad tokens). Prefer: wait for whoami when token exists so we have abilities before rendering nav/guards.

**Deliverable:** Unauthenticated → login. Authenticated without `admin` → no-access (or home). Authenticated with `admin` → full app as today.

### 0.3 SPA: Nav and future-proofing

- **Minimal (Phase 0):** No change to nav links. All current users have `admin`, so all links stay visible. Optionally wrap the whole sidebar nav in `v-if="can('admin')"` so that when we later add tenant-only users, they don’t see admin nav until we define tenant abilities and links.
- **Doc only:** In this plan or in ADMIN_PANELS_AND_PERMISSIONS.md, note that when we add more abilities, we’ll: (1) add `view_*` / `edit_*` to config and whoami, (2) wrap nav items in `v-if="can('view_trunk')"` etc., (3) optionally group nav into “System” vs “Tenant” and gate by area ability.

**Deliverable:** No behavioural change now; one optional `v-if="can('admin')"` on nav so we don’t add tech debt when we introduce non-admin users.

### 0.4 API: No structural change

- **Leave as-is:** Routes stay behind `abilities:admin`. whoami already returns abilities. Login response can stay without abilities (SPA gets abilities from whoami). Optional later: include `abilities` in login response so the SPA can show correct nav without waiting for whoami.
- **Docs:** In `config/abilities.php` or a short comment in api.php, note that the next step is to add granular abilities (e.g. `view_trunk`, `edit_trunk`) and optionally split route groups (admin vs tenant); see ADMIN_PANELS_AND_PERMISSIONS.md.

**Deliverable:** No code change; documentation only so we don’t forget the expansion path.

---

### 0.5 SPA: Minimal Users panel (admin-only)

- **Why include:** Today users are created via Postman. A minimal Users panel lets admins manage users from the UI and is the first real use of `can('admin')` for a panel. API already supports it (all user routes are behind `abilities:admin`).
- **Scope:** List users (GET `auth/users`), Create user (POST `auth/register`: name, email, password, optional abilities). Optional: Delete user (DELETE `auth/users/{id}`), Revoke tokens (DELETE `auth/users/revoke/{id}`). No edit-user in API yet — add later when API has PUT/PATCH for user (e.g. name, abilities).
- **UI:** Follow PANEL_PATTERN: Users list view (table: id, name, email, abilities; Create button; link to detail if we add it, or delete/revoke from list). Create view: form with name, email, password, password confirm; optional abilities (multi-select or checkboxes from current ability set, e.g. `admin` only for now). Gate the "Users" nav item with `can('admin')` so only admins see it.
- **API:** No change. Register already accepts `abilities` (array); list and userById return user (password hidden). If the API returns a collection for `GET users/{id}` (e.g. `get()` not `first()`), SPA can take first element; or add a note for API to return a single object for detail.

**Deliverable:** Admins can open Users from the nav, see the list, create a user (with optional abilities), and optionally delete or revoke. No more Postman for user creation.

---

## Phase 1 — Expand later (not now)

- Add more abilities to `config/abilities.php` and to user/token assignment (seed/migration or manual).
- Split API route groups: e.g. admin routes require `admin` or `view_trunk`/`edit_trunk`, tenant routes require `admin` or `view_extension`/`edit_extension`, etc.
- SPA: use `can('view_trunk')` etc. to show/hide nav items and buttons; add route meta `{ requiresAbility: 'view_trunk' }` and guard by it.
- Optionally group sidebar into “System” and “Tenant” and gate by area.

---

## Order of work (Phase 0)

| Step | What | Test |
|------|------|------|
| 0.1 | Auth store: getter `abilities`; add `can(ability)` (composable or store getter) using `admin` as the single gate | In dev: `can('admin')` true when logged in as admin user |
| 0.2 | Router: after auth guard, require `can('admin')` for non-login routes; redirect to `/no-access` (or home) if not; ensure whoami is loaded before guard when token exists | Logged-in admin: full app. Simulate non-admin (e.g. temporarily strip abilities in whoami): redirect to no-access |
| 0.3 | Optional: wrap sidebar nav in `v-if="can('admin')"`; add simple NoAccess view if using `/no-access` | Same as 0.2 |
| 0.4 | API/docs: comment or one-line note in abilities config / api.php pointing to ADMIN_PANELS_AND_PERMISSIONS.md for expansion | N/A |
| 0.5 | Users panel: list (GET auth/users), create (POST auth/register), optional delete/revoke; nav item "Users" gated by `can('admin')` | Admin can list users, create user (with optional abilities), delete/revoke from UI |

---

## Future-proofing: 2FA and self-service (don’t preclude)

**2FA / login modernization (later)**  
- We are **not** changing the login flow in Phase 0. The SPA today: one POST to `auth/login` → receive `accessToken` → store it → optionally whoami → redirect.  
- **Do not assume** login is a single round-trip. When you add 2FA, the API may return a different shape (e.g. `requires_2fa`, challenge id) and the SPA will need an extra step (e.g. 2FA code screen) before the final token is issued. The rest of the app only cares that “we have a token and whoami gives user+abilities”; it does not depend on the login response shape. Keep login logic in one place (LoginView or a small auth helper) so 2FA can be added there without touching the rest of the app.  
- **Do not** cache or assume “user never needs 2FA” or that abilities exist only in the login response. We use **whoami** as the source of truth for user and abilities after any successful auth; that remains correct with 2FA (token is created after full auth).

**Self-service registration (later, maybe)**  
- We are **not** adding public sign-up in Phase 0. User creation is admin-only (Users panel, `can('admin')`).  
- **Do not preclude** a future public “Sign up” flow. When implementing the route guard (0.2), use an **explicit allow-list of public routes** (e.g. `['/login']`) that require neither login nor admin. Adding `/register` (or `/signup`) later is then a one-line addition to that list; no structural change.  
- Admin user creation (POST `auth/register` with abilities) stays separate from any future self-service endpoint (e.g. unauthenticated POST with default abilities and different validation). We are not locking the API; we are only adding an admin UI.

**Centralized auth / federated superuser (later)**  
- This is a **federated system** of PBX instances; a future “superuser” layer may let admins see all instances, with a **centralized auth service** that every instance trusts.  
- The current path **does not lock you out**. The SPA only assumes: (1) we have a **Bearer token**, (2) **whoami** (or equivalent) returns user and abilities. It does **not** assume the token was issued by the same host as the API. So you can later:  
  - **Gateway:** Point `baseUrl` at a gateway that does login against central auth and proxies API calls to instances; instances validate the token with the gateway/central. SPA unchanged.  
  - **Split login and API:** Have the SPA obtain the token from a central auth endpoint (e.g. OAuth2/OIDC or a central API), then send that token to each instance (or gateway). Instances would validate the token against central (e.g. JWT or token introspection). SPA would need a configurable “auth origin” for login; the rest (store token, whoami, `can()`) stays the same.  
- **Keep the contract abstract:** “We have a token; we get user and abilities from the server (whoami).” Do not hard-code “token must be issued by the same origin as baseUrl” in the auth store. Today we get the token via POST to `baseUrl + '/auth/login'`; that’s a choice of where to get the token, not a requirement that the issuer and the API host are the same.  
- **API side:** The ability model (token carries abilities, middleware checks abilities) is unchanged. The token can be issued by Sanctum today and by a central service later; each instance (or a gateway) just needs to resolve the token to a user and abilities and expose whoami in the same shape. So adopting centralized auth is about **who issues and validates the token**, not about changing the ability/permission model.

---

## Success criteria (Phase 0)

- All existing flows unchanged for current (admin) users.
- One place defines “app access” as `can('admin')`.
- Route guard enforces that only users with `admin` can reach panel routes.
- SPA has a single pattern for ability checks (`can(...)`) and stores abilities from whoami; ready to add more abilities and nav visibility later without rework.
- Admins can manage users from the app (list, create with optional abilities, delete/revoke); no need for Postman for user creation.

---

## References

- **AUTH_PATTERNS.md** — Auth contract and future-proofing rules for agents (2FA, self-service, centralized auth); follow when touching login, tokens, whoami, or guards.
- **ADMIN_PANELS_AND_PERMISSIONS.md** — Ability model, admin vs tenant areas, UI structure.
- **PROJECT_PLAN.md** — Current state; admin user management and this permissions rollout.
- **pbx3api:** `config/abilities.php`, `routes/api.php` (middleware `abilities:admin`), `AuthController::user` (whoami).
