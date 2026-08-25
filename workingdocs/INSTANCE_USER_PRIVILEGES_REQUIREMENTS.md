# Instance user privileges (requirements)

**Status:** **P1–P4 done** (2026-07-22) — API route split + cluster scope + SPA nav/guards/password/create-user; **P4** portable users travel as `portable_users.json` in tenant export/import (`PortableUserMobility`).  
**Plane:** Instance Sanctum (`pbx3api` + `pbx3spa`) — **not** Gatekeeper `fleet_*` (Rule 10).  
**Related:** **`ADMIN_PANELS_AND_PERMISSIONS.md`** (pattern); **`PERMISSIONS_MINIMAL_DEPLOY_PLAN.md`** (Phase 0 done); **`AUTH_PATTERNS.md`**; **`TRUNK_ROUTE_MULTITENANCY.md`** (pipes vs policy); tenant mobility / `TenantMobilityService` + `PortableUserMobility`; **`FLEET_AUTH_COOKIE_SSO.md`** (fleet abilities separate).  
**Ship rule:** **pbx3api + pbx3spa together** (SPA Phase F is this track — do not implement SPA alone).

---

## Problem

Today the instance SPA is **admin-or-nothing** (`abilities:admin` on API panel routes; SPA `can('admin')`). MSP / instance owners need **tenant-bounded** customer users who can run day-to-day PBX ops for their cluster(s) without seeing trunks, outbound routes, provisioning templates, or the System area — with a **slim** ability matrix that can **move with the tenant**.

---

## Design principles (locked)

1. **Slim hierarchy** — Two rungs on the instance: **`admin`** (box / MSP) and **`tenant`** (± optional `recordings`). No cascading “tenant admin manages users who manage users.” Identity lifecycle (create / revoke / force password for others) stays with **`admin`** until real operational pain forces a single extra skill.
2. **Portable customer auth** — Customer (`tenant` / `recordings`) identities are **part of the tenant**, not furniture of the box. When the tenant moves, **those users move with it**. Instance `admin` users **stay on the instance**.
3. **Headroom without a stack** — New ability strings later if needed; no role-builder, no nested admins.

Today Laravel `users` live in **instance** SQL and are **not** in the tenant mini-DB schema. **P4** closes the gap: portable customer users travel as **`portable_users.json`** in the export zip (`PortableUserMobility` + `TenantMobilityService`).

---

## Direction of flow (locked)

```text
Identity (Sanctum user + token abilities + allowed_clusters)
    → Ability gate (admin | tenant | recordings | … headroom)
        → Nav / route / API surface
            → Row scope (cluster IN allowed_clusters; CDR accountcode; recordings tenant filter)
                → Commit when user can create/update (tenant)
```

| Layer | Answers |
|-------|---------|
| **Plane** | Instance vs fleet (fleet unchanged) |
| **Ability** | What class of actions (keep the set tiny) |
| **Scope** | Which tenant(s) (`allowed_clusters`) |
| **Portability** | Customer user ↔ home tenant(s); travels on export/import |

---

## First-out abilities

| Ability | Meaning | Moves with tenant? |
|---------|---------|---------------------|
| `admin` | Full instance: all tenants, Trunks, Routes, Tenants list, System, Users manage, Asterisk Start/Stop | **No** — instance-local |
| `tenant` | Tenant ops in `allowed_clusters` (nav matrix below); **includes Commit**; **no** Trunks/Routes/System/Devices; **no** recordings listen/download | **Yes** — customer identity |
| `recordings` | Listen / download recordings within allowed clusters (additive; usually with `tenant`) | **Yes** — with that user |

**Headroom:** Open ability list on user/token. Add skills only when needed. Optional named “roles” later = presets over the same matrix — **not** a second authority ladder.

**Implication:** `admin` is a superset. Do **not** invent a fourth “tenant_admin” persona for first-out.

---

## Scope: `allowed_clusters`

- Non-`admin` users are **tenant-bounded**: list/show/create/update/delete only for `cluster IN allowed_clusters`.
- **Multi-tenant client:** one login, several clusters → same abilities, wider scope (switcher UX).
- **UX (locked):** **context switcher** when `allowed_clusters.length > 1`; single-cluster users get **no** picker.
- **API:** Enforce scope server-side; 403 on cross-tenant access.

