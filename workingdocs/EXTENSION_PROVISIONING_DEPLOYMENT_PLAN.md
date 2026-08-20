# Extension Provisioning Deployment Plan

**Status: Finalised – ready for implementation.** Database changes are manual (user will apply); API and frontend work can follow §5 Implementation Order.

---

## Handover for next agent

**To implement extension provisioning, read in this order:**

1. **This file (§8 Build readiness, §5 Implementation Order)** – what to build and in what order.
2. **DATABASE_CHANGES_FOR_PROVISIONING.md** – exact list of DB changes (user is doing these manually; no Laravel migrations on PBX3).
3. **EXTENSION_PROVISIONING_QUICKSTART.md** – one-page quick reference: key files, pre-build checks, what can be deferred.
4. **EXTENSION_PROVISIONING_ISSUES.md** – known bugs/fixes (getVendorFromMac path, adjustAstProvSettings object syntax, etc.).
5. **LEGACY_SARK_EXTENSION_CREATE_REFERENCE.md** – how the legacy SARK admin UI did create/Save/Commit (for parity).
6. **PANEL_PATTERN.md** – frontend conventions (FormSegmentedPill, useSchema, etc.).

**Implementation order:** Schema (user) → API (ExtensionController save/update, getVendorFromMac, adjustAstProvSettings, Device/globals) → Frontend (ExtensionCreateView extensionType/MAC, then Save/Commit when designed). PJSIP endpoint edit in UI can be deferred.

---

**Purpose:** Add provisioning support for SIP extensions (provisioned and unprovisioned) in the new system.

**Scope:** Schema changes, API updates, frontend updates to support two extension types: SIP (with optional MAC for provisioning), WebRTC.
**Note:** Mailbox option deferred - can be created via other methods.

**Reference:** How the legacy system did it is captured in `workingdocs/LEGACY_SARK_EXTENSION_CREATE_REFERENCE.md`.

**Device table:** Schema and data lifted from the legacy SARK package as-is and integrated: Device CREATE added to `sqlite_create_instance.sql`, data in `sqlite_device_data.sql` (copy of legacy `db_v4_device.sql`), loaded by `create.initial.db` and `reloader.sh` after instance schema. You can review/edit `sqlite_device_data.sql` as needed.

---

## 1. Schema Changes

### 1.1 Add columns to ipphone table

**Files to update:**
- `pbx3/pbx3-1/opt/pbx3/db/db_sql/sqlite_create_tenant.sql`
- `pbx3/full_schema.sql`

**Columns to add:**
```sql
"provision" TEXT,                        -- provisioning string with #INCLUDE directives
"provisionwith" TEXT DEFAULT 'IP',      -- how to provision: 'IP' or 'FQDN'
```

**Placement:** Add after `pjsipuser` (line 227) and before `stealtime` (line 228) in sqlite_create_tenant.sql.

**Notes:**
- `provision` stores the `#INCLUDE` directives (e.g., `#INCLUDE Yealink\n#INCLUDE yealink.udp\n#INCLUDE yealink.ipv4`)
- `provisionwith` defaults to 'IP' (can be 'IP' or 'FQDN' based on globals.FQDNPROV)
- Location always defaults to 'remote' (no column needed)
- Ignore: `sndcreds`, `firstseen`, `lastseen` (not needed)

### 1.2 Migration and database build (manual; PBX3 is not Laravel)

**PBX3 owns the database and is not Laravel-based.** It does not use Laravel migration routines. Schema changes are applied manually: (1) update the build routines (so new installs get the columns), and (2) run migration SQL against existing databases.

**Build routines (for new installs):** Update `sqlite_create_tenant.sql` and `full_schema.sql` as in §1.1 so that new database builds include `provision` and `provisionwith`.

**Migration SQL (for existing DBs):** Create and run manually when ready (e.g. in a later iteration). Suggested file: `pbx3/pbx3-1/opt/pbx3/db/db_sql/migrations/add_provisioning_columns.sql` (or equivalent):

