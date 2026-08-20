# Legacy SARK admin panel backlog

**Purpose:** Open SPA + API panels still missing from the pre-PBX3 legacy SARK admin UI. Shipped panels are tracked in **`PANEL_PATTERN.md`**, **`SINGLE_PANEL_SCREENS.md`**, and product **`TODO.md`**.

**Data source of truth:** **`pbx3/pbx3-1/opt/pbx3/db/db_sql/`** — not the legacy UI. Read instance SQL (`sqlite_create_instance.sql`) and tenant SQL (`sqlite_create_tenant.sql`) before designing any panel.

**Full historical inventory** (legacy panel list + legacy SARK→PBX3 mapping table): **`archive/SAIL65_PANEL_PORT_PLAN.md`**.

**Not porting:** sarkcallback, sarkreception, sarkphone (and similar retired panels).

---

## Open / partial

### Partial — Class of Service (sarkcos)

- **`cosrules`** list/create/detail done.
- **Still missing:**
  - Extension edit: daytime / nighttime COS matrix (`ipphonecosopen` / `ipphonecosclosed`).
  - CoS rule **`defaultopen`** / **`defaultclosed`** editable on create/edit (SPA read-only today).
  - Instance **`globals.cosstart`** on Instance Globals.
  - SPA consumer for **`cosopens`** / **`coscloses`** beyond create-time seeding.
- See **`pbx3api/workingdocs/COS_AUDIT_PROTOTYPE.md`** §5.2 · product **`TODO.md`** §P1.

### Higher value

| Legacy panel | PBX3 direction |
|--------------|----------------|
| **sarkrecordings** | Read-only list + play/download; may tie to **`RECORDINGS_STORAGE_DESIGN.md`** |
| **sarkreport** | PDF export per list panel (not a separate nav item) |

### Security / provisioning

| Legacy panel | PBX3 direction |
|--------------|----------------|
| **sark3pcerts** | 3rd-party provisioning certs (Snom, Yealink, …) — separate from main Certificates; see **`PROVISIONING_SERVER_REQUIREMENTS.md`** |

### Operational / niche

| Legacy panel | PBX3 direction |
|--------------|----------------|
| **sarkwallboard** | AMI wallboard — parked (**`TODO.md`** §13) |
| **sarkshell** | High-risk shell iframe — optional admin-only |
| **sarkldap** | LDAP strategy deferred — **`TODO.md`** LDAP items |
| **sarkpcap** | Packet capture — niche single-screen |
| **sarkfreset** | Factory reset — guarded single-screen |

---

## Port workflow (summary)

1. Read **pbx3 SQL** for tables/columns.
2. Confirm or add **pbx3api** model + controller + routes.
3. Design SPA per **`PANEL_PATTERN.md`** (List/Create/Detail, singleton, or single-screen).
4. Implement + test tenant resolution, schema read-only fields, Save vs Commit.

Legacy UI behaviour notes (if needed): **`~/GiT/pbx3-ops/devdocs/archive/legacy-sark-wizards/`** (archived create-wizard analysis).
