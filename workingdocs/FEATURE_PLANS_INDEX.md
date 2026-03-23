# Feature plans index

**AI:** For feature work, read the docs listed in **Read (in order)** for that task. See SESSION_HANDOFF.md read-order table.

| Task | Read (in order) | Status |
|------|------------------|--------|
| Extension provisioning | EXTENSION_PROVISIONING_QUICKSTART.md → EXTENSION_PROVISIONING_DEPLOYMENT_PLAN.md | done |
| Trunk create | TRUNK_IMPLEMENTATION_PLAN.md, COMPLEX_CREATE_PLAN.md | done |
| DDI / Inbound routes | DDI_CREATE_PLAN.md, COMPLEX_CREATE_PLAN.md | done |
| IVR create | COMPLEX_CREATE_PLAN.md, wizardnotes/ivr/ | done |
| Certificates / Let's Encrypt | CERTIFICATES_ADOPTION_PLAN.md | done |
| LE per-tenant FQDN / multi-SAN | LETSENCRYPT_PER_TENANT_FQDN_OPTIONS.md | planned (gated §11) |
| Permissions / admin | PERMISSIONS_MINIMAL_DEPLOY_PLAN.md, ADMIN_PANELS_AND_PERMISSIONS.md, AUTH_PATTERNS.md | done (Phase 0) |
| Field mutability (schema) | FIELD_MUTABILITY_API_PLAN.md, pbx3api/docs/SCHEMAS_ENDPOINT.md | done |
| List export (CSV/PDF) | LIST_EXPORT_PDF_CSV.md, PANEL_PATTERN.md § Optional list export | done |
| Boolean standardisation | BOOLEAN_STANDARDISATION.md | deferred (migration not run) |
| Help text per-field hints | UX_IMPROVEMENTS_IVR.md § Help Text, useHelp + FieldHelpIcon | done |
| Trunk/route multitenancy | TRUNK_ROUTE_MULTITENANCY.md | reference |
| Data-driven list policy | DATA_DRIVEN_LIST_POLICY_PROJECT.md | deferred |

**Source of truth:** Schema and code. Verify against repo when implementing; this index may be outdated.
