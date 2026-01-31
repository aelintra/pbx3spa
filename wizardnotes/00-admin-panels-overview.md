# Admin Panels – Planning Notes (sail-6/opt/sark/php)

**First analysis:** 2025-01-31  
**Scope:** Admin panels and their logic under `sail-6/opt/sark/php`.

---

## 1. Entry point and routing

- **Main entry:** `srkmain.php`
  - Requires: `srkPageClass`, `srkDbClass`, `srkHelperClass`, `srkhead.php`, `formvalidator.php`
  - Parses URL: `$url = explode('/', $_SERVER['SCRIPT_URL'])` → e.g. `/php/sarkextension/main.php` → `$url[2]` = panel name (e.g. `sarkextension`)
  - Loads `view.php` from that panel folder, then instantiates class `$url[2]` (e.g. `sarkextension`) and calls `$Panel->showForm()`
  - User permissions: looks up `panel` by classname, then `userpanel` for current user; passes `perms` into session and hidden input
  - Session: `$_SESSION['user']['pkey']`, `$_SESSION['ctrl']['cosflag']`, `$_SESSION['ctrl']['sysuser']`, etc.

- **Panel URL pattern:** `/php/<panelname>/main.php` (e.g. `/php/sarkextension/main.php`)
  - Panel name = PHP class name (defined in that panel’s `view.php`).
- **Exception:** `sarksupt` does not use srkmain.php. Its `main.php` includes `view.php` directly and instantiates class **support** (not sarksupt). So sarksupt is a standalone panel with a different class name.

---

## 2. Shared infrastructure (root of opt/sark/php)

| File / folder | Purpose |
|---------------|--------|
| `config.php` | Defines: paths (SARK_DB, SNAPSHOTS, BACKUPS, MONITOR, etc.), PJSIP conf paths, EXEC_DB_RELOAD script |
| `navigation.php` | Builds navbar from DB: user → UserPanel → panel → panelgrouppanel → panelgroup; conditional visibility (e.g. sarkldap, sarkpci, sarkdiscover by arch/VCL) |
| `banner.php` | Top banner (included from srkmain) |
| `srkhead.php` | Page head (included from srkmain) |
| `srkfoot.php` | Page footer (included at end of srkmain) |
| `formvalidator.php` | ValidatorObj, CustomValidator, FormValidator |
| `srkPageClass` | Base “page” class: button definitions, UI helpers (no file extension in require) |
| `srkDbClass` | DB::getInstance() – SQLite SARK_DB |
| `srkHelperClass` | helper class (e.g. check_pid, logit) |
| `srkAmiHelperClass` | Asterisk AMI helper |
| `srkNetHelperClass` | nethelper (network utilities) |
| `srkBooleans.php` | Boolean handling helpers |
| `srkGenClass` | General utilities |
| `srkLDAPHelperClass` | LDAP helper |
| `srkFileTailClass` | File tail (e.g. log viewing) |
| `srkPDFClass` | PDF generation |
| `srksessions/` | session.php, common.php, logout.php – auth/session |
| `AsteriskManager.php` / `AsteriskManagerException.php` | AMI client (class `ami`) |
| `fpdf.php` | PDF library (FPDF) |

---

## 3. Panel layout pattern

Each admin panel lives in a folder `sark<name>/` (or `sark3pcerts/`) with a consistent pattern:

- **main.php** – Thin entry; often just includes srkmain or similar bootstrap (srkmain is the real entry via URL).
- **view.php** – Defines class `sark<name>` and implements `showForm()` (main UI).
- **update.php** – Handles form submit / update (called by AJAX or form post).
- **delete.php** – Handles delete (when present).
- **javascript.js** – Front-end behaviour for the panel.

Some panels add:

- **blflist.php**, **updateblf.php**, **fkeylist.php** – BLF / function keys (e.g. sarkextension, sarkdevice, sarkphone).
- **extlist.php**, **search.php**, etc. – Extra list/search endpoints.

