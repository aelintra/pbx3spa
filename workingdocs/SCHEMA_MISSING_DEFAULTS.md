# Missing column defaults (four schema files)

**Source:** The four files in `pbx3/pbx3-1/opt/pbx3/db/db_sql` (sqlite_create_instance.sql, sqlite_create_laravel.sql, sqlite_message.sql, sqlite_create_tenant.sql). The running database is created from these; when we read schema from the DB we get what they define.

**Scope:** Only tables that correspond to admin-editable resources (tenant/cluster, agent, appl, cos, dateseg, greeting, holiday, ipphone, ivrmenu, inroutes, page, meetme, queue, route, trunks). Laravel tables (users, sessions, migrations, etc.) and globals/tt_help_core are noted but not prioritised for create-form defaults.

Below: columns that currently have **no DEFAULT** where a default could reasonably be added so create forms and the schema API have a clear initial value. Suggested defaults are only recommendations; product/domain rules may override.

---

## sqlite_create_instance.sql

### globals
- **bindaddr** — TEXT, no default. Suggest: `DEFAULT NULL` (optional).
- **edomain** — TEXT, no default. Suggest: `DEFAULT NULL`.
- **fqdn** — TEXT, no default. Suggest: `DEFAULT NULL`.
- **fqdnprov** — TEXT, no default. Suggest: `DEFAULT NULL` or `'NO'`.
- **logopts** — TEXT, no default. Suggest: `DEFAULT NULL`.
- **mycommit** — TEXT, no default. Suggest: `DEFAULT NULL`.
- **reclimit** — TEXT, no default. Suggest: `DEFAULT NULL`.
- **recmount** — TEXT, no default. Suggest: `DEFAULT NULL`.
- **recqdither** — TEXT, no default. Suggest: `DEFAULT NULL`.
- **recqsearchlim** — TEXT, no default. Suggest: `DEFAULT NULL`.
- **sitename** — TEXT, no default. Suggest: `DEFAULT NULL`.

(These are instance/globals; less critical for SPA create panels but would make GET /schemas defaults consistent.)

### tt_help_core
- Content table; columns (displayname, htext, name, cname) are content, not config. No defaults needed for admin create forms.

---

## sqlite_create_laravel.sql

- Laravel migration tables (users, sessions, cache, jobs, etc.). Leave as-is; not used by resource create panels.

---

## sqlite_message.sql

- INSERTs only; no table definitions. N/A.

---

## sqlite_create_tenant.sql

### agent
- **conf** — TEXT, no default. Suggest: `DEFAULT NULL`.
- **description** — TEXT, no default. Suggest: `DEFAULT ''` or `NULL`.
- **extlen** — INTEGER, no default. Suggest: `DEFAULT NULL` (or 0 if “no extension length” is 0).
- **num** — TEXT, no default. Suggest: `DEFAULT NULL`.
- **passwd** — TEXT, no default. Required on create; could leave NULL or add a placeholder default if app never inserts without it.

### appl (custom app)
- **description** — TEXT, no default. Suggest: `DEFAULT ''`.
- **extcode** — TEXT, no default. Suggest: `DEFAULT NULL`.
- **name** — TEXT, no default. Suggest: `DEFAULT NULL` (deprecated in favour of cname).
- **cname** — TEXT, no default. Suggest: `DEFAULT NULL` or `''`.
- **striptags** — TEXT, no default. Suggest: `DEFAULT NULL`.

### cos
- **cluster** — TEXT, no default. Suggest: `DEFAULT 'default'` if all COS rows are tenant-scoped.
- **cname** — TEXT, no default. Suggest: `DEFAULT NULL` or `''`.
- **description** — TEXT, no default. Suggest: `DEFAULT ''`.

