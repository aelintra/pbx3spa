<script setup>
import { ref, computed, onMounted } from 'vue'
import { getApiClient } from '@/api/client'
import { useToastStore } from '@/stores/toast'
import { normalizeList } from '@/utils/listResponse'
import { useStickyFilter, useStickySort } from '@/composables/useStickyFilter'
import { firstErrorMessage } from '@/utils/formErrors'
import { isRowActive } from '@/utils/listActive'
import { exportListToCsv } from '@/utils/exportCsv'
import DeleteConfirmModal from '@/components/DeleteConfirmModal.vue'
import ListLoadingState from '@/components/ListLoadingState.vue'

const { filterText } = useStickyFilter('conferences')
const toast = useToastStore()
const conferences = ref([])
const tenants = ref([])
const loading = ref(true)
const error = ref('')
const deleteError = ref('')
const deletingPkey = ref(null)
const confirmDeletePkey = ref(null)
const exportPdfLoading = ref(false)
const { sortKey, sortOrder } = useStickySort('conferences', { defaultKey: 'pkey' })

const clusterToTenantPkey = computed(() => {
  const map = new Map()
  for (const t of tenants.value) {
    if (t.id != null) map.set(String(t.id), t.pkey ?? t.id)
    if (t.shortuid != null) map.set(String(t.shortuid), t.pkey ?? t.shortuid)
    if (t.pkey != null) map.set(String(t.pkey), t.pkey)
  }
  return map
})

function tenantPkeyDisplay(c) {
  const cl = c.cluster
  if (cl == null || cl === '') return '—'
  return clusterToTenantPkey.value.get(String(cl)) ?? cl
}

const filteredConferences = computed(() => {
  const list = conferences.value
  const q = (filterText.value || '').trim().toLowerCase()
  if (!q) return list
  const map = clusterToTenantPkey.value
  return list.filter((item) => {
    const pkey = (item.pkey ?? '').toString().toLowerCase()
    const cluster = (item.cluster ?? '').toString().toLowerCase()
    const tenant = (map.get(String(item.cluster)) ?? item.cluster ?? '').toString().toLowerCase()
    const name = (item.cname ?? '').toString().toLowerCase()
    const type = (item.type ?? '').toString().toLowerCase()
    return pkey.includes(q) || cluster.includes(q) || tenant.includes(q) || name.includes(q) || type.includes(q)
  })
})

function sortValue(item, key) {
  if (key === 'cluster') return tenantPkeyDisplay(item)
  const v = item[key]
  if (v == null || v === '') return ''
  return String(v)
}