---

## 4. List of panel classes (44)

All defined in `view.php` in the folder of the same name:

| Panel folder     | Class in view.php |
|------------------|-------------------|
| sark3pcerts      | sark3pcerts       |
| sarkagent        | sarkagent         |
| sarkapp          | sarkapp           |
| sarkbackup       | sarkbackup        |
| sarkcallback     | sarkcallback      |
| sarkcallgroup    | sarkcallgroup     |
| sarkcert         | sarkcert          |
| sarkcluster      | sarkcluster       |
| sarkconference   | sarkconference    |
| sarkcos          | sarkcos           |
| sarkddi          | sarkddi           |
| sarkdevice       | sarkdevice        |
| sarkdiscover     | sarkdiscover      |
| sarkedit         | sarkedit          |
| sarkedsw         | sarkedsw          |
| sarkedsw6        | sarkedsw6         |
| sarkextension    | sarkextension     |
| sarkfqdnwlist    | sarkfqdnwlist     |
| sarkfreset       | sarkfreset        |
| sarkglobal       | sarkglobal        |
| sarkgreeting     | sarkgreeting      |
| sarkholiday      | sarkholiday       |
| sarkipblacklist  | sarkipblacklist   |
| sarkivr          | sarkivr           |
| sarkldap         | sarkldap          |
| sarklog          | sarklog           |
| sarklogin        | sarklogin         |
| sarkmcast        | sarkmcast         |
| sarknetwork      | sarknetwork       |
| sarkpasswd       | sarkpasswd        |
| sarkpcap         | sarkpcap          |
| sarkpci          | sarkpci           |
| sarkphone        | sarkphone         |
| sarkqueue        | sarkqueue         |
| sarkrecordings   | sarkrecordings    |
| sarkreception    | sarkreception     |
| sarkreport       | sarkreport        |
| sarkroute        | sarkroute         |
| sarkshell        | sarkshell         |
| sarksplash       | sarksplash        |
| sarksupt         | **support** (class name differs from folder; view.php defines `support`) |
| sarktimer        | sarktimer         |
| sarktrunk        | sarktrunk         |
| sarkuser         | sarkuser          |
| sarkwallboard    | sarkwallboard     |

---

## 5. Non-panel PHP under opt/sark/php

- **Legacy/list style** (no sark* class): `cluster/`, `date/`, `endpoints/`, `greetings/`, `lineio/`, `operator/`, `queue/`, `logscan/` – list or helper scripts.
- **Standalone scripts:** `bandwidth.php`, `dialler.php`, `download.php`, `downloadg.php`, `downloadpdf.php`, `linehelp.php`, `localvars.php`, `settings.php`.
- **Fonts:** `font/` – PDF font definitions (e.g. courier, helvetica, times).

---

## 6. Navigation and permissions

- **navigation.php:** Menu built from DB; only panels linked to current user’s panel groups and with `p.active='yes'` are shown.
- **Conditional hiding:** e.g. sarkldap (if slapd not running), sarkpci (arm, or VCL, or no dahdi), sarkdiscover (if VCL), sarkthreat (if !PKTINSPECT).
- **Permissions:** Per user/panel in `userpanel.perms`; injected as hidden input `#perms` and `$_SESSION['user']['perms']`.

---

## 7. Possible next steps for planning

- [ ] Map each panel to DB tables (e.g. extension → tables used in view/update/delete).
- [ ] Document update/delete flows (which scripts, which POST/GET, which tables).
- [ ] List AJAX endpoints used by javascript.js (or inline JS) and which PHP they call.
- [ ] Identify shared patterns (e.g. CRUD, BLF, batch operations) for refactor or consistency.
- [ ] Note dependencies on Asterisk (AMI, config files under /etc/asterisk) and scripts (e.g. EXEC_DB_RELOAD).
- [ ] Check sarksupt and any panels that don’t follow the standard view.php class pattern.

---

*Working notes – for use in later planning and refactoring.*
