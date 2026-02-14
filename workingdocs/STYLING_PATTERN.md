# Styling pattern — deferred until after app functionality

**Purpose:** Capture styling decisions and visual requirements to be applied in a **single styling pass** after the basic application functionality is complete. Do not implement these during feature work; they are for the dedicated styling phase.

**Rationale:** Doing styling in one pass keeps the design system consistent (colors, radii, shadows, typography, controls) and avoids rework when tokens or patterns change.

---

## Scope

- **When:** After the basic app (CRUD, flows, validation) is finished.
- **What:** One design pass applying a consistent look across forms, buttons, pills, layout, and typography.
- **Reference:** This doc; PANEL_PATTERN.md (for structure and behaviour, not final visuals).

---

## Deferred requirements

### Segmented pills — match boolean pill look (elliptical selected)

**Component:** `FormSegmentedPill.vue` (used for 2–5 option fixed-choice fields, e.g. Extension protocol, transport, callbackto, devicerec, ipversion).

**Current state:** Horizontal row of pill buttons; selected option has a filled background; each segment has rounded ends. Functional and readable.

**Target (to implement in styling pass):** Style the segmented pill group to resemble the boolean (FormToggle) pills:

- **One outer track** — Single capsule shape (fully rounded edges) for the whole control, like the boolean pill track.
- **Sliding elliptical “thumb”** — An inner pill-shaped element (same elliptical/rounded shape as the boolean toggle thumb) that moves to sit under the selected option. Position is derived from the selected index (e.g. `transform` or `left`/`width`).
- **Labels on top** — Option labels remain in a row; the thumb slides underneath the selected one.

Result: one rounded track with one elliptical selected indicator that moves between choices, visually consistent with the YES/NO boolean pills. Implementation is styling + optional small template change (wrapper/thumb element); behaviour and props stay the same.

**Do not implement this until the general styling phase.** Documented here so it is not forgotten.

---

## Future sections

As other styling decisions or deferred visual requirements come up, add them under **Deferred requirements** with the same clarity (what, why deferred, target look or behaviour).
