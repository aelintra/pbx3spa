# Extension provisioning – quickstart for next agent

**Goal:** SIP extensions with optional MAC (provisioned/unprovisioned), WebRTC extensions; Save vs Commit (no generator run on every Save). Plan is finalised; DB changes are done manually by the user; you implement API then frontend.

---

## Read first (in order)

| Order | Doc | Use |
|-------|-----|-----|
| 1 | **EXTENSION_PROVISIONING_DEPLOYMENT_PLAN.md** | Full plan; §8 Build readiness, §5 Implementation order, §2 API / §3 Frontend |
| 2 | **DATABASE_CHANGES_FOR_PROVISIONING.md** | Exact DB changes (user applies manually; you don’t run Laravel migrations on PBX3) |
| 3 | **EXTENSION_PROVISIONING_ISSUES.md** | Known fixes: getVendorFromMac path, adjustAstProvSettings object syntax, protocol dirty check, etc. |
| 4 | **LEGACY_SARK_EXTENSION_CREATE_REFERENCE.md** | Legacy create/Save/Commit behaviour (for parity) |
| 5 | **PANEL_PATTERN.md** | Frontend: FormSegmentedPill, useSchema, list/detail/create conventions |

---

## Implementation order

1. **Schema** – User adds `provision` and `provisionwith` to ipphone (see DATABASE_CHANGES_FOR_PROVISIONING.md). No action for you unless you need to run migration SQL on a dev DB yourself.
2. **API** – Extension model (provision, provisionwith); ExtensionController::save() (extensionType SIP/WebRTC, MAC → vendor, Device lookup, provision string, adjustAstProvSettings); getVendorFromMac path `/opt/pbx3/cache/manuf.txt`; update() for MAC add/change/remove and transport/protocol; updateableColumns; dirty/Commit design (can be minimal at first).
3. **Frontend** – ExtensionCreateView: extensionType (SIP/WebRTC) pills, MAC optional for SIP; ExtensionDetailView: schema-driven; later: Commit button (green/red), PJSIP config edit (can defer).
4. **Test** – Create SIP with/without MAC, WebRTC; update MAC; check provision string and Device/pjsipuser.

---

## Key files

| Area | File |
|------|------|
| Plan | `pbx3spa/workingdocs/EXTENSION_PROVISIONING_DEPLOYMENT_PLAN.md` |
| DB checklist | `pbx3spa/workingdocs/DATABASE_CHANGES_FOR_PROVISIONING.md` |
| API save/update | `pbx3api/app/Http/Controllers/ExtensionController.php` (save, update, getVendorFromMac, adjustAstProvSettings) |
| API model | `pbx3api/app/Models/Extension.php` (provision, provisionwith fillable) |
| Create view | `pbx3spa/src/views/ExtensionCreateView.vue` |
| Detail view | `pbx3spa/src/views/ExtensionDetailView.vue` |
| Schema (yardstick) | `pbx3/full_schema.sql` (ipphone); tenant build = `pbx3/pbx3-1/opt/pbx3/db/db_sql/sqlite_create_tenant.sql` |
| Generator (Commit runs this) | `pbx3/pbx3-1/opt/pbx3/scripts/genAst.sh` → `php/utilities/runAstGen.php` → GenClass (genPjsipPhones, genPjsipWebrtc) |
| Globals (API) | `pbx3api/app/Helpers/Helper.php` – `get_globals()`; FQDNPROV for provisionwith |

---

## Pre-build checks

- **Device table:** API must read Device (sipiaxfriend, technology). Confirm default DB connection includes Device (instance schema) or add way to query it.
- **Initial provision:** Only `#INCLUDE {device}` (+ Cisco tags if needed); then adjustAstProvSettings() adds transport/protocol lines (don’t pre-add .udp/.ipv4).
- **Dirty/Commit:** Decide where “dirty” lives and how frontend triggers Commit (e.g. instance endpoint that runs genAst.sh + reload). Can start minimal.

---

## Can defer

- **PJSIP config read/write in Edit panel** – API contract + backend write to endpoint file; add in a later pass.
- **Commit button placement** – Start with one place (e.g. app chrome); refine later.
- **Migration of existing DBs** – User runs migration SQL when ready; not blocked for API/frontend work.
