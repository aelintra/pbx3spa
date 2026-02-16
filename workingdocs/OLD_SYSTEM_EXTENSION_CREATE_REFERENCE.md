# Old System (sail65) Extension Create Reference

**Purpose:** Capture how the legacy system created extensions and produced usable Asterisk PJSIP objects, for parity and for questioning whether PBX3 can do it more simply.

**Source:** `/Users/jeffstokoe/GiT/sail65/sail-6/opt/sark/`

---

## 1. Create flow (sarkextension/view.php)

- **Chooser** (`extchooser`): `Provisioned` | `Unprovisioned` | `WebRTC` | batch variants | `MAILBOX`.
- **Provisioned (single):** Validate MAC → `getVendorFromMac(mac)` → reject if invalid/duplicate → `$tuple['device'] = $res` → `addNewExtension($tuple)`.
- **Unprovisioned:** `$tuple['device'] = 'General SIP'` → `addNewExtension($tuple)`.
- **WebRTC:** `$tuple['device'] = 'WebRTC'` → `addNewExtension($tuple)`.
- **Mailbox:** `$tuple['device'] = 'MAILBOX'` → `addNewExtension($tuple)`.

---

## 2. addNewExtension($tuple) (same file, ~673–741)

1. **Device lookup:** `SELECT sipiaxfriend, technology, blfkeyname FROM device WHERE pkey = ?` with `$tuple['device']`.
2. **Build provision** (technology == 'SIP'):
   - If device not General SIP and not MAILBOX: `$tuple['provision'] .= "#INCLUDE " . $tuple['device']`.
   - If WebRTC: `$tuple['transport'] = "wss"`.
   - If not Polycom and Device has blfkeyname != 'None': `$tuple['provision'] .= "\n#INCLUDE " . $resdevice['blfkeyname']`.
   - If device matches `/^[Cc]isco/`: append `"\n</flat-profile>\n</device>"`.
3. Set `technology`, `passwd`, `dvrvmail = pkey`.
4. **adjustAstProvSettings($tuple)** — strip transport/protocol #INCLUDE lines, then (on edit) add lines from tuple transport/protocol.
5. **Insert:** `$this->helper->createTuple("ipphone", $tuple)`.
6. **If insert OK:** create COS links; then if `device == "WebRTC"` → `$this->helper->createPjsipWebrtcInstance($tuple['pkey'])`, else → `$this->helper->createPjsipPhoneInstance($tuple['pkey'])`.

So PJSIP instance creation runs in the **same PHP request**, immediately after the DB insert, using **pkey** (e.g. `2001`).

---

## 3. createPjsipPhoneInstance / createPjsipWebrtcInstance (srkHelperClass)

- **Phone:** Copy `PJSIP . PJSIP_PHONE_TEMPLATE` → `PJSIP . $key . '_' . PJSIP_PHONE` (e.g. `sark_pjsip_2001_phone.conf`), then chown/chmod.
- **WebRTC:** Same pattern with webrtc template and suffix.
- Only copies if target missing or empty.

Constants (config.php): `PJSIP = '/etc/asterisk/sark_pjsip_'`, `PJSIP_PHONE = 'phone.conf'`, `PJSIP_PHONE_TEMPLATE = 'phone.tmpl'`, etc.

---

## 4. getVendorFromMac($mac)

- Normalize MAC to 6 hex then `1:2:3`; run `` `grep -i $findmac /opt/sark/www/sark-common/manuf.txt` ``.
- Allowed vendors (regex): Snom, Panasonic, Yealink, Polycom, **Fanvil**, Cisco, Gigaset, Aastra, Grandstream, Vtech.
- Return vendor string or `0` on no match.

---

## 5. adjustAstProvSettings(&$tuple)

- Always: if `provision` set, strip lines matching `#INCLUDE.*\.(tcp|tls|udp|ipv6|ipv4)`, rtrim.
- When `$_POST['macaddr']` set (edit path): load device from ipphone; by device prefix (Snom, Yeal, Pana) append `#INCLUDE ….(tcp|tls|udp)` and `#INCLUDE ….(ipv6|ipv4)` from `$tuple['transport']` and `$tuple['protocol']`.

---

## 6. provisionwith

- From globals: if `FQDNPROV == 'YES'` then `$tuple['provisionwith'] = 'FQDN'`.

---

## 7. createTuple("ipphone", $tuple) (srkHelperClass)

- Merges tuple with `default_ipphone()`, builds INSERT, executes. All tuple keys (pkey, device, provision, sipiaxfriend, etc.) are written.

---

## 8. Provisioning listener (scripts/responder.pl)

- Auto-create by MAC: get next pkey; General SIP sipiaxfriend from Device; vendor provision/blfkeyname from Device; build sipiaxfriend (ACL etc.); INSERT ipphone. Same Device-based pattern.

---

## 9. Save vs Commit (the trigger for generator + Asterisk reload)

**Two actions:**

- **Save** (on create/edit panels): Saves the current row or new object to the DB. It turns the Commit button red (sets the dirty flag) but the user does **not** have to press Commit before leaving the panel. The user can Save, navigate away, edit another row, Save again, and so on.
- **Commit:** A separate, explicit action. The user can carry out a series of changes to different rows/objects (Save on each panel as they go), and only press **Commit** once when done with all changes. Commit then runs the generator and Asterisk reload; the button goes green.

So: **Save** = persist to DB + set dirty (commit goes red). **Commit** = run generator + reload (commit goes green). The user never has to Commit before leaving a panel; they can batch many Saves and Commit when finished. This is a common pattern in admin panels: draft/apply or save/deploy separation so users can make multiple changes and apply them in one go.

**Commit button:**

- **Commit button** appeared on **every panel** (extensions, trunks, queues, globals, etc.).
- **Green** when there was nothing outstanding (DB and generated Asterisk config in sync).
- **Red** when there were uncommitted changes (something had been saved to DB but generator had not yet run).
- **When pressed:** Fired the generator (rebuilt all Asterisk .conf files from DB) and issued an Asterisk reload.

**Implementation (sail65):**

- **Dirty state:** `commitOn()` in srkHelperClass touches `/opt/sark/cache/commitflag`. Any panel that writes to the DB (create, **Save** on edit, delete) calls `$this->helper->commitOn()` so the flag is set.
- **Button state:** srkPageClass `commitButton()` checks `file_exists('/opt/sark/cache/commitflag')`. If the flag exists → show the “needs commit” button (commitClick.png, highlighted/red); if not → show normal commit button (commit.png, green).
- **On Commit click:** Each view checks `$_POST['commit']` or `$_POST['commitClick']` and calls `$this->helper->sysCommit()`.
- **sysCommit()** (srkHelperClass): Instantiates `genAsteriskObjects`, runs `genAsterisk()` (generator), runs `snap.sh`, runs `asterisk -rx 'reload'`, then removes the commitflag file.

PBX3 should mirror this: **Save** (create or update) = DB only + set dirty; user can leave without committing. **Commit** = single action (button on every panel or in app chrome) that runs genAst.sh in instance context and Asterisk reload; green/red from dirty state.
