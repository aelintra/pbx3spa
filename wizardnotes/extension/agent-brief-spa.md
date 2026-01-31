# Agent brief: Add new extension (SPA)

**Purpose:** Instructions for an agent (or developer) to implement the “add new extension” flow in a modern SPA using the recommended approach: **single form with conditional UI** and **one create API**.

**Reference docs (in this folder):**
- `add-wizard.md` – Legacy PHP behaviour, fields, validation, per-type logic.
- `flowchart.md` – Logic flowcharts (and `flowchart.html` for visual).

---

## 1. Approach to implement

- **One screen:** A “New extension” page (single route, e.g. `/extensions/new`).
- **One form:** Extension type selector + conditional fields. Show/hide fields based on selected type; do **not** use a multi-step wizard.
- **One API:** `POST` to a single create endpoint with a body that includes extension type and all optional fields. Server performs validation and type-specific logic (same as legacy `saveNew()` / `addNewExtension()`).
- **Outcomes:** On success → navigate to the new extension’s edit page (or list). On validation error → stay on form and display API error payload.

---

## 2. API contract

### 2.1 Create extensions

**Endpoint:** `POST /api/extensions` (or equivalent in your stack).

**Request body (JSON):** All fields that the legacy form can submit. Server ignores irrelevant fields per type.

| Field            | Type   | Required | Used when | Notes |
|------------------|--------|----------|------------|--------|
| `extensionType`  | string | yes      | always     | One of: `Provisioned`, `Unprovisioned`, `WebRTC`, `Provisioned batch`, `Unprovisioned batch`, `WebRTC batch`, `VXT batch`, `MAILBOX`. |
| `pkey`           | string | yes      | always     | Start extension number (numeric string). Length must match system `EXTLEN`. |
| `desc`           | string | no       | single ext | Caller ID / description. Default server-side: `Ext` + pkey. |
| `cluster`        | string | no       | always     | Default: `default`. |
| `macaddr`        | string | yes*     | Provisioned | *Required when extensionType is Provisioned. 12 hex chars, no colons. |
| `txtmacblock`    | string | yes*     | Provisioned batch | *Required when extensionType is Provisioned batch. Newline/whitespace-separated list of MACs. |
| `blksize`        | number | yes*     | * batch types | *Required for Unprovisioned batch, WebRTC batch, VXT batch. Number of extensions to create. |
| `vxtdevice`      | string | yes*     | VXT batch | *Required when extensionType is VXT batch. One of: `Panasonic VXT`, `Snom VXT`, `Yealink VXT`. |

**Server behaviour (must mirror legacy):**

1. Load globals (EXTLEN, NATDEFAULT, VCL, FQDNPROV, cluster default, etc.).
2. Validate: `pkey` required, numeric, length = EXTLEN; for `Provisioned`, `macaddr` required and format; for batch types, required fields present.
3. Build base tuple: pkey, desc (or default), location (from VCL/NATDEFAULT), cluster, provisionwith (from FQDNPROV), etc.
4. Switch on `extensionType`:
   - **Provisioned:** Resolve device from MAC (getVendorFromMac); check MAC not duplicate; call addNewExtension once.
   - **Unprovisioned:** device = General SIP; addNewExtension once.
   - **WebRTC:** device = WebRTC; addNewExtension once.
   - **MAILBOX:** device = MAILBOX; addNewExtension once.
   - **Provisioned batch:** Split txtmacblock; validate no empty list; duplicate MAC check; for each MAC: resolve device, addNewExtension, increment pkey.
   - **Unprovisioned batch / WebRTC batch / VXT batch:** Set device; loop blksize times: addNewExtension, increment pkey.
5. addNewExtension: load device row, build provision, set technology/password/dvrvmail, adjustAstProvSettings, insert ipphone, createCos, createPjsipPhoneInstance or createPjsipWebrtcInstance.

**Response:**

- **201 Created:** Body includes created extension(s). At least: primary key of last created extension (for redirect). Example: `{ "created": [ "101", "102" ], "lastPkey": "102" }` or equivalent.
- **400 Bad Request:** Validation errors. Body shape suitable for form display, e.g. `{ "message": "Validation failed", "errors": { "pkey": "Extension length is incorrect", "macaddr": "MAC address already exists" } }`. Use same error keys as legacy where possible.

### 2.2 Supporting endpoints (for the form)

- **Next free extension:** `GET /api/extensions/next` (or similar). Returns `{ "pkey": "101" }` using same logic as legacy `getNextFreeExt()` (SIPIAXSTART, first unused pkey).
- **Extension type options:** Either:
  - Return from a globals/config endpoint, e.g. `GET /api/config` or `GET /api/globals` including `VXT` and optionally a computed list of type options, or
  - Hardcode in the client the same options as legacy: if VXT then include `VXT batch`, else omit it.
- **Cluster list:** If needed for a cluster dropdown, `GET /api/clusters` or include in config.

---

