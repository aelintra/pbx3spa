# Create & edit panels — section and field order (inventory)

**Rendered HTML (tables, headings):** open [`CREATE_EDIT_PANEL_FIELD_ORDER.html`](./CREATE_EDIT_PANEL_FIELD_ORDER.html) in a browser. Regenerate from this file with `npm run docs:panel-inventory` in `pbx3spa/`.

**Purpose:** Baseline for standardising column/field order across the SPA.  
**Scope:** **Database-backed PBX entity CRUD only** — create/detail views for objects stored in the instance database (agents, extensions, queues, tenants, etc.).  
**Special cases (ignore for standardisation):** **Device** templates (`DeviceCreateView` / `DeviceDetailView`) and **Help messages** (`HelpMessageCreateView` / `HelpMessageDetailView`) — different layout goals; do not try to align them with dialplan-style panels. They are omitted from the summary tables below; stub entries only in the long inventory.  
**Out of scope (not listed below):** system or non-entity UIs such as `SysglobalsEditView.vue`, `AsteriskFileDetailView.vue`, `NetworkView.vue`, backup/firewall/certificates/logs, dashboard, and `UserCreateView.vue` (app user provisioning).  
**Source of truth:** The Vue files (Mar 2026); this doc can drift — re-scan when changing forms.

**Conventions in use**

- Most CRUD panels use `<h2 class="detail-heading">` for sections.
- **IVR** keystroke block uses `destinations-heading` (not `detail-heading`).
- **Tenant** create/detail render Timers → Advanced → Call recording → Monitoring → Call control → LDAP from shared arrays in `@/constants/tenantAdvanced.js` (order is the array order there).
- **Readonly identity** fields often use `FormReadonly` on edit and plain `FormField` disabled on some views — labels still listed below.

### Edit panels — at a glance (table)

Detail views only. Section names are headings **inside the form** (not the page chrome). **Identity stack** = whether the usual **pkey → UID → KSUID** pattern appears in Identity (see structural patterns below). **Tenant** = which section holds the tenant `FormSelect`. **Device** and **Help message** are omitted here (special cases).

| Entity | Detail view | Sections (top → bottom) | Identity stack | Tenant section |
|--------|-------------|-------------------------|----------------|----------------|
| Agent | `AgentDetailView.vue` | Identity → Queues | LUID/KSUID not displayed | Identity |
| Class of Service | `ClassOfServiceDetailView.vue` | Identity → Settings | Full | Identity |
| Conference | `ConferenceDetailView.vue` | Identity → Settings | Full | Identity |
| Custom app | `CustomAppDetailView.vue` | Identity → Settings → Code | Partial (no LUID line; KSUID ro) | Settings |
| Day timer | `DayTimerDetailView.vue` | Identity → Rule | pkey + State; LUID optional; no KSUID | Rule |
| Extension | `ExtensionDetailView.vue` | Identity → Transport → Advanced → Runtime | Ext → SIP Identity → KSUID (labels differ) | Identity |
| Greeting | `GreetingDetailView.vue` | Identity → Metadata → Audio | Full | Identity |
| Holiday timer | `HolidayTimerDetailView.vue` | Identity → Holiday | pkey + State; LUID if present; no KSUID | Holiday |
| Inbound route | `InboundRouteDetailView.vue` | Identity → Settings | Full | Settings |
| IVR | `IvrDetailView.vue` | Identity → Settings → Keystroke options | Full | Identity |
| Queue | `QueueDetailView.vue` | Identity → **Options** → Timing & limits → Advanced | Full | Identity |
| Outbound route | `RouteDetailView.vue` | Identity → Settings → Dialplan → Paths (trunks) | Full | Settings |
| Tenant | `TenantDetailView.vue` | Identity → Settings → Timers → Advanced → Call recording → Monitoring & hot desk → Call control → LDAP | Full | Identity (fixed rows); rest from `tenantAdvanced.js` |
| Trunk | `TrunkDetailView.vue` | Identity → Settings → Advanced | Full + Transport + Technology in Identity | (fixed default cluster in save) |

