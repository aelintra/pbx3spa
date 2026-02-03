# Session handoff — where we left off

**Start here:** Read **PROJECT_PLAN.md** § Current state and **PANEL_PATTERN.md** §8 to see what’s done and what’s left.

---

## Done

- Steps 1–17+; full CRUD for Tenants, Extensions, Trunks, Queues, Agents, Routes, IVRs, Inbound routes (list/detail/create per PANEL_PATTERN).
- List blocks (§2.2), detail Identity/Settings/Advanced (§4.1), edit-from-list, delete confirmation modal, toasts.
- Create wording: list toolbar = “Create”, create form submit = “Create” / “Creating…”.
- Home dashboard (PBX status, Commit/Start/Stop/Reboot); auth with sessionStorage, route guard, whoami.
- **Create panels fully aligned with §3:** Tenant, Inbound route (use as reference).

### Latest session (Inbound routes + schema + booleans)

- **Inbound route create (pbx3api):** Destinations API uses `$request->all()` in `move_request_to_model` (Helper.php) so JSON POST body is read; pkey set from request; Asterisk extension validation for pkey (digits, _XZN.! pattern, s/i/t); reject single "0"; validation message for invalid extension.
- **Inbound route detail (pbx3-frontend):** Open/Close route are **destination dropdowns** (None, Operator, Queues/Extensions/IVRs/CustomApps) loaded from `GET /destinations?cluster=<tenant>`; MOH value **NO** mapped to **OFF** so the pill slider shows the correct selection.
- **Schema yardstick:** **pbx3/full_schema.sql** is the single source of truth for table columns. API models and controllers were aligned to it (inroutes, trunks, route, queue, appl, dateseg; removed faxdetect, lcl, monitor, routeable, carrier→technology, desc→description where schema has description, etc.). ipphone keeps **desc** (SIP username; Asterisk generator uses it); TODO rename to sip_username later.
- **Boolean standardisation (documented only):** **BOOLEAN_STANDARDISATION.md** describes the plan and fixer logic to migrate existing DBs to YES/NO. No migration file is in the repo (removed to avoid unplanned runs); create it when ready per the doc.

---

## Left to do

### Complex create flows (create exercise)

**Approach:** One create view per resource + type chooser + conditional fields + one polymorphic create API per resource. See **workingdocs/COMPLEX_CREATE_PLAN.md**.

**Status (create exercise):** Tenant, Extension, Trunk, Inbound route create done; IVR create still to do (minimal form today). Finish IVR create per §3 (tenant dropdown, description, defaults). 

### Create-panel standardization (PANEL_PATTERN §3 + §8)

Standardize these create panels so they match §3 (SQL defaults, Identity/Settings/Advanced, segmented pills):

- **Extension**
- **Trunk** (first: type-chooser create per COMPLEX_CREATE_PLAN)
- **Route**
- **Queue**
- **Agent**
- **IVR**

For each: (a) preset create-form fields from DB SQL DEFAULTs and model `$attributes`; (b) group fields into Identity, Settings (or Transport), and optional Advanced; (c) use segmented pills for boolean and short fixed-choice fields instead of `<select>`.

### Other to-dos (from PROJECT_PLAN § Current state)

- **pbx3api – Middleware on remote:** Investigate why `ValidateClusterAccess.php` doesn’t appear on remote after pull (newpanels in use, file tracked); may be from old Sanctum experiment or deploy path.

- **Extensions:** Allow changing extension number (pkey) — needs API support first.
- **Phone images:** API hosts library; SPA consumes URLs.
- **Tenants – Timer status / masteroclo:** API null handling; prefer API fix (e.g. model accessor or DB default).
- **Field mutability:** Prefer API-driven immutable metadata so frontend can derive lowlight without per-panel lists.
- **Review later (UX):** Inline edit for list rows — revisit when main pattern is stable.

### Panel pattern audit (for when we come back)

**Fully implement pattern (read: Identity + Settings/Transport + Advanced; edit: all API-updateable fields):** Trunk, Inbound route only.

**Do not fully implement:** Tenant (edit: 5 of 50+ fields), Extension (edit: 6 of 16), Route (edit: 3 of 9), Agent (no read structure + edit: 3 of 7), Queue (no read structure + edit: 2 of 5), IVR (no read structure + edit: 2 of many). See full audit in chat history; standardize these panels later.

### Parked / later

- **Backups** — review after first CRUD set.
- **Admin user management** — API needs stronger user/privilege support first.
- **Help messages (tt_help_core)** — API to expose, then frontend consumes.

---

## References

- **PROJECT_PLAN.md** § Current state — full “next chat” instructions, stack, principles, job steps.
- **COMPLEX_CREATE_PLAN.md** — complex create flows: approach, trunk-first plan, current state (Trunk frontend + API), wizardnotes refs.
- **PANEL_PATTERN.md** §8 — reference implementation status; §3 for create-form rules; §2.2 list blocks; §4.1 detail blocks.
- **BOOLEAN_STANDARDISATION.md** — plan and fixer for standardising boolean columns to YES/NO; migration in pbx3api (run when ready).
- **pbx3/full_schema.sql** — schema yardstick; API models/controllers must match column set (see SYSTEM_CONTEXT.md).
- **wizardnotes/** — add-wizard.md, agent-brief-spa.md per resource (DDI, extension, trunk, ivr).
- **SYSTEM_CONTEXT.md**, **README.md** — context and setup.
