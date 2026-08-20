# Data-driven list policy (future project)

**Status:** Separate project, to be done later. Not implemented now.

**Purpose:** Replace hardcoded allow/deny or read-only lists (e.g. Asterisk config files, log files) with a single, general mechanism that is data-driven and configurable per instance.

---

## Problem

Several panels depend on “which items are in the list” or “which are read-only vs editable”:

- **Asterisk Files (sarkedit):** Hardcoded list of filenames that are read-only; all other files in `/etc/asterisk` are editable.
- **Log files:** We may want to define which log files are visible (e.g. inclusive: “only these” or exclusive: “all under this dir except these”).
- **Other file-based or list-based UIs** may need similar rules (inclusive vs exclusive, read-only vs editable).

Hardcoded lists in code are hard to change per instance and don’t scale across use cases.

---

## Proposed approach: general policy store

A **single, general mechanism** (e.g. one or more tables in the instance DB) that can drive multiple “scopes”:

- **Scope:** Identifies the context (e.g. `asterisk_files`, `log_files`, `sip_pcap`). Each scope has its own policy rows.
- **Item:** The thing being controlled (e.g. filename, path, or identifier).
- **Mode per scope:** Either **inclusive** or **exclusive**:
  - **Inclusive:** “Only these items are allowed / visible.” Items not in the list are disallowed or hidden.
  - **Exclusive:** “Everything is allowed / visible except these.” Items in the list are disallowed or read-only (semantics can be scope-specific).
- **Optional attributes:** e.g. `readonly` (YES/NO) for Asterisk files, or a simple allow/deny flag.

So for one scope we might use inclusive (e.g. “only these log files”), for another exclusive (e.g. “all Asterisk files except these read-only ones”).

---

## Design sketch (for when we build it)

- **Table(s):** e.g. `list_policy` with columns such as: `scope` (e.g. `asterisk_files`, `log_files`), `item` (filename or key), `readonly` or `allowed`, and optionally a scope-level config row that says “this scope is inclusive” vs “exclusive”.
- **Semantics:** Defined per scope. Example:
  - `asterisk_files`, **exclusive:** rows = read-only filenames; not in table = editable.
  - `log_files`, **inclusive:** rows = only these paths/names visible; not in table = hidden.
- **API:** Endpoints (or params) accept scope; API consults the policy store and returns filtered list + per-item flags. No hardcoded lists in code.
- **Seed/migration:** Default rows per scope so behaviour matches current/legacy when the feature is first deployed.

---

## Use cases to support (when implemented)

| Scope            | Example use                          | Inclusive / Exclusive | Extra semantics        |
|------------------|--------------------------------------|------------------------|------------------------|
| Asterisk files   | Which files in `/etc/asterisk` are read-only | Exclusive (list = read-only) | Edit vs view-only      |
| Log files        | Which log files are visible in Logs panel    | TBD (inclusive or exclusive) | View / download        |
| SIP PCAP         | Which files in siplog are listable           | TBD                    | List / download        |

---

## Out of scope for now

- No schema changes or API implementation in the current codebase.
- Asterisk Files and Logs panels can continue to use hardcoded or simple logic until this project is done.
- This doc is the place to capture the idea and refine the design when we start the project.

---

## References

- Legacy SARK read-only list: `sarkedit/view.php` (array `$readOnlyFiles`).
- Instance DB: `pbx3/pbx3-1/opt/pbx3/db/db_sql/sqlite_create_instance.sql` (where any future policy table would live).
