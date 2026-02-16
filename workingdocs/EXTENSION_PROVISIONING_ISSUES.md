# Extension Provisioning Plan - Issues Found

**Date:** Review of EXTENSION_PROVISIONING_DEPLOYMENT_PLAN.md

**Important Use Case:** SIP extension can be created without MAC, then MAC added later via update. Must handle MAC lookup and provisioning setup when MAC is added.

---

## Critical Issues

### 1. **provisionwith is in guarded array** ✅ RESOLVED
**Location:** `Extension.php` line 45
**Issue:** `provisionwith` is in the `$guarded` array, which will prevent it from being set during `Extension::create()`
**Fix:** Remove `provisionwith` from guarded array (or use `$fillable` instead)
**Status:** ✅ AGREED - Will fix when we begin work
**Note:** Comment says "not in tenant schema" but we're adding it, so this needs updating

### 2. **adjustAstProvSettings() uses array syntax instead of object syntax** ✅ RESOLVED
**Location:** `ExtensionController.php` lines 660, 670, 680, etc.
**Issue:** Code uses `$extension['transport']` and `$extension['protocol']` (array syntax) but `$extension` is an Eloquent model (object)
**Fix:** Change to `$extension->transport` and `$extension->protocol`
**Status:** ✅ Will fix when we begin work
**Impact:** Will cause errors when method is called

### 3. **Initial provision string is incorrect** ✅ RESOLVED
**Location:** Plan section 2.2, line 69
**Issue:** Plan says to build initial provision as `#INCLUDE {device}\n#INCLUDE {device}.udp\n#INCLUDE {device}.ipv4`
**Reality:** Old system (view.php line 689) only adds `#INCLUDE {device}` initially
**Fix:** User doesn't care about timing - as long as final cascade matches old system
**Status:** ✅ RESOLVED - Will ensure final result matches old system's cascade of INCLUDES
**Note:** `adjustAstProvSettings()` will add transport/protocol includes later