### cluster (tenant)
- **blind_busy** — TEXT. Suggest: `DEFAULT NULL`.
- **bounce_alert** — TEXT. Suggest: `DEFAULT NULL`.
- **camp_on_q_onoff** — TEXT. Suggest: `DEFAULT NULL`.
- **camp_on_q_opt** — TEXT. Suggest: `DEFAULT NULL`.
- **clusterclid** — TEXT. Suggest: `DEFAULT NULL`.
- **cname** — TEXT. Suggest: `DEFAULT NULL` or `''`.
- **description** — TEXT. Suggest: `DEFAULT ''`.
- **extblklist** — TEXT. Suggest: `DEFAULT NULL`.
- **include** — TEXT. Suggest: `DEFAULT ''` or `NULL`.
- **localarea** — TEXT. Suggest: `DEFAULT ''` or `NULL`.
- **localdplan** — TEXT. Suggest: `DEFAULT NULL`.
- **masteroclo** — TEXT, no default. **Reasonable default:** `DEFAULT 'AUTO'` (matches SPA and avoids API null handling).
- **mixmonitor** — TEXT. Suggest: `DEFAULT NULL`.
- **name** — TEXT. Suggest: `DEFAULT NULL`.
- **number_range_regex** — TEXT. Suggest: `DEFAULT NULL`.
- **oclo** — TEXT. Suggest: `DEFAULT NULL`.
- **pickupgroup** — TEXT. Suggest: `DEFAULT NULL`.
- **rec_final_dest** — TEXT. Suggest: `DEFAULT NULL`.
- **rec_limit** — TEXT. Suggest: `DEFAULT NULL`.
- **rec_mount** — TEXT. Suggest: `DEFAULT NULL`.
- **routeoverride** — TEXT. Suggest: `DEFAULT NULL` or `''`.
- **sysop** — INTEGER, no default. Suggest: `DEFAULT 100` (operator extension) if that’s the usual.
- **usemohcustom** — TEXT. Suggest: `DEFAULT ''` or `NULL`.

### dateseg (day timer)
- **cname** — TEXT, no default. Suggest: `DEFAULT ''` or `NULL`.
- **description** has DEFAULT '*NEW RULE*'; good.

### greeting
- **filename** — TEXT. Suggest: `DEFAULT NULL`.
- **type** — TEXT. Suggest: `DEFAULT NULL`.
- **description** — TEXT. Suggest: `DEFAULT ''`.

### holiday
- **cname** — TEXT. Suggest: `DEFAULT NULL`.
- **description** — TEXT. Suggest: `DEFAULT ''`.
- **route** — TEXT. Suggest: `DEFAULT NULL`.
- **stime** / **etime** — INTEGER. Suggest: `DEFAULT NULL` (required for meaning).

### ipphone (extensions)
- **callerid** — TEXT. Suggest: `DEFAULT ''` or `NULL`.
- **cname** — TEXT. Suggest: `DEFAULT NULL` or `''`.
- **cellphone** — TEXT. Suggest: `DEFAULT ''` or `NULL`.
- **celltwin** — TEXT, no default. **Reasonable default:** `DEFAULT 'OFF'` (SPA already uses 'OFF').
- **desc** — TEXT. Suggest: `DEFAULT NULL` (set by app from protocol).
- **description** — TEXT. Suggest: `DEFAULT ''`.
- **device** — TEXT. Suggest: set by app; `DEFAULT NULL`.
- **devicemodel** — TEXT. Suggest: `DEFAULT NULL`.
- **dvrvmail** — TEXT. Suggest: `DEFAULT NULL`.
- **extalert** — TEXT. Suggest: `DEFAULT NULL`.
- **macaddr** — TEXT. Suggest: `DEFAULT NULL`.
- **passwd** — TEXT. Required on create; `DEFAULT NULL` or leave no default.
- **technology** — TEXT. Set by app; `DEFAULT NULL`.
- **tls** — TEXT. Suggest: `DEFAULT 'OFF'` or `NULL`.
- **vmailfwd** — TEXT. Suggest: `DEFAULT ''` or `NULL`.
- **basemacaddr**, **pjsipuser**, **stealtime**, **stolen** — internal; `DEFAULT NULL` if missing.

### ivrmenu
- **cluster** — TEXT, no default. **Reasonable default:** `DEFAULT 'default'`.
- **cname** — TEXT. Suggest: `DEFAULT NULL` or `''`.
- **name** — TEXT (deprecated). Suggest: `DEFAULT NULL`.
- **timeout** — TEXT, no default. **Reasonable default:** `DEFAULT 'operator'` (matches SPA).

