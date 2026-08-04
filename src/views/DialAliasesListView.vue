<script setup>
import { ref, computed, onMounted } from 'vue'
import { getApiClient } from '@/api/client'
import { useToastStore } from '@/stores/toast'
import { normalizeList } from '@/utils/listResponse'
import { loadTenantOptions } from '@/utils/loadTenantOptions'
import { useStickyFilter, useStickySort } from '@/composables/useStickyFilter'
import { firstErrorMessage } from '@/utils/formErrors'
import { useFleetPosture } from '@/composables/useFleetPosture'
import ListActiveChip from '@/components/ListActiveChip.vue'
import DeleteConfirmModal from '@/components/DeleteConfirmModal.vue'
import ListLoadingState from '@/components/ListLoadingState.vue'

const { filterText } = useStickyFilter('dialaliases')
const toast = useToastStore()
const { loadFleetPosture, isFleetNode } = useFleetPosture()
const rows = ref([])
const tenants = ref([])
const loading = ref(true)
const error = ref('')
const deleteError = ref('')
const deletingShortuid = ref(null)
const confirmDeleteShortuid = ref(null)
const fleetReady = ref(false)
const { sortKey, sortOrder } = useStickySort('dialaliases', { defaultKey: 'pkey' })

const clusterToTenantPkey = computed(() => {
  const map = new Map()
  for (const t of tenants.value) {
    if (t.id != null) map.set(String(t.id), t.pkey ?? t.id)
    if (t.shortuid != null) map.set(String(t.shortuid), t.pkey ?? t.shortuid)
    if (t.pkey != null) map.set(String(t.pkey), t.pkey)
  }
  return map
})

function tenantPkeyDisplay(row) {
  if (row.tenant_pkey != null && row.tenant_pkey !== '') return String(row.tenant_pkey)
  const v = row.cluster
  if (v == null || v === '') return '—'
  return clusterToTenantPkey.value.get(String(v)) ?? String(v)
}

function targetPkeyDisplay(row) {
  if (row.target_tenant_pkey != null && row.target_tenant_pkey !== '') {
    return String(row.target_tenant_pkey)
  }
  const v = row.target_cluster
  if (v == null || v === '') return '—'
  return clusterToTenantPkey.value.get(String(v)) ?? String(v)
}

function uidDisplay(row) {
  const v = row.shortuid
  return v == null || v === '' ? '—' : String(v)
}

function str(v) {
  return v == null ? '' : String(v)
}

const filteredRows = computed(() => {
  const list = rows.value
  const q = (filterText.value || '').trim().toLowerCase()
  if (!q) return list
  return list.filter((r) => {
    return (
      str(r.pkey).toLowerCase().includes(q) ||
      str(r.shortuid).toLowerCase().includes(q) ||
      str(r.description).toLowerCase().includes(q) ||
      str(r.active).toLowerCase().includes(q) ||
      tenantPkeyDisplay(r).toLowerCase().includes(q) ||
      targetPkeyDisplay(r).toLowerCase().includes(q)
    )
  })
})

function sortValue(r, key) {
  if (key === 'cluster') return tenantPkeyDisplay(r)
  if (key === 'target_cluster') return targetPkeyDisplay(r)
  const v = r[key]
  return v == null ? '' : String(v)
}

const sortedRows = computed(() => {
  const list = [...filteredRows.value]
  const key = sortKey.value
  const order = sortOrder.value
  list.sort((a, b) => {
    let va = sortValue(a, key)
    let vb = sortValue(b, key)
    if (typeof va === 'string') va = va.toLowerCase()
    if (typeof vb === 'string') vb = vb.toLowerCase()
    let cmp = 0
    if (va < vb) cmp = -1
    else if (va > vb) cmp = 1
    return order === 'asc' ? cmp : -cmp
  })
  return list
})

function setSort(key) {
  if (sortKey.value === key) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortOrder.value = 'asc'
  }
}

function sortClass(key) {
  if (sortKey.value !== key) return ''
  return sortOrder.value === 'asc' ? 'sort-asc' : 'sort-desc'
}

async function loadRows() {
  loading.value = true
  error.value = ''
  deleteError.value = ''
  try {
    await loadFleetPosture()
    fleetReady.value = true
    if (!isFleetNode()) {
      rows.value = []
      return
    }
    const [listRes, tenantList] = await Promise.all([
      getApiClient().get('dialaliases'),
      loadTenantOptions()
    ])
    tenants.value = tenantList
    rows.value = normalizeList(listRes, 'dialaliases') || normalizeList(listRes) || []
  } catch (err) {
    error.value = firstErrorMessage(err, 'Failed to load dial prefixes')
    rows.value = []
  } finally {
    loading.value = false
  }
}

