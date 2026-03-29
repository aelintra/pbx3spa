# Session handoff — where we left off

**AI: read this first.**

## Quick start (next agent)

1. **Repos / branch:** **`pbx3spa`** and **`pbx3api`** — default integration branch is **`main`** (Mar 2026: former `cleanup` work was merged to `main`; remote `cleanup` was deleted on GitHub; you may still have a local `cleanup` branch). **`pbx3-master`** is **not** a git repo; it is a folder holding four separate repos (**pbx3**, **pbx3api**, **pbx3cagi**, **pbx3spa**). **Commit and push from the repo you changed** — for SPA work, that is always **`pbx3spa`** (not the parent folder).
2. **Read order:** This file → **PROJECT_PLAN.md** § Current state → **SYSTEM_CONTEXT.md** / **README.md** as needed. UI work: **PANEL_PATTERN.md** (especially §8 reference status, §2.2 lists, §3 create, list **Local UID** = `cell-immutable`). Cross-cutting features: **FEATURE_PLANS_INDEX.md**.
3. **Recently shipped (sanity-check `git log`):** **Top back link on detail/create/settings:** **`PanelBackLink.vue`** — `← {Parent}` above the `<h1>` on all resource detail/create views, **User create**, **Asterisk file** detail, **System globals**, and **Network (IP settings)**; props `:to` (route object) and `label`; optional root `class` for local heading CSS. **Asterisk file editor** Save/Cancel use **`.edit-actions`** / **`.edit-actions-top`** and the same blue primary + **`.secondary`** Cancel as other detail panels (not `action-btn`). **Commit** in **AppLayout** (`CommitButton.vue`, `syscommands/commitstatus`); **sticky filter + sort** (`useStickyFilter.js`, **STICKY_LIST_UI.md**); **contextual help** (`useHelp.js`, `FieldHelpIcon.vue`, prefetch `helpcore` in layout); Extensions list **live** IP/Status (**EXTENSIONS_LIVE_DATA.md**); list **Local UID** uses **`cell-immutable`** everywhere that column exists (Queues, Conferences, Greetings, Class of Service, etc.); Class of Service list includes **Dialplan** column. **App shell:** main content scrolls independently of the **sidebar**; sidebar **`scrollTop`** persisted in **`sessionStorage`** (`pbx3spa-sidebar-scroll`). **Nav:** accordion — one section open at a time (see **PANEL_PATTERN** § App shell). May ship on branch **`scroller`** until merged to **`main`**.
4. **What’s still open:** **Left to do** below; **SINGLE_PANEL_SCREENS.md** (Logs partial, 3rd-party certs / factory reset / SIP PCAP need API); **COMPLEX_CREATE_PLAN.md** (trunk **IAX2** deferred).

**Primary branch today:** **`main`** on **pbx3spa** and **pbx3api** (not `spanel`).

## Read order by task

| Task | Read (in order) |
|------|------------------|
| Current state / next steps | This file only |
| New or refactor panel | PANEL_PATTERN.md; optional: LIST_EXPORT_PDF_CSV.md, SINGLE_PANEL_SCREENS.md, PANEL_PATTERN_DEPARTURES.md |
| Panel conversion / technical debt | AGENT_HANDOFF_TECHNICAL_DEBT.md, PANEL_REFACTOR_STRATEGY.md |
| Feature (provisioning, DDI, trunk, cert, etc.) | FEATURE_PLANS_INDEX.md → then docs listed there |
| Port from Sail65 | SAIL65_PANEL_PORT_PLAN.md |
| Auth / permissions | AUTH_PATTERNS.md, ADMIN_PANELS_AND_PERMISSIONS.md, PERMISSIONS_MINIMAL_DEPLOY_PLAN.md |
| Schema / API alignment | pbx3api/workingdocs/PLAN_MODELS_AND_VALIDATION_HARMONISATION.md + resource audit; pbx3 full_schema.sql |
| Dev / run locally | DEV_ENVIRONMENT.md, SPA_BASICS.md |

**Source of truth:** Schema and code. Verify against pbx3 full_schema.sql and repo code when changing behaviour; workingdocs may be outdated.

---