## 3. Client (SPA) behaviour

### 3.1 Route and entry

- Route: e.g. `/extensions/new` (or `/extensions/create`).
- User reaches it from the extension list via a “New extension” (or “Add”) button.

### 3.2 Form state

- **extensionType:** string. Initial value: empty or “Choose extension type” (no type selected).
- **pkey:** string. Pre-fill from `GET /api/extensions/next` when the form mounts.
- **desc:** string. Optional; suggest default `Ext{pkey}` when pkey is set.
- **cluster:** string. Default `default`; optionally load from API.
- **macaddr:** string (Provisioned only).
- **txtmacblock:** string (Provisioned batch only).
- **blksize:** number (batch types only).
- **vxtdevice:** string (VXT batch only).

Disable or hide the submit button until `extensionType` is set to a real type (not the placeholder).

### 3.3 Visibility rules (conditional UI)

Show fields based on `extensionType` exactly as in the legacy UI (see `add-wizard.md` and flowchart “Client-side – type → visible fields” in `flowchart.md`):

| extensionType           | Show fields |
|-------------------------|-------------|
| (none / placeholder)    | Only type selector. |
| Provisioned             | pkey (start ext), macaddr, desc (caller ID), cluster. |
| Unprovisioned           | pkey, desc, cluster. |
| WebRTC                  | pkey, desc, cluster. |
| Provisioned batch       | pkey, txtmacblock (textarea), cluster. |
| Unprovisioned batch     | pkey, blksize, cluster. |
| WebRTC batch            | pkey, blksize, cluster. |
| VXT batch               | pkey, blksize, vxtdevice (dropdown: Panasonic VXT, Snom VXT, Yealink VXT), cluster. |
| MAILBOX                 | pkey, desc, cluster. |

Always show: extension type selector, cluster (if applicable). “pkey” is the start extension number (single or first in batch).

### 3.4 Client-side validation (optional but recommended)

- **pkey:** Required, numeric, length equal to system EXTLEN (EXTLEN can come from config/globals or a fixed value, e.g. 3–5).
- **Provisioned:** macaddr required, 12 hex characters.
- **Provisioned batch:** txtmacblock non-empty, split by whitespace; optionally validate each token as 12 hex.
- **Batch types:** blksize required, numeric, >= 1.
- **VXT batch:** vxtdevice required.

Display inline or summary errors from the API (400) using the same keys (pkey, macaddr, etc.).

### 3.5 Submit and navigation

1. On submit: `POST /api/extensions` with JSON body built from form state (only include fields relevant to the chosen type; server can ignore extras).
2. **201:** Navigate to edit page for the new extension, e.g. `/extensions/{lastPkey}` (or first created if you prefer). If the API returns multiple ids, use the last (or first) per product decision.
3. **400:** Stay on the form. Display `errors` on the form (field-level and/or summary).
4. **5xx / network error:** Show a generic error message; keep user on form.

### 3.6 Cancel

- “Cancel” (or back) navigates to the extension list (e.g. `/extensions`) without submitting.

---

## 4. Type options (extension type dropdown)

- **Default list (no VXT):** Choose extension type, Provisioned, Unprovisioned, WebRTC, Provisioned batch, Unprovisioned batch, WebRTC batch, MAILBOX.
- **With VXT:** Add “VXT batch” (e.g. after WebRTC batch). Use `GET /api/config` or `GET /api/globals` and a `VXT` flag to decide which list to show, or replicate legacy behaviour (e.g. config that includes `vxt: true`).

---

## 5. Checklist for the agent

When implementing, ensure:

- [ ] One route for “new extension” and one form (no multi-step wizard).
- [ ] Extension type selector drives visibility of fields per the table in §3.3.
- [ ] `POST /api/extensions` request body matches §2.1; server implements validation and type switch per legacy saveNew() / addNewExtension().
- [ ] Next-free-extension and type options (and optionally globals) available to the client (§2.2).
- [ ] On 201: navigate to edit (or list); on 400: show errors and stay on form (§3.5).
- [ ] Cancel returns to extension list (§3.6).
- [ ] Optional: client-side validation for pkey, macaddr, blksize, vxtdevice as in §3.4.

---

## 6. Legacy reference (where to look)

- **Logic and fields:** `sail-6/opt/sark/php/sarkextension/view.php` – `showNew()`, `saveNew()`, `addNewExtension()`, `createCos()`, `adjustAstProvSettings()`, `getVendorFromMac()`, `checkThisMacForDups()`, `checkHeadRoom()`.
- **UI visibility:** `sail-6/opt/sark/php/sarkextension/javascript.js` – `#extchooser` change handler and div visibility.
- **Next free ext:** `sail-6/opt/sark/php/srkHelperClass` – `getNextFreeExt()`.
- **Flowcharts:** `flowchart.md` (and `flowchart.html` for diagrams).

---

*Document for agent-driven implementation of the SPA “add new extension” flow.*
