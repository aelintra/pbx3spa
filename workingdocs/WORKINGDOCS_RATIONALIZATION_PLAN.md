# Workingdocs rationalization plan

**Purpose:** Consolidate and rationalize documentation across `pbx3/workingdocs`, `pbx3api/workingdocs`, and `pbx3spa/workingdocs` so that **AI agents** (Cursor and successors) have a single source of truth, explicit read-order, and no duplicate or stale state.

**Audience:** Workingdocs are **for the AI**. Optimize for agent consumption: one entry point per repo, task-triggered read order, dense structure (tables/bullets over long prose), and no conflicting “current state” across files.

**Scope:** All `workingdocs/` folders in the three repos. Does not cover `pbx3api/docs/` (API reference) or `pbx3/docs/` (MkDocs).

**Status:** Draft for review.

---

## 0. Optimization criteria (AI/agent)

| Criterion | Implication |
|-----------|-------------|
| **Single entry per repo** | One file is “read this first.” No competing handoffs; agent always loads the same entry. |
| **Code and schema are source of truth** | Everything comes from the schema + the code. Workingdocs must not state an axiom that is not true in the code. Anything in the docs that contradicts the code or schema is a problem—fix the doc or remove the contradiction; do not treat the doc as truth when it conflicts. |
| **Explicit read-order by task** | Entry (or index) contains a table: **Task** → **Read these docs in order.** Reduces wrong-context and hallucination. |
| **One source of “current state”** | Done / next / open TODO live in **one** handoff. Remove or replace duplicate “Current state” and “Done” sections elsewhere with “See HANDOFF.md.” |
| **Dense, scannable content** | Prefer headings, tables, bullet lists. Trim narrative and “Previous session” history; keep only what affects the next action. |
| **No stale directives** | Resolved debt and completed items: archive or one-line “fixed” in handoff. Do not leave “MUST FIX” in files that are no longer current. |
| **Cross-repo pointers** | Entry in repo A states: “When doing X, also read pbx3api/workingdocs/Y” so agent pulls the right context from other repos. |

**What changes vs “human-friendly” rationalization:** Stricter single entry; **read-order-by-task tables** in every entry so the agent does not guess which doc to open. **Code and schema are source of truth:** everything comes from the schema + the code; workingdocs must not state an axiom that is not true in the code—anything in the docs that contradicts code or schema is a problem (fix or remove; see §0.1); **one** “current state” (no duplicate Done/Next in PROJECT_PLAN and SESSION_HANDOFF); **trim narrative** (e.g. “Previous session”); **archive** resolved debt so “MUST FIX” is not stale; **FEATURE_PLANS_INDEX** so feature work has explicit “read A then B”; README is a one-line pointer, not a second handoff.

### 0.1 Axiom: code and schema over docs

**Everything comes from the schema + the code.** Workingdocs describe process, conventions, read-order, and next steps—they do not replace or override the code. Any statement in the docs that contradicts the schema or the code is a problem: correct the doc or remove it; do not treat the doc as truth when it conflicts with the code. When implementing or changing behaviour, use the actual schema files and code as the source of truth; treat workingdocs (including audit snapshots and pattern text) as guidance that may be outdated—verify against the repo.

---

## 1. Current state summary

| Repo     | File count | Role |
|----------|------------|------|
| **pbx3** | 13         | Backend context, cleanup/installer, TLS, DB variance, TODO list |
| **pbx3api** | 20      | Per-resource audit prototypes (17) + harmonisation plan + id/shortuid scan + network audit |
| **pbx3spa** | 54        | Handoff, patterns, plans, technical debt, feature plans, reference |

### 1.1 pbx3/workingdocs (13 files)