**Move tension (call out):** A user with **multiple** `allowed_clusters` does not fit neatly in one tenant zip. Prefer **one home cluster per customer user** for first-out portability; multi-cluster logins are allowed for UX but need an explicit move rule later (e.g. export with “primary” cluster, or duplicate/link policy). Do not let multi-cluster become an excuse for a heavier identity service.

---

## Tenant move & auth (locked constraint)

| Identity | On tenant export/import |
|----------|-------------------------|
| Users with only `tenant` / `recordings` (no `admin`) whose scope is that tenant (or primary = that tenant) | **Must travel** with the tenant mini-DB / zip (passwords/hashes, abilities, `allowed_clusters`) |
| Users with `admin` | **Remain** on source instance; not part of tenant package |
| Sanctum tokens | **Do not** need to move — re-login on destination |

**Implementation (P4):** Export packs portable non-admin users whose `allowed_clusters` includes the tenant; import creates/merges by email (never overwrite `admin`); source detach via `tenant:export --detach-users`, fleet export (default), or tenant delete. Multi-cluster users: package scoped to this tenant; detach strips shortuid rather than deleting.

Keep the matrix slim partly **because** every extra identity relationship is another thing to pack, conflict-check, and re-home on import.

---

## Login homing / tenant URL (**B′ leaning — design notes 2026-07-23**)

**Problem:** P4 moves **credentials** with the tenant. It does **not** tell the customer’s browser **which instance origin** to open. That is a **nav** problem, not more Sanctum matrix. Phones already get a stable edge (tenant FQDN → SBC → current node, or solo DNS). SPA login today is **instance-URL-bound**.

**Preference:** Avoid changing **public DNS** on every move if a cleaner path exists. DNS cutover is acceptable as a **fallback**, not the first design choice.

| Challenger | Idea | DNS on move? | Notes |
|------------|------|--------------|--------|
| **A — Stable tenant admin URL** | Bookmarkable front door per tenant (e.g. `https://{tenant}.admin…` or path on a broker) that always lands on the **current** home SPA/API | **Maybe** — only if the stable name is a DNS name that must retarget | Same *shape* as SIP stable naming; pairs with catalog `meta.json.instance_id` |
| **B — Login broker (no per-move DNS)** | Fixed Gatekeeper/control-plane (or Pages) login origin; resolve home → hit correct instance API | **No** (broker FQDN stays put) | Customers need not memorize instance FQDNs; Model B instance picker stays MSP-facing |
| **B′ — Tenant id on login** (**leaning**) | Login fields: **tenant shortuid *or* tenant URL/FQDN** + email + password. SPA resolves via directory → `instance_id` → instance API base, then `POST …/auth/login` on that node | **No** | Cheap UX; customers already know shortuid and/or dialable tenant FQDN; no per-move DNS. After move, same id + password just works. |
| **C — Ops tell / bookmark update** | After move, MSP sends new instance URL | **No** | Honest for lab / early fleet; weak product story |
| **D — Per-move DNS to instance** | Customer URL is the node; update A/CNAME when tenant moves | **Yes** | Works; **least preferred** given DNS churn + TTL |

### Why a lookup (not DNS alone)

Tenant FQDNs are public in DNS, but in an SBC-fronted fleet they typically point at the **SBC VIP**, not the home node’s `:44300`. Instance FQDNs are also public — the missing public fact is **tenant → current `instance_id`**, which lives in `tenants/{shortuid}/meta.json` (and SBC `domain.setid`). B′ publishes a **safe projection** of that join for the SPA.

### Settled direction (2026-07-23) — compiled home index, not Gatekeeper in the customer path

Do **not** make customer login depend on `control.pbx3.com`. Mirror the instance picker: browser `GET`s catalog objects; Gatekeeper/registrar only **writes**.

**Authoritative:** `tenants/{shortuid}/meta.json` (`instance_id`, `cname`/`fqdn`).  
**Compiled rollup (new):** e.g. `catalog/tenant-home.json` — slim rows only:

```json
{
  "version": 1,
  "updated_at": "…",
  "tenants": [
    { "shortuid": "abc789", "cname": "abc789.example.com", "instance_id": "<ksuid>" }
  ]
}
```

SPA: normalize input (`abc789` or `abc789.example.com`) → match row → join `instance_id` to existing **`catalog/instance-index.json`** → seed `api_base_url` → normal Sanctum login on that node. No second password store. Uniform soft-fail on miss (limit enumeration).

