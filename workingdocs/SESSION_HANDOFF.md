# Session handoff — where we left off

**AI: read this first.**

## Session end 2026-05-30 — Track B Phases 0–3 on `main`

**Completed:** Track B release hardening **Phases 0–3** merged to **`main`** in **pbx3**, **pbx3api**, **pbx3spa**; **`hardening`** branch deleted. Fleet TLS, pbx3api installer health checks, fail2ban `jail.d` (**0.0.3-15**). Golden **08jzwn** validated end-to-end.

**Next (Track B Phase 4):** SPA field help on Tier 1–2 demo panels — **`pbx3/workingdocs/TRACK_B_RELEASE_HARDENING.md`** § Phase 4, **`STAKEHOLDER_DEMO_SCRIPT.md`**, **`formHelpPkey.js`**, **`tt_help_core`** in `sqlite_message.sql`.

---

## Session end 2026-05-17 — LE done; directory planning next

**Completed:** Per-instance **Let's Encrypt Option A** (multi-SAN, HTTP-01 webroot) merged to **`main`** in **pbx3**, **pbx3api**, **pbx3spa**. Remote **`certificates`** branches removed. Test node **`08jzwn.pbx3.com`**: package **pbx3 0.0.3-9**, API on **`main`**, three tenant FQDNs on cert, **Sync** + **renew --dry-run** OK.

**Dev pattern:** Local **pbx3spa** + `https://<instance-or-tenant-fqdn>:44300/api`. **`:44300/`** is Laravel only (welcome page) — not a missing cert.

**Next priority:** **Instance directory** (Model B central admin) — planning reference:

| Doc | Location |
|-----|----------|
| **PLANNING_HANDOFF.md** (start here) | **`pbx3/pbx3-directory/docs/`** |
| **INSTANCE_DIRECTORY_NEXT.md** (pointer) | **pbx3spa/workingdocs/** |
| **CENTRAL_ADMIN_DIRECTION.md** | **pbx3spa/workingdocs/** |

---

## Quick start (next agent)

1. **Repos / branch:** **`main`** on **pbx3**, **pbx3api**, **pbx3spa**. **`pbx3-master`** is **not** a git repo (four nested repos). Commit inside the repo you changed.
2. **Directory work:** Read **`pbx3/pbx3-directory/docs/PLANNING_HANDOFF.md`** → **CENTRAL_ADMIN_DIRECTION.md** → v0 schema under **`pbx3/pbx3-directory/schema/`**.
3. **Panel / UI work:** **PANEL_PATTERN.md**; **PROJECT_PLAN.md** § Current state; **FEATURE_PLANS_INDEX.md**.
4. **TLS / certs (maintenance only):** **pbx3/workingdocs/TLS_AND_CERTIFICATES.md** — new tenant = DNS → **Sync**; do not re-run **Get certificate** if LE already configured.

**Primary branch:** **`main`** (all repos).

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
| **Instance directory (next)** | **`pbx3/pbx3-directory/docs/PLANNING_HANDOFF.md`**; **INSTANCE_DIRECTORY_NEXT.md**; **CENTRAL_ADMIN_DIRECTION.md** |
| Per-instance TLS / LE (shipped on main) | pbx3 **TLS_AND_CERTIFICATES.md**, **TLS_IMPLEMENTATION_STEPS.md** |
| **Track B — SPA field help (Phase 4)** | pbx3 **TRACK_B_RELEASE_HARDENING.md** § Phase 4 → **STAKEHOLDER_DEMO_SCRIPT.md** → **PANEL_PATTERN.md** |

**Source of truth:** Schema and code. Verify against pbx3 full_schema.sql and repo code when changing behaviour; workingdocs may be outdated.

---

**Start here (context):** Read **PROJECT_PLAN.md** § Current state and **PANEL_PATTERN.md** (single-screen panels, cascaded sections, table alignment, toast API) to see what’s done and what’s left. **Branch:** **`main`** (pbx3spa, pbx3api).

**Extensions:** Complete (create/update, extension type derivation, live IP/Status from Asterisk AMI, SIP password display). Structure is sound; some TODOs remain (regenerate password, allow pkey change, PJSIP config edit). See **EXTENSIONS_LIVE_DATA.md** for live data behaviour and gotchas.

**Single-screen panels:** Firewall (IPv4 + IPv6) and **Backup/restore (Backups + Snapshots)** are complete. See **SINGLE_PANEL_SCREENS.md** for the full list; **PANEL_PATTERN.md** § Single-screen panels with cascaded sections and § Table column alignment for layout rules.

**Repos:** **pbx3-master** is not a git repo; it is a placeholder folder containing the four repos: **pbx3**, **pbx3api**, **pbx3cagi**, **pbx3spa**. Commit in the relevant repo.

## Direction of travel — central admin (2026-05-17)

**Agreed:** **Model B** — one **central pbx3spa**; operators pick an **instance** from a **directory** (S3 index/map TBD), not a login URL field.

**LE/TLS:** **Done** on test node; merged to **`main`**. See **Session end 2026-05-17** above.

**Directory planning:** **`pbx3/pbx3-directory/docs/PLANNING_HANDOFF.md`** (phases A–E, open questions, test node reference). Stub schema: **`pbx3/pbx3-directory/schema/`**.

**Dev today:** API base URL at login until instance picker ships (**`DEV_ENVIRONMENT.md`**).

---

## TLS / Certificates — shipped (2026-05-17)

**On `main`:** Multi-SAN LE (Option A), Certificates panel (**Sync**, cert covers), `tls-active.json`, webroot HTTP-01, **pbx3 0.0.3-9** (bash `apply-active-cert`, postinst `idpwgen`).

**Operator flow:** DNS per tenant FQDN → **Sync with tenant list** → verify `tls-active.json` → local SPA + `https://<fqdn>:44300/api`.

**Optional node follow-on:** firewall `update-fqdn-inline` (Step 1.2–1.3 in **TLS_IMPLEMENTATION_STEPS.md**). Archive: **pbx3/workingdocs/HANDOFF_RESUME_LE_OPERATOR_FLOW.md** (pre-merge notes; Sync now in SPA).

---

## Done

### App layout — independent main scroll + sidebar scroll persistence

- **`src/layouts/AppLayout.vue`:** Viewport-height shell (`100vh`) so **list/detail content** scrolls inside **`.content`** while the **left nav stays on screen**. Sidebar has its own scroll and **`sessionStorage`** persistence (`pbx3spa-sidebar-scroll`) so scroll position survives refresh and route changes (rAF-throttled save; restore after `nextTick`).
- **Accordion nav:** One nav **group** expanded at a time (compact sidebar). **Tradeoff** vs scroll persistence: user feedback may later justify **persisting expanded groups** or **multiple open sections** — documented in **PANEL_PATTERN.md** § App shell and navigation.
- **Branch:** Developed on **`scroller`**; merge to **`main`** when ready.

### Shell / topbar (Apr 2026 — after context chips)

- **`src/layouts/AppLayout.vue`:** Top bar is **three zones**: **`.topbar-left`** (**`h1.logo` → `PBX3 Admin`**), **`.topbar-center`** (**`SessionContextChips`**), **`.topbar-right`** (Commit, user, Logout). The left and right zones use **`flex: 1 1 0`** so they share space; the chip block is **`position: absolute`**, **`left: 50%`**, **`transform: translateX(calc(-50% - var(--pbx-shell-sidebar-width) / 2))`** so **Instance / Tenant** align with **viewport** center (main column alone would skew chips right of true center because of the sidebar).
- **CSS variable:** **`.app-layout { --pbx-shell-sidebar-width: 15.75rem; }`** and **`.sidebar { width: var(--pbx-shell-sidebar-width); }`**. If you change sidebar width, update the variable only — do not hard-code a second width in the transform.
- **Z-index / visibility:** Chips use **`z-index: 2`**; wings **`z-index: 1`**. **Do not** add opaque **`background`** on **`.topbar-left` / `.topbar-right`** while chips sit underneath — that **hid** the chips in an earlier iteration.
- **Sidebar:** No image or text logo in the nav column (PNG transparency / proper logo asset **deferred**). **`.sidebar-top-spacer`** (`min-height: calc(0.75rem * 2 + 2rem * 1.25)`) preserves top padding so the first nav links stay where they were with the old PBX³ line.
- **Example commits on `main`:** `74921db` (*topbar identity chips viewport-centered and visible*); earlier shell work includes `e459d45` (*sidebar top spacer, wider nav column*). **Always `git log`** for the latest.

### Latest session (Apr 2026 — context chips, instance FQDN, detail active header)

- **Commit:** Example on **`pbx3spa`** `main`: `8bd0233` (*SPA: context chips, globals FQDN instance label, detail active UX*). **Always commit inside `pbx3spa/`** (or `pbx3api/`, etc.); **`pbx3-master` is not a git repository.**
- **Context chips:** `src/components/SessionContextChips.vue` in **AppLayout** top bar (see **Shell / topbar** above for layout). **Auth** (`src/stores/auth.js`): `globalsFqdn` from **`GET sysglobals` → `fqdn`**; `displayInstanceLabel` prefers that, then whoami `instance_label` / `instance_name`, then API URL host. **`refreshGlobalsFqdnForTopBar()`** in **AppLayout** after login / `whoami`. **SysglobalsEditView**, **NetworkView**, **TenantCreateView** call **`auth.setGlobalsFqdnFromSysglobal`** after loading sysglobals. **Tenant** context: **TenantDetailView** `setTenantContext`; **TenantsListView** / unmount detail **`clearTenantContext`**; **`useSessionContext.js`**.
- **Detail edit — Active in header:** Pattern matches **Extension**, **Queue**, **Trunk**, **IVR**, **Day timer**, etc.: wrap **`PanelBackLink`** default slot in **`div.detail-panel-head`** → **`div.detail-title-status-row`** → **`h1.detail-panel-title`** + **`DetailActiveStatusBar`** (`v-model="editActive"`, `toggle-id`, `:readonly="isReadOnly('active')"` when applicable). Optional **`p.detail-active-inactive-hint`** when `editActive === 'NO'` (entity-specific sentence). Do **not** put long inactive copy inside **`DetailActiveStatusBar`** (it used to right-align under the pill). **Removed** **`.detail-inactive-banner`** (orange box) in favour of the muted hint. Global layout rules live in **`src/assets/main.css`** (`.detail-title-status-row`, `.detail-panel-head .detail-active-inactive-hint`).
- **Day timers:** **DayTimerDetailView** now syncs **`active`** on load and includes it in **PUT** when not schema read-only (list already had **Active** column).

### Previous session (panel back link + Asterisk editor button parity)

- **Component:** `src/components/PanelBackLink.vue` — header row with `router-link` `← {{ label }}` and default **slot** for the following `<h1>`. Styling matches the former inline Asterisk back link (blue, small type, hover underline).
- **Where used:** Every `*DetailView` and `*CreateView` for tenant-scoped resources (extensions, tenants, trunks, queues, … — see `router/index.js` `name` values in each view). **UserCreateView** → `users`. **AsteriskFileDetailView** → `asterisk-files`. **SysglobalsEditView** and **NetworkView** → `dashboard` (“← Dashboard”) because there is no list parent.
- **Adding a new panel:** Import `PanelBackLink`, wrap the top `<h1>` only: `<PanelBackLink :to="{ name: '…' }" label="…">` … `</PanelBackLink>`. Pass `class="edit-header"` / `create-header` / `detail-header` when the view already relied on those selectors for margin/`h1` rules.
- **Asterisk file edit:** Top and bottom action rows are **`.edit-actions`** / **`.edit-actions-top`** with unclassed `type="submit"` Save and `class="secondary"` Cancel — same CSS pattern as e.g. `ExtensionDetailView.vue` (blue Save, outlined Cancel). **Cancel** still calls `goBack()` → list route.

### Previous session (Commit everywhere, sticky sort, contextual help)

- **Commit in app chrome:** `CommitButton` in `AppLayout` topbar on all routes that mutate PBX config (admin only), except operational-only areas (backup, certificates, devices, firewall, help-messages, IP settings, logs, users). Uses `GET syscommands/commitstatus` and `GET syscommands/commit` — same red/green dirty behaviour as Dashboard; users do not need to return Home to commit.
- **Sticky sort:** `useStickySort` in `useStickyFilter.js`; wired to every sortable list (and both tables on Backup/restore). Same sessionStorage + 5‑min expiry as `useStickyFilter`. See **STICKY_LIST_UI.md**.
- **Per-field help:** `useHelp` loads `helpcore` once (admin layout); `FieldHelpIcon` resolves hints by `tt_help_core` pkey on forms. No separate `GET /help/{resource}/{field}` required for current UX.

### Previous milestone (Certificates panel + Let's Encrypt)

- **Certificates panel (pbx3spa):** Single view at `/certificates` with two sections: **Let's Encrypt** and **Purchased certificate**. When LE not configured: form **Hostname (FQDN)** + **Email (Let's Encrypt)** and button **Get certificate** (POST `/certificates/letsencrypt/setup`). When configured: Hostname, Expires, Issuer + **Renew now** (POST `/certificates/letsencrypt/renew`). Help text: A record + port 80 reachable; we open 80 only during issuance/renewal. Purchased: upload cert/key, Install, Remove. See **pbx3/workingdocs/TLS_AND_CERTIFICATES.md** (index), **pbx3/workingdocs/CERTIFICATES_PANEL_AND_API.md**, **SINGLE_PANEL_SCREENS.md**.
- **Certificates API (pbx3api):** GET active, GET letsencrypt, POST letsencrypt/setup (fqdn, email → le-first-cert.sh), POST letsencrypt/renew (le-renew-with-80.sh), GET/POST/DELETE custom. Setup and renew need PBX3_SYSCMD_TIMEOUT ≥ 90.
- **pbx3 scripts:** le-port80-open.sh, le-port80-close.sh (Shorewall managed rule); le-renew-with-80.sh (open 80, certbot renew, close 80); le-first-cert.sh (first-time: open 80, certonly --standalone, write le-domain, apply-active-cert, close 80). Cron: twice daily LE renewal when le-domain exists. apply-active-cert.sh unchanged (custom → LE → snakeoil for nginx + Asterisk).
- **Docs:** **pbx3/workingdocs/TLS_AND_CERTIFICATES.md** (index), **pbx3/workingdocs/CERTIFICATES_PANEL_AND_API.md**, **pbx3/workingdocs/LETSENCRYPT_PER_TENANT_FQDN.md** (Option A §12). **pbx3spa** stub files redirect to **pbx3**. Shipped on **`main`** (pbx3, pbx3api, pbx3spa).
- **Per-tenant FQDN + LE:** **pbx3/workingdocs/LETSENCRYPT_PER_TENANT_FQDN.md** is complete (this repo’s **LETSENCRYPT_PER_TENANT_FQDN_OPTIONS.md** is a redirect). It covers: Option A (multi-SAN LE cert), firewall FQDN inspection (inline rules per tenant), data model (FQDNs in tenants; instance apex in **`globals.domain`** / API **`domain`**), purchased certs (§6: wildcard/single multi-SAN supported via custom path; multiple individual purchased certs = future extension). **§11 gate:** Panel integration is on **`main`**; re-read §11 prerequisites table, then **§12** Phases 1–4 before starting implementation.
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

### Instance directory (Model B) — **next**

- **Planning:** **`pbx3/pbx3-directory/docs/PLANNING_HANDOFF.md`** — phases A–E, open questions, test node `08jzwn`.
- **Product:** **CENTRAL_ADMIN_DIRECTION.md** — central SPA, instance picker, S3 index TBD.
- **Pointer:** **INSTANCE_DIRECTORY_NEXT.md** (this repo).
- **Not started:** SPA picker, central auth, directory write path, S3 publish.

### Let's Encrypt per-tenant FQDN — **done on main** (maintenance)

- **Spec:** **pbx3/workingdocs/LETSENCRYPT_PER_TENANT_FQDN.md**. New tenant: DNS → **Sync**. Optional: firewall `update-fqdn-inline` (**TLS_IMPLEMENTATION_STEPS.md** Step 1.2–1.3).

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
- **PANEL_PATTERN.md** §8 — reference implementation status; §3 for create-form rules; §2.2 list blocks; §4.1 detail blocks; **App shell** — **SessionContextChips** (viewport-centered), **`--pbx-shell-sidebar-width`**, **sidebar top spacer**; **Edit** — **detail-panel-head**, **DetailActiveStatusBar**, **detail-active-inactive-hint**; **PanelBackLink** + top `←` parent navigation on create/detail (and dashboard-parent settings views).
- **SPA_SHELL_ROADMAP.md** — Stage 1 + Stage 2 shell (context chips, top bar three-zone layout, detail active UX); remaining ideas (collapsible sidebar, ⌘K).
- **`src/components/SessionContextChips.vue`**, **`src/components/DetailActiveStatusBar.vue`**, **`src/stores/auth.js`** (`globalsFqdn`, `tenantContext`), **`src/composables/useSessionContext.js`**, **`src/utils/sessionContext.js`** — context chips and tenant signpost.
- **`src/components/PanelBackLink.vue`** — shared top-of-panel back link; use for any new detail/create/settings sub-page that should return to a list or Home.
- **BOOLEAN_STANDARDISATION.md** — plan and fixer for standardising boolean columns to YES/NO; migration in pbx3api (run when ready).
- **pbx3api/docs/TODO_IVR_NAME.md** — IVR ivrmenu `name` field: research usage and decide whether to remove from API/UI (schema marks name deprecated in favour of cname).
- **pbx3api/docs/TENANT_SCOPED_PATTERN.md** — Tenant-scoped panels: id for identity, pkey+cluster for uniqueness; controller update by id; Form Request pkey rules. **pbx3api/.cursor/rules/tenant-scoped-panels.mdc** — Cursor rule for same (when editing API controllers/models/requests).
- **pbx3/full_schema.sql** — schema yardstick; API models/controllers must match column set (see SYSTEM_CONTEXT.md).
- **TRUNK_ROUTE_MULTITENANCY.md** — Trunk/route ownership (collective vs private), allocation, migration mechanics; read when working on trunks, outbound routes, or tenant migration.
- **wizardnotes/** — add-wizard.md, agent-brief-spa.md per resource (DDI, extension, trunk, ivr).
- **SYSTEM_CONTEXT.md**, **README.md** — context and setup.
- **pbx3/workingdocs/TLS_AND_CERTIFICATES.md** — TLS documentation index + overview (**pbx3** repo).
- **pbx3/workingdocs/CERTIFICATES_PANEL_AND_API.md** — Panel + **`/certificates/*`** API + code checklist.
- **pbx3/workingdocs/LETSENCRYPT_PER_TENANT_FQDN.md** — **Option A** full spec, firewall §9. **pbx3spa** `CERTIFICATES_ADOPTION_PLAN.md` / `LETSENCRYPT_PER_TENANT_FQDN_OPTIONS.md` redirect to **pbx3**.
- **pbx3/pbx3-directory/docs/PLANNING_HANDOFF.md** — **instance directory** planning (next session).
- **INSTANCE_DIRECTORY_NEXT.md** — short pointer to directory docs.
- **CENTRAL_ADMIN_DIRECTION.md** — Model B central admin.
