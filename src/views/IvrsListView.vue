<script setup>
import { ref, computed, onMounted } from 'vue'
import { getApiClient } from '@/api/client'
import { useToastStore } from '@/stores/toast'
import { normalizeList } from '@/utils/listResponse'
import DeleteConfirmModal from '@/components/DeleteConfirmModal.vue'

const toast = useToastStore()
const ivrs = ref([])
const tenants = ref([])
const loading = ref(true)
const error = ref('')
const deleteError = ref('')
const deletingPkey = ref(null)
const confirmDeletePkey = ref(null)
const filterText = ref('')
const sortKey = ref('pkey')
const sortOrder = ref('asc')

/** Map tenant shortuid -> pkey so we can show pkey in the Tenant column when IVR.cluster is shortuid. */
const tenantShortuidToPkey = computed(() => {
  const map = {}
  for (const t of tenants.value) {
    if (t.shortuid) map[String(t.shortuid)] = t.pkey
    if (t.pkey) map[String(t.pkey)] = t.pkey
  }
  return map
})

/** Local UID (shortuid) for display — same as Trunk/Tenant/InboundRoute list */
function localUidDisplay(ivr) {
  const v = ivr.shortuid
  return v == null || v === '' ? '—' : String(v)
}

/** Tenant column: show tenant pkey (resolve shortuid -> pkey when API returns shortuid in cluster). */
function tenantDisplay(ivr) {
  const c = ivr.cluster
  if (c == null || c === '') return '—'
  return tenantShortuidToPkey.value[String(c)] ?? c
}

const filteredIvrs = computed(() => {
  const list = ivrs.value
  const q = (filterText.value || '').trim().toLowerCase()
  if (!q) return list
  return list.filter((ivr) => {
    const pkey = (ivr.pkey ?? '').toString().toLowerCase()
    const shortuid = (ivr.shortuid ?? '').toString().toLowerCase()
    const cluster = (ivr.cluster ?? '').toString().toLowerCase()
    const desc = (ivr.description ?? '').toString().toLowerCase()
    return pkey.includes(q) || shortuid.includes(q) || cluster.includes(q) || desc.includes(q)
  })
})

function sortValue(ivr, key) {
  const v = ivr[key]
  return v == null ? '' : String(v)
}

const sortedIvrs = computed(() => {
  const list = [...filteredIvrs.value]
  const key = sortKey.value
  const order = sortOrder.value
  list.sort((a, b) => {
    const va = sortValue(a, key).toLowerCase()
    const vb = sortValue(b, key).toLowerCase()
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

async function loadIvrs() {
  loading.value = true
  error.value = ''
  try {
    const [tenantsRes, ivrsRes] = await Promise.all([
      getApiClient().get('tenants'),
      getApiClient().get('ivrs')
    ])
    tenants.value = normalizeList(tenantsRes, 'tenants')
    ivrs.value = normalizeList(ivrsRes, 'ivrs')
  } catch (err) {
    error.value = err.data?.message || err.message || 'Failed to load IVRs'
  } finally {
    loading.value = false
  }
}

function askConfirmDelete(pkey) {
  confirmDeletePkey.value = pkey
  deleteError.value = ''
}

function cancelConfirmDelete() {
  confirmDeletePkey.value = null
}

async function confirmAndDeleteIvr(pkey) {
  if (confirmDeletePkey.value !== pkey) return
  deleteError.value = ''
  deletingPkey.value = pkey
  try {
    await getApiClient().delete(`ivrs/${encodeURIComponent(pkey)}`)
    await loadIvrs()
    toast.show(`IVR ${pkey} deleted`)
  } catch (err) {
    deleteError.value = err.data?.message ?? err.message ?? 'Failed to delete IVR'
  } finally {
    confirmDeletePkey.value = null
    deletingPkey.value = null
  }
}

onMounted(loadIvrs)
</script>

<template>
  <div class="list-view">
    <header class="list-header">
      <h1>IVRs</h1>
      <p class="toolbar">
        <router-link :to="{ name: 'ivr-create' }" class="add-btn">Create</router-link>
        <input
          v-model="filterText"
          type="search"
          class="filter-input"
          placeholder="Filter by IVR Direct Dial, Local UID, tenant, or description"
          aria-label="Filter IVRs"
        />
      </p>
    </header>

    <section v-if="loading || error || deleteError || ivrs.length === 0" class="list-states">
      <p v-if="loading" class="loading">Loading IVRs from API…</p>
      <p v-else-if="error" class="error">{{ error }}</p>
      <p v-if="deleteError" class="error">{{ deleteError }}</p>
      <div v-else-if="ivrs.length === 0" class="empty">No IVRs. (API returned an empty list.)</div>
    </section>

    <section v-else class="list-body">
      <p v-if="filterText && filteredIvrs.length === 0" class="empty">No IVRs match the filter.</p>
      <table v-else class="table">
        <thead>
          <tr>
            <th class="th-sortable" title="Click to sort" :class="sortClass('pkey')" @click="setSort('pkey')">IVR Direct Dial</th>
            <th class="th-sortable" title="Click to sort" :class="sortClass('shortuid')" @click="setSort('shortuid')">Local UID</th>
            <th class="th-sortable" title="Click to sort" :class="sortClass('cluster')" @click="setSort('cluster')">Tenant</th>
            <th class="th-sortable" title="Click to sort" :class="sortClass('description')" @click="setSort('description')">description</th>
            <th class="th-sortable" title="Click to sort" :class="sortClass('greetnum')" @click="setSort('greetnum')">Greeting number</th>
            <th class="th-sortable" title="Click to sort" :class="sortClass('timeout')" @click="setSort('timeout')">Timeout</th>
            <th class="th-actions" title="Edit"><span class="action-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg></span></th>
            <th class="th-actions" title="Delete"><span class="action-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg></span></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="ivr in sortedIvrs" :key="ivr.pkey">
            <td>{{ ivr.pkey }}</td>
            <td class="cell-immutable" title="Immutable">{{ localUidDisplay(ivr) }}</td>
            <td>{{ tenantDisplay(ivr) }}</td>
            <td>{{ ivr.description ?? '—' }}</td>
            <td>{{ ivr.greetnum != null ? String(ivr.greetnum) : '—' }}</td>
            <td>{{ ivr.timeout ?? '—' }}</td>
            <td>
              <router-link :to="{ name: 'ivr-detail', params: { pkey: ivr.pkey } }" class="cell-link cell-link-icon" title="Edit" aria-label="Edit">
                <span class="action-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg></span>
              </router-link>
            </td>
            <td>
              <button
                type="button"
                class="cell-link cell-link-delete cell-link-icon"
                :title="deletingPkey === ivr.pkey ? 'Deleting…' : 'Delete'"
                :aria-label="deletingPkey === ivr.pkey ? 'Deleting…' : 'Delete'"
                :disabled="deletingPkey === ivr.pkey"
                @click="askConfirmDelete(ivr.pkey)"
              >
                <span v-if="deletingPkey === ivr.pkey" class="action-icon action-icon-spin" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21h5v-5"/></svg></span>
                <span v-else class="action-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg></span>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <DeleteConfirmModal
      :show="!!confirmDeletePkey"
      title="Delete IVR?"
      :loading="deletingPkey === confirmDeletePkey"
      @confirm="confirmAndDeleteIvr(confirmDeletePkey)"
      @cancel="cancelConfirmDelete"
    >
      <template #body>
        <p>IVR <strong>{{ confirmDeletePkey }}</strong> will be permanently deleted. This cannot be undone.</p>
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
.list-header h1 {
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
.cell-immutable {
  color: #64748b;
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