**When updated:** same control-plane writers as today — on **tenant register**, **move** (`moveTenant` / move job / `move-tenant.sh`), **cname change**, **decommission**. Rebuild or patch the rollup in the same path as the `meta.json` write (move job: refresh before cutover is “done”). Not on every call/login. Browser cache same class of issue as stale instance catalog.

**Scope:** **one org bucket / one builder’s fleet** — not a global multi-fleet mega-index. Optional `org_id` on instance rows stays in-catalog metadata. Multi-cluster user: type the **home tenant** for this session.

**SPA polymorphism (builder POV):** one codebase; behaviour from **build-time `VITE_*`** (especially `VITE_INSTANCE_DIRECTORY_URL`), **session mode** (tenant vs fleet), and **data** (catalog + whoami). Each system builder (fork/clone) runs **their** SPA wherever they choose, pointed at **their** catalog — n unrelated builders ⇒ n SPA deploys is fine; no need for one universal mega-SPA. Same-builder multi-fleet with one build is optional later (runtime catalog URL), not required for OSS cloners.

**Customer journey (example):** open builder SPA → “Sign in to tenant” → enter tenant shortuid (or FQDN) + email + password → GET tenant-home + instance-index → `POST {api_base_url}/auth/login` → whoami must include that shortuid in `allowed_clusters` (else reject) → lock tenant context to that UID. MSP path keeps **Manage instance** / instance picker. Fleet/Gatekeeper remains ops, not the PBX front door.

**Still open / implement status (2026-07-23 thin slice):** Schema `tenant-home.v0.json`; Gatekeeper rebuild on register/move + `POST /api/v1/catalog/tenant-home/rebuild`; Mac `rebuild-tenant-home.sh`; SPA three-door chooser + tenant resolve. **Lab:** publish rollup once (`rebuild-tenant-home.sh` or Gatekeeper rebuild) so `/dev-catalog/catalog/tenant-home.json` (or S3) exists. Cache-Control / Phase D private catalog later.

**Relation:** Orthogonal to ability matrix. Does **not** reopen tenant-admin user ladder.

---

## Tenant nav surface (first-out)

Tenant users see **only**:

| Nav group | Items | Notes |
|-----------|--------|--------|
| **Home** | Landing / status | **Commit** yes (with `tenant`). **Start/Stop Asterisk** = `admin` only |
| **Endpoints** | Extensions, Conferences | Cluster-scoped; **hide provision / Devices template** controls from tenant UI |
| **Inbound** | DID routes | Cluster-scoped |
| **ACD** | Queues, IVRs, Greetings, Agents, CDR | Cluster-scoped; **Recordings** only if `recordings` |
| **Schedules & policy** | Day timers, Holiday timers, **Class of Service** | Cluster-scoped; tenants **create/edit their own CoS rules** |

**Hidden from non-`admin` (nav + API 403):**

| Area | Includes |
|------|----------|
| **Tenants** list | Instance tenant CRUD |
| **Outbound** | Trunks, Routes |
| **System** | Asterisk Files, Backup, Snapshots, Certificates, Custom Apps, Firewall, Help messages **panel**, Instance Globals, Logs, Network, **Users** (**Devices** templates removed 2026-08-25) |
| Provisioning | Extension MAC / type label only; Device templates **removed** (2026-08-25) |

**Access ≠ ownership:** Route **rows** may still live in tenant mini-DB for export; non-admins have **no** Routes UI/API.

---

## Commit (locked)

`tenant` ⇒ **Commit** (so creates/updates can go live). Not a separate ability. Do **not** open the rest of System.

---

## CoS (locked)

Customers define dial policy for **their** users (bar prefixes/ranges, etc.) via CoS under `tenant` + cluster scope.

---

## CDR & recordings (locked)

| Resource | Tenant key | Rule |
|----------|------------|------|
| **CDR** | `accountcode` (= cluster; cagi) | Under `tenant`; API **forces** accountcode ∈ `allowed_clusters` |
| **Queues / Agents / IVRs / …** | `cluster` | Filter + 403 |
| **Recordings** | Tenant path / metadata | Only with `recordings`; **API scope** required |

---

## Users & passwords (slim)