| File | Purpose | Notes |
|------|---------|--------|
| **AGENT_HANDOFF.md** | Onboard new agent to pbx3 repo; workspace layout, current state, key docs | Primary entry for pbx3. Cross-refs pbx3api/pbx3spa. |
| **TODO.md** | Open tasks (API/nginx, TLS, LDAP, pjsipuser); completed/deferred section | Single live TODO list for pbx3. |
| **CLEANUP_PLAN.md** | Phased cleanup (A–F): docs, scripts, schema, legacy web, naming, installer | Historical + ongoing; phases A–D largely done. |
| **PBX3_CLEANUP_CONTEXT.md** | Repo layout, DB split, PHP, scripts; “discoveries” for cleanup | Overlaps CLEANUP_PLAN and AGENT_HANDOFF. |
| **APACHE_CONFIG_TO_PBX3API.md** | Decision: HTTP/nginx in pbx3api; rationale; Phase 1/2 status | Still relevant; status overlaps TODO. |
| **PBX3API_INSTALLER_NGINX_ADDITIONS.md** | Checklist: what to add to pbx3api installer for nginx | Implementation checklist; references nginx-api-site-reference.conf. |
| **PBX3API_INSTALLER_HEALTHCHECK_NOTE.md** | Health-check follow-up (e.g. HTTPS) | Small; could live inside APACHE_CONFIG or TODO. |
| **nginx-api-site-reference.conf** | Reference nginx server block for API | Config asset; keep. |
| **TLS_AND_CERTIFICATES.md** (pbx3) | Host TLS index + overview | See **CERTIFICATES_PANEL_AND_API.md** and **LETSENCRYPT_PER_TENANT_FQDN.md** in same repo. |
| **PHP_SCRIPTS_AND_MODULES.md** | PHP utilities and modules in pbx3 | Reference. |
| **DB_PBX3_VS_PBX3API_VARIANCE.md** | Schema differences between pbx3 and Laravel/pbx3api | Reference for schema work. |
| **DEBIAN_PACKAGE_IMPROVEMENTS.md** | Package/deb improvements | Backlog. |
| **copilot-instructions.md** | Instructions for AI/copilot | Repo-specific AI guidance. |

**Issues:** CLEANUP_PLAN vs PBX3_CLEANUP_CONTEXT overlap; several “status” bullets duplicated with TODO. Health-check note is small and could be merged.

### 1.2 pbx3api/workingdocs (20 files)

| Category | Files | Purpose |
|----------|--------|---------|
| **Master plan** | PLAN_MODELS_AND_VALIDATION_HARMONISATION.md | Process: audit → your input → fix controller + SPA; Trunk prototype; Task 2 validation. |
| **Audit prototypes** | TENANT_AUDIT_PROTOTYPE.md, TRUNK_AUDIT_PROTOTYPE.md, EXTENSION_AUDIT_PROTOTYPE.md, QUEUE_AUDIT_PROTOTYPE.md, AGENT_AUDIT_PROTOTYPE.md, ROUTE_AUDIT_PROTOTYPE.md, IVR_AUDIT_PROTOTYPE.md, INBOUNDROUTE_AUDIT_PROTOTYPE.md, CUSTOMAPP_AUDIT_PROTOTYPE.md, GREETINGS_AUDIT_PROTOTYPE.md, CONFERENCE_AUDIT_PROTOTYPE.md, COS_AUDIT_PROTOTYPE.md, DAYTIMERS_AUDIT_PROTOTYPE.md, HOLIDAYTIMERS_AUDIT_PROTOTYPE.md, GLOBALS_AUDIT_PROTOTYPE.md, HELPCORE_AUDIT_PROTOTYPE.md, DEVICE_AUDIT_PROTOTYPE.md | Per-resource: columns from schema, suggested role (updateable/identity/deprecated), “your input needed”. |
| **Scans** | CREATE_ID_SHORTUID_SCAN.md | Tables with id/shortuid; which controllers set them on create. |
| **Other** | NETWORK_AUDIT_PROTOTYPE.md | Different kind of audit (network); name fits “prototype” pattern but content is not model/validation. |

**Issues:** 17 audit docs are consistent and useful; no strong duplication. NETWORK_AUDIT could be renamed for clarity (e.g. NETWORK_AUDIT.md or moved under a subfolder if we introduce structure). Naming is already regular (`*_AUDIT_PROTOTYPE.md`).

### 1.3 pbx3spa/workingdocs (54 files)

**Grouped by purpose:**

