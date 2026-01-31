<script setup>
import { ref, computed, onMounted } from 'vue'
import { getApiClient } from '@/api/client'
import { useToastStore } from '@/stores/toast'

const toast = useToastStore()
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
    if (Array.isArray(response.tenants)) return response.tenants
    if (Object.keys(response).every((k) => /^\d+$/.test(k))) return Object.values(response)
  }
  return []
}

// --- Display helpers ---
/** Local UID (shortuid) for display */
function localUidDisplay(t) {
  const v = t.shortuid
  return v == null || v === '' ? '—' : String(v)
}

/** Timer status: masteroclo or effective default AUTO */
function timerStatusDisplay(t) {
  return (t.masteroclo != null && t.masteroclo !== '') ? t.masteroclo : 'AUTO'
}

// --- Filter ---
const filteredTenants = computed(() => {
  const list = tenants.value
  const q = (filterText.value || '').trim().toLowerCase()
  if (!q) return list
  return list.filter((t) => {
    const pkey = (t.pkey ?? '').toString().toLowerCase()
    const shortuid = (t.shortuid ?? '').toString().toLowerCase()
    const desc = (t.description ?? '').toString().toLowerCase()
    const clid = (t.clusterclid ?? '').toString().toLowerCase()
    const abstime = (t.abstimeout ?? '').toString().toLowerCase()
    const chanmax = (t.chanmax ?? '').toString().toLowerCase()
    const timer = (t.masteroclo ?? '').toString().toLowerCase()
    return pkey.includes(q) || shortuid.includes(q) || desc.includes(q) || clid.includes(q) || abstime.includes(q) || chanmax.includes(q) || timer.includes(q)
  })
})

// --- Sort ---
function sortValue(t, key) {
  if (key === 'masteroclo') return timerStatusDisplay(t)
  const v = t[key]
  return v == null ? '' : String(v)
}

