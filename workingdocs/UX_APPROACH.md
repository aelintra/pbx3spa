# UX approach for the PBX3 admin frontend

How we deal with UX: when we do it, what we document, and how it ties to the job steps. Lightweight so we don’t block progress, but enough that we stay consistent and intentional.

---

## 1. How we deal with UX

**Option A: Upfront (before or alongside Step 1)**  
Spend a short, bounded “UX pass”: document principles, key flows, and rough screen outlines (bullets or simple sketches). Then build Steps 1–10 (and beyond) with that as reference. UX is mostly **documented once**, then **referred to** as we implement each step.

**Option B: Per-step**  
Before or during each job step, we briefly decide UX for that step (e.g. “login form: fields in this order, error under form, primary button label”). No big upfront doc; we capture decisions in the step or in short notes. Risk: patterns might drift (e.g. one list looks different from another).

**Option C: Hybrid (recommended)**  
- **Once, early:** A short UX doc (this file): principles + key flows + screen outlines. No full wireframes unless you want them; bullets and “user does X, sees Y” are enough.  
- **Per step:** When implementing, we check the doc and keep patterns consistent (e.g. “all lists use this table pattern,” “all forms use this error placement”).  
- **Checkpoints:** After a few steps (e.g. after Step 7 layout, after Step 8 first list), we pause to review: does the shell and first data page match what we want? Tweak the doc or the code, then continue.

So: **we deal with UX** by (1) writing down principles and key flows early, (2) using that as the reference during build, and (3) doing a quick review at one or two checkpoints so we don’t drift.

---

## 2. Principles for this admin app

- **Clarity over cleverness.** Operators need to find things and complete tasks quickly. Obvious labels, clear hierarchy, no hidden or trendy interactions.
- **Consistency.** Same patterns for lists (**tables** — see §3), forms (label above/beside, error under field or under form), buttons (primary = submit, secondary = cancel), and errors (where we show messages, how we show loading). Document once, reuse.
- **Efficiency.** Few clicks to common tasks (e.g. list → detail → edit). Nav by resource (Tenants, Extensions, …) so operators know where to go. Optional: shortcuts or “recent instances” later.
- **Forgiveness.** Destructive actions (delete, restart) get confirmation. Errors are visible and actionable (e.g. “Invalid credentials” with a way to try again).
- **Progressive.** We can ship a minimal shell and a few list/detail views first, then add CRUD and operational screens. UX should support that: e.g. “list → detail” before “list → detail → edit.”

We’re not optimising for marketing or first-time consumers; we’re optimising for **operators who use the app regularly** to manage PBX3 instances.

---

## 3. Current practice: navigation (sidebar vs top menus)

**What's current for admin panels**  
For simple admin/dashboard UIs, **sidebar navigation** is the usual pattern now: a vertical nav on the left (main links in a column), content on the right. Top bar is often kept **minimal** (logo, maybe "Logged in as X", Logout). Top menus with dropdowns (like the older SARK layout) still work but read as dated and don't scale as well when you have many items — long dropdowns get awkward. Most modern SaaS dashboards, cloud consoles, and admin templates (Stripe, Vercel, Laravel Nova, Vue/React admin themes) use **sidebar + minimal top bar**.

**Why sidebar fits us**  
- **Simple admin panel:** We're not doing anything exotic; we need clear, predictable nav. Sidebar gives that: all main sections visible at once (or grouped), current section highlighted, no nested dropdowns.  
- **Familiar:** Operators see this pattern everywhere (cloud consoles, internal tools). Low cognitive load.  
- **Scales:** We have Endpoints, PBX, Settings, Net (and sub-items). In a sidebar we can show groups or a flat list; on small screens we collapse to a hamburger that slides in from the left.  
- **Mobile:** Sidebar collapses to a drawer/hamburger; same structure, no cramped top dropdowns.

**Recommendation**  
Use a **sidebar** for main navigation (Tenants, Extensions, Trunks, Routes, IVRs, Queues, etc., grouped or flat as you prefer) and a **minimal top bar** (logo, instance or user, Logout). Drop the "top menus with dropdowns" pattern from SARK; it's fine to keep SARK's *grouping* (Endpoints, PBX, Settings, Net) but render it as a **left sidebar** in the new app. No need for anything fancy — just a clear, current-practice admin shell.

---

## 4. List presentation: tabular output and scale

**Tabular output as default**  
List views use **tables**. Tables are the easiest to deal with for this app: operators can scan rows, compare values, and click through to detail or edit. We don’t need cards or alternate layouts for the main data lists; one consistent table pattern across resources keeps the UX simple and predictable.

**Typical scale of a PBX3 system**  
Asterisk PBX systems usually don’t have thousands of endpoints. More often:

