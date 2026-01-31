# Extension Add Procedure (Wizard) – sarkextension

**Scope:** Creating a new extension via the sarkextension panel.  
**Location:** `sail-6/opt/sark/php/sarkextension/`

---

## 1. How you get to “New Extension”

- From the main extension list, user clicks **New** (action bar). That posts/requests with `new=1` or similar so the panel shows the “New Extension” form.
- In `showForm()` (view.php):
  - `if (isset($_POST['new']) || isset($_GET['new'])) { $this->showNew(); return; }`
- So the “wizard” is: **show New form → user fills and submits → saveNew() → then showEdit()** (or showNew again if validation fails). There is no multi-step server-side wizard; it’s one form with conditional fields driven by the “extension type” dropdown.

---

## 2. New Extension form (showNew)

- **Entry:** `showNew()` in view.php (lines ~337–434).
- **Suggested extension:** Start extension number comes from `$this->helper->getNextFreeExt()` (srkHelperClass): reads `globals.SIPIAXSTART`, then finds first `ipphone.pkey` >= that not in use.
- **Extension type chooser:** Dropdown `extchooser` built from:
  - **Adopt flow:** `?new=...&...` with adopt options: Provisioned, Unprovisioned (only).
  - **Normal create:** If `globals.VXT` then `createOptions`, else `createNoVxtOptions` (no “VXT batch”).
- **Options in dropdown:** Choose type, Provisioned, Unprovisioned, WebRTC, Provisioned batch, Unprovisioned batch, WebRTC batch, VXT batch (if VXT), MAILBOX.

### Form fields (all in one form, many hidden until type chosen)

| Div ID        | Shown when                    | Content |
|---------------|-------------------------------|--------|
| divchooser    | Always first                  | Extension type dropdown (extchooser) |
| divmacaddr    | Provisioned                   | MAC address (macaddr) |
| divrule       | All types except “Choose”     | Start extension number (blkstart, form name `pkey`) |
| divblksize    | * batch, VXT batch            | Block size (blksize) |
| divmacblock   | Provisioned batch             | Textarea list of MACs (txtmacblock) |
| divcalleridname | Provisioned, Unprovisioned, WebRTC, MAILBOX | Caller ID name (calleridname, form name `desc`) |
| divdevice     | (not shown by current JS)     | Device dropdown (General SIP + device list) |
| divdevicevxt  | VXT batch                     | VXT device (vxtdevice): Panasonic/Snom/Yealink VXT |
| cluster       | Always                        | Cluster selector (cluster) |

- Default description: `Ext` + suggested pkey (e.g. `Ext101`).
- Buttons: Cancel, Save (endsave). JS shows **save** / **endsave** only after user changes `extchooser` from “Choose extension type”.

---

## 3. Front-end behaviour (javascript.js)

- On load: hide all conditional divs and save/endsave; only divchooser visible.
- On `#extchooser` change:
  - Hide divchooser, show save/endsave.
  - Show divrule for all chosen types.
  - Show divmacaddr, divcalleridname for Provisioned.
  - divmacblock for Provisioned batch.
  - divblksize for Unprovisioned batch, WebRTC batch, VXT batch.
  - divcalleridname for Unprovisioned, WebRTC, MAILBOX.
  - divdevicevxt + divblksize for options containing “VXT”.
- Validation (jQuery validate): pkey/newkey range 001–99999, desc/callername, macaddr format (12 hex), email, digits for cfim/cfbs, ringdelay range.
- Form submits to same page (POST); no separate “update.php” for create – create is handled in view.php.

---

## 4. Submit and validation (saveNew)

- **Trigger:** `if (isset($_POST['save']) || isset($_POST['endsave']))` in showForm() → `saveNew()`.
- **Flow:** saveNew() validates, builds `$tuple`, then branches on `$_POST['extchooser']` and calls `addNewExtension($tuple)` (and for batch, in a loop). After success, showForm() calls `showEdit()` (edit the new ext); on validation error it calls `showNew()` again.

### Validation (saveNew)

- FormValidator: pkey required and numeric; for Provisioned, macaddr required and regex (12 hex or whitespace).
- Extension length must match `globals.EXTLEN`.
- Optional desc; default `Ext` + pkey.
- location: from `globals.VCL` (remote) or `globals.NATDEFAULT`.
- provisionwith: if `globals.FQDNPROV == 'YES'` then FQDN.
- cluster: from POST or `'default'`.
- **Provisioned:** MAC required; `getVendorFromMac(mac)` must return a device; `checkThisMacForDups(mac)` must be false.
- **Provisioned batch:** txtmacblock split by whitespace; no duplicate MACs; `checkHeadRoom(count,$pkey)` – note: in code, Provisioned batch uses `$pkey` but that variable is not set in saveNew() (only `$tuple['pkey']` is). Likely bug: should be `$tuple['pkey']`.
- **Unprovisioned / WebRTC / MAILBOX batch:** `checkHeadRoom(blksize, $tuple['pkey'])` (and for batch, blksize from POST).