const sortedTenants = computed(() => {
  const list = [...filteredTenants.value]
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
async function loadTenants() {
  loading.value = true
  error.value = ''
  try {
    const response = await getApiClient().get('tenants')
    tenants.value = normalizeList(response)
  } catch (err) {
    error.value = err.data?.message || err.message || 'Failed to load tenants'
  } finally {
    loading.value = false
  }
}

// --- Delete (confirmation modal) ---
function askConfirmDelete(pkey) {
  if (pkey === 'default') return
  confirmDeletePkey.value = pkey
  deleteError.value = ''
}

function cancelConfirmDelete() {
  confirmDeletePkey.value = null
}

async function confirmAndDeleteTenant(pkey) {
  if (confirmDeletePkey.value !== pkey || pkey === 'default') return
  deleteError.value = ''
  deletingPkey.value = pkey
  try {
    await getApiClient().delete(`tenants/${encodeURIComponent(pkey)}`)
    await loadTenants()
    toast.show(`Tenant ${pkey} deleted`)
  } catch (err) {
    deleteError.value = err.data?.message || err.message || 'Failed to delete tenant'
  } finally {
    confirmDeletePkey.value = null
    deletingPkey.value = null
  }
}

onMounted(loadTenants)
</script>

<template>
  <div class="list-view">
    <header class="list-header">
      <h1>Tenants</h1>
      <p class="toolbar">
        <router-link :to="{ name: 'tenant-create' }" class="add-btn">Add tenant</router-link>
        <input
          v-model="filterText"
          type="search"
          class="filter-input"
          placeholder="Filter by name, Local UID, description, CLID, Abstime, ChanMax, or timer"
          aria-label="Filter tenants"
        />
      </p>
    </header>

    <section v-if="loading || error || deleteError || tenants.length === 0" class="list-states">
      <p v-if="loading" class="loading">Loading tenants from API…</p>
      <p v-else-if="error" class="error">{{ error }}</p>
      <p v-if="deleteError" class="error">{{ deleteError }}</p>
      <div v-else-if="tenants.length === 0" class="empty">No tenants. (API returned an empty list.)</div>
    </section>

    <section v-else class="list-body">
      <p v-if="filterText && filteredTenants.length === 0" class="empty">No tenants match the filter.</p>
      <table v-else class="table">
        <thead>
          <tr>
            <th class="th-sortable" title="Click to sort" :class="sortClass('pkey')" @click="setSort('pkey')">
              name
            </th>
            <th class="th-sortable" title="Click to sort" :class="sortClass('shortuid')" @click="setSort('shortuid')">
              Local UID
            </th>
            <th class="th-sortable" title="Click to sort" :class="sortClass('description')" @click="setSort('description')">
              description
            </th>
            <th class="th-sortable" title="Click to sort" :class="sortClass('clusterclid')" @click="setSort('clusterclid')">
              CLID
            </th>
            <th class="th-sortable" title="Click to sort" :class="sortClass('abstimeout')" @click="setSort('abstimeout')">
              Abstime
            </th>
            <th class="th-sortable" title="Click to sort" :class="sortClass('chanmax')" @click="setSort('chanmax')">
              ChanMax
            </th>
            <th class="th-sortable" title="Click to sort" :class="sortClass('masteroclo')" @click="setSort('masteroclo')">
              Timer status
            </th>
            <th class="th-actions" title="Edit"><span class="action-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg></span></th>
            <th class="th-actions" title="Delete"><span class="action-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg></span></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="t in sortedTenants" :key="t.pkey">
            <td>
              <router-link :to="{ name: 'tenant-detail', params: { pkey: t.pkey } }" class="cell-link">{{ t.pkey }}</router-link>
            </td>
            <td>{{ localUidDisplay(t) }}</td>
            <td>{{ t.description ?? '—' }}</td>
            <td>{{ t.clusterclid != null && t.clusterclid !== '' ? t.clusterclid : '—' }}</td>
            <td>{{ t.abstimeout != null && t.abstimeout !== '' ? t.abstimeout : '—' }}</td>
            <td>{{ t.chanmax != null && t.chanmax !== '' ? t.chanmax : '—' }}</td>
            <td>{{ timerStatusDisplay(t) }}</td>
            <td>
              <router-link :to="{ name: 'tenant-detail', params: { pkey: t.pkey }, query: { edit: '1' } }" class="cell-link cell-link-icon" title="Edit" aria-label="Edit">
                <span class="action-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg></span>
              </router-link>
            </td>
            <td>
              <button
                v-if="t.pkey !== 'default'"
                type="button"
                class="cell-link cell-link-delete cell-link-icon"
                :title="deletingPkey === t.pkey ? 'Deleting…' : 'Delete'"
                :aria-label="deletingPkey === t.pkey ? 'Deleting…' : 'Delete'"
                :disabled="deletingPkey === t.pkey"
                @click="askConfirmDelete(t.pkey)"
              >
                <span v-if="deletingPkey === t.pkey" class="action-icon action-icon-spin" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21h5v-5"/></svg></span>
                <span v-else class="action-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg></span>
              </button>
              <span v-else class="cell-no-action">—</span>
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <Teleport to="body">
      <div v-if="confirmDeletePkey" class="modal-backdrop" @click.self="cancelConfirmDelete">
        <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-delete-title">
          <h2 id="modal-delete-title" class="modal-title">Delete tenant?</h2>
          <p class="modal-body">
            Tenant <strong>{{ confirmDeletePkey }}</strong> will be permanently deleted. This cannot be undone.
          </p>
          <div class="modal-actions">
            <button type="button" class="modal-btn modal-btn-cancel" @click="cancelConfirmDelete">Cancel</button>
            <button type="button" class="modal-btn modal-btn-delete" :disabled="deletingPkey === confirmDeletePkey" @click="confirmAndDeleteTenant(confirmDeletePkey)">
              {{ deletingPkey === confirmDeletePkey ? 'Deleting…' : 'Delete' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
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
.th-sortable {
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
}
/* Neutral sort icon so users see at a glance that columns are sortable */
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
.cell-no-action {
  color: #94a3b8;
  font-size: 0.875rem;
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

/* Delete confirmation modal */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}
.modal {
  background: white;
  border-radius: 0.5rem;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  padding: 1.5rem;
  max-width: 24rem;
  width: 100%;
}
.modal-title {
  margin: 0 0 0.75rem 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: #0f172a;
}
.modal-body {
  margin: 0 0 1.25rem 0;
  font-size: 0.9375rem;
  color: #475569;
  line-height: 1.5;
}
.modal-body strong {
  color: #0f172a;
}
.modal-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
}
.modal-btn {
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  font-weight: 500;
  border-radius: 0.375rem;
  cursor: pointer;
  border: none;
}
.modal-btn-cancel {
  background: #f1f5f9;
  color: #475569;
}
.modal-btn-cancel:hover {
  background: #e2e8f0;
}
.modal-btn-delete {
  background: #dc2626;
  color: white;
}
.modal-btn-delete:hover:not(:disabled) {
  background: #b91c1c;
}
.modal-btn-delete:disabled {
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
