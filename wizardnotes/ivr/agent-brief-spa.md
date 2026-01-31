# Agent brief: Add new IVR (SPA)

**Purpose:** Instructions for an agent (or developer) to implement the “add new IVR” flow in a modern SPA using the recommended approach: **single form** and **one create API**. IVR create has no type chooser and no conditional fields.

**Reference docs (in this folder):**
- `add-wizard.md` – Legacy PHP behaviour, fields, validation.
- `flowchart.md` – Logic flowcharts (and `flowchart.html` for visual).

---

## 1. Approach to implement

- **One screen:** A “New IVR” page (single route, e.g. `/ivrs/new`).
- **One form:** IVR name (pkey), cluster, description. All fields always visible; no type selector and no show/hide.
- **One API:** `POST` to a single create endpoint. Server validates and inserts one row into ivrmenu.
- **Outcomes:** On success → navigate to the new IVR’s edit page (or list). On validation error → stay on form and display API errors.

---

## 2. API contract

### 2.1 Create IVR

**Endpoint:** `POST /api/ivrs` (or equivalent).

**Request body (JSON):**

| Field         | Type   | Required | Notes |
|---------------|--------|----------|--------|
| `pkey` or `ivrname` | string | yes | IVR name (primary key). |
| `cluster`     | string | no       | Default e.g. `default`. |
| `description` | string | no       | Optional description. |

**Server behaviour (must mirror legacy):**

1. Validate: pkey (IVR name) required.
2. Build tuple from body (pkey, cluster, description, and any other ivrmenu columns the helper would set).
3. createTuple("ivrmenu", tuple) – insert one row.
4. Return 201 with created IVR id (pkey) or 400 with validation/DB errors.

**Response:**

- **201 Created:** Body includes created IVR id, e.g. `{ "pkey": "myivr" }`.
- **400 Bad Request:** Validation or DB errors, e.g. `{ "message": "Validation failed", "errors": { "pkey": "Please fill in IVR name" } }`.

### 2.2 Supporting endpoints (if needed)

- **Cluster list:** For cluster dropdown, `GET /api/clusters` or include in config. Default cluster (e.g. `default`) if not sent.

---

## 3. Client (SPA) behaviour

### 3.1 Route and entry

- Route: e.g. `/ivrs/new`. User reaches it from the IVR list via a “New IVR” (or “Add”) button.

### 3.2 Form state

- **pkey / ivrname:** string (IVR name).
- **cluster:** string, default e.g. `default`.
- **description:** string, optional.

### 3.3 Visibility rules

All fields always visible; no conditional UI. No type chooser.

### 3.4 Client-side validation (optional)

- **pkey / ivrname:** Required.

### 3.5 Submit and navigation

1. On submit: `POST /api/ivrs` with JSON body (pkey, cluster, description).
2. **201:** Navigate to edit page for the new IVR, e.g. `/ivrs/{pkey}`.
3. **400:** Stay on form; display errors.
4. **5xx / network error:** Show generic error; keep user on form.

### 3.6 Cancel

- “Cancel” navigates to IVR list (e.g. `/ivrs`) without submitting.

---

## 4. Checklist for the agent

- [ ] One route for “new IVR” and one form (no type chooser, no conditional fields).
- [ ] `POST /api/ivrs` request body matches §2.1; server validates pkey and createTuple("ivrmenu").
- [ ] On 201: navigate to edit (or list); on 400: show errors and stay on form.
- [ ] Cancel returns to IVR list.

---

## 5. Legacy reference (where to look)

- **Logic and fields:** `sail-6/opt/sark/php/sarkivr/view.php` – showNew(), saveNew(), buildTupleArray (helper), createTuple("ivrmenu").
- **Flowcharts:** `flowchart.md` (and `flowchart.html`).

---

*Document for agent-driven implementation of the SPA “add new IVR” flow.*
