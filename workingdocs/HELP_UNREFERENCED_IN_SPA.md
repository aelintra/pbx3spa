# tt_help_core rows not referenced by SPA field help

**Generated:** 2026-08-26 · **Script:** `scripts/audit-unreferenced-help.mjs`

Lists `tt_help_core` pkeys in `sqlite_message.sql` that no SPA form control resolves to via `help-pkey`, `deriveHelpPkeyFromFieldId()`, tenant advanced fields, or `helpPkeys.js` constants.

| Metric | Count |
|--------|------:|
| tt_help_core rows | 190 |
| SPA-referenced pkeys | 265 |
| **Unreferenced** | **0** |

## Unreferenced help rows

_None — seed matches SPA wiring (final pass 2026-08-26; pruned 233 legacy SARK rows)._

Regenerate: `node scripts/audit-unreferenced-help.mjs` · prune seed: add `--prune`.
