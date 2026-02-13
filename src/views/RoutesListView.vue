<script setup>
import { ref, computed, onMounted } from 'vue'
import { getApiClient } from '@/api/client'
import { useToastStore } from '@/stores/toast'
import { normalizeList } from '@/utils/listResponse'
import DeleteConfirmModal from '@/components/DeleteConfirmModal.vue'

const toast = useToastStore()
const routes = ref([])
const tenants = ref([])
const loading = ref(true)
const error = ref('')
const deleteError = ref('')
const deletingPkey = ref(null)
const confirmDeletePkey = ref(null)
const filterText = ref('')
const sortKey = ref('pkey')
const sortOrder = ref('asc') // 'asc' | 'desc'

/** Map cluster id, shortuid, or pkey → tenant pkey for display (always show pkey, not shortuid). */
const clusterToTenantPkey = computed(() => {
  const map = new Map()
  for (const t of tenants.value) {
    if (t.id != null) map.set(String(t.id), t.pkey ?? t.id)
    if (t.shortuid != null) map.set(String(t.shortuid), t.pkey ?? t.shortuid)
    if (t.pkey != null) map.set(String(t.pkey), t.pkey)
  }
  return map
})

/** Resolve route cluster to tenant pkey for display. Prefer API-provided tenant_pkey when present. */
function tenantPkeyDisplay(route) {
  if (route.tenant_pkey != null && route.tenant_pkey !== '') return String(route.tenant_pkey)
  const clusterValue = route.cluster
  if (clusterValue == null || clusterValue === '') return '—'
  const s = String(clusterValue)
  return clusterToTenantPkey.value.get(s) ?? s
}

/** Local UID (shortuid) for display */
function localUidDisplay(r) {
  const v = r.shortuid
  return v == null || v === '' ? '—' : String(v)
}

const filteredRoutes = computed(() => {
  const list = routes.value
  const q = (filterText.value || '').trim().toLowerCase()
  if (!q) return list
  const map = clusterToTenantPkey.value
  return list.filter((r) => {
    const pkey = (r.pkey ?? '').toString().toLowerCase()
    const shortuid = (r.shortuid ?? '').toString().toLowerCase()
    const tenantPkey = (r.tenant_pkey ?? map.get(String(r.cluster)) ?? r.cluster ?? '').toString().toLowerCase()
    const desc = (r.desc ?? r.description ?? '').toString().toLowerCase()
    const dialplan = (r.dialplan ?? '').toString().toLowerCase()
    const path1 = (r.path1 ?? '').toString().toLowerCase()
    const active = (r.active ?? '').toString().toLowerCase()
    return pkey.includes(q) || shortuid.includes(q) || tenantPkey.includes(q) || desc.includes(q) || dialplan.includes(q) || path1.includes(q) || active.includes(q)
  })
})

function sortValue(r, key) {
  if (key === 'cluster') return tenantPkeyDisplay(r)
  const v = r[key]
  return v == null ? '' : String(v)
}

