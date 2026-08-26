# LDAP tenant panel — parked (2026-08-26)

**Status:** SPA **Tenant create/edit** no longer shows an LDAP section. Schema, API, and SPA field defs remain so this can be reinstated without rediscovery.

## What was in the UI

Last placement: after **Call control**, heading **LDAP**.

| Field key | Label | Control | Options / notes |
|-----------|-------|---------|-----------------|
| `ldapbase` | LDAP base | text | default `dc=pbx3,dc=local` |
| `ldaphost` | LDAP host | text | default `127.0.0.1` |
| `ldapou` | LDAP OU | text | default `contacts` |
| `ldapuser` | LDAP user | text | default `admin` |
| `ldappass` | LDAP pass | text | default `pbx3admin` (not password-masked in SPA) |
| `ldaptls` | LDAP TLS | pill / toggle | `on` / `off` |
| `ldapanonbind` | LDAP anon bind | pill / toggle | `YES` / `NO` |

Shared source of truth for keys, labels, defaults, and save payload:

- `src/constants/tenantAdvanced.js` — `LDAP_KEYS`, `LDAP_FIELDS`, `CLUSTER_CREATE_DEFAULTS` ldap\* entries, `buildInitialFormLdap()`, `buildLdapPayload()`

Previous wiring (removed from views; restore by re-importing and pasting the section):

- `TenantDetailView.vue` — sync from tenant, `...buildLdapPayload(formLdap)` on save, template block under Call control
- `TenantCreateView.vue` — same payload + template

Field order note: `workingdocs/CREATE_EDIT_PANEL_FIELD_ORDER.md` still mentions LDAP historically; treat this file as the reinstate checklist.

## Still present (not removed)

| Layer | Location |
|-------|----------|
| SQLite `cluster` columns | `pbx3/pbx3-1/opt/pbx3/db/db_sql/sqlite_create_tenant.sql` (`ldapbase` … `ldaptls`) |
| Tenant API | `pbx3api` `Tenant` fillable + `TenantController` updateable validation for the same keys |
| Backup LDAP contacts | SPA Backup UI still offers an LDAP contacts restore checkbox; API `Helper` restore messages |
| Legacy PHP helper | `pbx3/pbx3-1/opt/pbx3/php/classes/LDAPHelperClass.php` — **reads LDAP settings from `globals`**, while product columns live on **`cluster`** (instance `globals` has no LDAP columns). Fix when LDAP strategy is chosen. |
| Utilities | `php/utilities/fixupTenantLdap.php`, `ldapfixup.php` |

## Reinstate SPA (minimal)

1. Re-import `LDAP_*` / `buildLdapPayload` / `buildInitialFormLdap` in create + detail views.
2. Re-add form state, sync (detail), payload merge, and the LDAP template block (copy from git history around this park date if needed).
3. Decide product strategy first: per-tenant `cluster` LDAP vs instance `globals` (helper mismatch above).

## Product decision (parked)

No overall LDAP strategy chosen yet (directory for phones vs admin auth vs contacts). Do not schedule UI reinstate until that design exists.
