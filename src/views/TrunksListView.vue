<script setup>
import { ref, computed, onMounted } from 'vue'
import { getApiClient } from '@/api/client'
import { useToastStore } from '@/stores/toast'
import DeleteConfirmModal from '@/components/DeleteConfirmModal.vue'

const toast = useToastStore()
const trunks = ref([])
const tenants = ref([])
const loading = ref(true)
const error = ref('')
const deleteError = ref('')
const deletingPkey = ref(null)
const confirmDeletePkey = ref(null)
const filterText = ref('')
const sortKey = ref('pkey')
const sortOrder = ref('asc') // 'asc' | 'desc'

// --- Normalize list response (array or wrapped) ---
function normalizeList(response) {
  if (Array.isArray(response)) return response
  if (response && typeof response === 'object') {
    if (Array.isArray(response.data)) return response.data
    if (Array.isArray(response.trunks)) return response.trunks
    if (Array.isArray(response.tenants)) return response.tenants
    if (Object.keys(response).every((k) => /^\d+$/.test(k))) return Object.values(response)
  }
  return []
}

// --- Map cluster id, shortuid, or pkey → tenant pkey for display (always show pkey, not shortuid) ---
const clusterToTenantPkey = computed(() => {
  const map = new Map()
  for (const t of tenants.value) {
    if (t.id != null) map.set(String(t.id), t.pkey ?? t.id)
    if (t.shortuid != null) map.set(String(t.shortuid), t.pkey ?? t.shortuid)
    if (t.pkey != null) map.set(String(t.pkey), t.pkey)
  }
  return map
})

/** Resolve trunk cluster to tenant pkey for display. Prefer API-provided tenant_pkey when present. */
function tenantPkeyDisplay(trunk) {
  if (trunk.tenant_pkey != null && trunk.tenant_pkey !== '') return String(trunk.tenant_pkey)
  const clusterValue = trunk.cluster
  if (clusterValue == null || clusterValue === '') return '—'
  const s = String(clusterValue)
  return clusterToTenantPkey.value.get(s) ?? s
}

/** Local UID (shortuid) for display */
function localUidDisplay(tr) {
  const v = tr.shortuid
  return v == null || v === '' ? '—' : String(v)
}

// --- Filter ---
const filteredTrunks = computed(() => {
  const list = trunks.value
  const q = (filterText.value || '').trim().toLowerCase()
  if (!q) return list
  const map = clusterToTenantPkey.value
  return list.filter((tr) => {
    const pkey = (tr.pkey ?? '').toString().toLowerCase()
    const shortuid = (tr.shortuid ?? '').toString().toLowerCase()
    const tenantPkey = (tr.tenant_pkey ?? map.get(String(tr.cluster)) ?? tr.cluster ?? '').toString().toLowerCase()
    const desc = (tr.description ?? '').toString().toLowerCase()
    const host = (tr.host ?? '').toString().toLowerCase()
    const active = (tr.active ?? '').toString().toLowerCase()
    return pkey.includes(q) || shortuid.includes(q) || tenantPkey.includes(q) || desc.includes(q) || host.includes(q) || active.includes(q)
  })
})

// --- Sort ---
function sortValue(tr, key) {
  if (key === 'cluster') return tenantPkeyDisplay(tr)
  const v = tr[key]
  return v == null ? '' : String(v)
}

