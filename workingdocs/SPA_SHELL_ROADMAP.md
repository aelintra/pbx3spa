# SPA shell roadmap (nav and chrome)

**Purpose:** Track what shipped for the logged-in **AppLayout** shell (sidebar, top bar, canvas) and what is **proposed next**, so you do not need to dig through chat history.

**Code:** `src/layouts/AppLayout.vue`, `src/assets/main.css` (sidebar tokens).

---

## Stage 1 — shipped (committed)

Theme: *light sidebar strip + nav polish* (commit subject includes `SPA shell stage 1`).

- **Sidebar background:** `--pbx-surface-subtle` (`#f1f5f9`) vs main column `--pbx-canvas` (`#f8fafc`) — visible nav rail without the old dark slate bar.
- **Tokens:** `--pbx-sidebar-hover-bg`, `--pbx-sidebar-active-bg`, `--pbx-sidebar-active-color` for hover and current route.
- **Separation:** `1px` right border on the sidebar (`--pbx-border`).
- **Nav rows:** Rounded hover/active (“pills”), slightly smaller link size, small vertical gaps in nested groups.
- **Section headings:** Softer caps (weight, size, letter-spacing) so groups feel less like legacy admin templates.

---

## Proposed next (not committed — pick in any order)

Rough **effort**: S = small (hours), M = moderate (day or so), L = larger.

### Nav / shell

| Idea | What it does | Effort |
|------|----------------|--------|
| **Nav icons** | Icon beside Home, groups, or high-traffic links — strongest visual “modern app” cue after stage 1. | M |
| **Collapsible sidebar** | Narrow icon-only rail on small widths; expand on hover or toggle. | L |
| **⌘K / quick open** | Modal: type to filter and jump to any nav destination (and maybe recent routes). | M |
| **Scroll active link into view** | When a group opens or route lands deep, ensure the active `.nav-link` is visible in the scrollable sidebar. | S |

### Clarity

| Idea | What it does | Effort |
|------|----------------|--------|
| **Breadcrumbs** | Skipped: navigation is shallow (list → detail/create) and `PanelBackLink` already orients the user. | — |
| **Page subtitles** | One line under `h1` on the heaviest screens (firewall, CoS, etc.) to reduce “what is this?” friction. | S |

### Polish

| Idea | What it does | Effort |
|------|----------------|--------|
| **`:focus-visible`** | Clear keyboard focus rings on sidebar links, top bar buttons, and Commit — accessibility and power users. | S |
| **Wider sidebar** | e.g. `13.5rem` if labels like “Queues / Ring groups” wrap awkwardly. | S |

### Product / safety

| Idea | What it does | Effort |
|------|----------------|--------|
| **Context chip in top bar** | Show current **tenant** or **instance** when multi-context exists — reduces wrong-box edits. | M (depends on auth/routing model) |

---

## Suggested order if you want a default sequence

1. ~~**Scroll active into view** + **focus-visible**~~ — **Done:** `AppLayout.vue` (`scrollActiveNavIntoView` on route change, after group toggle, after mount); `main.css` (`:focus-visible` on nav links + group buttons + logout); `CommitButton.vue` (`:focus-visible` on Commit).  
2. **Nav icons** — **Done:** `NavIcon.vue` + `AppLayout.vue` (`icon` per group and link; sidebar `13.5rem`). **⌘K quick open** — still optional.  
3. **Breadcrumbs** — skipped (redundant with `PanelBackLink` and two-level IA).  
4. **Collapsible sidebar** if laptop-width layout becomes painful.  
5. **Tenant/instance chip** when the product story for context is clear.

---

## Related docs

- **Nav grouping rationale:** `SIDEBAR_NAV_GROUPING.md`
- **Overall SPA plans / index:** `FEATURE_PLANS_INDEX.md`, `SESSION_HANDOFF.md`
- **Styling conventions:** `STYLING_PATTERN.md`, `PANEL_PATTERN.md`