### checkHeadRoom / checkThisMacForDups / getVendorFromMac

- **checkHeadRoom($count, $pkey):** Currently always returns `false` (stub). So “insufficient extension slots” is never triggered in current code.
- **checkThisMacForDups($mac):** Returns true if `ipphone` has a row with that macaddr.
- **getVendorFromMac($mac):** First 6 hex chars → OUI lookup in `/opt/sark/www/sark-common/manuf.txt` (e.g. `grep -i`), then maps to a known vendor string (Snom, Panasonic, Yealink, Polycom, Fanvil, Cisco, etc.) and thus to a **device** name used in the form.

---

## 5. Per-type behaviour in saveNew (switch on extchooser)

| Type                | Device / MAC source              | What happens |
|---------------------|----------------------------------|--------------|
| Provisioned         | MAC → getVendorFromMac → device | One `addNewExtension($tuple)`. |
| Unprovisioned       | device = General SIP            | One `addNewExtension($tuple)`. |
| WebRTC              | device = WebRTC                 | One `addNewExtension($tuple)`. |
| Provisioned batch   | txtmacblock → list of MACs      | For each MAC: vendor lookup, device set, `addNewExtension($tuple)`, then pkey++. |
| Unprovisioned batch | device = General SIP            | Loop blksize times: addNewExtension, pkey++. |
| WebRTC batch        | device = WebRTC                 | Same loop. |
| VXT batch           | device = vxtdevice (POST)       | Same loop. |
| MAILBOX             | device = MAILBOX                | One `addNewExtension($tuple)`. |

---

## 6. addNewExtension($tuple) – single-extension create

- Load device row: `device` table by `$tuple['device']` → sipiaxfriend, technology, blfkeyname.
- Build provision string: for SIP and not General SIP/MAILBOX, append `#INCLUDE` + device; for WebRTC set transport `wss`; for non-Polycom add blf include; Cisco gets extra XML closing tags.
- Set `technology` from device; generate password (`helper->ret_password`); set dvrvmail = pkey.
- **adjustAstProvSettings(&$tuple):** Tweaks provision includes (strip tcp/tls/udp/ipv6/ipv4 then re-add by transport/protocol for Snom, Yealink, Panasonic, etc.). Used when editing too (reads from DB for existing row).
- **Insert:** `$this->helper->createTuple("ipphone", $tuple)`.
- If OK:
  - **createCos():** For each COS with defaultopen/defaultclosed, insert into IPphoneCOSopen / IPphoneCOSclosed. **Note:** createCos() uses `$tuple['pkey']` but is called with no args; `$tuple` is not in scope inside createCos(). So this is a bug unless PHP is using a stale/global – should pass pkey into createCos($pkey).
  - Create PJSIP instance: WebRTC → `createPjsipWebrtcInstance(pkey)`, else `createPjsipPhoneInstance(pkey)`.

---

## 7. After create

- On success: `showForm()` calls `showEdit()` so the user sees the edit screen for the new extension (or the last created in a batch).
- On validation/DB error: `$this->invalidForm = true`, errors in `$this->error_hash`, `showNew()` re-rendered with errors.

---

## 8. Files involved

| File        | Role |
|------------|------|
| view.php   | showForm() routing; showNew() form; saveNew() validation and switch; addNewExtension(); createCos(); adjustAstProvSettings(); getVendorFromMac(); checkThisMacForDups(); checkHeadRoom(). |
| javascript.js | Show/hide divs by extchooser; validation; DataTable for list; BLF table. |
| main.php   | Includes srkmain (standard panel entry). |
| update.php | Inline edit of extension table columns (not the “add” flow). |

---

## 9. Possible bugs / follow-ups

1. **Provisioned batch:** `checkHeadRoom(count($macArray), $pkey)` – `$pkey` is undefined in saveNew(); should be `$tuple['pkey']`.
2. **createCos():** Uses `$tuple['pkey']` but `$tuple` is not passed in; should be e.g. `createCos($tuple['pkey'])` and parameter inside createCos().
3. **checkHeadRoom():** Always returns false; if headroom is ever enforced, this needs a real implementation (e.g. EXTLEN range, max extension, or similar).

---

## 10. Database / globals touched (create flow)

- **Read:** globals (EXTLEN, ACL, PWDLEN, USERCREATE, FQDNPROV, VCL, NATDEFAULT, VXT, SIPIAXSTART, etc.), device, COS, ipphone (duplicate check, next free ext).
- **Write:** ipphone (insert), IPphoneCOSopen, IPphoneCOSclosed; PJSIP configs via helper (createPjsipPhoneInstance / createPjsipWebrtcInstance).

---

*Working notes for later refactor or testing of the extension add wizard.*