**Create panels — at a glance (table)**

**Device** and **Help message** omitted (special cases).

| Entity | Create view | Sections (top → bottom) | Tenant section |
|--------|-------------|-------------------------|----------------|
| Agent | `AgentCreateView.vue` | Identity → Settings → Queues | Settings |
| Class of Service | `ClassOfServiceCreateView.vue` | Identity → Settings | Settings |
| Conference | `ConferenceCreateView.vue` | Identity → Settings | Settings |
| Custom app | `CustomAppCreateView.vue` | Identity → Settings → Code | Settings |
| Day timer | `DayTimerCreateView.vue` | Rule | Rule |
| Extension | `ExtensionCreateView.vue` | Identity → Settings → Advanced | Identity |
| Greeting | `GreetingCreateView.vue` | Identity → Metadata → Audio | Identity |
| Holiday timer | `HolidayTimerCreateView.vue` | Holiday | Holiday |
| Inbound route | `InboundRouteCreateView.vue` | Identity → Destinations | Identity (first) |
| IVR | `IvrCreateView.vue` | Identity → Settings → Keystroke options | Settings |
| Queue | `QueueCreateView.vue` | Identity → Settings → Timing & limits → Advanced | Settings |
| Outbound route | `RouteCreateView.vue` | Identity → Settings → Dialplan → Paths | Settings |
| Tenant | `TenantCreateView.vue` | Identity → Settings → (same dynamic blocks as detail) | Identity |
| Trunk | `TrunkCreateView.vue` | Technology → SIP registration → Identity → Connection | — |

---

## Agents

### `AgentCreateView.vue`

1. **Identity** — Agent number, Password, Common name, Description  
2. **Settings** — Tenant  
3. **Queues** — Queue 1 … Queue 6  

### `AgentDetailView.vue`

1. **Identity** — Agent number (ro), Tenant, Common name, Description, Password  
2. **Queues** — Queue 1 … Queue 6  

**Create vs edit:** Create puts **Password** under Identity and **Tenant** under Settings; edit puts **Tenant** in Identity after agent number.

---

## Class of Service

### `ClassOfServiceCreateView.vue`

1. **Identity** — CoS key, Common name, Description  
2. **Settings** — Tenant, Active, Dialplan  

### `ClassOfServiceDetailView.vue`

1. **Identity** — CoS key (ro), UID (ro), KSUID (ro), Tenant (required), Active, Description  
2. **Settings** — Dialplan (required), Default open (ro)  

---

## Conferences

### `ConferenceCreateView.vue`

1. **Identity** — Room number, Common name, Description  
2. **Settings** — Tenant, Active, Type, Participant PIN, Admin PIN  

### `ConferenceDetailView.vue`

1. **Identity** — Room number (editable or ro), Common name, UID, KSUID, Tenant (required), Active, Description  
2. **Settings** — Type, Participant PIN, Admin PIN  

---

## Custom apps

### `CustomAppCreateView.vue`

1. **Identity** — App name, Display name, Description  
2. **Settings** — Tenant, Active?, Span, Strip tags?, Direct dial  
3. **Code** — Extension code  

### `CustomAppDetailView.vue`

1. **Identity** — App name (field + ro duplicate pattern), KSUID (ro), Display name (ro), Description (ro)  
2. **Settings** — Tenant (select + ro), Active?, Span, Strip tags?, Direct dial (ro mix)  
3. **Code** — Extension code (field + ro)  

---

## Day timers

### `DayTimerCreateView.vue`

1. **Rule** — Description, Tenant  

### `DayTimerDetailView.vue`

1. **Identity** — pkey (ro), State (ro)  
2. **Rule** — Tenant, Description, Day of week, All day, Start time, End time  

---

## Devices (templates) — special case

