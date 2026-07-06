# Trunk and route ownership in multi-tenant PBX

**Purpose:** Capture the intended ownership model for trunks and DIDs, and how trunk allocation supports tenant portability. Policy only; schema/API/UI for allocation are a later phase.

**Architecture context:** The system is **federated**: DBs are **discrete** per node, **shared-nothing** between nodes. The goal is to minimise blast radius when a node goes down. Instance vs tenant are **logical** constructs (which schema file owns a table); **physically** all tables live in the same database on a node. Each node has schema from **instance** SQL (`sqlite_create_instance.sql`) and **tenant** SQL (`sqlite_create_tenant.sql`). A **central catalogue** holds: list of nodes and their locations; signposts to long-term storage (e.g. S3 buckets); metadata for start/stop/create/destroy instances; and may act as coordinator for tenant migrations (not certain yet). Defining trunks in the instance SQL (not the tenant SQL) signifies instance ownership; no separate DB connection or data migration is implied—just which file the table is defined in for provisioning.

---

## 1. Ownership model

- **Trunks:** **Collective (shared).** System owner/MSP manages trunks; they are shared infrastructure. Tenant admins do not own or configure physical trunks—they use what is provided.
- **DIDs (DDI / inbound routes):** **Privately owned** by the tenant. DID ownership and management can be delegated to the tenant. DIDs are globally unique (E.164), so there is no conflict between tenants; each tenant manages their own DIDs and inbound routing.

**Access (when role-based access is implemented):** Trunk management = system admin only. DDI/inbound-route management = tenant-scoped (tenant sees and manages their own DIDs).

**Schema placement:** The `trunks` table is defined in the **instance** SQL file (`pbx3/pbx3-1/opt/pbx3/db/db_sql/sqlite_create_instance.sql`), not in the tenant SQL file (`sqlite_create_tenant.sql`). This is a structural change that signifies the **instance** owns trunks, not tenants. The table may still carry a `cluster` column for association (e.g. first cut: trunks in default tenant), but the table itself lives in the instance schema.

---

## 2. Ownership decision (consensus, 2026-07)

**Question:** In a cloud multi-tenant PBX, who owns outbound SIP trunks — the host, the tenant, or both?

**Decision:** Split **pipes** from **policy**.

| Layer | Owner | Travels with tenant export? |
|-------|--------|----------------------------|
| **Physical trunks** (carrier creds, registration, channels, failover) | **Host / instance** (commercial relationship may be platform-level) | **No** |
| **Outbound routing policy** (dial plans, CoS, CLID, LCR, account codes) | **Tenant** | **Yes** (`route` and related tenant tables) |
| **Indirection** (virtual trunk / trunk group → real trunk on *this* node) | **Host maps; tenant references** | **Names/KSUIDs yes; map is per-instance** |

This matches how most hosted PBX providers operate and aligns with PBX3’s **federated, migration-first** design (see **`TENANT_MIGRATION_RUNBOOK.md`**, **`tenant:export`** — trunks excluded from mini-DB).

### Options considered (external review, 2026-07)

| Model | Fit for PBX3 fleet | Notes |
|-------|-------------------|--------|
| **Host owns trunks** | **Default — adopt** | One carrier account serves many tenants; credentials stay on the node; central fraud/failover; simplest tenant move *once routes use portable references*. |
| **Tenant owns trunks** | **Reject as default** | BYOC-friendly for enterprise single-box PBX; poor at fleet scale (credential sprawl, registrations, support, migration friction). |
| **Hybrid (host or tenant trunk owner)** | **Later phase** | Same routing model; add `owner = HOST \| TENANT` on trunk or trunk-group rows when BYOC is a product requirement. Not needed to prove S8 tenant move. |

### Platform vs instance

```
Platform (catalog, S3, future central admin)
  └── may document / assign commercial carrier relationships

Instance (08jzwn, bzy54n, …)
  └── real Asterisk trunks + PJSIP registration on THIS box

Tenant
  └── policy only; moves as mini-DB
```

Trunks are **instance-local telephony objects** even when the MSP buys capacity centrally. The catalog does not carry live SIP signaling (Rule 1: runtime does not depend on S3). Tenant move still requires **trunks (or maps) on the destination node**.

### Virtual trunks and trunk groups

**Virtual trunk** — a stable, human-facing slot tenants and routes reference, e.g. **Primary**, **Secondary**, **International**, **Failover**. Same four names on every node.

**Trunk group** — optional grouping layer (e.g. “US host carrier”, “EU host carrier”, or a tenant BYOC group) that resolves to one or more physical trunks. Routes can point at a **virtual trunk** or **trunk group**; the admin maintains a **per-instance map** from that abstraction to real `trunks` rows.

```text
Tenant route.path1  →  "Primary" (virtual)
                           │
              per-instance map (admin, not in tenant export)
                           ▼
                    trunks.pkey = ael3  →  Carrier
```

On migration: tenant zip unchanged; operator on destination sets **Primary → local trunk X** (and Secondary, etc.), then Commit. No rewrite of dial-plan rows.

**Why not route → real trunk pkey directly?** Carrier-chosen labels (`ael3`, site codes) **collide across nodes** and expose instance-specific names in portable tenant data. Virtual names are the portable contract.

### First cut vs target (why migration feels manual today)

| | **Target (this doc)** | **First cut (running system)** |
|--|----------------------|--------------------------------|
| Trunks table | Instance SQL | Instance SQL (declared); may still appear tenant-adjacent in legacy DBs |
| Route `path1`…`path4` | Virtual trunk or logical KSUID | **Real trunk pkey** from default-tenant dropdown |
| Tenant export | No trunks | No trunks (**S8.6**) |
| Land on new node | Map four virtual names | **Provision trunks whose pkeys match routes**, or hand-edit routes |

