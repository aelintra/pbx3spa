# Admin panels and permissions — pattern to adopt

**Purpose:** Mechanics for area layout, abilities, and row-level cluster scope.  
**Product HoR (first-out locks):** **`INSTANCE_USER_PRIVILEGES_REQUIREMENTS.md`** (P0 framing, 2026-07-22) — `admin` / `tenant` / `recordings`, tenant nav matrix, no trunks/routes/System for customers, Commit with `tenant`, CoS tenant-scoped, etc. Prefer that doc when deciding *what* to allow; use this file for *how* panels and APIs enforce it.

---

## 1. Area-based layout (admin vs tenant)

- **Admin / system area:** Trunks, Routes, Tenants list, System nav (Backup, Globals, Devices/provisioning templates, Users, …). **Instance `admin` only** (see privileges requirements).
- **Tenant / operational area:** Endpoints, Inbound (DID routes), ACD (queues/IVRs/agents/CDR; recordings gated), Schedules & policy (timers + CoS). Used by **`tenant`** (scoped) and `admin`.
- **Pattern:** Separate route groups (and nav sections). New panels are placed in one area and wired to the right ability.
- **Not tenant UI:** Outbound **Routes** and **Trunks** — even if route rows are tenant-owned for export (**`TRUNK_ROUTE_MULTITENANCY.md`**).

---

## 2. Permission model: abilities (and optional roles)

- **Abilities** are the main mechanism. **First-out set:** `admin`, `tenant`, `recordings` — see **`INSTANCE_USER_PRIVILEGES_REQUIREMENTS.md`**. Leave headroom in `config/abilities.php` for later skills.
- **Do not** start with a large `view_*` / `edit_*` matrix; add named abilities when a real split appears.
- **Roles** (optional later) map to a set of abilities — presets only; API/SPA work with abilities.
- **API:** Middleware checks ability for the route group; **plus** cluster scope for non-admin.
- **SPA:** `can(ability)` from whoami; nav + route guards; multi-cluster **context switcher** when `allowed_clusters.length > 1`.

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

**Superseded for product intent** by **`INSTANCE_USER_PRIVILEGES_REQUIREMENTS.md`** first-out table (`admin` / `tenant` / `recordings`). Historical sketch of fine-grained `view_trunk` / `edit_extension` / … retained only as optional future headroom — not first-out.

---

## 7. References

- **INSTANCE_USER_PRIVILEGES_REQUIREMENTS.md** — Product HoR (first-out abilities, nav matrix, phases).
- **AUTH_PATTERNS.md** — Auth contract and rules for agents (2FA, self-service, centralized auth); follow when touching login, tokens, whoami, or guards.
- **PANEL_PATTERN.md** — List/detail/create structure; no change.
- **TRUNK_ROUTE_MULTITENANCY.md** — Trunks = system/admin; DIDs = tenant. Aligns with admin vs tenant area.
- **PROJECT_PLAN.md** — Current state; admin user management called out as later / API-dependent.
- **pbx3api** — Sanctum, auth, existing abilities config (e.g. `config/abilities.php`, whoami). Extend with ability checks on routes.