**Not part of standardisation** (template + audit shape). See `DeviceCreateView.vue` / `DeviceDetailView.vue` in the repo for field order.

---

## Extensions

### `ExtensionCreateView.vue`

1. **Identity** — Extension number, Tenant, Name (optional), Common name, Description, Extension type, MAC address (optional)  
2. **Settings** — Device (ro), Active?, Transport  
3. **Advanced** — Callback to, Caller ID, Cell phone, Cell twin, Devicerec, DVR voicemail, Protocol (IP version), Voicemail forward (email)  

### `ExtensionDetailView.vue`

1. **Identity** — Ext, SIP Identity, SIP Password (ro), KSUID, MAC address, Extension type (ro), Device, **Tenant**, User (extension name), Common name, Description, Active?  
2. **Transport** — Technology, Transport  
3. **Advanced** — Callback to, Caller ID, Cell phone, Cell twin, Devicerec, DVR voicemail, Call max, Ext alert, Protocol (IP version), Voicemail forward (email), Provision, Provision with  
4. **Runtime** — cfim, cfbs, ringdelay (+ live IP/Status when SIP)  

---

## Greetings

### `GreetingCreateView.vue`

1. **Identity** — Greeting number, Tenant  
2. **Metadata** — Common name, Description  
3. **Audio** — file input (Audio file .wav/.mp3) + hint text  

### `GreetingDetailView.vue`

1. **Identity** — Greeting number (ro), UID, KSUID, **Tenant (required)**  
2. **Metadata** — Common name, Description, Original filename (ro), Type (ro)  
3. **Audio** — replace / upload controls (see file)  

---

## Help messages — special case

**Not part of standardisation** (help text + audit shape). See `HelpMessageCreateView.vue` / `HelpMessageDetailView.vue` in the repo for field order.

---

## Holiday timers

### `HolidayTimerCreateView.vue`

1. **Holiday** — Description, Tenant  

### `HolidayTimerDetailView.vue`

1. **Identity** — pkey (ro), State (ro)  
2. **Holiday** — Tenant, Description, Route, Start date, Start time, End date, End time  

---

## Inbound routes (DDI)

### `InboundRouteCreateView.vue`

1. **Identity** — Tenant, DDI type, Number (DiD/CLiD)  
2. **Destinations** — Open route, Closed route  

### `InboundRouteDetailView.vue`

1. **Identity** — Number (DiD/CLiD), DiD/CLiD (ro), UID, KSUID, Description (optional)  
2. **Settings** — Tenant, Active?, Open route, Closed route, Alert info (optional), MOH, SWOCLIP, DISA, DISA pass (optional), In prefix (optional), Tag (optional), CNAME, Device recording  

---

## IVRs

### `IvrCreateView.vue`

