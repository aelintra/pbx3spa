# Agent brief: Add new DDI/CLID (SPA)

**Purpose:** Instructions for an agent (or developer) to implement the “add new DDI” flow in a modern SPA using the recommended approach: **single form with conditional UI** and **one create API**.

**Reference docs (in this folder):**
- `add-wizard.md` – Legacy PHP behaviour, fields, validation, saveDiD/saveCLI, span loop, smartlink.
- `flowchart.md` – Logic flowcharts (and `flowchart.html` for visual).

---

## 1. Approach to implement

- **One screen:** A “New DiD” page (single route, e.g. `/ddis/new` or `/trunks/new-ddi`).
- **One form:** Route type selector (DiD or CLID) + conditional fields. Show/hide fields based on selected type.
- **One API:** `POST` to a single create endpoint with body that includes route type (carrier) and type-specific fields. Server performs validation and type-specific logic (saveDiD / saveCLI), then creates one or more lineio rows (span loop for DiD range).
- **Outcomes:** On success → navigate to DDI list (legacy does not navigate to edit). On validation error → stay on form and display API errors.

---

## 2. API contract

### 2.1 Create DDI/CLID

**Endpoint:** `POST /api/ddis` (or equivalent, e.g. `/api/lineio` for DDI/CLID type).

**Request body (JSON):** All fields that the legacy form can submit.

| Field          | Type   | Required | Used when | Notes |
|----------------|--------|----------|-----------|--------|
| `carrier` or `routeType` | string | yes | always | One of: `DiD`, `CLID`. Must match chooser value. |
| `cluster`      | string | no       | always    | Default e.g. `default`. |
| `trunkname`    | string | yes*     | DiD, CLID | *Required for both types. |
| `didnumber`    | string | yes*     | DiD only  | *Required when carrier = DiD. Single number or `number/span` (e.g. 5551234/10) for range. Cannot contain both `_` and `/`. Span max 100. |
| `clinumber`    | string | yes*     | CLID only | *Required when carrier = CLID. |
| `smartlink`    | string | no       | DiD only  | `YES` or `NO`. If YES, server may set openroute/closeroute from extension derived from pkey suffix (EXTLEN, ipphone lookup). |

**Server behaviour (must mirror legacy):**

1. Switch on `carrier`:
   - **DiD:** saveDiD – validate didnumber required; no `_` and `/` together; parse didnumber (pkey = first part; if `number/span`, span = second part, max 100). Build tuple: pkey, cluster, trunkname, carrier = DiD, technology = DiD, smartlink. Optional smartlink: EXTLEN, user cluster, for each pkey in range derive extkey from pkey suffix, lookup ipphone, set openroute/closeroute if match.
   - **CLID:** saveCLI – validate clinumber and trunkname required. Tuple: pkey = clinumber, cluster, trunkname, carrier = CLID, technology = CLID. Span = 1.
2. If validation fails, return 400 with errors.
3. Loop span times: createTuple("lineio", $tuple). On first error break and return 400. Increment pkey for next iteration (str_pad to preserve length for DiD range).
4. Return 201 with created id(s) or first created id. Legacy does not return to edit; client may navigate to list.

**Response:**

- **201 Created:** Body includes created DDI id(s), e.g. `{ "created": ["5551234"], "lastPkey": "5551234" }` or for range `{ "created": ["5551234","5551235",...], "lastPkey": "5551243" }`.
- **400 Bad Request:** Validation or DB errors, e.g. `{ "message": "Validation failed", "errors": { "didnumber": "No did number", "DiD": "DiD cannot have both class and span" } }`.

### 2.2 Supporting endpoints (if needed)

- **Cluster list:** For cluster dropdown, `GET /api/clusters` or config. Default `default`.

---

## 3. Client (SPA) behaviour

### 3.1 Route and entry

- Route: e.g. `/ddis/new`. User reaches it from the DDI list via a “New DiD” (or “Add”) button.

### 3.2 Form state

- **carrier / routeType:** string. Initial value: empty or “Choose a route type”.
- **cluster:** string, default `default`.
- **trunkname:** string.
- **didnumber:** string (DiD only).
- **clinumber:** string (CLID only).
- **smartlink:** string, YES | NO (DiD only). Default NO.

Disable or hide submit until `carrier` is set to DiD or CLID.

### 3.3 Visibility rules (conditional UI)

Show fields based on `carrier` (see `add-wizard.md` and flowchart “Client-side – type → visible fields” in `flowchart.md`):

| carrier (route type) | Show fields |
|----------------------|-------------|
| (none / placeholder) | Only route type selector. |
| DiD                  | cluster, trunkname, didnumber, smartlink. |
| CLID                 | cluster, trunkname, clinumber. |

### 3.4 Client-side validation (optional)

- **trunkname:** Required for both types.
- **didnumber:** Required when carrier = DiD; optionally disallow both `_` and `/`; if `/` present, second part numeric, ≤ 100.
- **clinumber:** Required when carrier = CLID.

### 3.5 Submit and navigation

1. On submit: `POST /api/ddis` (or equivalent) with JSON body built from form state.
2. **201:** Navigate to DDI list (e.g. `/ddis`). Legacy does not navigate to edit for the new DDI.
3. **400:** Stay on form; display errors.
4. **5xx / network error:** Show generic error; keep user on form.

### 3.6 Cancel

- “Cancel” navigates to DDI list without submitting.

---

## 4. Route type options (dropdown)

- Choose a route type
- DiD
- CLID

API must accept `DiD` and `CLID` for `carrier` / `routeType`.

---

## 5. Checklist for the agent

- [ ] One route for “new DDI” and one form; route type selector drives visibility per §3.3.
- [ ] `POST /api/ddis` (or equivalent) request body matches §2.1; server implements saveDiD/saveCLI, span loop, optional smartlink.
- [ ] On 201: navigate to list (not edit); on 400: show errors and stay on form.
- [ ] Cancel returns to DDI list.
- [ ] Optional: client-side validation for trunkname, didnumber, clinumber, span.

---

## 6. Legacy reference (where to look)

- **Logic and fields:** `sail-6/opt/sark/php/sarkddi/view.php` – showNew(), saveNew(), saveDiD(), saveCLI(), span loop, smartlink logic.
- **UI visibility:** `sail-6/opt/sark/php/sarkddi/javascript.js` – `#chooserDiD` change handler; hidden `#carrier`.
- **Flowcharts:** `flowchart.md` (and `flowchart.html`).

---

*Document for agent-driven implementation of the SPA “add new DDI” flow.*