### 4. **Missing: Device table lookup for technology and blfkeyname** ✅ RESOLVED
**Location:** Old system view.php line 675-677
**Issue:** Old system queries device table to get `technology` and `blfkeyname`
**Status:** ✅ YES - Need device table (holds provisioning templates)
**Decisions:**
- ✅ Need device table lookup for provisioning templates (`pjsipuser` field)
- ✅ Need to set `technology` from device table (old system: `$tuple['technology'] = $resdevice['technology'];`)
- ❌ BLF keyname: IGNORE (customers never used it, won't implement)
- ✅ Cisco XML: YES - need to add closing tags `</flat-profile></device>` for Cisco devices

### 5. **Missing: PJSIP instance creation** ✅ RESOLVED
**Location:** Old system view.php lines 726-731
**Issue:** Old system calls `createPjsipPhoneInstance()` or `createPjsipWebrtcInstance()` after creating extension
**Status:** ✅ Methods exist in `pbx3/pbx3-1/opt/pbx3/php/classes/HelperClass.php`:
  - `createPjsipPhoneInstance($key)` - creates template file at `ASTENDPOINTS/{key}_phone.conf`
  - `createPjsipWebrtcInstance($key)` - creates template file at `ASTENDPOINTS/{key}_webrtc.conf`
**Action Required:** Need to call these methods from `ExtensionController::save()` after creating extension:
  - For SIP extensions: call `createPjsipPhoneInstance($extension->shortuid)`
  - For WebRTC extensions: call `createPjsipWebrtcInstance($extension->shortuid)` (standardised on shortuid; Asterisk keys by shortuid)
**Note:** These methods may need to be modified/simplified for the new flow. They create template files that are later processed by `GenClass` to generate final PJSIP config files.

### 6. **MAC duplicate check scope unclear** ✅ RESOLVED
**Location:** Plan section 2.2, line 94
**Issue:** Plan says "check it doesn't exist in another extension" but doesn't specify global vs per-cluster
**Old system:** Checks globally (all extensions)
**Status:** ✅ RESOLVED - MACs are universally unique, should never be duplicate anywhere (global check)

### 7. **Protocol field confusion** ✅ RESOLVED
**Location:** ExtensionController.php line 194
**Issue:** Request uses `ipversion` but stores as `protocol` in attrs
**Current:** `$attrs['protocol'] = $request->input('ipversion');`
**Status:** ✅ DECISION - Rename `ipversion` → `protocol` in request (more accurate naming)
**Action:** Update validation and request handling to use `protocol` instead of `ipversion`

### 8. **Technology field for Mailbox**
**Location:** Extension model defaults `technology` to 'SIP'
**Issue:** Mailbox extensions might need different technology value
**Question:** What should `technology` be for Mailbox? (Old system might not set it, or sets from device table)

### 9. **adjustAstProvSettings() called on update but protocol change not checked**
**Location:** ExtensionController.php line 492-494
**Issue:** Only checks if `transport` is dirty, but should also check `protocol` (ipversion)
**Fix:** Add check for `protocol` changes: `if ($extension->isDirty('transport') || $extension->isDirty('protocol'))`

### 10. **Missing: BLF keyname handling** ✅ RESOLVED
**Location:** Old system view.php line 697-699
**Issue:** Old system adds `#INCLUDE {blfkeyname}` to provision string for non-Polycom devices
**Status:** ❌ IGNORE - Customers never used it, won't implement

### 11. **Missing: Cisco XML special handling** ✅ RESOLVED
**Location:** Old system view.php lines 703-706
**Issue:** Old system adds `</flat-profile></device>` XML closing tags for Cisco devices
**Status:** ✅ YES - Need to add closing tags for Cisco devices
**Implementation:** Detect Cisco devices (preg_match('/^[Cc]isco/', $device)) and append `\n</flat-profile>\n</device>` to provision string

---

## Medium Priority Issues

### 12. **get_globals() helper exists**
**Location:** Helper.php line 53-56
**Status:** ✅ Good - can use `get_globals()` to read `FQDNPROV`
**Usage:** `$globals = get_globals(); $provisionwith = ($globals->FQDNPROV === 'YES') ? 'FQDN' : 'IP';`

### 13. **Password generation handled**
**Location:** Extension.php constructor line 74
**Status:** ✅ Good - password auto-generated via `ret_password(12)`

### 14. **Location handling**
**Location:** Old system uses `get_location()` helper
**Status:** ✅ Good - user confirmed location always defaults to 'remote', no column needed

---

## User Decisions (Resolved)

1. ✅ **MAC duplicate check:** **Global** (MACs are universally unique, never duplicate anywhere)
2. ✅ **Device table:** **YES, needed** (holds provisioning templates)
3. ⚠️ **PJSIP instances:** Still need to determine if handled elsewhere or need to add
4. ❌ **BLF keyname:** **IGNORE** (customers never used it, won't implement)
5. ✅ **Cisco XML:** **YES, need to add** closing tags `</flat-profile></device>` for Cisco devices
6. ⚠️ **Technology field:** Still need to determine value for Mailbox (currently defaults to 'SIP')
7. ⚠️ **Protocol field:** Keep `ipversion` in request or rename to `protocol`? (Still need decision)
8. ✅ **Initial provision string:** User doesn't care when INCLUDES are added, as long as final cascade matches

---

## Recommended Fixes Before Implementation

1. ✅ **Remove `provisionwith` from guarded array** in Extension model (AGREED - fix when we begin work)
2. ✅ **Fix `adjustAstProvSettings()` array syntax → object syntax** (Will fix when we begin work)
3. ✅ **Initial provision string:** User doesn't care about timing, as long as final result matches old system
4. ✅ **Add protocol change check** to update() method: `if ($extension->isDirty('transport') || $extension->isDirty('protocol'))`
5. ✅ **MAC duplicate check:** Global scope (check all extensions, universally unique)
6. ✅ **Device table lookup:** YES - need to query for provisioning templates (`pjsipuser` field) and `technology`
7. ✅ **PJSIP instance creation:** Methods exist in `HelperClass.php` - need to call from `ExtensionController::save()` after extension creation (may need modification/simplification)
8. ❌ **BLF keyname:** IGNORE - won't implement (customers never used it)
9. ✅ **Cisco XML handling:** YES - add closing tags `</flat-profile></device>` for Cisco devices
10. ✅ **Technology field:** DECISION - Drop Mailbox option for now (can be created via other methods)
11. ✅ **Protocol field:** DECISION - Rename `ipversion` → `protocol` in request (more accurate naming)

---

## Additional Notes

- **Important Use Case:** SIP extension can be created without MAC address, then MAC added later via update. When MAC is added:
  - Must perform MAC vendor lookup
  - Must query Device table for provisioning template (`sipiaxfriend` → `pjsipuser`)
  - Must set `technology` from Device table
  - Must build initial `provision` string with base device include
  - Must call `adjustAstProvSettings()` to add transport/protocol includes
  - Must handle Cisco XML closing tags if Cisco device
  - Must validate MAC not duplicate (excluding current extension)
- **Provisioning listener:** Located at `/Users/jeffstokoe/GiT/sail65/sail-6/opt/sark/provisioning` - handles actual provisioning requests
- **Device table structure:** Found in `/Users/jeffstokoe/GiT/sail65/sail-6/opt/sark/db/db_v4_create.sql` (lines 104-124)
  - **Key columns:**
    - `pkey` (PRIMARY KEY) - device vendor name (e.g., 'Yealink', 'Cisco', 'General SIP')
    - `sipiaxfriend` - Asterisk SIP/PJSIP template (stored in `ipphone.pjsipuser`)
    - `technology` - Technology type ('SIP', 'IAX2', etc.) - stored in `ipphone.technology`
    - `provision` - Provisioning template string (used to build `ipphone.provision`)
    - `blfkeyname` - BLF key template (IGNORED - customers never used it)
  - **Query:** `SELECT sipiaxfriend, technology, blfkeyname FROM Device WHERE pkey = ?`
  - **Usage:** When MAC vendor is found, query Device table by vendor name (`pkey`), then:
    - Set `ipphone.pjsipuser` = `Device.sipiaxfriend`
    - Set `ipphone.technology` = `Device.technology`
    - Use `Device.provision` to build initial `ipphone.provision` string
