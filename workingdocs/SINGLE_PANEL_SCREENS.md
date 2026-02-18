# Single-panel screens (no List/Create — one screen per resource)

**Purpose:** Plan and track the single-screen panels we are bringing across from the old system (SARK, sail-6). These are **singleton** or **single-view** panels: one route, one view, no list/detail/create split. See PANEL_PATTERN.md § "Singleton / edit-only panels" for the pattern (SysglobalsEditView is the reference).

**Old system reference:** `/Users/jeffstokoe/GiT/sail65/sail-6/opt/sark/php/`

---

## Panel list (10 screens)

| # | Panel name       | SARK source    | pbx3api status | Notes |
|---|------------------|----------------|----------------|-------|
| 1 | **Home**         | sarkglobal (part) | ✅ syscommands (pbxrunstate, commitstatus, commit, start, stop, reboot) | DashboardView exists; build out as hub with links to other single panels + Commit/Start/Stop/Reboot. |
| 2 | **IP Settings**  | sarknetwork    | ❌ No API      | Network: FQDN, bindaddr/bindport, static IP, DHCP, SSH port, SMTP, ICMP, etc. sysglobals has some (bindaddr, bindport, fqdn, staticipv4, edomain, sendedomain). May need dedicated network endpoint or extend sysglobals. |
| 3 | **IPv4 Firewall**| Shorewall UI   | ✅ firewalls/ipv4 (GET, POST, PUT restart) | Single screen: load rules array, edit (e.g. textarea or line-by-line), Save, Restart. |
| 4 | **IPv6 Firewall**| Shorewall6 UI  | ✅ firewalls/ipv6 (GET, POST, PUT restart) | Same as IPv4, separate endpoint. |
| 5 | **Backup/restore** | sarkbackup   | ✅ backups + snapshots APIs | **Done.** Single panel with two cascaded sections: Backups (create, upload, download, restore with options, delete) and Snapshots (create, upload, download, restore DB only, delete). Route `/backup`, view `BackupView.vue`. API: backups + snapshots; both use syshelper for privileged file ops. See PANEL_PATTERN § Single-screen panels with cascaded sections. |
| 6 | **Certificates** | sarkcert       | ❌ No API      | Customer SSL cert install/remove (pem/key). pbx3 owns Let's Encrypt; this is for custom/customer certs. |
| 7 | **Certs (3rd Party)** | sark3pcerts | ❌ No API   | 3rd-party cert bundle (e.g. /etc/ssl/3pcerts/3pcerts.pem): view, save, remove. |
| 8 | **Factory Reset** | sarkfreset    | ❌ No API      | Password confirm + checkboxes (reset db, backups, snaps, greets, vmail, cdrs, logs, firewall, dhcp, host, ssh, ldap). Destructive; needs secure API. |
| 9 | **Logs**         | sarklog        | ⚠️ Partial     | **API:** GET /logs (returns minimal `{ "Log": "Master.csv" }`), GET /logs/cdrs{limit} (CDR CSV download). **SARK:** Table of log files (asterisk/messages, asterisk/full, cdr-csv/Master.csv, queue_log, syslog, shorewall.log, siplog, mail.log, fail2ban.log, auth.log) with View tail + Download. To match SARK: extend API (list log files, tail endpoint, download per file) or ship with CDR only first. |
| 10| **SIP PCAP logs** | sarkpcap       | ❌ No API      | **SARK:** List files in /var/log/siplog (name, size, modified, Download). SIP capture files. API would need: list siplog files, download file. |

---

## Implementation order (suggested)

1. **Home (Dashboard)** — Build out as hub: keep PBX status + Commit/Start/Stop/Reboot; add a "Single panels" / "System" section with links to: IP Settings, IPv4 Firewall, IPv6 Firewall, Backup/restore, Certificates, Certs (3rd Party), Factory Reset, Logs, SIP PCAP. (Placeholder links for panels without API.)
2. **Panels with existing API:** IPv4 Firewall, IPv6 Firewall, Backup/restore — add routes, nav, and views.
3. **Logs** — Use existing API (CDR download, minimal index); optional later: extend API for full log list/tail/download.
4. **Panels needing API first:** IP Settings, Certificates, Certs (3rd Party), Factory Reset, SIP PCAP — add placeholder views and nav; implement when API is available.