function askConfirmDelete(shortuid) {
  confirmDeleteShortuid.value = shortuid
}

async function confirmDelete() {
  const shortuid = confirmDeleteShortuid.value
  if (!shortuid) return
  deletingShortuid.value = shortuid
  deleteError.value = ''
  try {
    await getApiClient().delete(`dialaliases/${encodeURIComponent(shortuid)}`)
    toast.show('Dial prefix deleted')
    confirmDeleteShortuid.value = null
    await loadRows()
  } catch (err) {
    deleteError.value = firstErrorMessage(err, 'Failed to delete dial prefix')
  } finally {
    deletingShortuid.value = null
  }
}

onMounted(loadRows)
</script>

<template>
  <div class="list-view">
    <header class="list-header">
      <h1>Dial prefixes</h1>
      <p class="list-legend">
        Per-tenant short dial: prefix digits + remote extension reach another tenant via the fleet SBC
        path. Dial only — no feature codes after the prefix. Reverse needs its own prefix on the other
        tenant.
      </p>
      <p v-if="fleetReady && isFleetNode()" class="toolbar">
        <router-link :to="{ name: 'dialalias-create' }" class="add-btn">Create</router-link>
        <input
          v-model="filterText"
          type="search"
          class="filter-input"
          placeholder="Filter by prefix, tenant, target, description"
          aria-label="Filter dial prefixes"
        />
      </p>
    </header>

    <section v-if="loading || error || deleteError || !fleetReady" class="list-states">
      <ListLoadingState v-if="loading" message="Loading dial prefixes…" />
      <p v-else-if="error" class="error">{{ error }}</p>
      <p v-if="deleteError" class="error">{{ deleteError }}</p>
    </section>

    <section v-else-if="!isFleetNode()" class="list-states">
      <p class="empty">
        Dial prefixes are fleet-only in v1 (requires SBC path). This node is not in fleet mode.
      </p>
    </section>

    <section v-else-if="rows.length === 0" class="list-states">
      <div class="empty">No dial prefixes yet. Create one to map a short code to another tenant.</div>
    </section>

    <section v-else class="list-body">
      <p v-if="filterText && filteredRows.length === 0" class="empty">No dial prefixes match the filter.</p>
      <table v-else class="table">
        <thead>
          <tr>
            <th
              class="th-sortable"
              title="Click to sort"
              :class="sortClass('pkey')"
              @click="setSort('pkey')"
            >
              Prefix
            </th>
            <th
              class="th-sortable"
              title="Click to sort"
              :class="sortClass('cluster')"
              @click="setSort('cluster')"
            >
              Calling tenant
            </th>
            <th
              class="th-sortable"
              title="Click to sort"
              :class="sortClass('target_cluster')"
              @click="setSort('target_cluster')"
            >
              Target tenant
            </th>
            <th
              class="th-sortable"
              title="Click to sort"
              :class="sortClass('active')"
              @click="setSort('active')"
            >
              Active?
            </th>
            <th
              class="th-sortable"
              title="Click to sort"
              :class="sortClass('description')"
              @click="setSort('description')"
            >
              Description
            </th>
            <th
              class="th-sortable"
              title="Click to sort"
              :class="sortClass('shortuid')"
              @click="setSort('shortuid')"
            >
              UID
            </th>
            <th class="th-actions" title="Edit">
              <span class="action-icon" aria-hidden="true">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="1em"
                  height="1em"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                </svg>
              </span>
            </th>
            <th class="th-actions" title="Delete">
              <span class="action-icon" aria-hidden="true">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="1em"
                  height="1em"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="M3 6h18" />
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                  <line x1="10" x2="10" y1="11" y2="17" />
                  <line x1="14" x2="14" y1="11" y2="17" />
                </svg>
              </span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in sortedRows" :key="r.shortuid || r.id || r.pkey">
            <td class="cell-immutable" title="Prefix digits">{{ r.pkey }}</td>
            <td>{{ tenantPkeyDisplay(r) }}</td>
            <td>{{ targetPkeyDisplay(r) }}</td>
            <ListActiveChip :active="r.active" />
            <td>{{ r.description || '—' }}</td>
            <td class="cell-immutable">{{ uidDisplay(r) }}</td>
            <td>
              <router-link
                v-if="r.shortuid"
                :to="{ name: 'dialalias-detail', params: { shortuid: r.shortuid } }"
                class="cell-link cell-link-icon"
                title="Edit"
                aria-label="Edit"
              >
                <span class="action-icon" aria-hidden="true">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="1em"
                    height="1em"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                  </svg>
                </span>
              </router-link>
              <span
                v-else
                class="cell-link cell-link-icon"
                title="No shortuid - cannot edit"
                style="opacity: 0.5"
                >—</span
              >
            </td>
            <td>
              <button
                v-if="r.shortuid"
                type="button"
                class="cell-link cell-link-delete cell-link-icon"
                :title="deletingShortuid === r.shortuid ? 'Deleting…' : 'Delete'"
                :aria-label="deletingShortuid === r.shortuid ? 'Deleting…' : 'Delete'"
                :disabled="deletingShortuid === r.shortuid"
                @click="askConfirmDelete(r.shortuid)"
              >
                <span
                  v-if="deletingShortuid === r.shortuid"
                  class="action-icon action-icon-spin"
                  aria-hidden="true"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="1em"
                    height="1em"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                    <path d="M3 3v5h5" />
                    <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                    <path d="M16 21h5v-5" />
                  </svg>
                </span>
                <span v-else class="action-icon" aria-hidden="true">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="1em"
                    height="1em"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path d="M3 6h18" />
                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                    <line x1="10" x2="10" y1="11" y2="17" />
                    <line x1="14" x2="14" y1="11" y2="17" />
                  </svg>
                </span>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <DeleteConfirmModal
      :show="!!confirmDeleteShortuid"
      title="Delete dial prefix?"
      body-text="Remove this dial prefix? Dial plan will not use it after the next GenAst commit (slice C)."
      :loading="!!deletingShortuid"
      @cancel="confirmDeleteShortuid = null"
      @confirm="confirmDelete"
    />
  </div>
