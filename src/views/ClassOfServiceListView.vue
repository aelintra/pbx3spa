<script setup>
import { ref, computed, onMounted } from 'vue'
import { getApiClient } from '@/api/client'
import { useToastStore } from '@/stores/toast'
import { normalizeList } from '@/utils/listResponse'
import { useStickyFilter } from '@/composables/useStickyFilter'
import { firstErrorMessage } from '@/utils/formErrors'
import DeleteConfirmModal from '@/components/DeleteConfirmModal.vue'

const { filterText } = useStickyFilter('cosrules')
const toast = useToastStore()
const cosrules = ref([])
const tenants = ref([])
const loading = ref(true)
const error = ref('')
const deleteError = ref('')
const deletingShortuid = ref(null)
const confirmDeleteShortuid = ref(null)
const sortKey = ref('pkey')
const sortOrder = ref('asc')

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

const filteredCosrules = computed(() => {
  const list = cosrules.value
  const q = (filterText.value || '').trim().toLowerCase()
  if (!q) return list
  const map = clusterToTenantPkey.value
  return list.filter((item) => {
    const pkey = (item.pkey ?? '').toString().toLowerCase()
    const cluster = (item.cluster ?? '').toString().toLowerCase()
    const tenant = (map.get(String(item.cluster)) ?? item.cluster ?? '').toString().toLowerCase()
    const cname = (item.cname ?? '').toString().toLowerCase()
    const description = (item.description ?? '').toString().toLowerCase()
    return pkey.includes(q) || cluster.includes(q) || tenant.includes(q) || cname.includes(q) || description.includes(q)
  })
})

function sortValue(item, key) {
  if (key === 'cluster') return tenantPkeyDisplay(item)
  const v = item[key]
  if (v == null || v === '') return ''
  return String(v)
}

