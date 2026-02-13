<script setup>
import { ref, computed, onMounted } from 'vue'
import { getApiClient } from '@/api/client'
import { useToastStore } from '@/stores/toast'
import { normalizeList } from '@/utils/listResponse'
import { firstErrorMessage } from '@/utils/formErrors'
import DeleteConfirmModal from '@/components/DeleteConfirmModal.vue'

const toast = useToastStore()
const queues = ref([])
const tenants = ref([])
const loading = ref(true)
const error = ref('')
const deleteError = ref('')
const deletingPkey = ref(null)
const confirmDeletePkey = ref(null)
const filterText = ref('')
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

function tenantPkeyDisplay(q) {
  const c = q.cluster
  if (c == null || c === '') return '—'
  return clusterToTenantPkey.value.get(String(c)) ?? c
}

const filteredQueues = computed(() => {
  const list = queues.value
  const q = (filterText.value || '').trim().toLowerCase()
  if (!q) return list
  const map = clusterToTenantPkey.value
  return list.filter((item) => {
    const pkey = (item.pkey ?? '').toString().toLowerCase()
    const cluster = (item.cluster ?? '').toString().toLowerCase()
    const tenant = (map.get(String(item.cluster)) ?? item.cluster ?? '').toString().toLowerCase()
    const name = (item.name ?? item.cname ?? '').toString().toLowerCase()
    return pkey.includes(q) || cluster.includes(q) || tenant.includes(q) || name.includes(q)
  })
})

function sortValue(item, key) {
  if (key === 'cluster') return tenantPkeyDisplay(item)
  const v = item[key]
  if (v == null || v === '') return ''
  return key === 'timeout' ? String(Number(v)) : String(v)
}

