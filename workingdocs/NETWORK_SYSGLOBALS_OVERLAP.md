# Network vs System Globals

## Purpose

This document maps:

- what each panel shows,
- where each value is sourced from, and
- which fields overlap across both panels.

It also recommends whether to keep two panels or merge into one.

---

## Panels and primary API sources

## `NetworkView.vue` (`/ip-settings`, label: "Network")

- **Primary reads**
  - `GET /sysglobals`
  - `GET /syscommands/sysnotes`
  - `GET /syscommands/timezones`
- **Writes**
  - `PUT /sysglobals` (subset only: `bindport`, `staticipv4`, `tlsport`, `sitename`)
  - `PUT /syscommands/dns`
  - `PUT /syscommands/smtp` (when SMTP config exists)
  - `PUT /syscommands/timezone`
  - `PUT /syscommands/icmp`

## `SysglobalsEditView.vue` (`/sysglobals`, label: "System Globals")

- **Primary reads**
  - `GET /sysglobals`
  - `GET /tenants/default` (identity display only)
- **Writes**
  - `PUT /sysglobals` (broad update payload for many global columns)

---

## Overlap cross-reference

| Field (UI label) | Network panel source | System Globals source | Saved by Network | Saved by System Globals | Notes |
|---|---|---|---|---|---|
| Site Name (`sitename`) | `sysglobals.sitename` | `sysglobals.sitename` | Yes (`PUT /sysglobals`) | Yes (`PUT /sysglobals`) | **On-node friendly name** (HoR). Home header + session chips prefer this over FQDN. Catalog `label` is fleet-picker only (may mirror by convention). **Installer** must prompt and write `sysglobals.sitename` on first provision (see Locked decision below). |
| Hostname | `sysnotes.network.hostname` (read-only) | N/A | No | No | OS hostname from install/`hostnamectl`; **not editable** in Network (does not update `globals.fqdn`). Use **Site name** for a friendly label. |
| Bind Port (`bindport`) | `sysglobals.bindport` | `sysglobals.bindport` | Yes (`PUT /sysglobals`) | Yes (`PUT /sysglobals`) | True overlap, same source and destination. |
| TLS Port (`tlsport`) | `sysglobals.tlsport` | `sysglobals.tlsport` | Yes (`PUT /sysglobals`) | Yes (`PUT /sysglobals`) | True overlap, same source and destination. |
| Local IP (`localip` / `local_ip`) | `sysnotes.network.local_ip` | `sysglobals.localip` | No (display only) | No (display only) | Label overlaps, backing data source differs by panel. |
| Bind Address (`bindaddr`) | Not shown in Network | `sysglobals.bindaddr` | N/A | Yes (`PUT /sysglobals`) | Currently System Globals only. |
| Static IPv4 (`staticipv4`) | `sysglobals.staticipv4` | Not shown in System Globals (as form field) | Yes (`PUT /sysglobals`) | No (not currently exposed in SG form) | Network-only editable field at present. |

---

## Scope split (current behavior)

### Network

- Operational network/runtime oriented data:
  - Hostname (read-only), DNS, SMTP, timezone, ICMP from `syscommands/*`
  - selected SIP/network globals (`bindport`, `tlsport`, `staticipv4`, `sitename`) from `sysglobals`

### System Globals

- Broader PBX global config:
  - SIP/system limits
  - logging/recording/security/timeouts
  - domain/FQDN
  - system metadata (`z_created`, `z_updated`, `z_updater`)

---

## Recommendation

**Keep them as separate panels for now, but tighten ownership boundaries.**

### Why not merge immediately

- The two panels are backed by different API families (`sysglobals` vs several `syscommands/*` endpoints).
- A merged panel would mix distinct persistence paths and increase accidental coupling/risk.
- The current UX objective is progressive disclosure and clarity; a merged super-panel will likely become too dense.

### What to do next (recommended)

1. Define explicit field ownership:
   - **Network owns:** DNS, SMTP, timezone, ICMP, **sitename** (friendly label), and network-facing globals (`bindport`, `tlsport`, `staticipv4`). **Hostname** is display-only (instance FQDN identity lives in `globals.fqdn`, set at install).
   - **System Globals owns:** the rest.
2. NAT is fixed by template policy (`pbx3/pbx3-1/opt/pbx3/etc/asterisk/templates/pjsip_phone.tmpl`) and should not be user-editable in panels.
3. Remove duplicate editable fields from one side where practical (single source of edit truth).
4. Keep read-only informational duplicates only if they materially aid context.
5. Add a short note in both panels (or docs) describing ownership to avoid future drift.

This keeps complexity manageable and avoids a risky merge while still reducing user confusion.

---

## Locked decision (2026-07-30; **sync policy tightened 2026-08-03**) — friendly instance name

**Agree:** ops nicknames like “Golden” / “Kildare” are invented; they are not node identity (`fqdn` / `shortuid`).

| Field | Role |
|-------|------|
| `globals.fqdn` / OS hostname | Stable identity — TLS, API host, SIP where applicable |
| `globals.shortuid` | Opaque instance id (SUID) — catalog `id` usually matches |
| **`sysglobals.sitename`** | On-node friendly name **HoR** — Network **Site Name**, Home header, session chips |
| Catalog **`label`** | Fleet / instance chooser. **Must match `sitename` when both exist** (not a second independent nickname) |

### Display (SPA / fleet chooser) — locked 2026-08-03

**Friendly string** = non-empty **sitename** (or catalog **label**, once in sync) **else instance SUID** (`shortuid` / catalog `id`).  
Do **not** prefer full FQDN as the friendly fallback (FQDN remains identity / secondary detail).

```
display = sitename || catalog.label || shortuid
```
(After sync, first two are equal; order is defensive.)

### Sync (must not drift)

| Direction | When | Path |
|-----------|------|------|
| **sitename → catalog.label** | Installer site name; Network / sysglobals **Site Name** save; onboard that already knows sitename | **Gatekeeper** `PATCH /api/v1/instances/{id}` (or register body). **Rule 9/10:** not browser IAM, not instance Sanctum inventing catalog write |
| **catalog.label → sitename** | Optional later if Fleet Instances renames label | Fleet path may push node sitename (fleet.token); not v1 critical if operators edit **Site Name** as HoR |

### Edit semantics (locked 2026-08-03)

| Context | Site name save |
|---------|----------------|
| **Fleet node + catalog in use** | Change **sitename** → also set catalog **`label`** (same value) via **Gatekeeper**. If Gatekeeper/catalog write fails (control down, S3 issue, missing fleet config), **reject the save** — no partial update that reintroduces drift. |
| **Solo / no fleet catalog** | Sitename save **allowed** without catalog. |

Primary operator control: edit **sitename** (Network or Globals). Not two independent nicknames.

**SPA today** still uses sitename → FQDN → catalog (pre-sync). Implement dual-write + display fallback when scheduled — **`TODO.md`**.

**Installer:** still write **`sysglobals.sitename`** on first provision. Catalog register/onboard should seed **`label`** from that string (or SUID if empty).

**Tracked:** `pbx3/workingdocs/TODO.md`.