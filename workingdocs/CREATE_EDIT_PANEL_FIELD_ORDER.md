# Create & edit panels — section and field order (inventory)

**Purpose:** Baseline for standardising column/field order across the SPA.  
**Scope:** **Database-backed PBX entity CRUD only** — create/detail views for objects stored in the instance database (agents, extensions, queues, tenants, etc.).  
**Out of scope (not listed below):** system or non-entity UIs such as `SysglobalsEditView.vue`, `AsteriskFileDetailView.vue`, `NetworkView.vue`, backup/firewall/certificates/logs, dashboard, and `UserCreateView.vue` (app user provisioning).  
**Source of truth:** The Vue files (Mar 2026); this doc can drift — re-scan when changing forms.

**Conventions in use**

- Most CRUD panels use `<h2 class="detail-heading">` for sections.
- **IVR** keystroke block uses `destinations-heading` (not `detail-heading`).
- **Tenant** create/detail render Timers → Advanced → Call recording → Monitoring → Call control → LDAP from shared arrays in `@/constants/tenantAdvanced.js` (order is the array order there).
- **Readonly identity** fields often use `FormReadonly` on edit and plain `FormField` disabled on some views — labels still listed below.

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

1. **Identity** — CoS key (ro), Local UID (ro), KSUID (ro), Tenant (required), Active, Description  
2. **Settings** — Dialplan (required), Default open (ro)  

---

## Conferences

### `ConferenceCreateView.vue`

1. **Identity** — Room number, Common name, Description  
2. **Settings** — Tenant, Active, Type, Participant PIN, Admin PIN  

### `ConferenceDetailView.vue`

1. **Identity** — Room number (editable or ro), Common name, Local UID, KSUID, Tenant (required), Active, Description  
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

## Devices (templates)

### `DeviceCreateView.vue`

1. **Identity** — Template name, Description  
2. **Settings** — Technology, Owner, Provision  

### `DeviceDetailView.vue`

1. **Identity** — Template name (ro), Description (ro)  
2. **Settings** — Technology, Owner (ro)  
3. **System** — Created (ro), Updater (ro), Provision (ro)  

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

1. **Identity** — Greeting number (ro), Local UID, KSUID, **Tenant (required)**  
2. **Metadata** — Common name, Description, Original filename (ro), Type (ro)  
3. **Audio** — replace / upload controls (see file)  

---

## Help messages

### `HelpMessageCreateView.vue`

1. **Identity** — Message key, Display name  
2. **Help text** — Help text  

### `HelpMessageDetailView.vue`

1. **Identity** — Message key (ro), Display name (ro)  
2. **System** — Created (ro), Updater (ro)  
3. **Help text** — Help text (field + ro)  

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

1. **Identity** — Number (DiD/CLiD), DiD/CLiD (ro), Local UID, KSUID, Description (optional)  
2. **Settings** — Tenant, Active?, Open route, Closed route, Alert info (optional), MOH, SWOCLIP, DISA, DISA pass (optional), In prefix (optional), Tag (optional), CNAME, Device recording  

---

## IVRs

### `IvrCreateView.vue`

1. **Identity** — IVR Direct Dial, Description (optional), Display name (optional)  
2. **Settings** — Tenant, Active?, Greeting Number, Listen for extension dial?, Action on IVR Timeout  
3. **Keystroke options** — Table: for each key in `OPTION_ENTRIES` (0–9, \*, #): **Action on KeyPress** (select), **Tag**, **Alert**  

### `IvrDetailView.vue`

1. **Identity** — IVR Direct Dial (ro), Local UID (ro), KSUID (ro), Tenant, Description (optional), Display name (optional)  
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

1. **Identity** — Queue Dial (ro), Common name, Local UID, KSUID, Active, Description  
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

1. **Identity** — Route name (ro), Local UID (ro), Common name, Description  
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

- **Identity** — Name (ro), Local UID (ro), KSUID (ro), Description, CLID, Local area, Local dialplan  
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

1. **Identity** — Name, Common name, Local UID, KSUID, Transport, Technology  
2. **Settings** — Active?, SIP registration, Host, Username, Peername, Trunkname, Password, MOH, Call progress, SWOCLIP  
3. **Advanced** — Alert info, Caller ID, In prefix, Match, Tag, Callback, Privileged, IAX reg, Device recording, DISA, DISA pass, Transform  

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

When updating this inventory, a quick mechanical check:

```bash
rg 'class="detail-heading"' src/views/*CreateView.vue src/views/*DetailView.vue
rg 'class="section-title"' src/views/
```
