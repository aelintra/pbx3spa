# Agent brief: Add new trunk (SPA)

**Purpose:** Instructions for an agent (or developer) to implement the “add new trunk” flow in a modern SPA using the recommended approach: **single form with conditional UI** and **one create API**.

**Reference docs (in this folder):**
- `add-wizard.md` – Legacy PHP behaviour, fields, validation, per-type logic.
- `flowchart.md` – Logic flowcharts (and `flowchart.html` for visual).

---

## 1. Approach to implement

- **One screen:** A “New trunk” page (single route, e.g. `/trunks/new`).
- **One form:** Trunk type selector + conditional fields. Show/hide fields based on selected type; do **not** use a multi-step wizard.
- **One API:** `POST` to a single create endpoint with a body that includes trunk type (carrier/chooser value) and type-specific fields. Server performs validation and type-specific logic (same as legacy saveNew() and saveSIPreg / saveSIPdynamic / saveSIPsimple / saveIAX / saveSibling).
- **Outcomes:** On success → navigate to the new trunk’s edit page (or list). On validation error → stay on form and display API error payload.

---

## 2. API contract

### 2.1 Create trunk

**Endpoint:** `POST /api/trunks` (or equivalent in your stack).

**Request body (JSON):** All fields that the legacy form can submit. Server ignores irrelevant fields per type.

| Field          | Type   | Required | Used when | Notes |
|----------------|--------|----------|-----------|--------|
| `carrier` or `trunkType` | string | yes | always | One of: `SIP (send registration)`, `SIP (accept registration)`, `SIP (trusted peer)`, `GeneralIAX2`, `InterSARK`. Must match chooser value (legacy uses hidden `carrier` set from chooser). |
| `trunkname`     | string | yes*     | all types | *Required for all types. Becomes pkey. Alphanumeric, hyphens allowed (no spaces). |
| `host`          | string | yes*     | SIP send, SIP trusted, GeneralIAX2, InterSARK | *Required when shown. For SIP accept registration server sets host = `dynamic` and may ignore this. |
| `password`      | string | yes*     | SIP send, SIP accept, GeneralIAX2, InterSARK | *Required when shown. For SIP accept registration server may set username/password to NULL in DB but still validate. |
| `peername`      | string | yes*     | InterSARK | *Required when carrier = InterSARK. |
| `regthistrunk`  | string | no       | GeneralIAX2 | `YES` or `NO`. Default `NO`. If YES, server sets register string. |
| `privileged`    | string | no       | SIP send, SIP accept, SIP trusted, InterSARK | `YES` or `NO`. Default `NO`. Affects username/peername for InterSARK. |

**Server behaviour (must mirror legacy):**

1. Switch on `carrier` (or `trunkType`):
   - **SIP (send registration):** saveSIPreg – validate host, trunkname, password; build tuple (carrier = GeneralSIP, technology = SIP, pjsipreg = SND); createPjsipTrunkInstance; copyTemplates.
   - **SIP (accept registration):** saveSIPdynamic – validate host, trunkname, password; build tuple (host = dynamic, username/password = NULL, pjsipreg = RCV); createPjsipTrunkInstance; copyTemplates.
   - **SIP (trusted peer):** saveSIPsimple – validate host, trunkname; build tuple (pjsipreg = NONE); createPjsipTrunkInstance; copyTemplates.
   - **GeneralIAX2:** saveIAX – validate host, trunkname; build tuple (carrier = GeneralIAX2 or IAX2 per Carrier table, technology = IAX2); if regthistrunk = YES set register; copyTemplates. **Note:** Legacy switch case is `"IAX2"` but chooser sends `"GeneralIAX2"`; API should accept `GeneralIAX2` and run IAX logic.
   - **InterSARK:** saveSibling – validate trunkname, host; build tuple (carrier = InterSARK, technology = IAX2, privileged, peername); build username/peername from hostname and peername; copyTemplates.
2. If validation fails in the handler, set invalidForm/errors and return 400.
3. If valid: createTuple("lineio", $tuple). On success return 201; on DB error return 400 with message.

**Response:**

- **201 Created:** Body includes created trunk id (pkey = trunkname). Example: `{ "pkey": "mytrunk" }` or `{ "id": "mytrunk" }`.
- **400 Bad Request:** Validation or DB errors. Body suitable for form display, e.g. `{ "message": "Validation failed", "errors": { "trunkname": "No trunk name", "host": "No host address" } }`.

### 2.2 Supporting endpoints (if needed)

