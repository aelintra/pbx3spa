# tt_help_core rows with empty htext

**Generated:** 2026-08-27 · **Script:** `scripts/list-empty-help-htext.mjs` **`--exposed-only`**

Final pass after missing-pkey worklist is clear. **`FieldHelpIcon` only renders when `htext` is non-empty** — add copy here (or use Help Messages admin) so **?** appears in SPA.

Regenerate: `node scripts/list-empty-help-htext.mjs --write` · exposed wired fields only: add `--exposed-only`

| Metric | Count |
|--------|------:|
| Empty htext rows in seed (all) | **0** |
| Wired in SPA (any panel) | 0 |
| In this list | **0** |

## Rows needing htext

| Done | pkey | displayname | Wired in SPA | Panel(s) / notes |
|------|------|-------------|--------------|------------------|
| — | _none_ | — | — | — |

## Workflow

1. Finish **`FIELD_HELP_MISSING_PKEYS_EXPOSED.md`** (rows + hide-help + wiring).
2. Run this script (`--exposed-only --write`).
3. Add operator-facing `htext` for each pkey in `sqlite_message.sql` (key = column name).
4. Re-run `audit-field-help.mjs` — **Empty htext** should be 0 for exposed fields.
