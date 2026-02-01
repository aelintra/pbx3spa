# Session handoff — where we left off

**Start here:** Read **PROJECT_PLAN.md** § Current state and **PANEL_PATTERN.md** §8 to see what’s done and what’s left.

---

## Done

- Steps 1–17+; full CRUD for Tenants, Extensions, Trunks, Queues, Agents, Routes, IVRs, Inbound routes (list/detail/create per PANEL_PATTERN).
- List blocks (§2.2), detail Identity/Settings/Advanced (§4.1), edit-from-list, delete confirmation modal, toasts.
- Create wording: list toolbar = “Create”, create form submit = “Create” / “Creating…”.
- Home dashboard (PBX status, Commit/Start/Stop/Reboot); auth with sessionStorage, route guard, whoami.
- **Create panels fully aligned with §3:** Tenant, Inbound route (use as reference).

---

## Left to do

### Complex create flows (type-chooser creates)

**Approach:** One create view per resource + type chooser + conditional fields + one polymorphic create API per resource. See **workingdocs/COMPLEX_CREATE_PLAN.md**.

**Next:** Trunk create type-chooser (Phase 1: type chooser “SIP trunk” | “IAX2 trunk”, conditional fields, pills for regthistrunk; Phase 2: API bug fix). Then DDI, then Extension. IVR is simple (no chooser); can standardize in parallel.

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

### Parked / later

- **Backups** — review after first CRUD set.
- **Admin user management** — API needs stronger user/privilege support first.
- **Help messages (tt_help_core)** — API to expose, then frontend consumes.

---

## References

- **PROJECT_PLAN.md** § Current state — full “next chat” instructions, stack, principles, job steps.
- **COMPLEX_CREATE_PLAN.md** — complex create flows: approach, trunk-first plan, current state (Trunk frontend + API), wizardnotes refs.
- **PANEL_PATTERN.md** §8 — reference implementation status; §3 for create-form rules; §2.2 list blocks; §4.1 detail blocks.
- **wizardnotes/** — add-wizard.md, agent-brief-spa.md per resource (DDI, extension, trunk, ivr).
- **SYSTEM_CONTEXT.md**, **README.md** — context and setup.