- **Carrier / trunk types:** Trunk type options can be hardcoded in the client (same as legacy: SIP send reg, SIP accept reg, SIP trusted peer, GeneralIAX2, InterSARK) or returned from e.g. `GET /api/config` or `GET /api/carriers`.
- **Cluster:** New trunk form in legacy does not include cluster; default cluster may be applied server-side. If SPA needs cluster for new trunk, add optional `cluster` to request and document default.

---

## 3. Client (SPA) behaviour

### 3.1 Route and entry

- Route: e.g. `/trunks/new` (or `/trunks/create`).
- User reaches it from the trunk list via a “New trunk” (or “Add”) button.

### 3.2 Form state

- **carrier / trunkType:** string. Initial value: empty or “Choose a trunk type”.
- **trunkname:** string.
- **host:** string.
- **password:** string.
- **peername:** string (InterSARK only).
- **regthistrunk:** string, YES | NO (GeneralIAX2 only). Default NO.
- **privileged:** string, YES | NO. Default NO.

Disable or hide submit until `carrier` is set to a real type (not the placeholder).

### 3.3 Visibility rules (conditional UI)

Show fields based on `carrier` (trunk type) exactly as in legacy (see `04-trunk-add-wizard.md` and flowchart “Client-side – type → visible fields” in `05-trunk-add-flowchart.md`):

| carrier (trunk type)     | Show fields |
|--------------------------|-------------|
| (none / placeholder)     | Only type selector. |
| SIP (send registration)  | trunkname, host, password, privileged. |
| SIP (accept registration)| trunkname, password, privileged. |
| SIP (trusted peer)       | trunkname, host, privileged. |
| GeneralIAX2              | trunkname, password, host, regthistrunk. |
| InterSARK                | trunkname, peername, host, password, privileged. |

### 3.4 Client-side validation (optional but recommended)

- **trunkname:** Required for all types; alphanumeric and hyphens (no spaces). Same as legacy update.php rule.
- **host:** Required when visible (SIP send, SIP trusted, GeneralIAX2, InterSARK).
- **password:** Required when visible (SIP send, SIP accept, GeneralIAX2, InterSARK).
- **peername:** Required when carrier = InterSARK.

Display API validation errors (400) using the same keys (trunkname, host, etc.).

### 3.5 Submit and navigation

1. On submit: `POST /api/trunks` with JSON body built from form state (only include fields relevant to chosen type).
2. **201:** Navigate to edit page for the new trunk, e.g. `/trunks/{pkey}` (pkey = trunkname).
3. **400:** Stay on form. Display `errors` on the form (field-level and/or summary).
4. **5xx / network error:** Show generic error; keep user on form.

### 3.6 Cancel

- “Cancel” (or back) navigates to trunk list (e.g. `/trunks`) without submitting.

---

## 4. Trunk type options (dropdown)

Use the same options as legacy chooser:

- Choose a trunk type
- SIP (send registration)
- SIP (accept registration)
- SIP (trusted peer)
- GeneralIAX2
- InterSARK

API must accept these exact strings for `carrier` / `trunkType`. For **GeneralIAX2**, server must run the same logic as legacy saveIAX (legacy switch case is `"IAX2"` but form sends `"GeneralIAX2"`).

---

## 5. Checklist for the agent

When implementing, ensure:

- [ ] One route for “new trunk” and one form (no multi-step wizard).
- [ ] Trunk type selector drives visibility of fields per the table in §3.3.
- [ ] `POST /api/trunks` request body matches §2.1; server implements validation and type switch per legacy saveNew() and saveSIPreg / saveSIPdynamic / saveSIPsimple / saveIAX / saveSibling.
- [ ] Server accepts `GeneralIAX2` for IAX trunks (same logic as saveIAX).
- [ ] On 201: navigate to edit (or list); on 400: show errors and stay on form (§3.5).
- [ ] Cancel returns to trunk list (§3.6).
- [ ] Optional: client-side validation for trunkname, host, password, peername as in §3.4.

---

## 6. Legacy reference (where to look)

- **Logic and fields:** `sail-6/opt/sark/php/sarktrunk/view.php` – showNew(), saveNew(), saveSIPreg(), saveSIPdynamic(), saveSIPsimple(), saveIAX(), saveSibling(), copyTemplates().
- **UI visibility:** `sail-6/opt/sark/php/sarktrunk/javascript.js` – `#chooser` change handler and div visibility; hidden `#carrier` set from chooser.
- **Flowcharts:** `flowchart.md` (and `flowchart.html` for diagrams).

---

*Document for agent-driven implementation of the SPA “add new trunk” flow.*
