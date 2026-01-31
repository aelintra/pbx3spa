# Extensions API — what the list and detail return

Summary of what the pbx3api **GET extensions** and **GET extensions/{id}** actually return, so we know which columns we can show in the Extensions list and detail without extra calls.

---

## Source

- **Controller:** `pbx3api/app/Http/Controllers/ExtensionController.php`
  - `index()`: `Extension::orderBy('pkey','asc')->get()` — returns an **array of full extension objects** (same shape as single extension).
  - `show($extension)`: returns the single `Extension` model.
- **Model:** `Extension` uses table `ipphone`, with `$hidden` excluding some columns from JSON.
- **Schema:** `pbx3/.../db_sql/sqlite_create_tenant.sql` — `ipphone` table.

---

## Fields returned (list and detail)

The API returns the extension model as JSON. Laravel serializes all attributes **except** those in the model’s `$hidden` array.

**Hidden (not in API response):**  
`abstimeout`, `channel`, `dialstring`, `externalip`, `newformat`, `openfirewall`, `sipiaxfriend`, `tls`, `twin`

**So the list and detail can include (if present in DB):**

| Field        | In schema | Use in list / detail |
|-------------|-----------|------------------------|
| **pkey**    | ✓         | Ext number — primary link. |
| **cluster** | ✓         | Tenant (show as **“Tenant”** in UI). |
| **active**  | ✓         | YES/NO. |
| **device**  | ✓         | Device type (e.g. MAILBOX, snom, General SIP, WebRTC). |
| **technology** | ✓     | SIP, etc. |
| **transport** | ✓     | udp, tcp, tls, wss. |
| **desc**    | ✓         | Description / display name (SARK “User” is often this, truncated). |
| **description** | ✓   | Asterisk username (sometimes same as pkey). |
| **cname**   | ✓         | Common name — alternative “User” / display name. |
| **macaddr** | ✓         | MAC address (N/A for mailbox/webrtc). |
| **location** | (model default) | local/remote — may exist in DB via migrations. |
| **id**      | ✓         | KSUID. |
| **shortuid** | (SYSTEM_CONTEXT) | 8-char unique — if present in DB, use for SIP identity. |
| Other       | —         | callerid, callbackto, cellphone, celltwin, cluster, devicerec, dvrvmail, protocol, provisionwith, sndcreds, vmailfwd, z_* — use in detail as needed. |

---

## Not in list/detail (operational / live)

- **State** (e.g. “OK (119 ms)”, “Unknown”) — from Asterisk: `astamis/ExtensionState/{id}` (operational).
- **IP** (registration address) — from Asterisk/live state, not from the extension row.

So we **cannot** show State or IP in the list unless we add a separate operational call or a dedicated “extensions with state” endpoint. Defer State and IP to a later step: the API supports them via operational endpoints, but we are not calling them for the Extensions list/detail in the current build.

---

## SARK columns → API / UI

| SARK column | API field   | Note |
|-------------|------------|------|
| Ext         | pkey       | ✓ |
| Tenant      | cluster    | ✓ — **label as “Tenant”** in UI. |
| User        | desc or cname | ✓ — truncate for list if desired. |
| Device      | device     | ✓ |
| MAC         | macaddr    | ✓ |
| IP          | —          | Not in API; live only. |
| trns        | transport  | ✓ |
| State       | —          | Operational; not in list API. |
| Active?     | active     | ✓ |

---

## Recommendation for Extensions list

- **Columns we can use now (from GET extensions):**  
  Ext (pkey), **Tenant** (cluster), User (desc or cname), Device, MAC (macaddr), Transport, Active.  
- **Filter placeholder:** “Filter by pkey, tenant, or description” (and use “Tenant” not “cluster” in UI).  
- **Deferred:** State and IP — API exists (e.g. astamis/ExtensionState); add in a later step.
