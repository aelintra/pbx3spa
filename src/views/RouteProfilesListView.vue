<script setup>
import { ref, computed, onMounted } from 'vue'
import { getApiClient } from '@/api/client'
import { useToastStore } from '@/stores/toast'
import { normalizeList } from '@/utils/listResponse'
import { loadTenantOptions } from '@/utils/loadTenantOptions'
import { useStickyFilter, useStickySort } from '@/composables/useStickyFilter'
import { firstErrorMessage } from '@/utils/formErrors'
import DeleteConfirmModal from '@/components/DeleteConfirmModal.vue'
import ListLoadingState from '@/components/ListLoadingState.vue'
import { exportListToCsv } from '@/utils/exportCsv'

const { filterText } = useStickyFilter('routeprofiles')
const toast = useToastStore()
const profiles = ref([])
const tenants = ref([])
const loading = ref(true)
const error = ref('')
const deleteError = ref('')
const deletingShortuid = ref(null)
const confirmDeleteShortuid = ref(null)
const exportPdfLoading = ref(false)
const { sortKey, sortOrder } = useStickySort('routeprofiles', { defaultKey: 'name' })

const clusterToTenantPkey = computed(() => {
  const map = new Map()
  for (const t of tenants.value) {
    if (t.id != null) map.set(String(t.id), t.pkey ?? t.id)
    if (t.shortuid != null) map.set(String(t.shortuid), t.pkey ?? t.shortuid)
    if (t.pkey != null) map.set(String(t.pkey), t.pkey)
  }
  return map
})

function tenantPkeyDisplay(item) {
  const cl = item.cluster
  if (cl == null || cl === '') return '—'
  return clusterToTenantPkey.value.get(String(cl)) ?? cl
}

function lineCount(item) {
  return Array.isArray(item.lines) ? item.lines.length : 0
}

const filtered = computed(() => {
  const list = profiles.value
  const q = (filterText.value || '').trim().toLowerCase()
  if (!q) return list
  const map = clusterToTenantPkey.value
  return list.filter((item) => {
    const shortuid = (item.shortuid ?? '').toString().toLowerCase()
    const name = (item.name ?? '').toString().toLowerCase()
    const tenant = (map.get(String(item.cluster)) ?? item.cluster ?? '').toString().toLowerCase()
    return shortuid.includes(q) || name.includes(q) || tenant.includes(q)
  })
})

function sortValue(item, key) {
  if (key === 'cluster') return tenantPkeyDisplay(item)
  if (key === 'lines') return String(lineCount(item))
  const v = item[key]
  if (v == null || v === '') return ''
  return String(v)
}

const sorted = computed(() => {
  const list = [...filtered.value]
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
  else {
    sortKey.value = k
    sortOrder.value = 'asc'
  }
}

function sortClass(k) {
  if (sortKey.value !== k) return ''
  return sortOrder.value === 'asc' ? 'sort-asc' : 'sort-desc'
}

const routeprofileExportColumns = computed(() => [
  { key: 'cluster', label: 'Tenant', getValue: (p) => tenantPkeyDisplay(p) },
  { key: 'name', label: 'Name' },
  { key: 'lines', label: 'Modes', getValue: (p) => lineCount(p) }
])

function doExportCsv() {
  exportListToCsv(sorted.value, routeprofileExportColumns.value, 'routeprofiles.csv')
  toast.show('CSV downloaded')
}

async function doExportPdf() {
  exportPdfLoading.value = true
  try {
    const blob = await getApiClient().getBlob('routeprofiles/export/pdf')
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'routeprofiles.pdf'
    a.click()
    URL.revokeObjectURL(url)
    toast.show('PDF downloaded')
  } catch (err) {
    toast.show(firstErrorMessage(err, 'Export failed'), 'error')
  } finally {
    exportPdfLoading.value = false
  }
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [pRes, tRes] = await Promise.all([
      getApiClient().get('routeprofiles'),
      loadTenantOptions()
    ])
    profiles.value = normalizeList(pRes, 'routeprofiles') || normalizeList(pRes)
    tenants.value = normalizeList(tRes, 'tenants')
  } catch (err) {
    error.value = firstErrorMessage(err, 'Failed to load Route profiles')
  } finally {
    loading.value = false
  }
}

function askConfirmDelete(shortuid) {
  confirmDeleteShortuid.value = shortuid
  deleteError.value = ''
}

function cancelConfirmDelete() {
  confirmDeleteShortuid.value = null
}

async function confirmAndDelete(shortuid) {
  if (confirmDeleteShortuid.value !== shortuid) return
  deleteError.value = ''
  deletingShortuid.value = shortuid
  try {
    await getApiClient().delete(`routeprofiles/${encodeURIComponent(shortuid)}`)
    await load()
    toast.show('Route profile deleted')
  } catch (err) {
    deleteError.value = firstErrorMessage(err, 'Failed to delete Route profile')
  } finally {
    confirmDeleteShortuid.value = null
    deletingShortuid.value = null
  }
}

onMounted(load)
</script>