```sql
-- Add provisioning columns to existing ipphone tables
ALTER TABLE ipphone ADD COLUMN "provision" TEXT;
ALTER TABLE ipphone ADD COLUMN "provisionwith" TEXT DEFAULT 'IP';
```

**Run:** Execute this SQL against existing databases before or when deploying API changes. Migration and build-routine updates will be done manually; no Laravel migrations on the PBX3 side.

**Full checklist:** See **workingdocs/DATABASE_CHANGES_FOR_PROVISIONING.md** for the complete list of files to edit and the exact migration SQL.

---

## 2. API Changes (pbx3api)

### 2.1 Update Extension Model

**File:** `pbx3api/app/Models/Extension.php`

**Add to fillable/guarded:**
- Add `provision` and `provisionwith` to fillable array (if using fillable)
- Or ensure they're not in guarded array

### 2.2 Update ExtensionController::save()

**File:** `pbx3api/app/Http/Controllers/ExtensionController.php`

**Current state:** Line 112-215, accepts `protocol: SIP|WebRTC|Mailbox`

**Changes needed:**

1. **Change parameter name:** `protocol` → `extensionType` (values: `SIP`, `WebRTC`)
   **Note:** Mailbox option removed - deferred for now

2. **SIP type handling:**
   - If `macaddr` provided:
     - Call `getVendorFromMac($macaddr)` to get device vendor
     - Validate MAC not duplicate (check existing MACs)
     - Set `device` from vendor lookup
     - Query Device table for this device: `sipiaxfriend`, `technology`; set `pjsipuser` and `technology` on the new extension from that row.
     - Build initial `provision` string: `#INCLUDE {device}` only (BLF ignored per issues doc; add Cisco closing tags `\n</flat-profile>\n</device>` if device matches Cisco). Then call `adjustAstProvSettings()` to add transport/protocol includes (do not pre-add .udp/.ipv4 in initial string).
   - If `macaddr` not provided:
     - Set `device = 'General SIP'`
     - Query Device for `General SIP` → set `pjsipuser`, `technology` from that row
     - Leave `provision` empty/null

3. **WebRTC type:** 
   - Set `device = 'WebRTC'`, `transport = 'wss'`
   - Query Device for `WebRTC` → set `pjsipuser`, `technology` from that row
   - No `provision` string

4. **Set `provisionwith`:**
   - Read from `globals.FQDNPROV` (if 'YES' → 'FQDN', else 'IP')
   - Default to 'IP' if globals not available

6. **Call `adjustAstProvSettings()` after setting transport/protocol:**
   - This adjusts `provision` string based on transport (UDP/TCP/TLS) and protocol (IPV4/IPV6)
   - Only call if `provision` exists (i.e., MAC was provided)

**Validation updates:**
- `extensionType`: required, must be `SIP` or `WebRTC`
- MAC address: optional, only valid if `extensionType = 'SIP'`
- MAC format: `regex:/^[0-9a-fA-F]{12}$/` (12 hex chars, no colons)
- MAC duplicate check: if MAC provided, check it doesn't exist globally in any extension
- `protocol`: rename from `ipversion` to `protocol` (values: `IPV4`, `IPV6`)

### 2.3 Update getVendorFromMac() method

**File:** `pbx3api/app/Http/Controllers/ExtensionController.php` (line 589)

**Current:** Uses `/opt/pbx3/www/pbx3-common/manuf.txt`

**Change path to:** `/opt/pbx3/cache/manuf.txt`

**Rationale:**
- File is managed by `pbx3/scripts/getmaclist.sh` which downloads from IEEE and stores in cache
- Matches pbx3 config.php `CACHE` constant
- File already exists in repo at `pbx3-1/opt/pbx3/cache/manuf.txt`

**Update line 598:** Change path from `/opt/pbx3/www/pbx3-common/manuf.txt` to `/opt/pbx3/cache/manuf.txt`

