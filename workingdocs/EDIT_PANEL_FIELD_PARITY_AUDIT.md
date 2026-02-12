# Edit panel field parity audit

**Purpose:** Ensure every edit (detail) panel exposes and sends all API-updateable fields.  
**Source:** API controller `updateableColumns` (and create-only/read-only decisions per PANEL_PATTERN.md).

**Last run:** 2026-02-12

---

## Summary

| Panel | Status | Notes |
|-------|--------|--------|
| **Tenant** | ✅ Fixed | **All** updateable fields (main form + advanced); added missing `ldapanonbind` to `tenantAdvanced.js`. |
| **Extension** | ✅ Complete | **All** updateable fields in form; transport/protocol editable; runtime (cfim, cfbs, ringdelay) separate endpoint. |
| **Trunk** | ✅ Complete | **All** updateable fields in form or Identity; **transport** is read-only on edit (FormReadonly, not in PUT) per pattern. |
| **Route** | ✅ Complete | **All** updateable fields: active, auth, cluster, description, dialplan, path1–4, strategy. |
| **Queue** | ✅ Complete | **All** updateable fields: cluster, devicerec, greetnum, options. |
| **Agent** | ✅ Complete | **All** updateable fields: cluster, name, passwd, queue1–6. |
| **Ivr** | ✅ Fixed | **All** updateable fields via form + buildIvrPayload; **greetnum** now sent as string (was integer). |
| **InboundRoute** | ✅ Complete | **All** user-facing updateable fields: active, alertinfo, closeroute, cluster, description, disa, disapass, inprefix, moh, openroute, swoclip, tag, trunkname (z_updater not in UI). |

---

## API updateable columns (reference)

- **Tenant:** abstimeout, allow_hash_xfer, callrecord_1, cfwdextern_rule, cfwd_progress, cfwd_answer, clusterclid, chanmax, countrycode, dynamicfeatures, description, emergency, int_ring_delay, ivr_key_wait, ivr_digit_wait, language, **ldapanonbind**, ldapbase, ldaphost, ldapou, ldapuser, ldappass, ldaptls, localarea, localdplan, lterm, leasedhdtime, masteroclo, maxin, monitor_out, operator, pickupgroup, play_beep, play_busy, play_congested, play_transfer, rec_*, ringdelay, routeoverride, spy_pass, sysop, syspass, usemohcustom, vmail_age, voice_instr, voip_max.
- **Extension:** active, callbackto, callerid, cellphone, celltwin, cluster, desc, devicerec, dvrvmail, protocol, transport, vmailfwd.
- **Trunk:** active, alertinfo, callerid, callprogress, cluster, description, devicerec, disa, disapass, host, inprefix, match, moh, password, peername, register, swoclip, tag, transport, transform, trunkname, username, z_updater.
- **Route:** active, auth, cluster, description, dialplan, path1–4, strategy.
- **Queue:** cluster, devicerec, greetnum, options.
- **Agent:** cluster, name, passwd, queue1–6.
- **Ivr:** pkey, active, cname, name, alert0–11, description, cluster, greetnum, listenforext, option0–11, tag0–11, timeout, z_updater.
- **InboundRoute:** active, alertinfo, closeroute, cluster, description, disa, disapass, inprefix, moh, openroute, swoclip, tag, trunkname, z_updater.

---

## Intentional omissions

- **z_updater:** Not exposed in any edit UI (system/audit field).
- **Trunk transport:** Read-only on edit (FormReadonly in Identity); not sent in PUT.
- **Extension runtime:** Separate endpoint `PUT extensions/{pkey}/runtime` (cfim, cfbs, ringdelay).

---

## How to re-run

1. List each controller’s `updateableColumns` (excluding create-only keys that are correctly read-only on edit).
2. For each DetailView, confirm every key is either: (a) in the save payload, or (b) shown as FormReadonly and intentionally omitted from PUT.
3. For Tenant, confirm ADVANCED_KEYS / ADVANCED_FIELDS / CLUSTER_CREATE_DEFAULTS match the API’s advanced keys.