| Resource | Typical scale | Implication |
|----------|----------------|-------------|
| **Extensions** | A few hundred telephone extensions | Largest list; table is fine. Optional simple pagination or “show all” (e.g. 200–500 rows) — no need for heavy virtualization. |
| **Trunks** | A couple of carrier gateways | Small table (often single digits to low double digits). |
| **Outbound routes** | Maybe a dozen routes (where outbound calls go) | Small table. In our API these are **routes** (ring groups / dialplan routes). |
| **Call groups / ring groups** | Small set | Same **routes** resource; small table. |
| **IVRs** | A bunch | Typically single digits to a dozen or so; small table. |
| **Queues** | A bunch | Similar to IVRs; small table. |
| **Tenants** | Usually a handful (e.g. one per customer or site) | Small table. |
| **Ancillary** | Day timers, holiday timers, inbound routes, CoS, etc. | Mostly small tables. |

So: **extensions** are the only list that might reach “a few hundred” rows; everything else (trunks, routes, IVRs, queues, tenants, and ancillary objects) is small — often under a few dozen rows. Tables work well for all of them; we only need to decide whether extensions get pagination or “show all” (e.g. default “show all” with a note that very large systems could add pagination later).

**Summary**  
- **Lists = tables.** Same table pattern for every resource: columns for key fields, row click or “View” for detail, loading and error states.  
- **Scale:** Extensions = few hundred; trunks, routes, IVRs, queues, tenants = small. No need for heavy client-side virtualization; optional simple pagination for extensions if we want it.

---

## 5. Key flows (outline)