| Action | Who |
|--------|-----|
| **Change own login password** | Any authenticated user — self-service; include in first-out |
| **Create / edit users, abilities, `allowed_clusters`, revoke, force password refresh** | Instance **`admin` only** |
| **Tenant-managed users** (revoke / reset / create peers) | **Not first-out** — deliberately omitted to avoid a second admin ladder. Revisit only if MSP ticket load demands **one** additive skill (still no nested hierarchy) |

**Users panel:** System / `admin` only. No tenant “team admin” surface in first-out.

---

## Operational locks (agreed)

| Topic | Lock |
|-------|------|
| **Ability / scope change** | Re-issue Sanctum token or force re-login |
| **Field help** | Help-messages **panel** = `admin`; tenant forms still use help API |
| **Fleet** | Customer instance users get **zero** fleet by default |

---

## Explicit non-goals (first-out)

- Cascading tenant-admin → user authority stack  
- Per-field / per-extension ACLs  
- Full `view_*` / `edit_*` matrix  
- Custom role-builder UI  
- Self-service signup  
- Central IdP / SSO (contract stays token + whoami)  
- Moving instance `admin` users with a tenant  

---

## Phases (testable)

### P0 — Framing

| Done when | This document |
|-----------|---------------|
| **Status** | **Done** (2026-07-22; slim + portability) |

### P1 — Data model & Users admin

| Goal | `allowed_clusters` on user; admin edit (abilities, clusters, revoke, force password); token re-issue; **design customer users for export** (schema/flags: instance vs portable) |
| **Done when** | Admin can create portable `tenant` (± `recordings`) users; `admin` users marked instance-local |

### P2 — API enforcement

| Goal | Route groups + cluster scope + CDR clamp + recordings filter |
| **Done when** | Lab: tenant token cannot see trunks/routes/system or other tenants’ rows |

### P3 — SPA surface

| Goal | Nav/guards; Recordings gated; switcher; Commit; hide provision; change-own-password |
| **Done when** | Lab tenant login matches matrix |

### P4 — Tenant move carries auth

| Goal | Export/import includes portable users for that tenant; conflict policy on destination (email unique, etc.) |
| **Done when** | Lab: move tenant → customer can log into destination with same credentials; source portable users removed or disabled per move policy |
| **Status** | **Done** (2026-07-22) — `PortableUserMobility`; unit tests; CLI `--detach-users`; fleet export detaches by default; SPA/fleet tenant delete strips/removes |

### P5 — Headroom / login homing (only if needed)

| Goal | Single additive skill (e.g. peer revoke) **or** multi-cluster move rule — **or** lock **Login homing / tenant URL** challenger (prefer broker / stable front door **without** per-move DNS) |
| **Done when** | Explicit product ask |

---

## Suggested build order

1. **P0** — this doc. **Done.**  
2. **P1** — user model (portable vs instance-local) + admin Users.  
3. **P2** — API gates.  
4. **P3** — SPA.  
5. **P4** — export/import auth. **Done.**  
6. **P5** — only if pain shows (incl. login-homing challenger when fleet customer UX needs it).

---

## Supersedes (product assumptions)

- Fine-grained `view_routes` / per-panel ability matrices as first-out.  
- Tenant-admin revoke/create ladder (challenged and **dropped** for slim + move simplicity).  

**`ADMIN_PANELS_AND_PERMISSIONS.md`** remains mechanics; **this file** is product HoR.

---

## References

| Doc | Role |
|-----|------|
| **`PERMISSIONS_MINIMAL_DEPLOY_PLAN.md`** | Phase 0 shipped |
| **`ADMIN_PANELS_AND_PERMISSIONS.md`** | Area + scope pattern |
| **`AUTH_PATTERNS.md`** | Token + whoami contract |
| **`TRUNK_ROUTE_MULTITENANCY.md`** | Host trunks; portable tenant data |
| **`TenantMobilityService`** / **`PortableUserMobility`** / S8 export | P4: customer identities in `portable_users.json` |
| **`PBX3SPA_CODEBASE_ANALYSIS.md`** § Phase F | SPA side of this track |
| **`FLEET_LOG_RETENTION_REQUIREMENTS.md`** | CDR SQLite HoR |

---

*Last updated: 2026-07-23 — P1–P4 shipped; login-homing **B′** design notes (compiled `tenant-home` catalog rollup; no Gatekeeper on customer path; org/builder-scoped SPA).*
