# Styling pattern — SPA layout conventions and deferred visuals

**Purpose:** (1) Record **structural layout and copy** for detail/edit panels that are already implemented in code (so a styling pass does not accidentally reorder Identity or change title patterns). (2) Capture **deferred visual** styling to apply in a **single design pass** after core functionality is stable.

**Rationale:** One visual pass keeps tokens and controls consistent (colors, radii, shadows, typography). Separating “implemented layout rules” from “deferred chrome” avoids contradicting this file’s own guidance.

---

## Scope

- **Implemented (this doc, “Detail / edit panel layout”):** Identity field order, labels, extension exceptions, timer Identity content, and tenant-aware `<h1>` titles — already reflected in the database-backed detail views under `src/views/*DetailView.vue` (see also **CREATE_EDIT_PANEL_FIELD_ORDER.md**).
- **Deferred (“Deferred requirements”):** Purely visual changes (e.g. segmented pill track/thumb) — do not block feature work; implement in the dedicated styling phase.
- **Reference:** This doc; **PANEL_PATTERN.md** (structure and behaviour); **CREATE_EDIT_PANEL_FIELD_ORDER.md** (per-entity section and field inventory).

---

## Detail / edit panel layout (implemented)

These are **structural layout and copy conventions** already applied in the tenant-scoped database-backed **detail** views (and **Tenant** detail for Identity labelling). They are recorded here so a later styling pass does not undo heading order, title format, or field grouping. Field-level inventory and per-entity section order remain in **CREATE_EDIT_PANEL_FIELD_ORDER.md**.

### Identity section — first fields

- **Order:** Any Identity lines for **UID** (`shortuid`) and **KSUID** (`id`) come **first**, in that order, when the API returns non-empty values. If one or both are missing, those rows are omitted (the next field is still the human primary key or the next defined line). After UID lines, the human primary key follows (e.g. queue dial, route name, **Ext Dial** on extensions).
- **Labels:** The `shortuid` field is labeled **UID**. **KSUID** stays **KSUID**.

### Extension detail — exceptions

- **Ext Dial** is the label for the extension primary key (`pkey`), not “Ext”.
- **Extension type** and **Technology** are not shown on extension edit.
- **Transport** remains in its own section; do not add under-label hint/legend text for SIP transport on that control.
- **MAC address**: no under-field hint/legend on edit.
- **UID** appears **twice**, same value: once as the standard first Identity line (**UID**), and again between **Ext Dial** and **SIP Password** with the label **SIP User**.

### Day timer and Holiday timer detail

- **pkey** is not shown in the Identity section. UID, KSUID, and State remain as implemented.

### Panel title line (`<h1>`) — tenant-scoped detail views

- For entities owned by a tenant, the title follows: **`Edit <Entity> <key> (<tenantPkey>)`**, e.g. `Edit Route AFFCOT_INTERSITE (Affcot)`. The parenthesised value is the owning tenant **pkey** (same resolution as the form’s tenant/cluster field). The `<key>` part is whatever that panel already uses (pkey, display name, or a short description — e.g. day/holiday timers use ` — <description>` before the suffix).
- **Exceptions:** **Edit Tenant** — no tenant suffix (the record is the tenant). **Edit Trunk** — no tenant suffix (trunks are a shared instance resource selected by route rules, not tenant-scoped in the UI).

---

## Deferred requirements

### Segmented pills — match boolean pill look (elliptical selected)

**Component:** `FormSegmentedPill.vue` — 2–5 option fixed-choice fields. Examples include Extension **Callback to** and **Protocol (IP version)**, outbound route **Strategy**, and IVR-related pills where used. Many multi-value fields remain `FormSelect` (e.g. Extension **Transport**, Extension **Devicerec**).

**Current state:** Horizontal row of pill buttons; selected option has a filled background; each segment has rounded ends. Functional and readable.

**Target (to implement in styling pass):** Style the segmented pill group to resemble the boolean (FormToggle) pills:

- **One outer track** — Single capsule shape (fully rounded edges) for the whole control, like the boolean pill track.
- **Sliding elliptical “thumb”** — An inner pill-shaped element (same elliptical/rounded shape as the boolean toggle thumb) that moves to sit under the selected option. Position is derived from the selected index (e.g. `transform` or `left`/`width`).
- **Labels on top** — Option labels remain in a row; the thumb slides underneath the selected one.

Result: one rounded track with one elliptical selected indicator that moves between choices, visually consistent with the YES/NO boolean pills. Implementation is styling + optional small template change (wrapper/thumb element); behaviour and props stay the same.

**Do not implement this until the general styling phase.** Documented here so it is not forgotten.

---

## Future sections

As requirements come up: add **structural / copy** rules under **Detail / edit panel layout (implemented)** (and implement in code); add **purely visual** items under **Deferred requirements** with the same clarity (what, why deferred, target look or behaviour).