The policy direction is settled; the **gap is implementation**. First S8 tenant moves may require matching trunk **pkeys** on the destination — expected until the virtual-trunk mapping milestone ships.

### Roadmap order

1. **Now (S8):** Trunks out of tenant export; operator provisions/maps trunks on destination before Commit.
2. **Next trunk milestone:** Virtual trunk table + per-instance (or per-tenant) map; routes store portable references.
3. **Later (MSP / BYOC):** Trunk groups with `owner = HOST \| TENANT`; plug tenant-owned carriers into the same route abstraction.

---

## 3. Trunk allocation and tenant portability

**Driver:** The PBX is built to support **easy, quick movement of a tenant from one PBX backend instance to another.** A major gotcha in migration is **trunk re-allocation**: on the new instance, the tenant’s outbound routes must use that instance’s real trunks, not the old one’s.

**Approach:** Use **virtual trunks** that the admin **maps to real trunks** per instance.

- Tenants see and use **virtual trunks** (e.g. in outbound route selection). Tenant config references these, not physical trunk IDs.
- The admin maps each virtual trunk to a **real trunk** on the current instance. When a tenant is migrated, only this mapping is reconfigured on the new instance; tenant data (extensions, routes, IVRs, DIDs) stays unchanged and portable.
- **Standard virtual trunk names** keep migration simple and scriptable: **Primary**, **Secondary**, **International**, **Failover**. Same names everywhere; on each instance the admin maps “Primary” → this real trunk, “Secondary” → that one. No need for tenants or scripts to deal with instance-specific IDs.

**Why restrict which trunks a tenant can use?** Geography, cost, or other policy may require that only certain trunks are available to a given tenant. Virtual trunks plus admin mapping provide both **sharing** (one real trunk can back many tenants’ “Primary”) and **sensible allocation** (admin decides who gets which real trunk behind each name).

**Migration mechanics:** To migrate a tenant, run a selection on the tenant tables to extract that tenant's rows, build a single-tenant **miniDB** (tenant schema plus that tenant's data only), dump it to disk, compress it, and ship it to the new location for load. Trunks are **not** part of the tenant miniDB—they are instance-owned and stay on the source node. The destination node has its own trunks; after load, trunk re-allocation (e.g. virtual-trunk mapping or first-cut use of default-tenant trunks) is done on the new instance. **Symbolic/virtual trunk selection** is what makes this work: if routes in the miniDB reference virtual names (Primary, Secondary, etc.) or a logical trunk id that is remapped on landing, the new instance simply maps those to its local real trunks—no rewrite of tenant data. Without that, route rows would point at source-node trunk ids that do not exist on the destination.

---

## 4. Alternatives considered

All of the following preserve **tenant portability** (tenant data is instance-agnostic; only the mapping layer is per-instance). The choice was made for **simplicity for users**:

| Approach | Portable unit | User-friendly |
|----------|----------------|---------------|
| **Standard virtual names** (chosen) | Primary, Secondary, International, Failover | Yes; no jargon. |
| Role/slot indices | Slot 1, 2, 3, 4 | Requires labels; one step removed. |
| Trunk profile / CoS | Profile name (e.g. “standard”) | Good for bulk config; less obvious for casual admins. |
| Logical trunk UUID | KSUID (rows already have KSUIDs in DB) | Stable and flexible; not human-friendly for “map Primary to this trunk”. |

We adopt **standard virtual trunk names** as the user-facing model. Under the hood, logical trunk rows can still use KSUIDs for stability and migration; the four names are the standard set presented in the UI and in migration flows.

---

## 5. First cut (initial behaviour)

**Trunk tenant (cluster):** For now, all trunks are treated as belonging to the **default** tenant. New trunks are forced to `cluster = 'default'`; we may open this up later (e.g. allow assigning trunks to other tenants or to instance-only). This keeps ownership simple while the instance owns the trunks table.

**Outbound routes:** For the first implementation, when a user builds an **outbound route**, they simply choose **any trunk in the default tenant** (e.g. `cluster = 'default'`). No virtual-trunk layer or allocation yet; the route’s trunk dropdown is populated from trunks in the default tenant. This gets routing working; the virtual-trunk allocation model (Primary, Secondary, etc.) is a later phase.

**When moving the trunks table** from tenant SQL to instance SQL, edit only the create scripts in **pbx3/pbx3-1/opt/pbx3/db/db_sql**; that directory is the canonical definition of the DB. full_schema.sql and running_schema.sql can be ignored for this change.

---

## 6. Later phase (not in scope here)

- **Schema/API:** Tables and endpoints for virtual trunks and their mapping to real trunks; admin UI to assign real trunks to the standard names (per tenant or per instance as designed).
- **Outbound routes:** Ensure routes reference the portable abstraction (virtual trunk name or its KSUID), not raw real-trunk ID, when allocation is implemented.
- **Migration tooling:** Export/import and “land tenant on this instance” with “map Primary → …, Secondary → …” as part of the migration feature.

---

## 7. References

- **COMPLEX_CREATE_PLAN.md** — Trunk create (type chooser, API); ownership/allocation is a later phase.
- **TENANT_MIGRATION_RUNBOOK.md** — tenant move; trunks not exported; destination trunk step.
- **PROJECT_PLAN.md** / **SESSION_HANDOFF.md** — Current state and next priorities.
- **pbx3 full_schema.sql** / **sqlite_create_tenant.sql** — Persistent rows use KSUIDs; any allocation model can be built on top.
