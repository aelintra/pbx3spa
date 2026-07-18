# SPA panel polish — 2026-07-18

**Purpose:** Running record of panel changes requested and completed during the SPA polishing session.

## Conventions

- Record each panel separately.
- Capture the requested change, implementation, and verification.
- Mark unfinished or deferred items explicitly.
- Keep this document focused on this session; broader design rules remain in the existing SPA workingdocs.

## Changes

### Inbound → DID routes → List

**Requested:** Remove UID column — not useful to operators.

**Done:**
- Removed UID (`shortuid`) column from list table (header + cells).
- Removed UID from CSV export columns and filter placeholder / filter match.
- `shortuid` still used internally for edit/delete routes and delete confirm.

**Files:** `src/views/InboundRoutesListView.vue`

**Note:** Server PDF export (`inboundroutes/export/pdf`) unchanged in this pass — may still include UID until API export is aligned.

**Verified:** Code change only (await browser check on list).

---

### Extensions → Edit

**Requested:** When provisioning a phone, operators need SIP User / SIP Password and also the SIP registrar. Registrar was missing, so they had to open Tenants to find the tenant SUID/FQDN. Add a read-only **SIP Registrar** row after **SIP Password**, value = tenant URL (FQDN) for this extension.

**Done:**
- Added read-only **SIP Registrar** after SIP Password.
- Value is the matched tenant’s `fqdn` (from the tenants list already loaded on this panel), keyed by the form’s Tenant / extension cluster.
- Updates if the Tenant select changes; shows `—` when FQDN is missing.

**Files:** `src/views/ExtensionDetailView.vue`

**Verified:** Code change only (await browser check on edit panel).

---

### Extensions → Create / Edit — Common name

**Requested:** Remove **Common name** from create and edit — unused and confusing.

**Done:**
- Removed Common name field from Extension create and edit panels.
- Stopped sending `cname` in create/save payloads (existing DB values left unchanged on edit).

**Files:** `src/views/ExtensionCreateView.vue`, `src/views/ExtensionDetailView.vue`

**Verified:** Code change only (await browser check).

---

### Extensions → List — Latency chip colors

**Requested:** Color-match Latency bubbles: green &lt;100ms, yellow 100–200ms, then orange / red for higher RTT.

**Done:**
- Thresholds in `liveLatencyChip.js`: green &lt;100; yellow 100–200; orange 201–300; red &gt;300.
- CSS: yellow `.list-chip--latency-warn`, orange `.list-chip--latency-caution`, red `.list-chip--latency-bad`.
- Shared by Extensions and Trunks lists (same chip component).
- Added Vitest coverage for thresholds.

**Files:** `src/utils/liveLatencyChip.js`, `src/utils/liveLatencyChip.test.js`, `src/assets/main.css`, `workingdocs/EXTENSIONS_LIVE_DATA.md`

**Verified:** Unit tests for thresholds.

---

### Extensions → Edit — Behaviour (was Runtime)

**Requested:** CFIM / CFBS / ring delay no longer need a separate Runtime edit mode (AMI is fast enough). Put the three fields inline in a **Behaviour** section after Transport and before Advanced.

**Done:**
- Added **Behaviour** section with always-editable CFIM, CFBS, Ring delay.
- Saved with the main **Save** (PUT `…/runtime` after extension + CoS).
- Removed bottom **Runtime** section and **Edit runtime** / Cancel sub-form.
- Dropped IP / Status (RTT) from edit (still on Extensions list).

**Files:** `src/views/ExtensionDetailView.vue`

**Verified:** Code change only (await browser check).
