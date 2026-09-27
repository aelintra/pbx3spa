<script setup>
import { ref, computed, onMounted } from 'vue'
import { getApiClient } from '@/api/client'
import { useToastStore } from '@/stores/toast'
import { normalizeList } from '@/utils/listResponse'
import { loadTenantOptions } from '@/utils/loadTenantOptions'
import { useStickyFilter, useStickySort } from '@/composables/useStickyFilter'
import { firstErrorMessage } from '@/utils/formErrors'
import ListActiveChip from '@/components/ListActiveChip.vue'
import DeleteConfirmModal from '@/components/DeleteConfirmModal.vue'
import ListLoadingState from '@/components/ListLoadingState.vue'
import { exportListToCsv } from '@/utils/exportCsv'
import { refreshCommitStatusUi } from '@/utils/commitStatus'

const { filterText } = useStickyFilter('cosprofiles')
const toast = useToastStore()
const cosprofiles = ref([])
const tenants = ref([])
const loading = ref(true)
const error = ref('')
const deleteError = ref('')
const deletingShortuid = ref(null)
const confirmDeleteShortuid = ref(null)
const { sortKey, sortOrder } = useStickySort('cosprofiles', { defaultKey: 'cname' })

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

function ruleCount(item, side) {
  const list = side === 'open' ? item?.open_rules : item?.closed_rules
  return Array.isArray(list) ? list.length : 0
}

const filteredProfiles = computed(() => {
  const list = cosprofiles.value
  const q = (filterText.value || '').trim().toLowerCase()
  if (!q) return list
  const map = clusterToTenantPkey.value
  return list.filter((item) => {
    const pkey = (item.pkey ?? '').toString().toLowerCase()
    const cluster = (item.cluster ?? '').toString().toLowerCase()
    const tenant = (map.get(String(item.cluster)) ?? item.cluster ?? '').toString().toLowerCase()
    const cname = (item.cname ?? '').toString().toLowerCase()
    const description = (item.description ?? '').toString().toLowerCase()
    return (
      pkey.includes(q) ||
      cluster.includes(q) ||
      tenant.includes(q) ||
      cname.includes(q) ||
      description.includes(q)
    )
  })
})

function sortValue(item, key) {
  if (key === 'cluster') return tenantPkeyDisplay(item)
  if (key === 'open_n') return String(ruleCount(item, 'open'))
  if (key === 'closed_n') return String(ruleCount(item, 'closed'))
  if (key === 'is_default') return String(item.is_default ?? '').toUpperCase() === 'YES' ? '1' : '0'
  const v = item[key]
  if (v == null || v === '') return ''
  return String(v)
}

