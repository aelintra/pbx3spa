# Sidebar navigation grouping

**Purpose:** Propose ways to group the left-hand panel list so it is easy to navigate and logically organised. Current state: one flat list of ~25 links in `AppLayout.vue`.

---

## Current flat list (for reference)

Home · Tenants · Extensions · Trunks · Queues · Conferences · Class of Service · Day timers · Holiday timers · Greetings · Agents · Routes · Custom Apps · Devices · Help messages · IVRs · Inbound routes · Users · System Globals · Firewall · Certificates · IP Settings · Asterisk Files · Logs · Backup

---

## Option A – By telephony / call flow

Group by “where the call is” and “who configures what.” Familiar to PBX admins.

| Group | Label | Items | Rationale |
|-------|--------|-------|-----------|
| **Home** | — | Home | Entry point; keep at top alone. |
| **Tenancy** | Tenancy | Tenants | Multi-tenant scope; often first thing to set. |
| **Inbound** | Inbound | Inbound routes | DID → route (greetings in ACD). |
| **Endpoints** | Endpoints | Endpoints, Conferences | SIP endpoints (phones) and meet-me conferences. |
| **Outbound** | Outbound | Trunks, Routes | Carrier and dial rules. |
| **ACD** | ACD | Queues, Agents, IVRs, Greetings | Automatic Call Distribution: queues, agents, IVRs, greetings (Conferences in Endpoints). |
| **Schedules & policy** | Schedules & policy | Day timers, Holiday timers, Class of Service | When and what is allowed. |
| **Applications** | Applications | Custom Apps, Devices, Help messages | Apps, device templates, help text. |
| **System** | System | Users, Certificates, IP Settings, Firewall, System Globals, Asterisk Files, Logs, Backup | Instance-wide config and ops. |

**Pros:** Matches call path (inbound → extension/queue → outbound). **Cons:** “Applications” is a bit of a catch-all.

---

## Option B – By resource type (identity / connectivity / handling / system)

Group by *kind* of thing, not call flow. Good for “I need to edit X.”

| Group | Label | Items | Rationale |
|-------|--------|-------|-----------|
| **Home** | — | Home | Single link at top. |
| **Tenants** | Tenants | Tenants | Scope for everything below. |
| **People & endpoints** | People & endpoints | Extensions | Identities and endpoints (Agents in ACD in Option A). |
| **Connectivity** | Connectivity | Trunks, Routes, Inbound routes | All routing: carrier, outbound, inbound. |
| **Call handling** | Call handling | Queues, Agents, IVRs, Conferences, Greetings | Where calls land and how they’re handled. |
| **Time & policy** | Time & policy | Day timers, Holiday timers, Class of Service | Schedules and CoS. |
| **Templates & content** | Templates & content | Devices, Custom Apps, Help messages | Reusable config and content. |
| **System** | System | Users, System Globals, Firewall, Certificates, IP Settings, Asterisk Files, Logs, Backup | Server and security. |

**Pros:** Clear “where do I find trunks?” (Connectivity). **Cons:** “Templates & content” mixes devices with apps and help.

---

## Option C – Minimal groups (fewer headings)

Fewer groups; only split when the list would otherwise be too long.

| Group | Label | Items |
|-------|--------|-------|
| **Home** | — | Home |
| **Setup** | Setup | Tenants, Extensions, Trunks, Routes, Inbound routes, IVRs, Queues, Conferences, Agents, Class of Service, Day timers, Holiday timers, Greetings, Custom Apps, Devices, Help messages |
| **Admin** | Admin | Users, System Globals, Firewall, Certificates, IP Settings, Asterisk Files, Logs, Backup |

**Pros:** Very simple. **Cons:** “Setup” is long and mixed; less logical scan.

---

## Recommended: Option A with small tweaks (Option A′)

Use **Option A** as the base, with two refinements:

1. **Rename “Applications”** to **“Devices & apps”** and order: Devices, Custom Apps, Help messages (devices first as hardware templates).
2. **Order within System** by frequency / risk: Users, Certificates, IP Settings, Firewall, System Globals, Asterisk Files, Logs, Backup (admin users first; backup last).

Resulting structure:

| Group | Items (in order) |
|-------|-------------------|
| **(no group)** | Home |
| **Tenancy** | Tenants |
| **Inbound** | Inbound routes |
| **Endpoints** | Endpoints, Conferences |
| **Outbound** | Trunks, Routes |
| **ACD** | Queues, Agents, IVRs, Greetings |
| **Schedules & policy** | Day timers, Holiday timers, Class of Service |
| **Devices & apps** | Devices, Custom Apps, Help messages |
| **System** | Users, Certificates, IP Settings, Firewall, System Globals, Asterisk Files, Logs, Backup |

**Why this works:**  
- **Easy to navigate:** Headings chunk the list; “Inbound”, “Outbound”, “System” are quick to scan.  
- **Logically organised:** Follows call flow (inbound → endpoints → outbound) and then support (queues, time, devices) and finally system.  
- **Scalable:** New panels (e.g. Recordings, LDAP) slot into existing groups or a new “Operational” group.

---

## Implementation notes

1. **AppLayout.vue**  
   - Replace the single `<nav class="nav">` block with **grouped sections**: each section has a heading (e.g. `<span class="nav-heading">Inbound</span>`) and a set of `router-link` items.  
   - Reuse existing `nav-link` and `active` classes; add a class for the group heading (e.g. `nav-heading`) and optionally a wrapper (e.g. `nav-group`).

2. **Styling**  
   - Headings: smaller font, uppercase or muted colour, padding so they sit above the links.  
   - Optional: collapsible groups (e.g. only “System” collapsed by default) if you add state later.

3. **Single source of structure**  
   - Consider a small **config array** in the layout (or a composable) that defines groups and links (path, label, optional route name). Render the nav from that so adding/removing/reordering is one place.

4. **Order of groups**  
   - Keep the table order above: Home → Tenancy → Inbound → … → System.  
   - Within each group, keep the item order as in the table (e.g. Inbound: Inbound routes, IVRs, Greetings).

5. **Permissions**  
   - Keep existing `auth.can('admin')` gating; only the structure of the list changes, not who sees it.

---

## Summary

- **Option A (A′):** Telephony/call-flow grouping — **recommended** for easy navigation and logical organisation.  
- **Option B:** Good alternative if you prefer “resource type” over “call flow.”  
- **Option C:** Use only if you want the fewest possible headings and can accept a long “Setup” list.

Implement by adding group headings and reordering links in `AppLayout.vue` (and optionally a nav config array) as above.