<template>
  <div class="list-view">
    <div class="list-header">
      <h1>Route profiles</h1>
      <div class="header-actions">
        <router-link :to="{ name: 'routeprofile-create' }" class="add-btn">Create</router-link>
        <button
          type="button"
          class="export-btn"
          :disabled="sorted.length === 0"
          @click="doExportCsv"
        >
          Export CSV
        </button>
        <button
          type="button"
          class="export-btn"
          :disabled="sorted.length === 0 || exportPdfLoading"
          @click="doExportPdf"
        >
          {{ exportPdfLoading ? 'Exporting…' : 'Export PDF' }}
        </button>
      </div>
    </div>
    <div class="toolbar">
      <input
        v-model="filterText"
        type="search"
        class="filter-input"
        placeholder="Filter…"
        aria-label="Filter Route profiles"
      />
    </div>

    <div
      v-if="loading || error || deleteError || profiles.length === 0"
      class="list-status"
    >
      <ListLoadingState v-if="loading" message="Loading Route profiles from API…" />
      <p v-else-if="error" class="error">{{ error }}</p>
      <p v-else-if="deleteError" class="error">{{ deleteError }}</p>
      <div v-else-if="profiles.length === 0" class="empty">No Route profiles.</div>
    </div>
    <template v-else>
      <p v-if="filterText && filtered.length === 0" class="empty">No matches.</p>
      <div v-else class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th
                class="th-sortable"
                title="Click to sort"
                :class="sortClass('cluster')"
                @click="setSort('cluster')"
              >
                Tenant
              </th>
              <th
                class="th-sortable"
                title="Click to sort"
                :class="sortClass('name')"
                @click="setSort('name')"
              >
                Name
              </th>
              <th
                class="th-sortable"
                title="Click to sort"
                :class="sortClass('lines')"
                @click="setSort('lines')"
              >
                Modes
              </th>
              <th class="th-actions" title="Edit">Edit</th>
              <th class="th-actions" title="Delete">Delete</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in sorted" :key="p.shortuid || p.id">
              <td>{{ tenantPkeyDisplay(p) }}</td>
              <td>{{ p.name ?? '—' }}</td>
              <td>{{ lineCount(p) }}</td>
              <td>
                <router-link
                  v-if="p.shortuid"
                  :to="{ name: 'routeprofile-detail', params: { shortuid: p.shortuid } }"
                  class="cell-link"
                  >Edit</router-link
                >
              </td>
              <td>
                <button
                  v-if="p.shortuid"
                  type="button"
                  class="cell-link cell-link-delete"
                  :disabled="deletingShortuid === p.shortuid"
                  @click="askConfirmDelete(p.shortuid)"
                >
                  Delete
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <DeleteConfirmModal
      :open="!!confirmDeleteShortuid"
      title="Delete Route profile?"
      @cancel="cancelConfirmDelete"
      @confirm="confirmAndDelete(confirmDeleteShortuid)"
    >
      <p>This profile and its mode lines will be permanently deleted.</p>
    </DeleteConfirmModal>
  </div>
</template>

<style scoped>
.list-view {
  max-width: 72rem;
}
.list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.75rem;
}
.list-header h1 {
  margin: 0;
  font-size: 1.35rem;
}
.add-btn {
  display: inline-block;
  padding: 0.4rem 0.85rem;
  background: var(--color-accent, #2563eb);
  color: #fff;
  border-radius: 0.35rem;
  text-decoration: none;
  font-size: 0.9rem;
}
.header-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.export-btn {
  padding: 0.4rem 0.85rem;
  font-size: 0.9rem;
  font-weight: 500;
  color: #475569;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 0.35rem;
  cursor: pointer;
}
.export-btn:hover:not(:disabled) {
  background: #f8fafc;
  border-color: #cbd5e1;
}
.export-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.toolbar {
  margin-bottom: 0.75rem;
}
.filter-input {
  width: min(100%, 20rem);
  padding: 0.4rem 0.6rem;
  border: 1px solid var(--color-border, #ccc);
  border-radius: 0.3rem;
}
.empty,
.error,
.loading {
  margin: 1rem 0;
}
.error {
  color: var(--color-danger, #b91c1c);
}
.table-wrap {
  overflow-x: auto;
}
.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}
.data-table th,
.data-table td {
  text-align: left;
  padding: 0.45rem 0.6rem;
  border-bottom: 1px solid var(--color-border, #e5e5e5);
}
.th-sortable {
  cursor: pointer;
  user-select: none;
}
.th-sortable.sort-asc::after {
  content: ' ▲';
  font-size: 0.7em;
}
.th-sortable.sort-desc::after {
  content: ' ▼';
  font-size: 0.7em;
}
.cell-immutable {
  font-family: ui-monospace, monospace;
  font-size: 0.85em;
}
.cell-link {
  color: var(--color-accent, #2563eb);
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  font: inherit;
  text-decoration: underline;
}
.cell-link-delete {
  color: var(--color-danger, #b91c1c);
}
</style>
