# Feature plans index

**AI:** For feature work, read the docs listed in **Read (in order)** for that task. See **SESSION_HANDOFF.md** (**Quick start** + read-order table). Default git branch: **`main`** (pbx3spa / pbx3api).

| Task | Read (in order) | Status |
|------|------------------|--------|
| Extension provisioning | EXTENSION_PROVISIONING_QUICKSTART.md → EXTENSION_PROVISIONING_DEPLOYMENT_PLAN.md | done |
| Trunk create | TRUNK_IMPLEMENTATION_PLAN.md, COMPLEX_CREATE_PLAN.md | done |
| DDI / Inbound routes | DDI_CREATE_PLAN.md, COMPLEX_CREATE_PLAN.md | done |
| IVR create | COMPLEX_CREATE_PLAN.md | done |
| Certificates / Let's Encrypt | **pbx3** `workingdocs/TLS_AND_CERTIFICATES.md` (**§0**) → `CERTIFICATES_PANEL_AND_API.md` | done (fleet = instance-only LE) |
| LE multi-SAN (solo/direct only) | **pbx3** `workingdocs/LETSENCRYPT_PER_TENANT_FQDN.md` | solo/direct; not SBC fleet default |
| Permissions / admin | PERMISSIONS_MINIMAL_DEPLOY_PLAN.md, ADMIN_PANELS_AND_PERMISSIONS.md, AUTH_PATTERNS.md | done (Phase 0) |
| Field mutability (schema) | FIELD_MUTABILITY_API_PLAN.md, pbx3api/docs/SCHEMAS_ENDPOINT.md | done |
| List export (CSV/PDF) | LIST_EXPORT_PDF_CSV.md, PANEL_PATTERN.md § Optional list export | done |
| Boolean standardisation | BOOLEAN_STANDARDISATION.md | deferred (migration not run) |
| Help text per-field hints | UX_IMPROVEMENTS_IVR.md § Help Text, useHelp + FieldHelpIcon | done |
| Trunk/route multitenancy | TRUNK_ROUTE_MULTITENANCY.md | reference |
| Data-driven list policy | DATA_DRIVEN_LIST_POLICY_PROJECT.md | deferred |
| SPA bundle / maintainability (lazy routes, list/detail extraction) | PROJECT_PLAN.md § Current state, PBX3SPA_CODEBASE_ANALYSIS.md § Phase H / H2 | **deferred** (after S8, R1) |
| SPA shell (nav / chrome) | SPA_SHELL_ROADMAP.md, SESSION_HANDOFF.md § Shell / topbar + Latest session | Stage 1 + Stage 2 on **`main`**: context chips (**viewport-centered** top bar, **`--pbx-shell-sidebar-width`**), **PBX3 Admin** title left, **sidebar top spacer** (no rail logo yet), **detail active header**; collapsible sidebar / ⌘K still optional |
| **WSS line test (in-admin)** | **`WSS_LINE_TEST_REQUIREMENTS.md`** (**JsSIP** + post-call report; lab green 2026-08-03) · **pbx3** `WEBRTC_WSS_LAB.md` § Fleet edge W1 · §6.1 | **Phase 2 shipped 2026-08-26** — Tools → Line quality test; hidden caller; Hold/Resume; retires per-WebRTC button — §10. **Future:** Asterisk-leg RTCP twin — §11 (parked). |
| **Incident notify (tenant)** | **pbx3** **`INCIDENT_NOTIFY_REQUIREMENTS.md`** | **parked** — callout teams → ConfBridge + pluggable SMS; SPA CRUD + fire when scheduled |


**Source of truth:** Schema and code. Verify against repo when implementing; this index may be outdated.