**Start here (context):** Read **PROJECT_PLAN.md** § Current state and **PANEL_PATTERN.md** (single-screen panels, cascaded sections, table alignment, toast API) to see what’s done and what’s left. **Branch:** **`main`** (pbx3spa, pbx3api).

**Extensions:** Complete (create/update, extension type derivation, live IP/Status from Asterisk AMI, SIP password display). Structure is sound; some TODOs remain (regenerate password, allow pkey change, PJSIP config edit). See **EXTENSIONS_LIVE_DATA.md** for live data behaviour and gotchas.

**Single-screen panels:** Firewall (IPv4 + IPv6) and **Backup/restore (Backups + Snapshots)** are complete. See **SINGLE_PANEL_SCREENS.md** for the full list; **PANEL_PATTERN.md** § Single-screen panels with cascaded sections and § Table column alignment for layout rules.

**Repos:** **pbx3-master** is not a git repo; it is a placeholder folder containing the four repos: **pbx3**, **pbx3api**, **pbx3cagi**, **pbx3spa**. Commit in the relevant repo.

---

## Done

### App layout — independent main scroll + sidebar scroll persistence

- **`src/layouts/AppLayout.vue`:** Viewport-height shell (`100vh`) so **list/detail content** scrolls inside **`.content`** while the **left nav stays on screen**. Sidebar has its own scroll and **`sessionStorage`** persistence (`pbx3spa-sidebar-scroll`) so scroll position survives refresh and route changes (rAF-throttled save; restore after `nextTick`).
- **Accordion nav:** One nav **group** expanded at a time (compact sidebar). **Tradeoff** vs scroll persistence: user feedback may later justify **persisting expanded groups** or **multiple open sections** — documented in **PANEL_PATTERN.md** § App shell and navigation.
- **Branch:** Developed on **`scroller`**; merge to **`main`** when ready.

### Latest session (panel back link + Asterisk editor button parity)

- **Component:** `src/components/PanelBackLink.vue` — header row with `router-link` `← {{ label }}` and default **slot** for the following `<h1>`. Styling matches the former inline Asterisk back link (blue, small type, hover underline).
- **Where used:** Every `*DetailView` and `*CreateView` for tenant-scoped resources (extensions, tenants, trunks, queues, … — see `router/index.js` `name` values in each view). **UserCreateView** → `users`. **AsteriskFileDetailView** → `asterisk-files`. **SysglobalsEditView** and **NetworkView** → `dashboard` (“← Dashboard”) because there is no list parent.
- **Adding a new panel:** Import `PanelBackLink`, wrap the top `<h1>` only: `<PanelBackLink :to="{ name: '…' }" label="…">` … `</PanelBackLink>`. Pass `class="edit-header"` / `create-header` / `detail-header` when the view already relied on those selectors for margin/`h1` rules.
- **Asterisk file edit:** Top and bottom action rows are **`.edit-actions`** / **`.edit-actions-top`** with unclassed `type="submit"` Save and `class="secondary"` Cancel — same CSS pattern as e.g. `ExtensionDetailView.vue` (blue Save, outlined Cancel). **Cancel** still calls `goBack()` → list route.

### Previous session (Commit everywhere, sticky sort, contextual help)

- **Commit in app chrome:** `CommitButton` in `AppLayout` topbar on all routes that mutate PBX config (admin only), except operational-only areas (backup, certificates, devices, firewall, help-messages, IP settings, logs, users). Uses `GET syscommands/commitstatus` and `GET syscommands/commit` — same red/green dirty behaviour as Dashboard; users do not need to return Home to commit.
- **Sticky sort:** `useStickySort` in `useStickyFilter.js`; wired to every sortable list (and both tables on Backup/restore). Same sessionStorage + 5‑min expiry as `useStickyFilter`. See **STICKY_LIST_UI.md**.
- **Per-field help:** `useHelp` loads `helpcore` once (admin layout); `FieldHelpIcon` resolves hints by `tt_help_core` pkey on forms. No separate `GET /help/{resource}/{field}` required for current UX.

### Previous milestone (Certificates panel + Let's Encrypt)