**Supported vendors:** Snom, Panasonic, Yealink, Polycom, Fanvil, Cisco, Gigaset, Aastra, Grandstream, Vtech (match old system; see Notes)

**Note:** The file is automatically updated by `getmaclist.sh` cron job (downloads from IEEE OUI database).

### 2.4 Update adjustAstProvSettings() method

**File:** `pbx3api/app/Http/Controllers/ExtensionController.php` (line 632)

**Current:** Already exists but assumes `$extension->provision` exists

**Changes needed:**
- Ensure it handles null/empty `provision` gracefully
- Only adjust if `provision` is not null/empty
- Called during create (after setting transport/protocol) and update (when transport/protocol changes)

**Logic:** 
- Remove old transport/protocol includes
- Add new includes based on device vendor (Snom/Yealink/Panasonic), transport (UDP/TCP/TLS), protocol (IPV4/IPV6)

### 2.5 Update ExtensionController::update()

**File:** `pbx3api/app/Http/Controllers/ExtensionController.php` (line 482)

**Changes needed:**

1. **MAC address addition/changes:**
   - **Use case:** SIP extension created without MAC, then MAC added later
   - **Detection:** Check if `macaddr` is dirty AND:
     - Was null/empty, now has value (MAC being added)
     - OR was one value, now different (MAC being changed)
   - **When MAC added/changed:**
     - Validate MAC format: `regex:/^[0-9a-fA-F]{12}$/` (12 hex chars, no colons)
     - Check MAC not duplicate globally (exclude current extension's id)
     - Call `getVendorFromMac($macaddr)` to get device vendor
     - If vendor found:
       - Query Device table: `SELECT sipiaxfriend, technology FROM Device WHERE pkey = ?`
       - Set `device` = vendor name
       - Set `pjsipuser` = `Device.sipiaxfriend` (provisioning template)
       - Set `technology` = `Device.technology`
       - Build initial `provision` string: `#INCLUDE {device}\n`
       - Add Cisco XML closing tags if Cisco device: `\n</flat-profile>\n</device>`
       - Call `adjustAstProvSettings($extension)` to add transport/protocol includes
     - If vendor not found:
       - Reject update with validation error: "Can't find Manufacturer for this MAC"
   - **When MAC removed (set to null/empty):**
     - Set `device` = 'General SIP' (if SIP extension)
     - Clear `provision` string
     - Clear `pjsipuser` (match unprovisioned state)

2. **Transport/Protocol changes:**
   - Call `adjustAstProvSettings()` when `transport` OR `protocol` changes
   - Current code only checks `transport` (line 492) - add `protocol` check
   - Only call if `provision` exists (not null/empty)

3. **Validation:**
   - MAC format validation in `ExtensionRequest` (already exists, line 37)
   - Add MAC duplicate check in `update()` method (exclude current extension)
   - MAC vendor lookup validation (must find vendor if MAC provided)

### 2.6 Update updateableColumns

**File:** `pbx3api/app/Http/Controllers/ExtensionController.php` (line 21-42)

**Add:**
```php
'provision' => 'string|nullable',
'provisionwith' => 'in:IP,FQDN',
```

### 2.7 Streamlined approach: DB-first, generator creates Asterisk object

**Question:** Do we need the API (or any separate process) to create the per-extension PJSIP file (`{shortuid}_phone.conf` / `{shortuid}_webrtc.conf`) after extension create?

**Finding:** In PBX3 the **generator already creates the endpoint file on demand**. Flow today:

1. **genAst.sh** → **runAstGen.php** → **GenClass::genAsterisk()** → **genPjsipPhones()** / **genPjsipWebrtc()**.
2. Those methods read all active ipphone rows and for each call **HelperClass::getPjsipPhoneInstance(shortuid)** or **getPjsipWebrtcInstance(shortuid)**.
3. **getPjsip*Instance(key)** calls **createPjsip*Instance(key)** first, which **copies the template to `ASTENDPOINTS/key_phone.conf` (or webrtc) if the file is missing or empty**. Then it returns the file contents.
4. GenClass concatenates those contents (with xlatePjsipBuff substitution) into **pjsip_ready_phones.conf** / **pjsip_ready_webrtc.conf**, which main **pjsip.conf** includes.

So the **Asterisk object is created when the generator runs**, not when the API inserts the row. The API does not need to call PHP Helper or touch the filesystem to create the endpoint file.

**Streamlined requirement:**

- **Extension create (API):** Insert ipphone row only (pkey, shortuid, device, provision, pjsipuser, etc.). Do **not** implement an API→PHP or API→filesystem step to create the endpoint file.
- **Trigger config regeneration** in the instance context after extension create (and after extension update that affects PJSIP). When **genAst.sh** (or equivalent) runs, **genPjsipPhones** / **genPjsipWebrtc** will see the new row, call **getPjsipPhoneInstance(new_shortuid)**, which will create the file from template and include it in the aggregate. Asterisk reload then uses the new object.

**Implications:**

- **Single writer:** Only the generator (running on the instance with the correct SYSDB and ASTENDPOINTS) creates or updates the endpoint file. No duplicate logic in the API.
- **Save vs Commit (legacy pattern):** In the legacy SARK admin UI **Save** (on create/edit panels) wrote to the DB and set the dirty flag (Commit button went red), but the user did **not** have to press Commit before leaving the panel. The user could do a **series of Saves** on different rows/objects, then press **Commit** once when done; Commit ran the generator and Asterisk reload (button went green). So: **Save** = persist to DB + set dirty; **Commit** = run generator + reload. PBX3 should mirror this: Save (create/update) never runs the generator; Commit is a separate action (e.g. button on every panel or in app chrome), green when clean and red when there are uncommitted changes. See **LEGACY_SARK_EXTENSION_CREATE_REFERENCE.md §9** (commitflag, sysCommit, commitButton).
- **Edit flow:** If the user edits the PJSIP config in the UI, the API still needs a way to **write** the endpoint file content (e.g. an API that the frontend calls, which triggers a write on the instance side). So: create = DB + set dirty; Commit = run generator + reload. Edit of endpoint content = API write to file + set dirty; Commit = run generator + reload.

---

## 3. Frontend Changes (pbx3spa)

**Panel pattern:** All changes must follow `pbx3spa/workingdocs/PANEL_PATTERN.md`. Extensions use the standard three panels only: **ExtensionsListView**, **ExtensionCreateView**, **ExtensionDetailView** (no fourth panel). Use `shortuid` for routing and API (tenant-scoped resource). Use shared form components (`FormField`, `FormSelect`, `FormToggle`, `FormReadonly`), `useSchema('extensions')` in Create and Edit, `normalizeList` from `@/utils/listResponse.js`, and `<DeleteConfirmModal>` where applicable. **API field parity:** Create and Edit must expose every field the API accepts (including `extensionType`, `protocol`, `macaddr`, and any new updateableColumns); use `getSchema('extensions')` for readonly vs editable on Edit and `applySchemaDefaults('extensions', refsByKey)` on Create. **Tenant (cluster):** Keep existing tenant resolution pattern (options = pkey; resolve cluster shortuid→pkey on load/display).

### 3.1 Update ExtensionCreateView.vue

**File:** `pbx3spa/src/views/ExtensionCreateView.vue`

**Current state:** Uses `protocol` ref with values 'SIP', 'WebRTC', 'Mailbox' (Mailbox to be removed)

**Changes needed:**

1. **Rename `protocol` → `extensionType`:**
   - Change ref name throughout component
   - Update API call to send `extensionType` instead of `protocol`

2. **Type chooser:**
   - Options: SIP, WebRTC only (remove Mailbox). Per PANEL_PATTERN fixed-choice: **2 options → use FormSegmentedPill** (not dropdown).
   - Label: "Extension type" (instead of "Protocol")

3. **Conditional MAC field:**
   - Show MAC address field only when `extensionType === 'SIP'`
   - Make MAC optional (not required)
   - Hint text: "Optional. Required for device provisioning (auto-detects vendor)."

4. **Default transport:**
   - SIP: default to 'udp'
   - WebRTC: default to 'wss' (already done)

5. **Update API call:**
   - Send `extensionType` instead of `protocol`
   - Send `macaddr` only if provided (don't send empty string)

### 3.2 Update device display

**Current:** `deviceDisplay` computed shows device based on protocol

**Update:** Show device based on `extensionType`:
- SIP with MAC: "Provisioned SIP" or device vendor name (if available)
- SIP without MAC: "General SIP"
- WebRTC: "WebRTC"

### 3.3 Per-extension PJSIP config (endpoint file) — display and edit

**Paths (confirmed):**
- **Per-extension configs:** `pbx3/pbx3-1/opt/pbx3/etc/asterisk/endpoints/`
  - SIP: `{shortuid}_phone.conf`
  - WebRTC: `{shortuid}_webrtc.conf` (standardised on shortuid; Asterisk config keys by shortuid)
- **Amalgamated output:** `pbx3/pbx3-1/opt/pbx3/etc/asterisk/configs/pjsip_ready_phones.conf` (SIP) and `pjsip_ready_webrtc.conf` (WebRTC)
- **Flow:** HelperClass creates/reads/writes per-extension files in `endpoints/`; GenClass reads those files, does variable substitution (`xlatePjsipBuff`), and writes the combined result into `configs/pjsip_ready_phones.conf` / `pjsip_ready_webrtc.conf`. Main `pjsip.conf` includes those ready files.

**UX requirement (from old system):**
- The old system showed the **phone config** (content of the endpoint file from `endpoints/`) in a **longtext block** so the user could **modify the template** if required.
- **Implement:** In **ExtensionDetailView** (edit panel), display the endpoint config in an editable longtext (e.g. FormField with textarea or a dedicated longtext control per PANEL_PATTERN; label "PJSIP config" or "Phone config"), and persist changes back (API must support read/write of this content so the backend can write to the endpoint file; then config regen/amalgamation runs as today).

**Note:** Both SIP and WebRTC use `shortuid` for the endpoint filename; Asterisk config keys endpoints by shortuid.

### 3.4 Panel pattern checklist (extensions)

When implementing frontend changes, verify:

- [ ] **Three panels only:** List (`ExtensionsListView`), Create (`ExtensionCreateView`), Edit (`ExtensionDetailView`). No extra panel.
- [ ] **Routing:** Detail route uses `:shortuid`; list/detail/delete use `shortuid` with null guard.
- [ ] **Form components:** All fields use `FormField` / `FormSelect` / `FormToggle` / `FormReadonly` (no raw `<input>`/`<label>`). PJSIP longtext: use FormField textarea or equivalent shared control.
- [ ] **useSchema:** Create calls `ensureFetched()` then `applySchemaDefaults('extensions', refsByKey)`; Edit calls `ensureFetched()` before load and uses `getSchema('extensions')` for readonly vs editable.
- [ ] **API field parity:** Every API-accepted field (create/update) has a form control; new/renamed fields (`extensionType`, `protocol`, `macaddr`, `provision`, `provisionwith` per updateableColumns) included.
- [ ] **Fixed choice:** extensionType = 2 options (SIP, WebRTC) → FormSegmentedPill; protocol (IPV4/IPV6) = 2 options → pills; transport/devicerec = 4+ → FormSelect.
- [ ] **Tenant:** Cluster dropdown options = tenant pkey; resolve `resource.cluster` (shortuid→pkey) when loading Edit and when displaying in List.
- [ ] **Edit actions:** Save, Cancel, Delete at top and bottom (`.edit-actions`, `.edit-actions-top`); use `<DeleteConfirmModal>` for delete.
- [ ] **Headings:** Create = "Create extension"; Edit = "Edit Extension {displayName || pkey}".
- [ ] **normalizeList:** Use from `@/utils/listResponse.js` for list (and any list fetches in Create/Edit).

---

## 4. Testing Checklist

### 4.1 Schema
- [ ] Columns added to sqlite_create_tenant.sql (build routine for new installs)
- [ ] Columns added to full_schema.sql
- [ ] Migration SQL for existing DBs created; run manually when ready (PBX3 has no Laravel migrations)

### 4.2 API
- [ ] Create SIP extension with MAC (provisioned) → device set from MAC, provision string created
- [ ] Create SIP extension without MAC (unprovisioned) → device = 'General SIP', no provision
- [ ] Create WebRTC extension → device = 'WebRTC', transport = 'wss', no provision
- [ ] **Update: Add MAC to existing SIP extension** → MAC lookup, device set, provision string created
- [ ] **Update: Change MAC on existing SIP extension** → New MAC lookup, device updated, provision string rebuilt
- [ ] **Update: Remove MAC from SIP extension** → device = 'General SIP', provision cleared
- [ ] **Update: Change transport/protocol** → `adjustAstProvSettings()` called, provision includes updated
- [ ] MAC duplicate check works
- [ ] Invalid MAC format rejected
- [ ] Unknown MAC vendor rejected (or handled gracefully)
- [ ] provisionwith set from globals.FQDNPROV
- [ ] adjustAstProvSettings() called on create (when MAC provided)
- [ ] adjustAstProvSettings() called on update (when transport/protocol changes)

### 4.3 Frontend
- [ ] Type chooser shows SIP/WebRTC (no Mailbox)
- [ ] MAC field shows only for SIP
- [ ] MAC field optional (can create SIP without MAC)
- [ ] API call sends `protocol` instead of `ipversion`
- [ ] Default transport: SIP = 'udp', WebRTC = 'wss'
- [ ] API call sends `extensionType` (not `protocol`)
- [ ] Empty MAC not sent to API
- [ ] **Extension edit:** PJSIP config (endpoint file content) shown in editable longtext; save updates endpoint file (API support TBD)

### 4.4 Integration
- [ ] End-to-end: Create provisioned SIP → verify provision string in DB
- [ ] End-to-end: Create unprovisioned SIP → verify device = 'General SIP'
- [ ] End-to-end: Update extension transport → verify provision string updated
- [ ] Verify pjsipuser template populated correctly
- [ ] **Streamlined:** After extension create, set dirty; user presses Commit; verify generator runs, endpoint file appears under ASTENDPOINTS and is included in pjsip_ready_phones/webrtc, Asterisk reloads, button goes green

---

## 5. Implementation Order

1. **Schema first** (can't proceed without columns)
   - Add columns to schema files (sqlite_create_tenant.sql, full_schema.sql) so new DB builds include them
   - Migration for existing DBs is manual (PBX3 is not Laravel); create migration SQL and run manually when ready (can be a later iteration)

2. **API backend** (core logic)
   - Update Extension model
   - Update ExtensionController::save() for SIP type handling (DB only; no endpoint file creation in API)
   - Add MAC validation and duplicate check
   - Integrate getVendorFromMac() and adjustAstProvSettings()
   - On create/update (and other DB-changing operations): set "dirty" state (e.g. API or instance commitflag) so Commit button shows red. Commit action runs genAst.sh in instance context + Asterisk reload (see §2.7).
   - Test API endpoints

3. **Frontend** (UI)
   - Update ExtensionCreateView.vue
   - Test conditional fields
   - Test API integration
   - **Save:** On create/edit panels, Save persists to DB and sets dirty (Commit button goes red). User can leave the panel without pressing Commit.
   - **Commit button:** Present on every panel (or in app chrome). Green when no uncommitted changes, red when dirty. On click: call Commit endpoint (runs generator + reload); clear dirty state. User can do multiple Saves across panels and press Commit once when done with all changes.

4. **End-to-end testing**
   - Full flow: create all three types
   - Verify DB state
   - Verify provisioning strings

---

## 6. Notes

- **Location:** Always defaults to 'remote' (no column needed, handled in code)
- **sndcreds:** Ignored, defaults handled by provisioning system
- **firstseen/lastseen:** Not needed, ignored
- **manuf.txt path:** `/opt/pbx3/cache/manuf.txt` 
  - Managed by `pbx3/scripts/getmaclist.sh` (downloads from IEEE OUI database)
  - Updated weekly via cron: `0 0 * * 0` (Sunday midnight) in `pbx3-1/etc/cron.d/pbx3`
  - File is in `.gitignore` (runtime data, not committed - only `manuf.txt` is ignored, other cache files are kept)
  - Script filters for supported vendors: Snom, Panasonic, Yealink, Polycom, Fanvil, Cisco, Gigaset, Aastra, Grandstream, Vtech
- **provisionwith:** Read from `globals.FQDNPROV` on create, default 'IP'
- **pjsipuser:** Already exists, holds PJSIP template (no changes needed)
- **Save vs Commit:** Legacy SARK had **Save** (persist to DB + set dirty; user can leave without committing) and **Commit** (run generator + reload; user could batch many Saves and press Commit once when done). This is a common admin-panel pattern (draft/apply or save/deploy). PBX3 should replicate it (see §2.7 and LEGACY_SARK_EXTENSION_CREATE_REFERENCE.md §9).

---

## 7. Rollback Plan

If issues arise:
1. Revert API changes (ExtensionController::save() back to current state)
2. Revert frontend changes (ExtensionCreateView.vue)
3. Schema columns can remain (nullable, won't break existing code)
4. Migration can be reversed if needed (ALTER TABLE DROP COLUMN)

---

## 8. Build readiness

**Verdict: Ready to begin build** following the implementation order in §5. The plan has enough detail to implement schema, API (save/update, getVendorFromMac, adjustAstProvSettings), and frontend (Create/Edit, extensionType, MAC, Save vs Commit) in that order.

**Schema note:** PBX3 is not Laravel and has no migration runner. You will update the database build routines (schema files) and run migration SQL against existing DBs manually; this can be done in a later iteration if needed.

**Pre-build checks (unblock before or during Phase 2):**

1. **Device table and globals:** API must read Device (e.g. `sipiaxfriend`, `technology`) and globals (e.g. `FQDNPROV`). The codebase already has `get_globals()` and `DB::table(...)`. Confirm the API’s default DB connection includes the Device table (instance schema). If Device lives in a different DB (e.g. instance-only), add a way for the API to query it (e.g. same DB, or instance-scoped connection).
2. **Initial provision string:** Match old system: start with `#INCLUDE {device}` only; add BLF only if not Polycom (plan says BLF ignored); add Cisco closing tags if Cisco; then call `adjustAstProvSettings()` to add transport/protocol includes. Do not pre-add `.udp`/`.ipv4` before adjustAstProvSettings (see EXTENSION_PROVISIONING_ISSUES.md §3).
3. **Dirty and Commit:** Decide where “dirty” lives (e.g. instance commitflag file, or API/DB flag) and how the frontend triggers Commit (e.g. POST to instance, or API that proxies to instance). Can be a minimal first version: e.g. “dirty” in instance only, Commit button calls an endpoint that runs genAst.sh + reload. Can refine later (e.g. global Commit in app chrome).

**Can defer to a later phase:**

- **PJSIP config read/write in Edit panel** (§3.3): Requires an API contract and backend write to the endpoint file. You can ship create/update + Commit first and add “edit endpoint file in UI” in a follow-up.
- **Commit button placement:** Start with “on every panel” or “in app chrome”; UX can be tuned later.

**Known fixes already listed:** Extension model (provision/provisionwith fillable); getVendorFromMac path; adjustAstProvSettings object syntax and null-safe provision; protocol dirty check on update (EXTENSION_PROVISIONING_ISSUES.md).

---

**Status:** Finalised; ready for implementation. DB changes applied manually by user; then implement per §5.