| Purpose | Files | Notes |
|---------|--------|--------|
| **Entry / handoff** | README.md, SESSION_HANDOFF.md, AGENT_HANDOFF_TECHNICAL_DEBT.md, SYSTEM_CONTEXT.md | Multiple “start here” docs; README points to SESSION_HANDOFF + PROJECT_PLAN + others. |
| **Plans (high level)** | PLAN.md, PROJECT_PLAN.md | PLAN = context, design, architecture; PROJECT_PLAN = job steps, current state, stack. Overlap in “what we’re building”. |
| **Panel / UX pattern** | PANEL_PATTERN.md, PANEL_PATTERN_DEPARTURES.md, LIST_EXPORT_PDF_CSV.md, SIDEBAR_NAV_GROUPING.md, STYLING_PATTERN.md, CREATE_PANELS_STANDARDIZATION.md, SINGLE_PANEL_SCREENS.md | PANEL_PATTERN is canonical (~3200 lines). Others are supplements or snapshots. |
| **Refactor / technical debt** | PANEL_REFACTOR_STRATEGY.md, AGENT_HANDOFF_TECHNICAL_DEBT.md, TECHNICAL_DEBT_ANALYSIS.md, TECHNICAL_DEBT_TENANT_PANELS.md, TECHNICAL_DEBT_AGENTS_PANEL.md, EDIT_PANEL_FIELD_PARITY_AUDIT.md | Several debt docs; some are point-in-time audits (could be archived when addressed). |
| **Port / migration** | SAIL65_PANEL_PORT_PLAN.md | Single clear doc. |
| **Feature-specific** | EXTENSION_PROVISIONING_QUICKSTART.md, EXTENSION_PROVISIONING_DEPLOYMENT_PLAN.md, EXTENSION_PROVISIONING_ISSUES.md, DATABASE_CHANGES_FOR_PROVISIONING.md, OLD_SYSTEM_EXTENSION_CREATE_REFERENCE.md, EXTENSIONS_LIVE_DATA.md, TRUNK_IMPLEMENTATION_PLAN.md, TRUNK_ROUTE_MULTITENANCY.md, CERTIFICATES_ADOPTION_PLAN.md (stub → **pbx3** `CERTIFICATES_PANEL_AND_API.md`), DDI_CREATE_PLAN.md, PERMISSIONS_MINIMAL_DEPLOY_PLAN.md, ADMIN_PANELS_AND_PERMISSIONS.md, AUTH_PATTERNS.md, FIELD_MUTABILITY_API_PLAN.md, BOOLEAN_STANDARDISATION.md, SCHEMA_MISSING_DEFAULTS.md, PILLS_RETROFIT_LIST.md, DATA_DRIVEN_LIST_POLICY_PROJECT.md, REMOTE_CONSOLE_XTERM_ASSESSMENT.md, PKEY_ROUTING_ISSUE.md | Many small-scope plans; some done, some deferred. |
| **UX / assessment** | UX_APPROACH.md, UX_IMPROVEMENTS_IVR.md, UX_AI_REVIEW.md, HOLISTIC_ASSESSMENT.md | Principles vs IVR-specific vs review. |
| **Environment / how-to** | DEV_ENVIRONMENT.md, DEPLOYMENT_BASICS.md, SPA_BASICS.md, STACK_CHOICE.md | Dev and deployment; STACK_CHOICE is historical. |
| **reference/** | README.md, sark-extensions-page-source.html, EXTENSIONS_API_FIELDS.md, UI_TRENDS_IN ADMIN_PANELS | Legacy reference; one filename has space. |
| **Other** | PROJECT_PLAN.md (also under Plans), TENANT_IVR_FINAL_PASS.md, TECHNICAL_DEBT_*.md (see Refactor) | |

**Issues:**

- **Multiple entry points:** README, SESSION_HANDOFF, AGENT_HANDOFF_TECHNICAL_DEBT, SYSTEM_CONTEXT, PROJECT_PLAN “Current state” all tell you where to start. Redundant and can drift.
- **PLAN.md vs PROJECT_PLAN.md:** Both valuable; PLAN is design/context, PROJECT_PLAN is steps + current state. Could be one doc with clear sections or keep both with a single “start here” that points to both.
- **Technical debt docs:** TECHNICAL_DEBT_ANALYSIS, TECHNICAL_DEBT_TENANT_PANELS, TECHNICAL_DEBT_AGENTS_PANEL, EDIT_PANEL_FIELD_PARITY_AUDIT are point-in-time. When work is done, they could move to an `archive/` or be summarized in one “Technical debt log” with dates.
- **Feature plans:** Many small docs (DDI_CREATE_PLAN, PILLS_RETROFIT_LIST, etc.); some are done. No single index of “done vs open” except scattered in SESSION_HANDOFF and PROJECT_PLAN.
- **reference/:** Contains legacy SARK material; README and EXTENSIONS_API_FIELDS are useful. Fix filename with space (`UI_TRENDS_IN ADMIN_PANELS`).

---

## 2. Goals for rationalization (AI-optimized)

1. **Single entry point per repo:** One file is the only “read this first.” No competing handoffs.
2. **Read-order by task in the entry:** Entry doc contains a table: Task → read these docs (in order). Enables correct context loading without guessing.
3. **One source of “current state”:** Done / next / TODO in one handoff only. All other “Current state” or “Done” sections elsewhere become a pointer to that handoff.
4. **Dense handoffs:** Handoff = short workspace/repo role + current state (bullets) + read-order table. Trim narrative and historical “Previous session” blocks.
5. **No stale directives:** Archive or summarize resolved debt; do not leave outdated “MUST FIX” in active docs.
6. **Feature/task index:** One index (e.g. FEATURE_PLANS_INDEX.md or section in entry) with task → read order + status so agent knows what to load for “extension provisioning,” “new panel,” etc.

---

## 3. Proposed structure (AI-optimized)

### 3.1 pbx3/workingdocs

| Action | Current | Proposed |
|--------|---------|----------|
| **Single entry** | AGENT_HANDOFF.md | Keep **AGENT_HANDOFF.md** as the **only** entry. Add at top: “**AI: read this first.**” Include a **Read order by task** table (see below). |
| **Merge** | PBX3_CLEANUP_CONTEXT.md | Fold layout/discoveries into CLEANUP_PLAN or into AGENT_HANDOFF in a short § “Repo layout”; delete PBX3_CLEANUP_CONTEXT.md to avoid duplicate context. |
| **Merge** | PBX3API_INSTALLER_HEALTHCHECK_NOTE.md | Merge into TODO.md or APACHE_CONFIG_TO_PBX3API.md as one bullet; delete standalone. |
| **Keep** | TODO.md, CLEANUP_PLAN.md, TLS_AND_CERTIFICATES.md, CERTIFICATES_PANEL_AND_API.md, LETSENCRYPT_PER_TENANT_FQDN.md, APACHE_CONFIG_TO_PBX3API.md, PBX3API_INSTALLER_NGINX_ADDITIONS.md, nginx-api-site-reference.conf, PHP_SCRIPTS_AND_MODULES.md, DB_PBX3_VS_PBX3API_VARIANCE.md, DEBIAN_PACKAGE_IMPROVEMENTS.md, copilot-instructions.md | Certificate docs consolidated in **pbx3** `workingdocs/`. |
| **README** | — | Add **README.md**: “**AI:** Read AGENT_HANDOFF.md first. It contains current state and read-order by task.” No long table of all docs. |

**Read-order table to add in AGENT_HANDOFF.md:**

| Task | Read (in order) |
|------|------------------|
| Any / first time | This file, then TODO.md |
| Cleanup / installer | CLEANUP_PLAN.md, APACHE_CONFIG_TO_PBX3API.md, PBX3API_INSTALLER_NGINX_ADDITIONS.md |
| Schema / DB | DB_PBX3_VS_PBX3API_VARIANCE.md; for API alignment see pbx3api/workingdocs/PLAN_MODELS_AND_VALIDATION_HARMONISATION.md |
| TLS / certificates | **pbx3** `workingdocs/TLS_AND_CERTIFICATES.md` (index) → **CERTIFICATES_PANEL_AND_API.md** → **LETSENCRYPT_PER_TENANT_FQDN.md**; **pbx3spa** stubs only |

**Result:** One entry (AGENT_HANDOFF); no duplicate context doc; entry gives task → read order.

### 3.2 pbx3api/workingdocs

| Action | Current | Proposed |
|--------|---------|----------|
| **Single entry** | — | Add **README.md** as the only entry. Content: “**AI: read this first.**” Then: **Read order by task** table. No long prose. |
| **Keep** | PLAN_MODELS_AND_VALIDATION_HARMONISATION.md, CREATE_ID_SHORTUID_SCAN.md, all *_AUDIT_PROTOTYPE.md, NETWORK_AUDIT_PROTOTYPE.md | No change. |

**Read-order table for pbx3api README.md:**

| Task | Read (in order) |
|------|------------------|
| Model/validation alignment for a resource | PLAN_MODELS_AND_VALIDATION_HARMONISATION.md, then {RESOURCE}_AUDIT_PROTOTYPE.md (e.g. TRUNK_AUDIT_PROTOTYPE.md) |
| id/shortuid on create | CREATE_ID_SHORTUID_SCAN.md |
| Network audit | NETWORK_AUDIT_PROTOTYPE.md |

**Result:** One entry (README); task → docs in order.

### 3.3 pbx3spa/workingdocs

| Action | Current | Proposed |
|--------|---------|----------|
| **Single entry** | README.md, SESSION_HANDOFF.md, SYSTEM_CONTEXT.md, PROJECT_PLAN § Current state | **SESSION_HANDOFF.md** is the **only** source of “current state” (done / next / TODO). Add at top: “**AI: read this first.**” Add **Read order by task** table. **README.md** becomes a short pointer: “AI: read SESSION_HANDOFF.md first; it contains current state and read-order by task.” **SYSTEM_CONTEXT.md**: keep as short memory (workspace, schema ref); no “current state.” **PROJECT_PLAN.md** “Current state”: replace long list with 2–3 sentences + “See SESSION_HANDOFF.md for done/next/TODO.” |
| **Trim SESSION_HANDOFF** | Long “Previous session” blocks | Keep “Last updated,” “Done” (concise bullets), “Next / left to do.” Remove or drastically shorten “Previous session” narrative; or move to an archive so the agent does not load it every time. |
| **Technical debt** | AGENT_HANDOFF_TECHNICAL_DEBT.md, PANEL_REFACTOR_STRATEGY.md + 4 point-in-time docs | **Living:** AGENT_HANDOFF_TECHNICAL_DEBT + PANEL_REFACTOR_STRATEGY. **Archive** (move to `archive/`): TECHNICAL_DEBT_ANALYSIS, TECHNICAL_DEBT_TENANT_PANELS, TECHNICAL_DEBT_AGENTS_PANEL, EDIT_PANEL_FIELD_PARITY_AUDIT. In SESSION_HANDOFF read-order: “Panel conversion / debt → AGENT_HANDOFF_TECHNICAL_DEBT.md then PANEL_REFACTOR_STRATEGY.md.” |
| **Feature plans** | Many scattered docs | **Add FEATURE_PLANS_INDEX.md**: table with columns Task, Read (in order), Status (done / in progress / deferred). Example row: “Extension provisioning | EXTENSION_PROVISIONING_QUICKSTART → EXTENSION_PROVISIONING_DEPLOYMENT_PLAN | done.” Link from SESSION_HANDOFF read-order: “Feature X → see FEATURE_PLANS_INDEX.md then listed docs.” |
| **Pattern** | PANEL_PATTERN.md + supplements | Keep. In read-order: “New or refactor panel → PANEL_PATTERN.md; list export → LIST_EXPORT_PDF_CSV.md; single-screen → SINGLE_PANEL_SCREENS.md; port from Sail65 → SAIL65_PANEL_PORT_PLAN.md.” |
| **reference/** | Filename with space | Rename UI_TRENDS_IN ADMIN_PANELS → UI_TRENDS_IN_ADMIN_PANELS (or similar). |
| **Plans / UX / env** | PLAN.md, PROJECT_PLAN.md, UX_*, DEV_ENVIRONMENT, etc. | Keep; reference from read-order table where relevant (e.g. “Auth/login → AUTH_PATTERNS.md”). |

**Read-order table to add in SESSION_HANDOFF.md:**

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

**Result:** One handoff (SESSION_HANDOFF) with single “current state” and task → read order; FEATURE_PLANS_INDEX for feature work; archived debt docs so agent does not see stale “MUST FIX.”

---

## 4. Migration steps (order of operations)

1. **pbx3**
   - Merge PBX3API_INSTALLER_HEALTHCHECK_NOTE into TODO or APACHE_CONFIG; delete note.
   - Merge PBX3_CLEANUP_CONTEXT into CLEANUP_PLAN or AGENT_HANDOFF (§ Repo layout); delete PBX3_CLEANUP_CONTEXT.
   - In AGENT_HANDOFF.md: add at top “**AI: read this first.**” and a **Read order by task** table (§3.1).
   - Add workingdocs/README.md: “AI: read AGENT_HANDOFF.md first. It contains current state and read-order by task.”

2. **pbx3api**
   - Add workingdocs/README.md: “**AI: read this first.**” + **Read order by task** table (§3.2). No long index of every file.

3. **pbx3spa**
   - In SESSION_HANDOFF.md: add at top “**AI: read this first.**” and **Read order by task** table (§3.3). Trim “Previous session” blocks to a few lines or move to bottom/archive so current “Done” and “Next” are the only state.
   - Replace PROJECT_PLAN “Current state” with 2–3 sentences + “See SESSION_HANDOFF.md for done/next/TODO.”
   - Create workingdocs/archive/ and move TECHNICAL_DEBT_ANALYSIS, TECHNICAL_DEBT_TENANT_PANELS, TECHNICAL_DEBT_AGENTS_PANEL, EDIT_PANEL_FIELD_PARITY_AUDIT into it.
   - Add FEATURE_PLANS_INDEX.md: table Task | Read (in order) | Status; link from SESSION_HANDOFF read-order.
   - Update README.md: “AI: read SESSION_HANDOFF.md first; it contains current state and read-order by task.” Remove or shorten long “Contents” table so README is not a second handoff.
   - Rename reference/ file with space (UI_TRENDS_IN ADMIN_PANELS → e.g. UI_TRENDS_IN_ADMIN_PANELS).

4. **Cross-repo**
   - In pbx3 AGENT_HANDOFF read-order table: include rows that point to pbx3api/workingdocs/ and pbx3spa/workingdocs/ for schema, API, and SPA pattern (as in §3.1).
   - In pbx3spa SESSION_HANDOFF read-order: include pbx3 full_schema.sql and pbx3api workingdocs where relevant.

---

## 5. What we are not doing (out of scope)

- **pbx3api/docs/** and **pbx3/docs/** (MkDocs): Stay as-is; they are API reference and product docs, not workingdocs.
- **Deleting content:** Rationalization is merge, move, index, and trim duplication—not deleting historical value; archive or date-prefix instead where appropriate.
- **Single mono-repo doc folder:** workingdocs stay per-repo so each repo remains self-contained and commit scope is clear.

---

## 6. Summary table

| Repo | Before | After (target) | Main changes (AI-optimized) |
|------|--------|----------------|-----------------------------|
| pbx3 | 13 | ~11 + README | One entry (AGENT_HANDOFF); add “AI: read this first” + read-order table; merge health-check + CLEANUP_CONTEXT; README = pointer only. |
| pbx3api | 20 | 20 + README | One entry (README) with “AI: read this first” + read-order by task (model/validation, id/shortuid, network). |
| pbx3spa | 54 | ~50 + archive/ + FEATURE_PLANS_INDEX | One handoff (SESSION_HANDOFF) = only source of current state; add read-order table; trim SESSION_HANDOFF narrative and PROJECT_PLAN “Current state”; FEATURE_PLANS_INDEX for task → docs; archive 4 debt docs; README = pointer only. |

---

**Next:** Review this plan; then execute migration steps in §4 in order. Each repo: one commit for entry + read-order + merges/archives so the next agent has a single, task-driven entry point.