- **Certificates panel (pbx3spa):** Single view at `/certificates` with two sections: **Let's Encrypt** and **Purchased certificate**. When LE not configured: form **Hostname (FQDN)** + **Email (Let's Encrypt)** and button **Get certificate** (POST `/certificates/letsencrypt/setup`). When configured: Hostname, Expires, Issuer + **Renew now** (POST `/certificates/letsencrypt/renew`). Help text: A record + port 80 reachable; we open 80 only during issuance/renewal. Purchased: upload cert/key, Install, Remove. See **CERTIFICATES_ADOPTION_PLAN.md**, **SINGLE_PANEL_SCREENS.md**.
- **Certificates API (pbx3api):** GET active, GET letsencrypt, POST letsencrypt/setup (fqdn, email → le-first-cert.sh), POST letsencrypt/renew (le-renew-with-80.sh), GET/POST/DELETE custom. Setup and renew need PBX3_SYSCMD_TIMEOUT ≥ 90.
- **pbx3 scripts:** le-port80-open.sh, le-port80-close.sh (Shorewall managed rule); le-renew-with-80.sh (open 80, certbot renew, close 80); le-first-cert.sh (first-time: open 80, certonly --standalone, write le-domain, apply-active-cert, close 80). Cron: twice daily LE renewal when le-domain exists. apply-active-cert.sh unchanged (custom → LE → snakeoil for nginx + Asterisk).
- **Docs:** LETSENCRYPT_PLAN.md (panel setup, port 80 control, scripts), CERTIFICATES_ADOPTION_PLAN.md (API table, panel behaviour). Shipped on **`main`** (pbx3, pbx3api, pbx3spa).
- **Per-tenant FQDN + LE options plan:** **LETSENCRYPT_PER_TENANT_FQDN_OPTIONS.md** is complete. It covers: Option A (multi-SAN LE cert), firewall FQDN inspection (inline rules per tenant), data model (FQDNs in tenants, domain_name in globals), purchased certs (§6: wildcard/single multi-SAN supported via custom path; multiple individual purchased certs = future extension). **§11 gate:** Panel integration is on **`main`**; re-read §11 prerequisites table, then **§12** Phases 1–4 before starting implementation.
- **For next agent:** Certificates panel and LE flow are complete. Deploy: ensure scripts are executable (chmod +x le-*.sh); set PBX3_SYSCMD_TIMEOUT=90 for setup/renew from panel. Local test: don't create le-domain so no LE renewal runs.

### Previous sessions (condensed)

Holiday Timers, Extension harmonisation, Queue audit, Custom Apps, Help messages, Certificates, Backup/restore, Extensions completion, Permissions Phase 0, Trunk/DDI, Field mutability, create-panel standardization, tenant-scoped id vs pkey, IVR edit, Inbound routes + schema + booleans. See PROJECT_PLAN, FEATURE_PLANS_INDEX.md, and git history for detail.


---

## Left to do

### Complex create flows (create exercise)

**Approach:** One create view per resource + type chooser + conditional fields + one polymorphic create API per resource. See **workingdocs/COMPLEX_CREATE_PLAN.md**.

**Status:** **Trunk create: done** (SIP-only chooser; IAX2 deferred). **DDI (Inbound routes): done** (create + edit aligned to legacy; Connection/Advanced removed from edit). **Extensions: complete** (full CRUD, extension type derivation, live IP/Status from AMI, SIP password display; structure sound; some TODOs remain). **IVR create: done** (see **COMPLEX_CREATE_PLAN.md**). See COMPLEX_CREATE_PLAN.md for remaining create-flow items (e.g. trunk IAX2). 

### Create-panel standardization (PANEL_PATTERN §3 + §8)

**Done:** All six create panels (Extension, Trunk, Route, Queue, Agent, IVR) now match §3: Identity / Settings / optional Advanced grouping; defaults preset where applicable; FormToggle for booleans, FormSegmentedPill for 2–3 option fields, FormSelect for 4+. See **CREATE_PANELS_STANDARDIZATION.md** for status. Trunk type-chooser and conditional fields remain per COMPLEX_CREATE_PLAN.md.

### Let's Encrypt per-tenant FQDN (multi-SAN cert)