const sortedRoutes = computed(() => {
  const list = [...filteredRoutes.value]
  const key = sortKey.value
  const order = sortOrder.value
  list.sort((a, b) => {
    let va = sortValue(a, key).toLowerCase()
    let vb = sortValue(b, key).toLowerCase()
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

async function loadRoutes() {
  loading.value = true
  error.value = ''
  try {
    const [routeResponse, tenantResponse] = await Promise.all([
      getApiClient().get('routes'),
      getApiClient().get('tenants')
    ])
    routes.value = normalizeList(routeResponse, 'routes')
    tenants.value = normalizeList(tenantResponse, 'tenants')
  } catch (err) {
    error.value = err.data?.message || err.message || 'Failed to load routes'
  } finally {
    loading.value = false
  }
}

function askConfirmDelete(shortuid) {
  confirmDeletePkey.value = shortuid
  deleteError.value = ''
}

function cancelConfirmDelete() {
  confirmDeletePkey.value = null
}

async function confirmAndDeleteRoute(shortuid) {
  if (confirmDeletePkey.value !== shortuid) return
  deleteError.value = ''
  deletingPkey.value = shortuid
  try {
    await getApiClient().delete(`routes/${encodeURIComponent(shortuid)}`)
    await loadRoutes()
    toast.show(`Route deleted`)
  } catch (err) {
    deleteError.value = err.data?.message || err.message || 'Failed to delete route'
  } finally {
    confirmDeletePkey.value = null
    deletingPkey.value = null
  }
}

onMounted(loadRoutes)
</script>

<template>
  <div class="list-view">
    <header class="list-header">
      <h1>Routes (Outbound)</h1>
      <p class="toolbar">
        <router-link :to="{ name: 'route-create' }" class="add-btn">Create</router-link>
        <input
          v-model="filterText"
          type="search"
          class="filter-input"
          placeholder="Filter by name, Local UID, tenant, description, dialplan, path 1, or active"
          aria-label="Filter routes"
        />
      </p>
    </header>

    <section v-if="loading || error || deleteError || routes.length === 0" class="list-states">
      <p v-if="loading" class="loading">Loading routes from API…</p>
      <p v-else-if="error" class="error">{{ error }}</p>
      <p v-if="deleteError" class="error">{{ deleteError }}</p>
      <div v-else-if="routes.length === 0" class="empty">No routes. (API returned an empty list.)</div>
    </section>

    <section v-else class="list-body">
      <p v-if="filterText && filteredRoutes.length === 0" class="empty">No routes match the filter.</p>
      <table v-else class="table">
        <thead>
          <tr>
            <th class="th-sortable" title="Click to sort" :class="sortClass('pkey')" @click="setSort('pkey')">
              name
            </th>
            <th class="th-sortable" title="Click to sort" :class="sortClass('shortuid')" @click="setSort('shortuid')">
              Local UID
            </th>
            <th class="th-sortable" title="Click to sort" :class="sortClass('cluster')" @click="setSort('cluster')">
              Tenant
            </th>
            <th class="th-sortable" title="Click to sort" :class="sortClass('desc')" @click="setSort('desc')">
              desc
            </th>
            <th class="th-sortable" title="Click to sort" :class="sortClass('dialplan')" @click="setSort('dialplan')">
              Dialplan
            </th>
            <th class="th-sortable" title="Click to sort" :class="sortClass('path1')" @click="setSort('path1')">
              Path 1
            </th>
            <th class="th-sortable" title="Click to sort" :class="sortClass('active')" @click="setSort('active')">
              Active
            </th>
            <th class="th-actions" title="Edit"><span class="action-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg></span></th>
            <th class="th-actions" title="Delete"><span class="action-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg></span></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in sortedRoutes" :key="r.pkey">
            <td>{{ r.pkey }}</td>
            <td class="cell-immutable" title="Immutable">{{ localUidDisplay(r) }}</td>
            <td>{{ tenantPkeyDisplay(r) }}</td>
            <td>{{ r.desc ?? r.description ?? '—' }}</td>
            <td>{{ r.dialplan ?? '—' }}</td>
            <td>{{ r.path1 ?? '—' }}</td>
            <td>{{ r.active ?? '—' }}</td>
            <td>
              <router-link v-if="r.shortuid" :to="{ name: 'route-detail', params: { shortuid: r.shortuid } }" class="cell-link cell-link-icon" title="Edit" aria-label="Edit">
                <span class="action-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg></span>
              </router-link>
              <span v-else class="cell-link cell-link-icon" title="No shortuid - cannot edit" style="opacity: 0.5;">—</span>
            </td>
            <td>
              <button
                v-if="r.shortuid"
                type="button"
                class="cell-link cell-link-delete cell-link-icon"
                :title="deletingPkey === r.shortuid ? 'Deleting…' : 'Delete'"
                :aria-label="deletingPkey === r.shortuid ? 'Deleting…' : 'Delete'"
                :disabled="deletingPkey === r.shortuid"
                @click="askConfirmDelete(r.shortuid)"
              >
                <span v-if="deletingPkey === r.shortuid" class="action-icon action-icon-spin" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21h5v-5"/></svg></span>
                <span v-else class="action-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg></span>
              </button>
              <span v-else class="cell-link cell-link-icon" title="No shortuid - cannot delete" style="opacity: 0.5;">—</span>
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <DeleteConfirmModal
      :show="!!confirmDeletePkey"
      title="Delete route?"
      :loading="deletingPkey === confirmDeletePkey"
      @confirm="confirmAndDeleteRoute(confirmDeletePkey)"
      @cancel="cancelConfirmDelete"
    >
      <template #body>
        <p>Route <strong>{{ confirmDeletePkey }}</strong> will be permanently deleted. This cannot be undone.</p>
      </template>
    </DeleteConfirmModal>
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
.list-states {
  margin: 0;
}
.list-body {
  margin: 0;
}
.loading,
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
  color: #64748b;
  background: #f8fafc;
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
  justify-content: space-between;
  flex-wrap: wrap;
  align-items: center;
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