</template>

<style scoped>
.list-view {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.list-header {
  margin: 0;
}
.list-legend {
  margin: 0.25rem 0 0;
  max-width: 48rem;
  color: var(--color-muted, #64748b);
  font-size: 0.95rem;
  line-height: 1.4;
}
.list-states {
  margin: 0;
}
.list-body {
  margin: 0;
}
.error,
.empty {
  margin-top: 0;
}
.error {
  color: #dc2626;
}
.table {
  margin-top: 0;
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9375rem;
}
.table th,
.table td {
  padding: 0.5rem 0.75rem;
  text-align: left;
  border-bottom: 1px solid #e2e8f0;
}
.table th {
  font-weight: 600;
  color: #475569;
  background: #f8fafc;
}
.cell-immutable {
  color: var(--pbx-text-muted);
  background: transparent;
}
.th-sortable {
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
}
.th-sortable::before {
  content: '\21C5';
  font-size: 0.7em;
  color: #94a3b8;
  margin-left: 0.2em;
  font-weight: normal;
}
.th-sortable.sort-asc::before,
.th-sortable.sort-desc::before {
  content: none;
}
.th-sortable:hover {
  background: #f1f5f9;
}
.th-sortable.sort-asc::after {
  content: ' \2191';
  font-size: 0.75em;
  color: #64748b;
}
.th-sortable.sort-desc::after {
  content: ' \2193';
  font-size: 0.75em;
  color: #64748b;
}
.th-actions {
  cursor: default;
  white-space: nowrap;
}
.th-actions .action-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #64748b;
}
.action-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.cell-link-icon {
  padding: 0.25rem;
}
.cell-link-icon .action-icon {
  color: inherit;
}
.action-icon-spin {
  animation: action-spin 0.8s linear infinite;
}
@keyframes action-spin {
  to {
    transform: rotate(360deg);
  }
}
.table tbody tr:hover {
  background: #f8fafc;
}
.cell-link {
  color: #2563eb;
  text-decoration: none;
}
.cell-link:hover {
  text-decoration: underline;
}
.cell-link-delete {
  color: #dc2626;
  background: none;
  border: none;
  padding: 0;
  font: inherit;
  cursor: pointer;
}
.cell-link-delete:hover:not(:disabled) {
  text-decoration: underline;
}
.cell-link-delete:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
.toolbar {
  margin: 0.75rem 0 0 0;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}
.add-btn {
  display: inline-block;
  padding: 0.5rem 1rem;
  font-size: 0.9375rem;
  font-weight: 500;
  color: #fff;
  background: #2563eb;
  border-radius: 0.375rem;
  text-decoration: none;
}
.add-btn:hover {
  background: #1d4ed8;
}
.filter-input {
  padding: 0.5rem 0.75rem;
  font-size: 0.9375rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.375rem;
  min-width: 16rem;
}
.filter-input:focus {
  outline: none;
  border-color: #2563eb;
}
</style>