1. **Identity** — IVR Direct Dial, Description (optional), Display name (optional)  
2. **Settings** — Tenant, Active?, Greeting Number, Listen for extension dial?, Action on IVR Timeout  
3. **Keystroke options** — Table: for each key in `OPTION_ENTRIES` (0–9, \*, #): **Action on KeyPress** (select), **Tag**, **Alert**  

### `IvrDetailView.vue`

1. **Identity** — IVR Direct Dial (ro), UID (ro), KSUID (ro), Tenant, Description (optional), Display name (optional)  
2. **Settings** — Active?, Greeting Number, Listen for extension dial?, Action on IVR Timeout  
3. **Keystroke options** — Same grid as create  

---

## Queues

### `QueueCreateView.vue`

1. **Identity** — Queue Dial, Common name, Description  
2. **Settings** — Tenant, Active, Device recording, Strategy, Greeting number, Greeting, Options, Music class, Members  
3. **Timing & limits** — Timeout, Retry, Wrap-up time, Max length, Divert  
4. **Advanced** — Alert info, Outcome  

### `QueueDetailView.vue`

1. **Identity** — Queue Dial (ro), Common name, UID, KSUID, Active, Description  
2. **Options** — Device recording (required), Strategy, Greeting number, Greeting, Options, Music class, Members  
3. **Timing & limits** — (same as create)  
4. **Advanced** — (same as create)  

**Naming mismatch:** Create uses **Settings** for the block Detail calls **Options**.

---

## Outbound routes

### `RouteCreateView.vue`

1. **Identity** — Route name, Description, Common name  
2. **Settings** — Tenant, Active, Auth (PIN dial), Strategy  
3. **Dialplan** — Dialplan  
4. **Paths (trunks)** — Path 1 … Path 4  

### `RouteDetailView.vue`

1. **Identity** — Route name (ro), UID (ro), Common name, Description  
2. **Settings** — Tenant, Active?, Auth (PIN dial), Strategy  
3. **Dialplan** — Dialplan  
4. **Paths (trunks)** — Path 1 … Path 4  

**Create vs edit:** Create orders Identity as name → description → common name; edit orders name → local uid → ksuid → common name → description.

---

## Tenants

Section **order** (create and detail match):

1. **Identity**  
2. **Settings**  
3. **Timers** — driven by `TIMERS_FIELDS`  
4. **Advanced** — `ADVANCED_FIELDS`  
5. **Call recording** — `CALL_RECORDING_FIELDS`  
6. **Monitoring & hot desk** — `MONITORING_FIELDS`  
7. **Call control** — `CALL_CONTROL_FIELDS`  
8. **LDAP** — `LDAP_FIELDS`  

### `TenantCreateView.vue` — fixed fields

- **Identity** — Name, Description, CLID, Local area, Local dialplan  
- **Settings** — ChanMax, Max in, VoIP max  

### `TenantDetailView.vue` — fixed fields

- **Identity** — Name (ro), UID (ro), KSUID (ro), Description, CLID, Local area, Local dialplan  
- **Settings** — (same three numeric fields as create)  

### Dynamic field labels (create **and** detail, same order)

See `src/constants/tenantAdvanced.js`:

- **Timers:** Abstime, Ring delay, IVR key wait, IVR digit wait, Timer status (AUTO/CLOSED)  
- **Advanced:** Country code, Emergency numbers, Language, Operator, Spy pass, Sysop, Sys pass, Use MOH custom, Vmail age, Voice instr  
- **Call recording:** Call record 1, Rec age, Rec final dest, Rec file dlim, Rec grace, Rec limit (readonly), Rec max age, Rec max size, Rec used  
- **Monitoring & hot desk:** Mix monitor, Monitor out path, Monitor stage path, Hot desk lease (seconds)  
- **Call control:** Allow hash transfer, CFWD progress, CFWD answer, Lterm, Play beep, Play busy, Play congested, Play transfer  
- **LDAP:** LDAP base, LDAP host, LDAP OU, LDAP user, LDAP pass, LDAP TLS, LDAP anon bind  

---

## Trunks

### `TrunkCreateView.vue`

1. **Technology** — Technology (SIP / IAX2)  
2. **SIP registration** (SIP only) — How this trunk registers  
3. **Identity** — Trunk name, Common name, Description  
4. **Connection** — Host (unless accept-reg hint), Transport (SIP), Password (SIP)  

### `TrunkDetailView.vue`

1. **Identity** — Name, Common name, UID, KSUID, Transport, Technology  
2. **Settings** — Active?, SIP registration, Host, Username, Peername, Trunkname, Password, Call progress, Privileged  
3. **Advanced** — Caller ID, In prefix, Match, Device recording, Transform  

---

## Edit (detail) panels — structural patterns

Observations from comparing detail views (for standardisation and refactors). The inventory sections above remain the per-file source of truth.

### 1. The “identity stack” (when all three exist)

On many edits, **Identity** starts with the same logical order:

1. **Primary / human-facing key** (`pkey`, label varies: “Queue Dial”, “Room number”, “CoS key”, “Route name”, “IVR Direct Dial”, “Greeting number”, “Name” on trunks, etc.).
2. **UID** (`shortuid`).
3. **KSUID** (`id`, labeled **“KSUID”**).

That matches **Class of Service, Conference, Custom app, Greeting, IVR, Inbound route, Queue, Outbound route, Tenant, Trunk** (trunk then adds **Transport** and **Technology** in the same Identity block).

**Extension** uses the same data order for the two IDs but different labels: **Ext** → **SIP Identity** (still `shortuid`) → **SIP Password** (readonly) → **KSUID**, then MAC, type, device, tenant, etc.

### 2. Implementation pattern (not just layout)

Repeated mechanics:

- **`readonly-identity`** on that stack.
- **`FormReadonly`** vs **disabled `FormField`** behind **`isReadOnly('shortuid')` / `isReadOnly('id')`** (and sometimes `pkey`) so the same view can behave read-only or editable depending on context.

The visual pattern and the code pattern are aligned in several files (e.g. trunk, queue, IVR, class of service).

### 3. Where the triple is incomplete or different

- **Agent** — Agent number + Tenant + human fields + password; **no** UID / KSUID in the form.
- **Day timer** — `pkey` (label is literally **“pkey”**), optional UID, **State**; **no KSUID** in Identity.
- **Holiday timer** — pkey, UID (if present), State; same kind of lightweight Identity.

**Device** and **Help message** are **special cases** (ignored for this comparison); see stubs above.

So “most panels show pkey + shortuid + ksuid” is **directionally** true for dialplan-ish entities, but **not** for agents or timers (and not applicable to device/help).

### 4. Tenant placement

**Tenant** is almost always a **`FormSelect`** with a clear label, but **where** it lives varies:

- **Identity:** Agent, Conference, Extension, Greeting, IVR, Route, Class of Service (required tenant in Identity), etc.
- **Settings:** Inbound route, and create flows that mirror that split.

The control is consistent; the **section** is not.

### 5. Second section naming

After Identity, **“Settings”** is the default, but **Queue detail** uses **“Options”** for the same kind of block as create’s **“Settings”** — naming drift, not a different data model.

### 6. Obvious standardisation targets

If edit panels should feel the same:

- **Always the same order in Identity** when the API exposes them: **pkey (friendly label) → UID → KSUID**, then entity-specific readonly lines (e.g. SIP password, extension type), then **Tenant**, then common name / description / active as applicable.
- **Align outliers:** add UID + KSUID to **Agent** where the API exposes them, use a **human label** instead of **“pkey”** on day/holiday timers, and rename Queue’s **Options** → **Settings** (or the reverse on create) for parity.

---

## Cross-panel patterns to reconcile (for standardisation)

| Topic | Examples |
|--------|-----------|
| Section name for “queue/capacity options” | Queue **Settings** (create) vs **Options** (detail) |
| **Identity** field order | Route create: name, description, cname vs detail: name, shortuid, ksuid, cname, description |
| **Tenant** in Identity vs Settings | Extension detail: Tenant in Identity; Agent create: Tenant in Settings |
| **Password** placement | Agent create: under Identity; Agent edit: after Description in Identity |
| **Day / Holiday timers** | Create = single section; Detail adds **Identity** block before rule/holiday |
| **Heading class** | Most use `detail-heading`; IVR keystrokes use `destinations-heading` |
| **Trunk** | Create leads with **Technology** + **SIP registration** before Identity; detail is Identity-first |

---

## Files not in this inventory

- **List-only views:** `*ListView.vue` for each entity (no create/edit form inventory here).  
- **System / non-entity views:** as listed in **Out of scope** at the top of this doc.  
- **Special-case forms** (stubs only above): `Device*View.vue`, `HelpMessage*View.vue`.

When updating this inventory, a quick mechanical check:

```bash
rg 'class="detail-heading"' src/views/*CreateView.vue src/views/*DetailView.vue
rg 'class="section-title"' src/views/
```