const sortedConferences = computed(() => {
  const list = [...filteredConferences.value]
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

function setSort(k) {
  if (sortKey.value === k) sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  else { sortKey.value = k; sortOrder.value = 'asc' }
}

function sortClass(k) {
  if (sortKey.value !== k) return ''
  return sortOrder.value === 'asc' ? 'sort-asc' : 'sort-desc'
}

const conferenceExportColumns = computed(() => [
  { key: 'pkey', label: 'Room' },
  { key: 'shortuid', label: 'UID' },
  { key: 'cluster', label: 'Tenant', getValue: (c) => tenantPkeyDisplay(c) },
  { key: 'active', label: 'Active' },
  { key: 'cname', label: 'Name' },
  { key: 'type', label: 'Type' }
])

function doExportCsv() {
  exportListToCsv(sortedConferences.value, conferenceExportColumns.value, 'conferences.csv')
  toast.show('CSV downloaded')
}

async function doExportPdf() {
  exportPdfLoading.value = true
  try {
    const blob = await getApiClient().getBlob('conferences/export/pdf')
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'conferences.pdf'
    a.click()
    URL.revokeObjectURL(url)
    toast.show('PDF downloaded')
  } catch (err) {
    toast.show(firstErrorMessage(err, 'Export failed'), 'error')
  } finally {
    exportPdfLoading.value = false
  }
}

async function loadConferences() {
  loading.value = true
  error.value = ''
  try {
    const [confRes, tenantsRes] = await Promise.all([
      getApiClient().get('conferences'),
      getApiClient().get('tenants')
    ])
    conferences.value = normalizeList(confRes, 'conferences') || normalizeList(confRes)
    tenants.value = normalizeList(tenantsRes, 'tenants')
  } catch (err) {
    error.value = firstErrorMessage(err, 'Failed to load conferences')
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

async function confirmAndDelete(shortuid) {
  if (confirmDeletePkey.value !== shortuid) return
  deleteError.value = ''
  deletingPkey.value = shortuid
  try {
    await getApiClient().delete(`conferences/${encodeURIComponent(shortuid)}`)
    await loadConferences()
    toast.show(`Conference deleted`)
  } catch (err) {
    deleteError.value = firstErrorMessage(err, 'Failed to delete conference')
  } finally {
    confirmDeletePkey.value = null
    deletingPkey.value = null
  }
}

onMounted(loadConferences)
</script>

<template>
  <div class="list-view">
    <header class="list-header">
      <h1>Conferences</h1>
      <p class="toolbar">
        <router-link :to="{ name: 'conference-create' }" class="add-btn">Create</router-link>
        <button type="button" class="export-btn" :disabled="sortedConferences.length === 0" @click="doExportCsv">Export CSV</button>
        <button type="button" class="export-btn" :disabled="sortedConferences.length === 0 || exportPdfLoading" @click="doExportPdf">{{ exportPdfLoading ? 'Exporting…' : 'Export PDF' }}</button>
        <input
          v-model="filterText"
          type="search"
          class="filter-input"
          placeholder="Filter by room, tenant, or name"
          aria-label="Filter conferences"
        />
      </p>
    </header>

    <section v-if="loading || error || deleteError || conferences.length === 0" class="list-states">
      <ListLoadingState v-if="loading" message="Loading conferences from API…" />
      <p v-else-if="error" class="error">{{ error }}</p>
      <p v-if="deleteError" class="error">{{ deleteError }}</p>
      <div v-else-if="conferences.length === 0" class="empty">No conferences.</div>
    </section>

    <section v-else class="list-body">
      <p v-if="filterText && filteredConferences.length === 0" class="empty">No conferences match the filter.</p>
      <table v-else class="table">
        <thead>
          <tr>
            <th class="th-sortable" title="Click to sort" :class="sortClass('pkey')" @click="setSort('pkey')">Room</th>
            <th class="th-sortable" title="Click to sort" :class="sortClass('shortuid')" @click="setSort('shortuid')">UID</th>
            <th class="th-sortable" title="Click to sort" :class="sortClass('cluster')" @click="setSort('cluster')">Tenant</th>
            <th class="th-sortable" title="Click to sort" :class="sortClass('active')" @click="setSort('active')">Active</th>
            <th class="th-sortable" title="Click to sort" :class="sortClass('cname')" @click="setSort('cname')">Name</th>
            <th class="th-sortable" title="Click to sort" :class="sortClass('type')" @click="setSort('type')">Type</th>
            <th class="th-actions" title="Edit"><span class="action-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg></span></th>
            <th class="th-actions" title="Delete"><span class="action-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg></span></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="c in sortedConferences" :key="c.shortuid || c.id || (c.cluster || '') + '-' + (c.pkey || '')" :class="{ 'list-row-inactive': !isRowActive(c.active) }">
            <td>{{ c.pkey }}</td>
            <td class="cell-immutable" title="Immutable">{{ c.shortuid ?? '—' }}</td>
            <td>{{ tenantPkeyDisplay(c) }}</td>
            <td>{{ c.active ?? '—' }}</td>
            <td>{{ c.cname ?? '—' }}</td>
            <td>{{ c.type ?? '—' }}</td>
            <td>
              <router-link v-if="c.shortuid" :to="{ name: 'conference-detail', params: { shortuid: c.shortuid } }" class="cell-link cell-link-icon" title="Edit" aria-label="Edit">
                <span class="action-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg></span>
              </router-link>
              <span v-else class="cell-link cell-link-icon" title="No shortuid - cannot edit" style="opacity: 0.5;">—</span>
            </td>
            <td>
              <button
                v-if="c.shortuid"
                type="button"
                class="cell-link cell-link-delete cell-link-icon"
                :title="deletingPkey === c.shortuid ? 'Deleting…' : 'Delete'"
                :aria-label="deletingPkey === c.shortuid ? 'Deleting…' : 'Delete'"
                :disabled="deletingPkey === c.shortuid"
                @click="askConfirmDelete(c.shortuid)"
              >
                <span v-if="deletingPkey === c.shortuid" class="action-icon action-icon-spin" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21h5v-5"/></svg></span>
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
      title="Delete conference?"
      :loading="deletingPkey === confirmDeletePkey"
      @confirm="confirmDeletePkey && confirmAndDelete(confirmDeletePkey)"
      @cancel="cancelConfirmDelete"
    >
      <template #body>
        <p>Conference room <strong>{{ confirmDeletePkey }}</strong> will be permanently deleted. This cannot be undone.</p>
      </template>
    </DeleteConfirmModal>
  </div>
</template>

<style scoped>
.list-view { display: flex; flex-direction: column; gap: 1rem; }
.list-header { margin: 0; }
.list-states, .list-body { margin: 0; }
.error, .empty { margin-top: 0; }
.error { color: #dc2626; }
.table { margin-top: 0; width: 100%; border-collapse: collapse; font-size: 0.9375rem; }
.table th, .table td { padding: 0.5rem 0.75rem; text-align: left; border-bottom: 1px solid #e2e8f0; }
.table th { font-weight: 600; color: #475569; background: #f8fafc; }
.cell-immutable { color: #64748b; background: #f8fafc; }
.th-sortable { cursor: pointer; user-select: none; white-space: nowrap; }
.th-sortable::before { content: '\21C5'; font-size: 0.7em; color: #94a3b8; margin-left: 0.2em; font-weight: normal; }
.th-sortable.sort-asc::before, .th-sortable.sort-desc::before { content: none; }
.th-sortable:hover { background: #f1f5f9; }
.th-sortable.sort-asc::after { content: ' \2191'; font-size: 0.75em; color: #64748b; }
.th-sortable.sort-desc::after { content: ' \2193'; font-size: 0.75em; color: #64748b; }
.th-actions { cursor: default; white-space: nowrap; }
.action-icon { display: inline-flex; align-items: center; justify-content: center; }
.action-icon-spin { animation: action-icon-spin 0.8s linear infinite; }
@keyframes action-icon-spin { to { transform: rotate(360deg); } }
.cell-link-icon { padding: 0.25rem; }
.table tbody tr:hover { background: #f8fafc; }
.cell-link { color: #2563eb; text-decoration: none; }
.cell-link:hover { text-decoration: underline; }
.cell-link-delete { color: #dc2626; background: none; border: none; padding: 0; font: inherit; cursor: pointer; }
.cell-link-delete:hover:not(:disabled) { text-decoration: underline; }
.cell-link-delete:disabled { opacity: 0.7; cursor: not-allowed; }
.toolbar { margin: 0.75rem 0 0 0; display: flex; justify-content: space-between; align-items: center; gap: 0.75rem; }
.add-btn { display: inline-block; padding: 0.5rem 1rem; font-size: 0.9375rem; font-weight: 500; color: #fff; background: #2563eb; border-radius: 0.375rem; text-decoration: none; }
.add-btn:hover { background: #1d4ed8; }
.export-btn { padding: 0.5rem 1rem; font-size: 0.9375rem; font-weight: 500; color: #475569; background: #fff; border: 1px solid #e2e8f0; border-radius: 0.375rem; cursor: pointer; }
.export-btn:hover:not(:disabled) { background: #f8fafc; border-color: #cbd5e1; }
.export-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.filter-input { padding: 0.5rem 0.75rem; font-size: 0.9375rem; border: 1px solid #e2e8f0; border-radius: 0.375rem; min-width: 16rem; }
.filter-input:focus { outline: none; border-color: #2563eb; }
</style>