const sortedProfiles = computed(() => {
  const list = [...filteredProfiles.value]
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

const exportColumns = computed(() => [
  { key: 'cname', label: 'Name' },
  { key: 'pkey', label: 'Key' },
  { key: 'cluster', label: 'Tenant', getValue: (c) => tenantPkeyDisplay(c) },
  { key: 'active', label: 'Active' },
  { key: 'is_default', label: 'Default' },
  { key: 'open_rules', label: 'Standard rules', getValue: (c) => ruleCount(c, 'open') },
  { key: 'closed_rules', label: 'After-hours rules', getValue: (c) => ruleCount(c, 'closed') },
  { key: 'description', label: 'Description' }
])

function doExportCsv() {
  exportListToCsv(sortedProfiles.value, exportColumns.value, 'cosprofiles.csv')
  toast.show('CSV downloaded')
}

async function loadProfiles() {
  loading.value = true
  error.value = ''
  try {
    const [res, tRes] = await Promise.all([getApiClient().get('cosprofiles'), loadTenantOptions()])
    cosprofiles.value = normalizeList(res, 'cosprofiles') || normalizeList(res)
    tenants.value = normalizeList(tRes, 'tenants')
  } catch (err) {
    error.value = firstErrorMessage(err, 'Failed to load CoS profiles')
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
    await getApiClient().delete(`cosprofiles/${encodeURIComponent(shortuid)}`)
    await loadProfiles()
    toast.show('CoS profile deleted')
    refreshCommitStatusUi()
  } catch (err) {
    deleteError.value = firstErrorMessage(err, 'Failed to delete CoS profile')
  } finally {
    confirmDeleteShortuid.value = null
    deletingShortuid.value = null
  }
}

onMounted(loadProfiles)
</script>

<template>
  <div class="list-view">
    <header class="list-header">
      <h1>CoS profiles</h1>
      <p class="lede">
        Named privilege packs for extensions. Each profile has Standard and After-hours deny rules.
        New extensions get the <strong>Default</strong> profile (fixed per tenant — edit that
        profile’s lists to change default policy; do not elect a different profile as Default).
      </p>
      <p class="toolbar">
        <router-link :to="{ name: 'cosprofile-create' }" class="add-btn">Create</router-link>
        <button
          type="button"
          class="export-btn"
          :disabled="sortedProfiles.length === 0"
          @click="doExportCsv"
        >
          Export CSV
        </button>
        <input
          v-model="filterText"
          type="search"
          autocomplete="off"
          autocapitalize="off"
          autocorrect="off"
          spellcheck="false"
          class="filter-input"
          placeholder="Filter by name, tenant, or description"
          aria-label="Filter CoS profiles"
        />
      </p>
    </header>

    <section v-if="loading || error || deleteError || cosprofiles.length === 0" class="list-states">
      <ListLoadingState v-if="loading" message="Loading CoS profiles…" />
      <p v-else-if="error" class="error">{{ error }}</p>
      <p v-else-if="deleteError" class="error">{{ deleteError }}</p>
      <div v-else class="empty">No CoS profiles.</div>
    </section>

    <section v-else class="list-body">
      <p v-if="filterText && filteredProfiles.length === 0" class="empty">
        No profiles match the filter.
      </p>
      <table v-else class="table">
        <thead>
          <tr>
            <th class="th-sortable" :class="sortClass('cname')" @click="setSort('cname')">Name</th>
            <th class="th-sortable" :class="sortClass('cluster')" @click="setSort('cluster')">
              Tenant
            </th>
            <th class="th-sortable" :class="sortClass('is_default')" @click="setSort('is_default')">
              Default
            </th>
            <th class="th-sortable" :class="sortClass('active')" @click="setSort('active')">
              Active
            </th>
            <th class="th-sortable" :class="sortClass('open_n')" @click="setSort('open_n')">
              Standard
            </th>
            <th class="th-sortable" :class="sortClass('closed_n')" @click="setSort('closed_n')">
              After-hours
            </th>
            <th class="th-sortable" :class="sortClass('description')" @click="setSort('description')">
              Description
            </th>
            <th class="th-actions" title="Edit">
              <span class="action-icon" aria-hidden="true">✎</span>
            </th>
            <th class="th-actions" title="Delete">
              <span class="action-icon" aria-hidden="true">⌫</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="p in sortedProfiles"
            :key="p.shortuid || p.id || (p.cluster || '') + '-' + (p.pkey || '')"
          >
            <td>{{ p.cname ?? '—' }}</td>
            <td>{{ tenantPkeyDisplay(p) }}</td>
            <td>
              <span v-if="String(p.is_default || '').toUpperCase() === 'YES'" class="default-chip"
                >Yes</span
              >
              <span v-else class="muted">—</span>
            </td>
            <ListActiveChip :active="p.active" />
            <td>{{ ruleCount(p, 'open') }}</td>
            <td>{{ ruleCount(p, 'closed') }}</td>
            <td>{{ p.description ?? '—' }}</td>
            <td>
              <router-link
                v-if="p.shortuid"
                :to="{ name: 'cosprofile-detail', params: { shortuid: p.shortuid } }"
                class="cell-link"
                title="Edit"
                >Edit</router-link
              >
              <span v-else class="muted">—</span>
            </td>
            <td>
              <button
                v-if="p.shortuid"
                type="button"
                class="cell-link cell-link-delete"
                :disabled="deletingShortuid === p.shortuid"
                @click="askConfirmDelete(p.shortuid)"
              >
                {{ deletingShortuid === p.shortuid ? '…' : 'Delete' }}
              </button>
              <span v-else class="muted">—</span>
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <DeleteConfirmModal
      :show="!!confirmDeleteShortuid"
      title="Delete CoS profile?"
      :loading="deletingShortuid === confirmDeleteShortuid"
      @confirm="confirmDeleteShortuid && confirmAndDelete(confirmDeleteShortuid)"
      @cancel="cancelConfirmDelete"
    >
      <template #body>
        <p>
          This profile will be permanently deleted. Reassign extensions first if any still use it.
        </p>
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
.lede {
  margin: 0.35rem 0 0;
  font-size: 0.9375rem;
  color: #64748b;
  max-width: 42rem;
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
.export-btn {
  padding: 0.5rem 1rem;
  font-size: 0.9375rem;
  font-weight: 500;
  color: #475569;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 0.375rem;
  cursor: pointer;
}
.export-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.filter-input {
  padding: 0.5rem 0.75rem;
  font-size: 0.9375rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.375rem;
  min-width: 16rem;
  margin-left: auto;
}
.error {
  color: #dc2626;
}
.muted {
  color: #94a3b8;
}
.default-chip {
  display: inline-block;
  padding: 0.1rem 0.45rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: #1d4ed8;
  background: #dbeafe;
  border-radius: 999px;
}
.table {
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
.th-sortable.sort-asc::after {
  content: ' ↑';
  font-size: 0.75em;
  color: #64748b;
}
.th-sortable.sort-desc::after {
  content: ' ↓';
  font-size: 0.75em;
  color: #64748b;
}
.th-actions {
  white-space: nowrap;
}
.cell-link {
  color: #2563eb;
  text-decoration: none;
  background: none;
  border: none;
  padding: 0;
  font: inherit;
  cursor: pointer;
}
.cell-link-delete {
  color: #dc2626;
}
.table tbody tr:hover {
  background: #f8fafc;
}
</style>