const sortedQueues = computed(() => {
  const list = [...filteredQueues.value]
  const key = sortKey.value
  const order = sortOrder.value
  const isNumeric = key === 'timeout'
  list.sort((a, b) => {
    let cmp = 0
    if (isNumeric) {
      const na = Number(a[key])
      const nb = Number(b[key])
      const va = Number.isNaN(na) ? -Infinity : na
      const vb = Number.isNaN(nb) ? -Infinity : nb
      if (va < vb) cmp = -1
      else if (va > vb) cmp = 1
    } else {
      const va = sortValue(a, key).toLowerCase()
      const vb = sortValue(b, key).toLowerCase()
      if (va < vb) cmp = -1
      else if (va > vb) cmp = 1
    }
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

async function loadQueues() {
  loading.value = true
  error.value = ''
  try {
    const [queuesRes, tenantsRes] = await Promise.all([
      getApiClient().get('queues'),
      getApiClient().get('tenants')
    ])
    queues.value = normalizeList(queuesRes, 'queues') || normalizeList(queuesRes)
    tenants.value = normalizeList(tenantsRes, 'tenants')
  } catch (err) {
    error.value = firstErrorMessage(err, 'Failed to load queues')
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

async function confirmAndDelete(pkey) {
  if (confirmDeletePkey.value !== pkey) return
  deleteError.value = ''
  deletingPkey.value = pkey
  try {
    await getApiClient().delete(`queues/${encodeURIComponent(pkey)}`)
    await loadQueues()
    toast.show(`Queue ${pkey} deleted`)
  } catch (err) {
    deleteError.value = firstErrorMessage(err, 'Failed to delete queue')
  } finally {
    confirmDeletePkey.value = null
    deletingPkey.value = null
  }
}

onMounted(loadQueues)
</script>

<template>
  <div class="list-view">
    <header class="list-header">
      <h1>Queues</h1>
      <p class="toolbar">
        <router-link :to="{ name: 'queue-create' }" class="add-btn">Create</router-link>
        <input
          v-model="filterText"
          type="search"
          class="filter-input"
          placeholder="Filter by name, tenant, or cluster"
          aria-label="Filter queues"
        />
      </p>
    </header>

    <section v-if="loading || error || deleteError || queues.length === 0" class="list-states">
      <p v-if="loading" class="loading">Loading queues…</p>
      <p v-else-if="error" class="error">{{ error }}</p>
      <p v-if="deleteError" class="error">{{ deleteError }}</p>
      <div v-else-if="queues.length === 0" class="empty">No queues.</div>
    </section>

    <section v-else class="list-body">
      <p v-if="filterText && filteredQueues.length === 0" class="empty">No queues match the filter.</p>
      <table v-else class="table">
        <thead>
          <tr>
            <th class="th-sortable" title="Click to sort" :class="sortClass('pkey')" @click="setSort('pkey')">Queue</th>
            <th class="th-sortable" title="Click to sort" :class="sortClass('shortuid')" @click="setSort('shortuid')">Local UID</th>
            <th class="th-sortable" title="Click to sort" :class="sortClass('cluster')" @click="setSort('cluster')">Tenant</th>
            <th class="th-sortable" title="Click to sort" :class="sortClass('cname')" @click="setSort('cname')">Name</th>
            <th class="th-sortable" title="Click to sort" :class="sortClass('active')" @click="setSort('active')">Active</th>
            <th class="th-sortable" title="Click to sort" :class="sortClass('strategy')" @click="setSort('strategy')">Strategy</th>
            <th class="th-sortable" title="Click to sort" :class="sortClass('timeout')" @click="setSort('timeout')">Timeout</th>
            <th class="th-actions" title="Edit"><span class="action-icon" aria-hidden="true">✏️</span></th>
            <th class="th-actions" title="Delete"><span class="action-icon" aria-hidden="true">🗑️</span></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="q in sortedQueues" :key="q.pkey">
            <td>{{ q.pkey }}</td>
            <td>{{ q.shortuid ?? '—' }}</td>
            <td>{{ tenantPkeyDisplay(q) }}</td>
            <td>{{ q.cname ?? q.name ?? '—' }}</td>
            <td>{{ q.active ?? '—' }}</td>
            <td>{{ q.strategy ?? '—' }}</td>
            <td>{{ q.timeout != null && q.timeout !== '' ? q.timeout : '—' }}</td>
            <td>
              <router-link :to="{ name: 'queue-detail', params: { pkey: q.pkey } }" class="cell-link cell-link-icon" title="Edit" aria-label="Edit">
                <span class="action-icon" aria-hidden="true">✏️</span>
              </router-link>
            </td>
            <td>
              <button
                type="button"
                class="cell-link cell-link-delete cell-link-icon"
                :title="deletingPkey === q.pkey ? 'Deleting…' : 'Delete'"
                :aria-label="deletingPkey === q.pkey ? 'Deleting…' : 'Delete'"
                :disabled="deletingPkey === q.pkey"
                @click="askConfirmDelete(q.pkey)"
              >
                <span class="action-icon" aria-hidden="true">🗑️</span>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <DeleteConfirmModal
      :show="!!confirmDeletePkey"
      title="Delete queue?"
      :loading="deletingPkey === confirmDeletePkey"
      @confirm="confirmDeletePkey && confirmAndDelete(confirmDeletePkey)"
      @cancel="cancelConfirmDelete"
    >
      <template #body>
        <p>Queue <strong>{{ confirmDeletePkey }}</strong> will be permanently deleted. This cannot be undone.</p>
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
.cell-link { color: #2563eb; text-decoration: none; }
.cell-link:hover { text-decoration: underline; }
.cell-link-delete { color: #dc2626; background: none; border: none; padding: 0; font: inherit; cursor: pointer; }
.cell-link-delete:hover:not(:disabled) { text-decoration: underline; }
.cell-link-delete:disabled { opacity: 0.7; cursor: not-allowed; }
.toolbar { margin: 0.75rem 0 0 0; display: flex; justify-content: space-between; align-items: center; gap: 0.75rem; }
.add-btn { display: inline-block; padding: 0.5rem 1rem; font-size: 0.9375rem; font-weight: 500; color: #fff; background: #2563eb; border-radius: 0.375rem; text-decoration: none; }
.add-btn:hover { background: #1d4ed8; }
.filter-input { padding: 0.5rem 0.75rem; font-size: 0.9375rem; border: 1px solid #e2e8f0; border-radius: 0.375rem; min-width: 16rem; }
.filter-input:focus { outline: none; border-color: #2563eb; }
</style>
