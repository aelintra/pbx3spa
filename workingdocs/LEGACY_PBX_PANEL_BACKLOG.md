# Legacy PBX admin panel backlog

**Purpose:** Open SPA + API panels still missing from the pre-PBX3 previous-PBX admin UI. Shipped panels are tracked in **`PANEL_PATTERN.md`**, **`SINGLE_PANEL_SCREENS.md`**, and product **`TODO.md`**.

**Data source of truth:** **`pbx3/pbx3-1/opt/pbx3/db/db_sql/`** — not the legacy UI. Read instance SQL (`sqlite_create_instance.sql`) and tenant SQL (`sqlite_create_tenant.sql`) before designing any panel.

**Full historical inventory** (previous-PBX panel list + mapping table): private ops **`~/GiT/pbx3-ops/devdocs/archive/legacy-panel-port/`**.

**Not porting:** callback / reception / phone (and similar retired panels); third-party certs panel (only useful with in-house HTTP provisioning — **won't-do** 2026-08-23; use manufacturer RPS — **`PROVISIONING_SERVER_REQUIREMENTS.md`**).

---

## Done pending lab sign-off

### Class of Service — **2026-08-23**

**Status:** P1 engineering **done** on `main`; **lab sign-off** still open (Save → Commit → outbound dial matrix).

**Shipped:**

- **`cosrules`** list/create/detail — `ClassOfService*View`, `ClassOfServiceController`.
- CoS rule **`defaultopen`** / **`defaultclosed`** editable on create/edit; list columns; new extensions seeded via `ExtensionController::create_default_cos_instances()`.
- Extension edit: **Standard** / **After-hours** COS matrix (`ipphonecosopen` / `ipphonecosclosed`) — `ExtensionDetailView` + **`GET/PUT extensions/{extension}/cos`**.
- Instance **`globals.cosstart`** on Instance Globals — `SysglobalsEditView`.
- CoS rule **`orideopen`** / **`orideclosed`** (Override) — create/detail/list + API; GenAst forces rule onto **all** extensions on Commit (no junction backfill).
- SPA create: **no operator CoS key** — API sets **`pkey = shortuid`**; seeds may still use stable names (`HR_UK070`, `HR_OFFSHORE`). Extension matrix labels prefer **cname**.
- Junction assignment uses **`extensions/{extension}/cos`** (not standalone SPA panels for **`cosopens`** / **`coscloses`** — by design; see **`~/GiT/pbx3-ops/devdocs/pbx3api/workingdocs/COS_AUDIT_PROTOTYPE.md`** §5.2).

**Lab sign-off:** `cosstart` ON → rule defaults → extension matrix → Override → Save → Commit → allowed/blocked outbound patterns. CoS stays **binary** open/closed (day-parts Q8 — **`TIME_BASED_ROUTING_REQUIREMENTS.md`** §5.10).

**Optional follow-on (not blocking close):** feature tests for `extensions/{id}/cos`; deprecate or fix legacy `/cosopens` / `/coscloses` CRUD.

---

## Open / partial

### Higher value

| Previous panel | PBX3 direction |
|----------------|----------------|
| **Recordings** | **Shipped** (R1/R1.5/S7) — SPA **Recordings** under ACD. Unified From/To → API + play spinner **done (2026-08-26)**. |
| **Reports** | **Done as inline exports (2026-08-23)** — no dedicated Reports nav. **Export PDF/CSV** on these lists only: Greetings, Day timers, Holiday timers, Route profiles, Class of Service. Other lists that already had export keep it; do **not** add export to every remaining panel. |

### Tenant custom MOH — **2026-08-25 lab green**

**Status:** Upload / play / delete + Custom MOH Active on tip. File changes **`moh reload`** immediately (no Commit). **Custom MOH Active** needs **Save + Commit** (CAGI reads `sqlite.rdonly.db`). GenAst emits `moh-{shortuid}` class on Commit when the class folder is created.

---

### Operational / niche

| Previous panel | PBX3 direction |
|----------------|----------------|
| **Wallboard** | AMI wallboard — parked (**`TODO.md`** §13) |
| **Shell** | High-risk shell iframe — optional admin-only |
| **LDAP** | LDAP strategy deferred — **`TODO.md`** LDAP items |
| **Packet capture** | Niche single-screen |
| **Factory reset** | Guarded single-screen |

**Not a previous-PBX port:** **Tenant CLID blacklist** — old stub never used; greenfield with SPA auth. Spec: **`~/GiT/pbx3-master/pbx3/workingdocs/CLID_BLACKLIST_REQUIREMENTS.md`**.

---

## Port workflow (summary)

1. Read **pbx3 SQL** for tables/columns.
2. Confirm or add **pbx3api** model + controller + routes.
3. Design SPA per **`PANEL_PATTERN.md`** (List/Create/Detail, singleton, or single-screen).
4. Implement + test tenant resolution, schema read-only fields, Save vs Commit.

Previous-PBX UI behaviour notes (if needed): **`~/GiT/pbx3-ops/devdocs/archive/legacy-pbx-wizards/`** (archived create-wizard analysis — private).
