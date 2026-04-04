# SPA shell roadmap (nav and chrome)

**Purpose:** Track what shipped for the logged-in **AppLayout** shell (sidebar, top bar, canvas) and what is **proposed next**, so you do not need to dig through chat history.

**Code:** `src/layouts/AppLayout.vue`, `src/assets/main.css` (sidebar tokens).

---

## Stage 2 — shipped (committed, Apr 2026)

- **Context chips:** Instance (**`sysglobals.fqdn`**) + optional tenant on tenant detail; **`SessionContextChips.vue`**, **`auth`** store, **`useSessionContext`**, sync points in layout / sysglobals / tenant views. See **SESSION_HANDOFF.md** § Latest session.
- **Detail edit — Active in header:** **`DetailActiveStatusBar`** + **`detail-active-inactive-hint`** + **`main.css`** title-row nowrap; day timer edit includes **`active`**.

---

## Stage 1 — shipped (committed)

Theme: *light sidebar strip + nav polish* (commit subject includes `SPA shell stage 1`).

- **Sidebar background:** `--pbx-surface-subtle` (`#f1f5f9`) vs main column `--pbx-canvas` (`#f8fafc`) — visible nav rail without the old dark slate bar.
- **Tokens:** `--pbx-sidebar-hover-bg`, `--pbx-sidebar-active-bg`, `--pbx-sidebar-active-color` for hover and current route.
- **Separation:** `1px` right border on the sidebar (`--pbx-border`).
- **Nav rows:** Rounded hover/active (“pills”), slightly smaller link size, small vertical gaps in nested groups.
- **Section headings:** Softer caps (weight, size, letter-spacing) so groups feel less like legacy admin templates.

---

## Proposed next (remaining ideas — pick in any order)

Rough **effort**: S = small (hours), M = moderate (day or so), L = larger. *(Nav icons, scroll-active-into-view, focus-visible, wider sidebar, and context chips are already on **`main`** — see Stage 2 above and **Suggested order** strikethroughs.)*

### Nav / shell

| Idea | What it does | Effort |
|------|----------------|--------|
| **Nav icons** | **Done on main** (`NavIcon.vue` + `AppLayout`). | — |
| **Collapsible sidebar** | Narrow icon-only rail on small widths; expand on hover or toggle. Defer with **adaptive / responsive** layout pass. | L |
| **⌘K / quick open** | Modal: type to filter and jump to any nav destination (and maybe recent routes). | M |
| **Scroll active link into view** | **Done on main** (`AppLayout.vue`). | — |

### Clarity

| Idea | What it does | Effort |
|------|----------------|--------|
| **Breadcrumbs** | Skipped: navigation is shallow (list → detail/create) and `PanelBackLink` already orients the user. | — |
| **Page subtitles** | One line under `h1` on the heaviest screens (firewall, CoS, etc.) to reduce “what is this?” friction. | S |

### Polish

| Idea | What it does | Effort |
|------|----------------|--------|
| **`:focus-visible`** | **Done on main** (`main.css`, `CommitButton`). | — |
| **Wider sidebar** | **Done on main** (`13.5rem` in `AppLayout`). | — |

### Product / safety

| Idea | What it does | Effort |
|------|----------------|--------|
| **Context chip in top bar** | **Shipped (Stage 2).** Instance = **`sysglobals.fqdn`**; tenant on tenant detail. | — |

---

## Suggested order if you want a default sequence

1. ~~**Scroll active into view** + **focus-visible**~~ — **Done:** `AppLayout.vue` (`scrollActiveNavIntoView` on route change, after group toggle, after mount); `main.css` (`:focus-visible` on nav links + group buttons + logout); `CommitButton.vue` (`:focus-visible` on Commit).  
2. **Nav icons** — **Done:** `NavIcon.vue` + `AppLayout.vue` (`icon` per group and link; sidebar `13.5rem`). **⌘K quick open** — still optional.  
3. **Breadcrumbs** — skipped (redundant with `PanelBackLink` and two-level IA).  
4. **Collapsible sidebar** — defer until an **adaptive / responsive** layout pass (narrow breakpoints, icon rail, etc.).  
5. **Instance + tenant context chip** in the top bar — **done** (see Product / safety table): instance = **`sysglobals.fqdn`**; tenant when editing a tenant; tenant cleared on list and when leaving detail.

---

## Related docs

- **Nav grouping rationale:** `SIDEBAR_NAV_GROUPING.md`
- **Overall SPA plans / index:** `FEATURE_PLANS_INDEX.md`, `SESSION_HANDOFF.md`
- **Styling conventions:** `STYLING_PATTERN.md`, `PANEL_PATTERN.md`