const sortedCosrules = computed(() => {
  const list = [...filteredCosrules.value]
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

async function loadCosrules() {
  loading.value = true
  error.value = ''
  try {
    const [cosRes, tRes] = await Promise.all([
      getApiClient().get('cosrules'),
      getApiClient().get('tenants')
    ])
    cosrules.value = normalizeList(cosRes, 'cosrules') || normalizeList(cosRes)
    tenants.value = normalizeList(tRes, 'tenants')
  } catch (err) {
    error.value = firstErrorMessage(err, 'Failed to load Class of Service rules')
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
    await getApiClient().delete(`cosrules/${encodeURIComponent(shortuid)}`)
    await loadCosrules()
    toast.show('Class of Service rule deleted')
  } catch (err) {
    deleteError.value = firstErrorMessage(err, 'Failed to delete Class of Service rule')
  } finally {
    confirmDeleteShortuid.value = null
    deletingShortuid.value = null
  }
}

onMounted(loadCosrules)
</script>

<template>
  <div class="list-view">
    <header class="list-header">
      <h1>Class of Service</h1>
      <p class="toolbar">
        <router-link :to="{ name: 'cosrule-create' }" class="add-btn">Create</router-link>
        <input
          v-model="filterText"
          type="search"
          class="filter-input"
          placeholder="Filter by key, tenant, or name"
          aria-label="Filter Class of Service rules"
        />
      </p>
    </header>

    <section v-if="loading || error || deleteError || cosrules.length === 0" class="list-states">
      <p v-if="loading" class="loading">Loading Class of Service rules…</p>
      <p v-else-if="error" class="error">{{ error }}</p>
      <p v-if="deleteError" class="error">{{ deleteError }}</p>
      <div v-else-if="cosrules.length === 0" class="empty">No Class of Service rules.</div>
    </section>

    <section v-else class="list-body">
      <p v-if="filterText && filteredCosrules.length === 0" class="empty">No rules match the filter.</p>
      <table v-else class="table">
        <thead>
          <tr>
            <th class="th-sortable" title="Click to sort" :class="sortClass('pkey')" @click="setSort('pkey')">CoS key</th>
            <th class="th-sortable" title="Click to sort" :class="sortClass('shortuid')" @click="setSort('shortuid')">Local UID</th>
            <th class="th-sortable" title="Click to sort" :class="sortClass('cluster')" @click="setSort('cluster')">Tenant</th>
            <th class="th-sortable" title="Click to sort" :class="sortClass('cname')" @click="setSort('cname')">Name</th>
            <th class="th-sortable" title="Click to sort" :class="sortClass('active')" @click="setSort('active')">Active</th>
            <th class="th-sortable" title="Click to sort" :class="sortClass('defaultopen')" @click="setSort('defaultopen')">Default open</th>
            <th class="th-sortable" title="Click to sort" :class="sortClass('defaultclosed')" @click="setSort('defaultclosed')">Default closed</th>
            <th class="th-sortable" title="Click to sort" :class="sortClass('description')" @click="setSort('description')">Description</th>
            <th class="th-actions" title="Edit"><span class="action-icon" aria-hidden="true">✏️</span></th>
            <th class="th-actions" title="Delete"><span class="action-icon" aria-hidden="true">🗑️</span></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="c in sortedCosrules" :key="c.shortuid || c.id || (c.cluster || '') + '-' + (c.pkey || '')">
            <td>{{ c.pkey }}</td>
            <td>{{ c.shortuid ?? '—' }}</td>
            <td>{{ tenantPkeyDisplay(c) }}</td>
            <td>{{ c.cname ?? '—' }}</td>
            <td>{{ c.active ?? '—' }}</td>
            <td>{{ c.defaultopen ?? '—' }}</td>
            <td>{{ c.defaultclosed ?? '—' }}</td>
            <td>{{ c.description ?? '—' }}</td>
            <td>
              <router-link v-if="c.shortuid" :to="{ name: 'cosrule-detail', params: { shortuid: c.shortuid } }" class="cell-link cell-link-icon" title="Edit" aria-label="Edit">
                <span class="action-icon" aria-hidden="true">✏️</span>
              </router-link>
              <span v-else style="opacity: 0.5;">—</span>
            </td>
            <td>
              <button
                v-if="c.shortuid"
                type="button"
                class="cell-link cell-link-delete cell-link-icon"
                :disabled="deletingShortuid === c.shortuid"
                :title="deletingShortuid === c.shortuid ? 'Deleting…' : 'Delete'"
                @click="askConfirmDelete(c.shortuid)"
              >
                <span class="action-icon" aria-hidden="true">🗑️</span>
              </button>
              <span v-else style="opacity: 0.5;">—</span>
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <DeleteConfirmModal
      :show="!!confirmDeleteShortuid"
      title="Delete Class of Service rule?"
      :loading="deletingShortuid === confirmDeleteShortuid"
      @confirm="confirmDeleteShortuid && confirmAndDelete(confirmDeleteShortuid)"
      @cancel="cancelConfirmDelete"
    >
      <template #body>
        <p>This Class of Service rule will be permanently deleted. This cannot be undone.</p>
      </template>
    </DeleteConfirmModal>
  </div>
</template>

<style scoped>
.list-view { display: flex; flex-direction: column; gap: 1rem; }
.list-header { margin: 0; }
.list-states, .list-body { margin: 0; }
.loading, .error, .empty { margin-top: 0; }
.error { color: #dc2626; }
.table { margin-top: 0; width: 100%; border-collapse: collapse; font-size: 0.9375rem; }
.table th, .table td { padding: 0.5rem 0.75rem; text-align: left; border-bottom: 1px solid #e2e8f0; }
.table th { font-weight: 600; color: #475569; background: #f8fafc; }
.th-sortable { cursor: pointer; user-select: none; white-space: nowrap; }
.th-sortable::before { content: '\21C5'; font-size: 0.7em; color: #94a3b8; margin-left: 0.2em; font-weight: normal; }
.th-sortable.sort-asc::before, .th-sortable.sort-desc::before { content: none; }
.th-sortable:hover { background: #f1f5f9; }
.th-sortable.sort-asc::after { content: ' \2191'; font-size: 0.75em; color: #64748b; }
.th-sortable.sort-desc::after { content: ' \2193'; font-size: 0.75em; color: #64748b; }
.th-actions { cursor: default; white-space: nowrap; }
.action-icon { display: inline-flex; align-items: center; justify-content: center; }
.cell-link-icon { padding: 0.25rem; }
.table tbody tr:hover { background: #f8fafc; }
.cell-link { color: #2563eb; text-decoration: none; background: none; border: none; padding: 0; font: inherit; cursor: pointer; }
.cell-link:hover { text-decoration: underline; }
.cell-link-delete { color: #dc2626; }
.cell-link:disabled { opacity: 0.7; cursor: not-allowed; }
.toolbar { margin: 0.75rem 0 0 0; display: flex; justify-content: space-between; align-items: center; gap: 0.75rem; }
.add-btn { display: inline-block; padding: 0.5rem 1rem; font-size: 0.9375rem; font-weight: 500; color: #fff; background: #2563eb; border-radius: 0.375rem; text-decoration: none; }
.add-btn:hover { background: #1d4ed8; }
.filter-input { padding: 0.5rem 0.75rem; font-size: 0.9375rem; border: 1px solid #e2e8f0; border-radius: 0.375rem; min-width: 16rem; }
.filter-input:focus { outline: none; border-color: #2563eb; }
</style>