---

## SARK reference (file paths)

| Panel       | SARK path |
|------------|-----------|
| Home / Globals | `sarkglobal/view.php` |
| Network / IP  | `sarknetwork/view.php` |
| Backup/restore| `sarkbackup/view.php` |
| Certificates  | `sarkcert/view.php` |
| 3rd Party Certs | `sark3pcerts/view.php` |
| Factory Reset | `sarkfreset/view.php` |
| Logs        | `sarklog/view.php` (log file list + tail via srkFileTailClass) |
| SIP PCAP    | `sarkpcap/view.php` (file list in /var/log/siplog + download) |

Firewall: SARK uses Shorewall config files; pbx3api FirewallController reads/writes `/etc/shorewall/pbx3_rules` and `/etc/shorewall6/pbx3_rules6`.

---

## Route and nav (pbx3spa)

- **Home:** `/` (DashboardView) — already default.
- **Single panels** (suggested paths):  
  `/ip-settings`, `/firewall/ipv4`, `/firewall/ipv6`, `/backup`, `/certificates`, `/certificates/3rd-party`, `/factory-reset`, `/logs`, `/logs/sip-pcap`.

Nav: Either group under "System" or "Single panels" in the sidebar, or add each to the main nav. Current nav has Home, Tenants, Extensions, … System Globals; we can add a subsection or separate links for Firewall, Backup, Logs, etc.

---

---

## Old Home (sarkglobal) vs current API

**What the old Home panel shows:**

1. **Action bar:** Reboot, SIP CAP on/off (start/stop siplog service), Start PBX, Stop PBX.
2. **Form actions:** Update (save globals), Commit (run generator + reload).
3. **Full globals form:** General Settings, PBX Services, Continuous SIP PCAP Logging (logsipfilesize, logsipnumfiles, logsipdispsize + “Clear PCAP logs” button), Control, LDAP, SIP driver, Phone Browser Security, User Services — all from `globals` table.

**Covered by current API (no changes needed):**

- **PBX run state** — `GET syscommands/pbxrunstate` (returns `{ pbxrunstate: true|false }`; frontend should map to “Running”/“Stopped”, see note below).
- **Commit status** — `GET syscommands/commitstatus` → `{ dirty: boolean }`.
- **Commit** — `GET syscommands/commit`.
- **Start / Stop / Reboot** — `GET syscommands/start`, `syscommands/stop`, `syscommands/reboot`.
- **All globals form data** — `GET / PUT sysglobals` (already used by System Globals panel). Home does not need to duplicate the full form; link to System Globals for editing.

**Missing from API (would need new syscommands or similar):**

- **SIP CAP (SIP PCAP logging) service state** — SARK uses `/opt/sark/service/srk-ua-siplog/down` (file exists ⇒ service off). Would need e.g. `GET syscommands/sipcapstatus` → `{ running: boolean }`.
- **SIP CAP Start / Stop** — SARK: `sv u srk-ua-siplog` / `sv d srk-ua-siplog` and touch/rm `down` file. Would need e.g. `GET syscommands/sipcap?action=start|stop` or separate endpoints.
- **Clear PCAP logs** — SARK: stop service, `rm -rf /var/log/siplog/*`. Would need e.g. `GET syscommands/sipcapclear` or include in sipcap action.

**Conclusion:** Everything on the old Home except **SIP CAP on/off** and **Clear PCAP logs** can be done with the current API. For full parity, add 2–3 syscommand-style endpoints (sipcap status, start/stop, clear). Optional: have `pbxrunstate` also expose `running` so the frontend can use one name (or fix DashboardView to use `pbxrunstate`).

---

## References

- **PANEL_PATTERN.md** § Singleton / edit-only panels (SysglobalsEditView).
- **pbx3api/docs/general.md** — Firewalls, Backups, Logs/CDRs, sysglobals.
- **pbx3api/docs/routes-data-vs-operational.md** — Data vs operational split.
