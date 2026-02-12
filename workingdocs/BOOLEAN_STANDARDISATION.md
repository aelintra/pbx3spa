# Boolean column standardisation

## Problem

For historical reasons, boolean-like columns use mixed conventions:

- **YES/NO** — e.g. `active`, `swoclip`, `defaultclosed`, `defaultopen`
- **ON/OFF** — e.g. `moh` (inroutes, trunks), `COSSTART` (globals)
- **1/0** — e.g. `VCL` (globals), some INTEGER columns
- **true/false** — occasionally in config or legacy data

This causes:

- API validation accepting `ON`/`OFF` while schema default is `NO`
- UI having to map `NO` → `OFF` for pill sliders
- Inconsistent behaviour and bugs when values are compared or displayed

## Target convention

**Standardise on YES/NO** for all boolean-like TEXT columns:

- **YES** = true / on / 1
- **NO** = false / off / 0

Rationale: YES/NO is already the majority in the schema (`active`, `swoclip`, etc.) and in Asterisk/telephony UIs.

## Scope

1. **Schema (full_schema.sql)**  
   - Change any remaining DEFAULT `'ON'`/`'OFF'` to `'YES'`/`'NO'` in new/updated table definitions.  
   - Document which columns are boolean; keep INTEGER 0/1 columns as-is unless we decide to migrate them to TEXT YES/NO later.

2. **API (pbx3api)**  
   - Validators: use `in:YES,NO` (or equivalent) for all boolean fields.  
   - Remove `in:ON,OFF`; accept only YES/NO.  
   - Models: default attributes and any logic that checks booleans should use YES/NO.

3. **Frontend (pbx3spa)**  
   - All boolean controls (pill sliders, toggles) bind to YES/NO.  
   - Remove mapping from API `NO` → display `OFF`; display YES/NO or “On”/“Off” as labels only.

4. **Asterisk / generator code (pbx3)**  
   - Where the generator reads these columns, ensure it treats YES/NO (and document any remaining ON/OFF expectations for Asterisk config files).

## Fixer routine (migrate existing database)

A one-off migration normalises existing data so that all boolean-like TEXT columns use only YES or NO. **No migration file is in the repo yet** — it was removed to avoid an unplanned `php artisan migrate` running before we're ready. When we're ready, create a new migration in pbx3api using the logic below.

**Mapping rules:**

- → **YES**: `ON`, `on`, `1`, `true`, `TRUE`, `yes`, `YES` (and trimmed variants)
- → **NO**: `OFF`, `off`, `0`, `false`, `FALSE`, `no`, `NO` (and trimmed variants)
- Values that are already `YES` or `NO` are left unchanged.
- Any other value is left as-is (or optionally forced to NO and logged).

**When ready:** Add a Laravel migration in pbx3api `database/migrations/` that loops over the tables/columns below, checks `Schema::hasTable` / `Schema::hasColumn`, and runs an UPDATE with the mapping (e.g. `CASE WHEN UPPER(TRIM(...)) IN ('ON','1','TRUE','YES') THEN 'YES' WHEN ... IN ('OFF','0','FALSE','NO') THEN 'NO' ELSE col END`). Run once per environment with `php artisan migrate` after backup.

**Tables and columns to fix (TEXT booleans):**

- `inroutes`: `active`, `callprogress`, `moh`, `swoclip`
- `trunks`: `active`, `callprogress`, `moh`, `swoclip`
- `cluster`: any TEXT column that is boolean (audit from full_schema)
- `cos`: `active`, `defaultclosed`, `defaultopen`, `orideclosed`, `orideopen`
- `dateseg`: `active`
- `ipphone`: `active`
- `ipphonecosopen` / `ipphonecosclosed`: `active`
- `ivrmenu`: `active`, `listenforext`
- `page`: `active`
- `queue`: `active`
- `route`: `active`, `auth`
- `globals`: `COSSTART`, `FQDNINSPECT`, `SENDEDOMAIN`, `SIPFLOOD`, etc. (audit)

The migration script uses a list of `(table, column)` and runs an UPDATE with the mapping above for each, only if the table exists.

## TODO

- [ ] Audit full_schema.sql and list every boolean-like column (TEXT and INTEGER).
- [ ] When ready: add a new migration in pbx3api using the Fixer routine above (no migration file is in the repo yet).
- [ ] Change API validators and model defaults to YES/NO only.
- [ ] Change frontend to use YES/NO; remove NO→OFF mapping.
- [ ] Update schema defaults in full_schema.sql for new/updated tables.
- [ ] Update Asterisk generator/docs if it expects ON/OFF in config.
