# Sticky list UI (filter and sort)

**Status:** Sticky filter rolled out to all list panels with a filter.

## Sticky filter

- **Composable:** `useStickyFilter(listId)` in `src/composables/useStickyFilter.js`.
- **Behaviour:** Returns a `filterText` ref initialised from `sessionStorage` (key `pbx3spa-list-filter-{listId}`). Persists on change. **Expiry:** stored value expires after **5 minutes** of not visiting the list; each time we enter the list with a non-expired filter we refresh the timestamp, so the filter persists as long as you're active on the panel (list → edit → back repeatedly) and clears only after 5+ minutes away.
- **Usage:** `const { filterText } = useStickyFilter('devices')` — use a stable `listId` per panel.
- **Rollout:** In use on all list panels with a filter: Tenants, Extensions, Trunks, Queues, Agents, Routes, Custom Apps, IVRs, Inbound routes, Devices, Asterisk Files (Users list has no filter). Each uses its own listId.

## ToDo: Sticky sort

- **Idea:** Persist sort column and direction (e.g. `sortKey`, `sortOrder`) in sessionStorage the same way, so that when the user sorts a list, navigates to detail, then returns, the sort is still applied.
- **Approach:** Either a separate `useStickySort(listId)` composable returning `{ sortKey, sortOrder }` with its own storage key (e.g. `pbx3spa-list-sort-{listId}`), or extend the same composable. Decide after sticky filter is rolled out and validated.
- **Not implemented yet.**