**Connect and log in**  
1. User opens app → sees **login** (or “connect”) screen.  
2. Fields: **API base URL** (e.g. https://192.168.1.205:44300), **Email**, **Password**.  
3. Submit → success: store token, redirect to main app (e.g. Tenants list). Failure: show error (e.g. under form), stay on login.  
4. Optional: “Remember this instance” (e.g. save URL only, not password) for next time.

**Main app (after login)**  
1. **Shell:** Sidebar or top nav with: Tenants, Extensions, Trunks, Queues, … (data), and optionally “System” or “Actions” (operational), plus **Logout**.  
2. **Default view:** e.g. Tenants list (or a small “dashboard” with links).  
3. **List pages:** **Table** with key columns; row click or “View” → detail. Loading state while fetch; error state with retry or message. (See §3 — tabular output for all lists.)  
4. **Detail pages:** Read-only at first (e.g. Tenant detail); later Edit button → form, Submit/Cancel.  
5. **Logout:** Clears session, redirects to login.

**Instance switching (later)**  
1. If we support “multiple instances” in one session: a way to switch (e.g. instance selector in nav or header) and optionally re-login per instance.  
2. For Step 1–10 we can keep it simple: one instance per session (login = choose instance + auth).

We can add more flows (e.g. “Create tenant,” “Run backup,” “Restart firewall”) as we add those job steps; each flow stays a short “user does X, sees Y” outline.

---

## 6. Screen outlines (minimal)

- **Login:** One column or card: API base URL, Email, Password, [Log in]. Error message below button or above form. No nav.
- **App shell:** Nav (Tenants, Extensions, … Logout) + main content area. Optional: “Logged in as X” or instance URL in header.
- **List (e.g. Tenants):** Page title “Tenants”; **table** with columns (e.g. pkey, description, …); loading spinner or skeleton; error banner if fetch fails. Same pattern for all resources (extensions, trunks, routes, IVRs, queues, etc.). Optional: simple pagination for extensions only (few hundred rows). Later: “Add …” button per resource.
- **Detail (e.g. Tenant):** Page title “Tenant: {pkey}”; fields in a readable layout; later: “Edit” button.
- **Form (e.g. Edit tenant):** Same fields as detail but editable; [Save] [Cancel]. Validation errors per field or summary.

We don’t need pixel-perfect wireframes for the first version; these outlines plus the principles above are enough to keep Step 1–10 consistent. If you want to sketch wireframes (e.g. on paper or in a tool), we can attach them or describe them here.

---

## 7. How this ties to the job steps

- **Before Step 1:** Read this doc (and optionally add a sketch or two). No code yet.  
- **Steps 1–7:** Scaffold, API client, auth, login, route guard, layout. Use “Login” and “App shell” + “Key flows” above so the layout and nav match.  
- **Step 8–9:** First lists (Tenants, Extensions). Use **table** pattern (§3) and “List” outline so both lists look and behave the same.  
- **Checkpoint (e.g. after Step 8 or 9):** Quick review: Does the shell and first list feel right? Any tweaks to nav, table style, or error handling? Update this doc or the code, then continue.  
- **Later steps:** Detail views, forms, operational screens — same idea: one line in this doc per screen or flow, then implement to match.

If we find a better pattern mid-step (e.g. “errors work better above the form”), we update this doc so the next step reuses it.

---

## 8. Artifacts we can add (optional)

- **Wireframes:** Simple line/sketch of each main screen (login, shell, list, detail, form). You can do these in Figma, Excalidraw, or on paper and photo them; we reference them in this doc.  
- **Component checklist:** “All lists use a **table** (same component or pattern) with loading and error states; all forms use …” so we don’t invent a new pattern every step. Scale: extensions = largest (optional pagination); everything else = small tables.  
- **Copy:** Button labels (“Log in,” “Save,” “Cancel,” “Delete”), error messages (“Invalid credentials,” “Could not load tenants”). One place to keep them so we stay consistent.

We can add these when you want to “spend a little time on UX” — e.g. one short session to add wireframes or a component checklist, then continue building.

---

## 9. Summary

- **How we deal with UX:** Document principles and key flows early (this doc); use them as reference during each job step; optional checkpoint after layout and first list; optional wireframes or checklist.  
- **Principles:** Clarity, consistency, efficiency, forgiveness, progressive.  
- **Lists:** **Tabular output** for all resources (§3). Typical scale: extensions = few hundred; trunks, routes, IVRs, queues, tenants, ancillary = small. One table pattern; optional pagination for extensions only.  
- **Key flows:** Login → shell → list → detail (→ edit later).  
- **Screen outlines:** Login, shell, list (table), detail, form — bullets only for now; wireframes optional.  
- **Tie to steps:** Read before Step 1; follow during Steps 1–10; checkpoint after Step 8 or 9; update doc when we improve a pattern.
- **Current system reference:** §9 and **workingdocs/reference/sark-extensions-page-source.html** — SARK layout, nav (Endpoints, PBX, Settings, Net), table pattern; what we keep vs change for the new Vue app.

You can “spend a little time on UX” by: (1) reviewing and editing this doc, (2) adding one or two rough wireframes or a short component checklist, and/or (3) doing a checkpoint review after Step 7 or 8. That keeps UX intentional without big-bang design up front.

---

## 10. Current system reference (SARK)

The older SARK PBX UI (Aelintra) gives a concrete reference for what you have now. The new PBX3 admin frontend will be different (SPA, API-driven) but we can carry over the **structure and patterns** that work. A condensed structure sample is in **workingdocs/reference/sark-extensions-page-source.html**.

### Layout and chrome

- **Top:** White bar with logo (SARK), then **black bar** with navigation.
- **Nav (desktop):** **Dropdown menus** — Endpoints, PBX, Settings, Net. Plus **Home**, **Commit**, **+Add**, **Logout** in the bar.
- **Nav (mobile):** Hamburger opens a panel with the same links grouped under Endpoints, PBX, Settings, Net.
- **Content:** Page title in a gray bar (e.g. "Extensions"), then main content in a **centered column** (margins on sides).
- **Footer:** Black bar with copyright.

### Nav structure (SARK → PBX3 mapping)

| SARK dropdown | Items (SARK) | PBX3 API / new app |
|---------------|--------------|---------------------|
| **Endpoints** | Extensions, Route(Inbound), Route(Outbound), Trunks | extensions, inboundroutes, routes, trunks |
| **PBX** | Agents, Class of Service, Conferences, Dashboard, Greetings, IVR, Multi-Tenant, Queues, Reports, Ring Groups, Timers(Holidays), Timers(Recurring) | agents, cosrules/cosopens/coscloses, greetings, ivrs, tenants, queues, routes, holidaytimers, daytimers |
| **Settings** | Backup/Restore, Globals, Logs, Users, Custom Apps, etc. | backups, snapshots, sysglobals, logs, auth/users, customapps, etc. |
| **Net** | IP Settings, IPV4 Firewall, IPV6 Firewall | firewalls/ipv4, firewalls/ipv6 |

For the new app we use **the same grouping**: Endpoints, PBX, Settings, Net. We may rename to match the API (e.g. "Multi-Tenant" → "Tenants", "Ring Groups" → "Routes").

### Table pattern (SARK Extensions page)

- **Table:** Striped, hoverable, compact. Header row: **coloured background** (e.g. deep-orange), white text.
- **Columns:** Ext, Tenant, User, Device, MAC, IP, trns, State, Active?, **Edit**, **Del**. Some columns hidden on small screens (responsive).
- **Edit:** Link/icon per row → edit page. In the new app: row click or "View"/"Edit" → detail/edit view (client-side route).
- **Del:** Link/icon with **confirm** ("Delete? - Confirm?"). We keep confirm-on-delete.
- **Commit / +Add:** In the top bar. In the new app: "+ Add" per resource, "Save" on forms; optional "Commit" (syscommand) under Settings.

### What we keep (spirit)

- Top bar with logo + black nav; grouped items (dropdowns or sidebar).
- Grouping: Endpoints, PBX, Settings, Net.
- Page title bar then content; centered content with side margins.
- Tables: striped, hover, clear header; Edit and Delete per row; confirm on delete.
- Mobile: collapsible menu (hamburger) with same structure.

### What we do differently

- **SPA:** No full page reload; Vue Router; data from API (JSON).
- **Tables:** Vue-rendered; no jQuery DataTables (simple sort/filter or "show all").
- **Auth:** Login screen first (instance URL + credentials).
- **Edit/Delete:** Client-side routes and API calls (PUT, DELETE) instead of form POST.
- **Commit:** Explicit action under Settings/System if we expose it, not a global bar button by default.
