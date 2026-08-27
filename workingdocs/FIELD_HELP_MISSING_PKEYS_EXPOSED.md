# SPA field pkeys missing from tt_help_core

**Generated:** 2026-08-27 · **Script:** `scripts/list-missing-help-pkeys.mjs` **`--exposed-only`**

Editable fields on instance SPA panels (nav / account / create flows). Excludes FormReadonly identity/audit stamps.
Regenerate: `node scripts/list-missing-help-pkeys.mjs --write` · exposed only: add `--exposed-only`

**Final pass (after this list is done):** `node scripts/list-empty-help-htext.mjs --exposed-only --write` → **`FIELD_HELP_EMPTY_HTEXT_EXPOSED.md`**

| Metric | Count |
|--------|------:|
| Unique missing pkeys (actionable) | **0** |
| Dynamic / audit-noise (fix wiring, not DB) | 15 |

## Exposed in SPA — editable fields needing help

Check off when row exists and field shows **?** help in SPA.

| Done | pkey | Label (sample) | Panel(s) |
|------|------|----------------|----------|

## Audit noise — fix SPA wiring, not seed

Dynamic `:id` / `:help-pkey` on exposed panels — add static `help-pkey` (or alias in `formHelpPkey.js`).

| pkey (raw) | Label | Panel(s) |
|------------|-------|----------|
| `'alert-' + item.key` | Alert | ACD → IVRs → Create (`/ivrs/new`) |
| `'dest-' + item.key` | Action on KeyPress | ACD → IVRs → Create (`/ivrs/new`) |
| `'edit-alert-' + item.key` | Alert | ACD → IVRs → Edit (`/ivrs/:shortuid`) |
| `'edit-dest-' + item.key` | Action on KeyPress | ACD → IVRs → Edit (`/ivrs/:shortuid`) |
| `'edit-tag-' + item.key` | Tag | ACD → IVRs → Edit (`/ivrs/:shortuid`) |
| `'tag-' + item.key` | Tag | ACD → IVRs → Create (`/ivrs/new`) |
| ``adv-${f.key}`` | f.label | Tenants → Create (`/tenants/new`) |
| ``cc-${f.key}`` | f.label | Tenants → Create (`/tenants/new`) |
| ``edit-adv-${f.key}`` | f.label | Tenants → Edit (`/tenants/:pkey`) |
| ``edit-cc-${f.key}`` | f.label | Tenants → Edit (`/tenants/:pkey`) |
| ``edit-rec-${f.key}`` | f.label | Tenants → Edit (`/tenants/:pkey`) |
| ``edit-timers-${f.key}`` | f.label | Tenants → Edit (`/tenants/:pkey`) |
| ``mon-${f.key}`` | f.label | Tenants → Create (`/tenants/new`) |
| ``rec-${f.key}`` | f.label | Tenants → Create (`/tenants/new`) |
| ``timers-${f.key}`` | f.label | Tenants → Create (`/tenants/new`) |