const sortedTrunks = computed(() => {
  const list = [...filteredTrunks.value]
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

// --- Load ---
async function loadTrunks() {
  loading.value = true
  error.value = ''
  try {
    const [trunkResponse, tenantResponse] = await Promise.all([
      getApiClient().get('trunks'),
      getApiClient().get('tenants')
    ])
    trunks.value = normalizeList(trunkResponse)
    tenants.value = normalizeList(tenantResponse)
  } catch (err) {
    error.value = err.data?.message || err.message || 'Failed to load trunks'
  } finally {
    loading.value = false
  }
}

// --- Delete (confirmation modal) ---
function askConfirmDelete(pkey) {
  confirmDeletePkey.value = pkey
  deleteError.value = ''
}

function cancelConfirmDelete() {
  confirmDeletePkey.value = null
}

async function confirmAndDeleteTrunk(pkey) {
  if (confirmDeletePkey.value !== pkey) return
  deleteError.value = ''
  deletingPkey.value = pkey
  try {
    await getApiClient().delete(`trunks/${encodeURIComponent(pkey)}`)
    await loadTrunks()
    toast.show(`Trunk ${pkey} deleted`)
  } catch (err) {
    deleteError.value = err.data?.message || err.message || 'Failed to delete trunk'
  } finally {
    confirmDeletePkey.value = null
    deletingPkey.value = null
  }
}

onMounted(loadTrunks)
</script>

<template>
  <div class="list-view">
    <header class="list-header">
      <h1>Trunks</h1>
      <p class="toolbar">
        <router-link :to="{ name: 'trunk-create' }" class="add-btn">Create</router-link>
        <input
          v-model="filterText"
          type="search"
          class="filter-input"
          placeholder="Filter by name, Local UID, tenant, description, host, or active"
          aria-label="Filter trunks"
        />
      </p>
    </header>

    <section v-if="loading || error || deleteError || trunks.length === 0" class="list-states">
      <p v-if="loading" class="loading">Loading trunks from API…</p>
      <p v-else-if="error" class="error">{{ error }}</p>
      <p v-if="deleteError" class="error">{{ deleteError }}</p>
      <div v-else-if="trunks.length === 0" class="empty">No trunks. (API returned an empty list.)</div>
    </section>

    <section v-else class="list-body">
      <p v-if="filterText && filteredTrunks.length === 0" class="empty">No trunks match the filter.</p>
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
            <th class="th-sortable" title="Click to sort" :class="sortClass('description')" @click="setSort('description')">
              description
            </th>
            <th class="th-sortable" title="Click to sort" :class="sortClass('active')" @click="setSort('active')">
              Active?
            </th>
            <th class="th-sortable" title="Click to sort" :class="sortClass('host')" @click="setSort('host')">
              host
            </th>
            <th class="th-actions" title="Edit"><span class="action-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg></span></th>
            <th class="th-actions" title="Delete"><span class="action-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg></span></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="tr in sortedTrunks" :key="tr.pkey">
            <td>
              <router-link :to="{ name: 'trunk-detail', params: { pkey: tr.pkey } }" class="cell-link">{{ tr.pkey }}</router-link>
            </td>
            <td class="cell-immutable" title="Immutable">{{ localUidDisplay(tr) }}</td>
            <td>
              <router-link
                v-if="tenantPkeyDisplay(tr) !== '—'"
                :to="{ name: 'tenant-detail', params: { pkey: tenantPkeyDisplay(tr) } }"
                class="cell-link"
              >{{ tenantPkeyDisplay(tr) }}</router-link>
              <span v-else>—</span>
            </td>
            <td>{{ tr.description ?? '—' }}</td>
            <td>{{ tr.active ?? '—' }}</td>
            <td>{{ tr.host ?? '—' }}</td>
            <td>
              <router-link :to="{ name: 'trunk-detail', params: { pkey: tr.pkey }, query: { edit: '1' } }" class="cell-link cell-link-icon" title="Edit" aria-label="Edit">
                <span class="action-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg></span>
              </router-link>
            </td>
            <td>
              <button
                type="button"
                class="cell-link cell-link-delete cell-link-icon"
                :title="deletingPkey === tr.pkey ? 'Deleting…' : 'Delete'"
                :aria-label="deletingPkey === tr.pkey ? 'Deleting…' : 'Delete'"
                :disabled="deletingPkey === tr.pkey"
                @click="askConfirmDelete(tr.pkey)"
              >
                <span v-if="deletingPkey === tr.pkey" class="action-icon action-icon-spin" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21h5v-5"/></svg></span>
                <span v-else class="action-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg></span>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <DeleteConfirmModal
      :show="!!confirmDeletePkey"
      title="Delete trunk?"
      :loading="deletingPkey === confirmDeletePkey"
      @confirm="confirmAndDeleteTrunk(confirmDeletePkey)"
      @cancel="cancelConfirmDelete"
    >
      <template #body>
        <p>Trunk <strong>{{ confirmDeletePkey }}</strong> will be permanently deleted. This cannot be undone.</p>
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