- **Plan:** **LETSENCRYPT_PER_TENANT_FQDN_OPTIONS.md** — multi-SAN LE cert (node + all tenant FQDNs), manual “Sync with tenant list”, firewall INLINE rules per FQDN, purchased certs (§6). **Gate (§11):** Prerequisite panel work is on **`main`**; confirm §11 checklist (schema/sysglobals/tenant create) then follow **§12** Phases 1–4 (pbx3 scripts + NetHelper + update-fqdn-inline; API domain list from tenants + sysglobals; SPA Certificates “Cert covers” + Sync; cron/runbook).

### Future project: data-driven list policy

- **Doc:** **DATA_DRIVEN_LIST_POLICY_PROJECT.md**. Replace hardcoded allow/deny or read-only lists (e.g. Asterisk files, log files) with a general, data-driven policy store. One mechanism, multiple scopes (e.g. `asterisk_files`, `log_files`), with per-scope inclusive vs exclusive semantics. Not implemented now; Asterisk Files and Logs can use hardcoded or simple logic until this project is done.

### Boolean pill style (to decide)

- **Segmented pill vs slider toggle:** Pattern says “all booleans as pills.” We currently use (a) **segmented pill** (YES | NO, two segments) for form booleans (e.g. “Listen for extension dial?”, “Register this trunk?”) and (b) **slider toggle** (left/right, single pill) for per-item on/off (e.g. “activate this key” in the IVR hide/reveal card layout). Decide whether to standardise on one style, or keep both (e.g. segmented for form booleans, slider for inline toggles). Deferred; document decision in PANEL_PATTERN or BOOLEAN_STANDARDISATION when decided.

### Other to-dos (from PROJECT_PLAN § Current state)

- **pbx3api – Middleware on remote:** Investigate why `ValidateClusterAccess.php` doesn’t appear on remote after pull (newpanels in use, file tracked); may be from old Sanctum experiment or deploy path.

- **Commit from config panels:** **Done** — **`CommitButton`** in **`AppLayout`** topbar (admin) + Dashboard; `commitstatus` / `commit` syscommands; hidden on operational-only routes (backup, certificates, devices, firewall, help-messages, IP settings, logs, users). See **Done** § Latest session.
- **Extensions:** Allow changing extension number (pkey) — needs API support first.
- **Extensions:** Add "Regenerate SIP password" button — allow users to regenerate passwd (for compromised/periodic refresh) without allowing manual password creation. Low priority.
- **Phone images:** API hosts library; SPA consumes URLs.
- **Tenants – Timer status / masteroclo:** API null handling; prefer API fix (e.g. model accessor or DB default).
- **Field mutability:** Done — API-driven; frontend uses GET /schemas (useSchema composable). See FIELD_MUTABILITY_API_PLAN.md.
- **Review later (UX):** Inline edit for list rows — revisit when main pattern is stable.
- **Sticky list filter/sort:** **Done** — `useStickyFilter` + `useStickySort` (5‑min expiry). See **STICKY_LIST_UI.md**.
- **Help text (per-field hints):** **Done** — cached `helpcore` + `FieldHelpIcon` / form `hint` props; optional future: REST shape `GET /help/{resource}/{field}` if we want resource-scoped URLs (see **UX_IMPROVEMENTS_IVR.md**).
- **SPA bundle size / performance (watch):** Fine on **LAN** today; re-check when testing moves to the **cloud** (latency, slower links). Watch `npm run build` output (JS/CSS gzip sizes), consider **route-level code splitting** (`import()` in router) and **rollup visualizer** if the main chunk grows. No fixed budget yet — treat as ongoing hygiene.

### Panel pattern audit (for when we come back)

**Fully implement pattern (read: Identity + Settings/Transport + Advanced; edit: all API-updateable fields):** Trunk, Inbound route only.

**Do not fully implement:** Tenant (edit: 5 of 50+ fields), Extension (edit: core fields implemented; structure sound; some advanced fields deferred), Route (edit: 3 of 9), Agent (no read structure + edit: 3 of 7), Queue (no read structure + edit: 2 of 5). **IVR:** read structure (Identity/Settings/Advanced) and edit now include all API-updateable fields (active, cname, name, description, cluster, greetnum, listenforext, timeout, option/tag/alert 0–11); see TODO_IVR_NAME for name deprecation decision. See full audit in chat history; standardize remaining panels later.

