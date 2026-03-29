# Extensions: live IP and Status (from Asterisk)

**Summary:** The Extensions list and detail panels show **IP** (endpoint address) and **Status** (RTT from Asterisk) for each extension. Data comes from Asterisk AMI (PJSIP). When no phone is registered or AMI has no data, we show **Unknown**.

---

## API

| Endpoint | Purpose |
|----------|---------|
| **GET /api/extensions/live** | Returns an object keyed by extension **pkey** (string): `{ "1000": { "ip": "...", "latency": "..." }, ... }`. Only **SIP** extensions with **active ≠ NO** (same rule as legacy SARK `get_pjsip_array`) get an AMI `PJSIPShowEndpoint` call; inactive extensions are omitted — list UI shows **Unknown** for IP/Status on those rows. |
| **GET /api/trunks/live** | Same shape, keyed by trunk **pkey**. Only **SIP** trunks with **active ≠ NO**. **PJSIPShowEndpoint** must use trunk **pkey** — Asterisk endpoint names come from GenClass templates (`$trunk` → **pkey**), not **shortuid** (extensions differ: they use shortuid in PJSIP). **IAX2** trunks and inactive SIP are omitted — **TrunksListView** shows **Unknown** for IP/Status. Route must be registered **before** `GET trunks/{trunk}`. **Implementation:** `TrunkController::indexLive()`. |
| **GET /api/extensions/{id}/runtime** | For a single extension: cfim, cfbs, ringdelay; for SIP also **ip** and **latency**. |

**Implementation (pbx3api):**

- **Helper:** `pjsip_endpoint_live($amiHandle, $pkey)` in `app/Helpers/Helper.php` — sends AMI `PJSIPShowEndpoint`, parses response for Contact/URI/Match (IP) and RoundtripUsec (latency). Returns `['ip' => '...', 'latency' => '...']`; uses **"Unknown"** when no value (not "—").
- **Ami class:** `amiQueryUntilBlankLine($query)` in `app/CustomClasses/Ami.php` — reads AMI response until a blank line. **Critical:** without this, each AMI read would block for the socket timeout (~3s), so N extensions would cause gateway timeout. Use this for any AMI command that returns a single response block ending with a blank line.
- **ExtensionController::indexLive()** — gets all SIP extensions (no active filter), calls `get_ami_handle()`, loops with `pjsip_endpoint_live()` per pkey, returns JSON object. Uses `set_time_limit(30)` and `.limit(200)`.

**Route order:** `GET extensions/live` must be registered **before** `GET extensions/{extension}` (so "live" is not matched as an extension id).

---

## Frontend

**List (ExtensionsListView.vue):**

- Loads `extensions` + `tenants` first, then `extensions/live` so the table is not blocked by AMI (see `ExtensionsListView.vue`). `liveData` holds the live response object.
- **IP** and **Status** columns: `ipDisplay(e)` and `statusDisplay(e)` use `String(e.pkey)` to look up `liveData.value[key]`. Keys in the API response are strings (e.g. `"1000"`, `"1110"`); `e.pkey` from the list is also string in JSON, but normalising with `String(e.pkey)` avoids any number/string mismatch.
- **Normalisation:** `liveValueDisplay(val)` treats empty, `"—"`, or Unicode em dash as no value and returns **"Unknown"**. So even if the API ever returns `"—"` (e.g. old deploy), the UI shows "Unknown". Real values (IP address, `"OK (5 ms)"`) are shown as-is.

**Detail (ExtensionDetailView.vue):**

- Runtime section fetches `GET extensions/{shortuid}/runtime`; for SIP, response includes **ip** and **latency**. Display shows them above cfim/cfbs/ringdelay; use same "Unknown" when null or empty.

---

## Gotchas for next agent

1. **API may still return "—"** on some servers if the "Unknown" change in Helper.php wasn’t deployed. Frontend normalises "—" to "Unknown" so the list always shows Unknown when there’s no real data.
2. **Live keys are pkey strings.** The list can have duplicate pkeys (same extension number in different tenants); each row still looks up by `e.pkey` and gets the same live entry (Asterisk doesn’t distinguish by tenant for PJSIP endpoint name).
3. **indexLive skips `active = NO`** (legacy SARK parity). Inactive SIP rows have no live entry → **Unknown** for IP/Status.
4. **PJSIPShowEndpoints** (plural) returns a high-level list without Contact/RoundtripUsec; we must use **PJSIPShowEndpoint** (singular) per extension to get IP and RTT. See old SARK `srkAmiHelperClass` (sail65) for reference.

---

## Reference

- Old panel (sail65): `sarkextension/view.php` (showMain table: IP, latency from AMI); `srkAmiHelperClass` (get_pjsip_array, getIpAddressFromPeer, getLatencyFromPeer).
- API: `pbx3api/app/Http/Controllers/ExtensionController.php` (indexLive, showruntime), `app/Helpers/Helper.php` (pjsip_endpoint_live), `app/CustomClasses/Ami.php` (`amiPjsipShowEndpointForLive`, `amiQueryUntilBlankLine`).
- Frontend: `pbx3spa/src/views/ExtensionsListView.vue` (liveData, ipDisplay, statusDisplay, liveValueDisplay), `ExtensionDetailView.vue` (Runtime section ip/latency); **Trunks:** `TrunksListView.vue` (same list pattern after `GET trunks`).
- API (trunks): `pbx3api/app/Http/Controllers/TrunkController.php` (`indexLive`), `routes/api.php` (`trunks/live` before `trunks/{trunk}`).
