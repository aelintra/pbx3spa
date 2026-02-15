# Admin panels and permissions — pattern to adopt

**Purpose:** Single reference for how admin-style panels and user permissions fit the existing panel pattern. Defines the model so we can add enforcement gradually without blocking panel work.

---

## 1. Area-based layout (admin vs tenant)

- **Admin / system area:** e.g. `/admin` or a distinct nav section — Trunks, Tenants, system config, future User/role management. Intended for **system admins** (MSP, instance owner). Resources here are instance-owned or system-wide (see TRUNK_ROUTE_MULTITENANCY).
- **Tenant / operational area:** Extensions, Routes, Queues, Agents, IVRs, Inbound routes (DIDs). Used by **tenant admins** and optionally system admins. Resources are tenant-scoped (cluster).
- **Pattern:** Separate route groups (and nav sections) for “Admin” vs “Tenant”. Access control is per area: “can access admin” vs “can access tenant panels”. New panels are placed in one area and wired to the right ability.

---

## 2. Permission model: abilities (and optional roles)

- **Abilities** are the main mechanism: e.g. `view_trunk`, `edit_trunk`, `manage_trunk_tenant`, `view_extension`, `edit_extension`, `view_routes`, etc. Stored on the user (e.g. in token or from whoami) and checked on every relevant request.
- **Roles** (e.g. `system_admin`, `tenant_admin`) are optional and map to a set of abilities. API and SPA can work with abilities only; roles simplify assignment.
- **API:** Middleware or policy checks ability for the route (e.g. `ability:edit_trunk`). Returns 403 if the user’s token/abilities don’t include it.
- **SPA:** Store abilities (and optionally role) from login/whoami. Composable or guard, e.g. `can('edit_trunk')`. Use `v-if="can('edit_trunk')"` on nav items and buttons; route guard redirects if user lacks ability for that area or resource.

Fits existing Sanctum/abilities usage in pbx3api; “layered permissions” (e.g. who can modify trunk tenant) are additional abilities granted to some users later.

---

## 3. Row-level scope: which tenant(s) a user can work on

**Yes — this is part of the same pattern.** Abilities answer *what* you can do (view trunk, edit extension, etc.). **Tenant (cluster) scope** answers *which rows* you can do it on.

- **User context:** Each user has an **allowed set of tenants (clusters)** they can work on. Examples: system admin = all clusters; tenant admin = one or more clusters (e.g. `['default']` or `['tenant-a', 'tenant-b']`). This comes from the user record or whoami (e.g. `user.allowed_clusters` or `user.cluster` for single-tenant).
- **API:** For tenant-scoped resources (extensions, routes, queues, agents, IVRs, inbound routes):
  - **List:** Filter to rows where `cluster IN (user's allowed clusters)`. If the user is admin or has "all clusters", return all rows; otherwise apply the filter.
  - **Show / Update / Delete:** Before returning or applying, check that the resource's `cluster` is in the user's allowed set; if not, return 403.
  - **Create:** Restrict `cluster` to one of the user's allowed clusters (e.g. validate request cluster against allowed set; default to user's single cluster if they have one).
- **Admin / system resources:** Trunks (and future system-wide resources) may be visible to all admins; row-level restriction there is optional (e.g. only when we add `manage_trunk_tenant` and non-admin trunk viewers). Tenants list: system admin sees all; tenant admin might see only their own tenant row(s) if we support that later.
- **SPA:** Lists show only what the API returns (already scoped). Dropdowns (e.g. cluster/tenant picker on create) should only offer the user's allowed clusters. Detail/create forms don't need to re-check row scope if the API enforces it; 403 on save or load is sufficient.

So: **area + abilities** control panel access; **allowed clusters** control which rows a user can list, open, create, update, and delete. Both are consistent and implemented together as we add tenant-scoped users.

---

## 4. UI structure (already in place)

- **Sidebar + list/detail:** Nav by resource; each resource has List → Create / Detail (edit). Current PANEL_PATTERN (list blocks, detail Identity/Settings/Advanced, create form) stays; no change to panel structure.
- **Admin twist:** One nav section is “System” or “Admin” (Trunks, Tenants, future Users); another is “Tenant” (Extensions, Routes, IVRs, DIDs, etc.). Which section and which items a user sees is determined by abilities.
- **Dashboard:** Login → Home (PBX status, Commit/Start/Stop). Admin users see extra nav items or dashboard tiles (e.g. Trunks, Users). Abilities control visibility.

---

## 5. Implementation approach (minimal now, expand later)

- **Define and document** the ability set (and optional roles) in this doc or a companion (e.g. list of abilities, which resources/actions they cover). Update as new panels or admin features are added.
- **API:** One middleware (or route group) that checks ability for a given route group. Apply to admin routes first (e.g. trunks), then tenant routes as needed. Use existing Sanctum token abilities; ensure whoami (or login response) returns abilities so the SPA can store them.
- **SPA:** Store abilities from auth (whoami/login). Add a simple `can(ability)` (composable or from store). Use it to hide nav items and disable buttons; add route guards that redirect when the user lacks the required ability for that area.
- **Defer** full user/role management UI to a later sub-project. No “user management” or “role CRUD” panel yet; abilities can be assigned manually or via seed/migration until then.

When adding a new panel, wire it to the chosen ability (e.g. “this route requires `view_trunk`”; “Create button requires `edit_trunk`”) so we don’t build a second, permission-free world.

---

## 6. Example ability set (starter)

| Ability | Scope | Notes |
|--------|--------|-------|
| `view_trunk`, `edit_trunk` | Admin | Trunk list/detail/create/update/delete. |
| `manage_trunk_tenant` | Admin | Allow changing trunk cluster (later phase; not in first cut). |
| `view_extension`, `edit_extension` | Tenant | Extensions. |
| `view_routes`, `edit_routes` | Tenant | Outbound routes. |
| … | … | Same pattern for queues, agents, IVRs, inroutes (DIDs), tenants. |
| `admin` | Admin | Full system access; can imply all other abilities. |

Roles (optional): e.g. `system_admin` → all abilities; `tenant_admin` → tenant-scoped view/edit only for extensions, routes, IVRs, DIDs, etc.

---

## 7. References

- **AUTH_PATTERNS.md** — Auth contract and rules for agents (2FA, self-service, centralized auth); follow when touching login, tokens, whoami, or guards.
- **PANEL_PATTERN.md** — List/detail/create structure; no change.
- **TRUNK_ROUTE_MULTITENANCY.md** — Trunks = system/admin; DIDs = tenant. Aligns with admin vs tenant area.
- **PROJECT_PLAN.md** — Current state; admin user management called out as later / API-dependent.
- **pbx3api** — Sanctum, auth, existing abilities config (e.g. `config/abilities.php`, whoami). Extend with ability checks on routes.