### inroutes (inbound routes)
- **cluster** — TEXT, no default. **Reasonable default:** `DEFAULT 'default'`.
- **openroute** — TEXT, no default. **Reasonable default:** `DEFAULT 'None'` (matches SPA).
- **closeroute** — TEXT, no default. **Reasonable default:** `DEFAULT 'None'`.
- **devicerec** — TEXT, no default. Suggest: `DEFAULT 'default'` or `'None'`.
- **alertinfo**, **callback**, **callerid**, **cname**, **description**, **disa**, **disapass**, **host**, **inprefix**, **match**, **openroute**, **password**, **peername**, **register**, **swoclip**, **tag**, **technology**, **transform**, **trunkname**, **username** — many optional; suggest `DEFAULT NULL` or `''` for string fields where “empty” is valid.

### page
- **cluster** — TEXT. Suggest: `DEFAULT 'default'`.
- **cname** — TEXT. Suggest: `DEFAULT NULL`.
- **description** — TEXT. Suggest: `DEFAULT ''`.
- **pagegroup** — TEXT. Suggest: `DEFAULT NULL`.

### meetme
- **cname** — TEXT. Suggest: `DEFAULT NULL`.
- **description** — TEXT. Suggest: `DEFAULT ''`.

### queue
- **cluster** — TEXT, no default. **Reasonable default:** `DEFAULT 'default'`.
- **alertinfo** — TEXT. Suggest: `DEFAULT NULL`.
- **cname** — TEXT. Suggest: `DEFAULT NULL`.
- **description** — TEXT. Suggest: `DEFAULT ''`.
- **devicerec** — TEXT, no default. **Reasonable default:** `DEFAULT 'default'` or `'None'`.
- **divert** — INTEGER. Suggest: `DEFAULT NULL`.
- **members** — TEXT. Suggest: `DEFAULT NULL` or `''`.
- **musicclass** — TEXT. Suggest: `DEFAULT NULL`.

### route (outbound)
- **cluster** — TEXT, no default. **Reasonable default:** `DEFAULT 'default'`.
- **alternate** — TEXT. Suggest: `DEFAULT NULL`.
- **cname** — TEXT. Suggest: `DEFAULT NULL`.
- **description** — TEXT. Suggest: `DEFAULT ''`.
- **dialplan** — TEXT. Suggest: `DEFAULT NULL` (often required by app).

### trunks
- **cluster** — TEXT, no default. **Reasonable default:** `DEFAULT 'default'`.
- **devicerec** — TEXT, no default. **Reasonable default:** `DEFAULT 'default'` or `'None'`.
- **openroute** / **closeroute** — no default. Suggest: `DEFAULT 'None'` if “no route” is represented that way.
- **alertinfo**, **callback**, **callerid**, **cname**, **description**, **disa**, **disapass**, **host**, **inprefix**, **match**, **password**, **peername**, **register**, **tag**, **technology**, **transform**, **trunkname**, **username** — suggest `DEFAULT NULL` or `''` where an empty value is valid.

---

## Summary: high-value defaults for admin create panels

These are the ones that would most help create forms and schema/API consistency (same as SPA or common convention):

| Table     | Column     | Suggested default | Note |
|----------|------------|-------------------|------|
| cluster  | masteroclo | `'AUTO'`          | SPA/API already treat as default; avoids null |
| ipphone  | celltwin   | `'OFF'`           | SPA uses 'OFF' |
| ivrmenu  | cluster    | `'default'`       | Tenant-scoped |
| ivrmenu  | timeout    | `'operator'`      | SPA default |
| inroutes | cluster    | `'default'`       | Tenant-scoped |
| inroutes | openroute  | `'None'`          | SPA default |
| inroutes | closeroute | `'None'`          | SPA default |
| inroutes | devicerec  | `'default'` or `'None'` | Optional |
| queue    | cluster    | `'default'`       | Tenant-scoped |
| queue    | devicerec  | `'default'` or `'None'` | Optional |
| route    | cluster    | `'default'`       | Tenant-scoped |
| trunks   | cluster    | `'default'`       | Tenant-scoped |
| trunks   | devicerec  | `'default'` or `'None'` | Optional |

Adding these in the four `db_sql` files (and applying to the DB) would align the running schema with SPA/API expectations and give GET /schemas useful defaults for create forms. Other columns above can be added as needed for consistency or to avoid NULL where a sentinel is preferred.
