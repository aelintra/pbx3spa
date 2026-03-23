# Sticky list UI (filter and sort)

**Status:** **Done** — sticky filter and sticky sort rolled out to all list panels that use them.

## Sticky filter

- **Composable:** `useStickyFilter(listId)` in `src/composables/useStickyFilter.js`.
- **Behaviour:** Returns a `filterText` ref initialised from `sessionStorage` (key `pbx3spa-list-filter-{listId}`). Persists on change. **Expiry:** stored value expires after **5 minutes** of not visiting the list; each time we enter the list with a non-expired filter we refresh the timestamp, so the filter persists as long as you're active on the panel (list → edit → back repeatedly) and clears only after 5+ minutes away.
- **Usage:** `const { filterText } = useStickyFilter('devices')` — use a stable `listId` per panel.
- **Rollout:** In use on all list panels with a filter: Tenants, Extensions, Trunks, Queues, Agents, Routes, Custom Apps, IVRs, Inbound routes, Devices, Asterisk Files (Users list has no filter). Each uses its own listId.

## Sticky sort

- **Composable:** `useStickySort(listId, options)` in the same file (`defaultKey`, optional `defaultOrder: 'asc' | 'desc'`).
- **Storage key:** `pbx3spa-list-sort-{listId}`; **same 5‑minute expiry and timestamp refresh** as the filter composable.
- **Rollout:** All sortable resource lists (Tenants, Extensions, Trunks, Queues, Agents, Routes, IVRs, Inbound routes, Custom Apps, Devices, Class of Service, Conferences, Day/Holiday timers, Greetings, Help messages) plus **Backup/restore** (separate ids: `backup-backups`, `backup-snapshots`).
