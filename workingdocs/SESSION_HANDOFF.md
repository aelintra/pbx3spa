# Session handoff — where we left off

**AI: read this first.**

**Session end:** When the user says **`session end`**, **`end session`**, or **`update handoff`**, follow **`pbx3/workingdocs/SESSION_END_CHECKLIST.md`** (prepend a new block below; update **`pbx3/workingdocs/TODO.md`** and **`AGENT_HANDOFF.md`** too).

**New session:** Read **`AGENT_HANDOFF.md`** § Next agent session notes → **`TODO.md`** → this file (top **Session end** block only). Wait for user task before coding.

## Session end 2026-08-03 — docs garden (handoff/TODO archive)

**Merged / on `main` soon:** docs only. Live handoffs slimmed; history under **`workingdocs/archive/`** (pbx3 + spa). **`TODO.md`** open-only; closed log archived. **SESSION_END_CHECKLIST** updated.

**Resume:** same product backlog as before garden; top of **AGENT_HANDOFF** + **TODO**. Wait for task.

---

## Session end 2026-08-02 — Kildare PSTN + Mangle + number wire draft

**Merged to `main`:** **pbx3cagi** Mangle **1.0.0-9** (`502596e`); **pbx3** Egress seed `00:+ 0:+44` + wire/research docs; **pbx3-docs** number-dialect seed note. SPA product code unchanged this session.

**Dev against golden:** `https://08jzwn.pbx3.com:44300/api` · SSH `ubuntu@44.196.98.191` (`pbx3test.pem`). **Kildare:** `https://kildare.pbx3.com:44300` · SSH `ubuntu@3.93.253.1` (`aelsip.pem`) · tenant **`18c8z3`**. Magrathea **`3.93.26.82`**.

**Operator impact:** Kildare **outbound + inbound** over Brindley working. Inbound Numbers / inroute show **`+441924918076`** (fleet wire). Outbound still node Mangle national→`+E.164` then SBC Brindley strip to `0…`.

**Docs / TODO:** open **number wire Model A/B** draft; **cagi 1.0.0-9** package/golden roll follow-up. **`TODO.md`** updated this session.

**Resume:** SPA-stable; product from TODO or wire-standard decision. Wait for task.


---

## Session history (archived)

Older **Session end** blocks live in **`archive/SESSION_HANDOFF_HISTORY.md`**. New session: top block only. Session end prepends a new block above this pointer.

---

## Quick start (next agent)

1. **Repos / branch:** **`main`** in all repos (`helptext`, `panelfixes`, `directory` merged and deleted). **`pbx3-master`** is **not** a git repo (four nested repos). Commit inside the repo you changed.
2. **Directory work:** Read **`pbx3/pbx3-directory/docs/PLANNING_HANDOFF.md`** → **CENTRAL_ADMIN_DIRECTION.md** → v0 schema under **`pbx3/pbx3-directory/schema/`**.
3. **Panel / UI work:** **PANEL_PATTERN.md**; **PROJECT_PLAN.md** § Current state; **FEATURE_PLANS_INDEX.md**.
4. **TLS / certs (maintenance only):** **pbx3/workingdocs/TLS_AND_CERTIFICATES.md** — new tenant = DNS → **Sync**; do not re-run **Get certificate** if LE already configured.

**Primary branch:** **`main`** (all repos).

## Read order by task

| Task | Read (in order) |
|------|------------------|
| Current state / next steps | This file only |
| **Session end** (user request) | **pbx3/workingdocs/SESSION_END_CHECKLIST.md** |
| **New session** (user request) | **pbx3/AGENT_HANDOFF.md** § Next agent session notes → **pbx3/TODO.md** → this file (top block only) |
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