### Layout alternatives (parked)

- **IVR create — pill-per-key layout:** Alternative to the current inline horizontal table: one pill (toggle) per telephone key that activates/deactivates keypress listen; when activated, the panel expands vertically to show Action on KeyPress (dropdown), Tag (text), Alert (text). Matches the original SARK IVR edit UI. Reverted in favour of the horizontal table; can be reintroduced if preferred (see chat/session history for implementation).

### Parked / later

- **Backups** — review after first CRUD set.
- **Admin user management** — API needs stronger user/privilege support first.

---

## References

- **PROJECT_PLAN.md** § Current state — full “next chat” instructions, stack, principles, job steps.
- **EXTENSION_PROVISIONING_QUICKSTART.md** — start here for extension provisioning (read order, key files, implementation order).
- **EXTENSION_PROVISIONING_DEPLOYMENT_PLAN.md** — full plan; §8 Build readiness, §5 Implementation order.
- **EXTENSIONS_LIVE_DATA.md** — live IP/Status from Asterisk (extensions/live, runtime, amiQueryUntilComplete, key-value collection approach matching old system, frontend Unknown/— handling; gotchas for next agent).
- **DATABASE_CHANGES_FOR_PROVISIONING.md** — DB changes list (user applies manually; PBX3 has no Laravel migrations).
- **COMPLEX_CREATE_PLAN.md** — complex create flows: Trunk done, DDI done, Extensions complete, IVR create done.
- **PERMISSIONS_MINIMAL_DEPLOY_PLAN.md** — Phase 0 rollout (abilities, can(), route guard, Users panel); Phase 1 later.
- **ADMIN_PANELS_AND_PERMISSIONS.md** — Pattern: abilities, admin vs tenant areas, row-level scope.
- **AUTH_PATTERNS.md** — Auth contract and rules for agents (2FA, self-service, centralized auth); follow when touching login/tokens/whoami/guards.
- **PANEL_PATTERN.md** §8 — reference implementation status; §3 for create-form rules; §2.2 list blocks; §4.1 detail blocks; **PanelBackLink** + top `←` parent navigation on create/detail (and dashboard-parent settings views).
- **`src/components/PanelBackLink.vue`** — shared top-of-panel back link; use for any new detail/create/settings sub-page that should return to a list or Home.
- **BOOLEAN_STANDARDISATION.md** — plan and fixer for standardising boolean columns to YES/NO; migration in pbx3api (run when ready).
- **pbx3api/docs/TODO_IVR_NAME.md** — IVR ivrmenu `name` field: research usage and decide whether to remove from API/UI (schema marks name deprecated in favour of cname).
- **pbx3api/docs/TENANT_SCOPED_PATTERN.md** — Tenant-scoped panels: id for identity, pkey+cluster for uniqueness; controller update by id; Form Request pkey rules. **pbx3api/.cursor/rules/tenant-scoped-panels.mdc** — Cursor rule for same (when editing API controllers/models/requests).
- **pbx3/full_schema.sql** — schema yardstick; API models/controllers must match column set (see SYSTEM_CONTEXT.md).
- **TRUNK_ROUTE_MULTITENANCY.md** — Trunk/route ownership (collective vs private), allocation, migration mechanics; read when working on trunks, outbound routes, or tenant migration.
- **wizardnotes/** — add-wizard.md, agent-brief-spa.md per resource (DDI, extension, trunk, ivr).
- **SYSTEM_CONTEXT.md**, **README.md** — context and setup.
- **CERTIFICATES_ADOPTION_PLAN.md** — Certificates panel: LE setup (FQDN + email, Get certificate), status, Renew now, custom cert install/remove; API design (setup, renew, custom), SPA sections, port 80 control.
- **LETSENCRYPT_PER_TENANT_FQDN_OPTIONS.md** — Per-tenant FQDNs + TLS: options (multi-SAN, wildcard, SNI), recommendation (Option A + manual sync), firewall FQDN inspection (§9), purchased certs (§6), prerequisites and gate (§11), implementation plan (§12). Read when implementing LE multi-SAN or tenant hostnames.
