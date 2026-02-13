<script setup>
import { ref, computed, onMounted } from 'vue'
import { getApiClient } from '@/api/client'
import { useToastStore } from '@/stores/toast'
import { normalizeList } from '@/utils/listResponse'
import { firstErrorMessage } from '@/utils/formErrors'
import DeleteConfirmModal from '@/components/DeleteConfirmModal.vue'

const toast = useToastStore()
const extensions = ref([])
const tenants = ref([])
const loading = ref(true)
const error = ref('')
const deleteError = ref('')
const deletingPkey = ref(null)
const confirmDeletePkey = ref(null)
const filterText = ref('')
const sortKey = ref('pkey')
const sortOrder = ref('asc') // 'asc' | 'desc'

/** Map cluster id, shortuid, or pkey → tenant pkey for display (always show pkey, not shortuid) */
const clusterToTenantPkey = computed(() => {
  const map = new Map()
  for (const t of tenants.value) {
    if (t.id != null) map.set(String(t.id), t.pkey ?? t.id)
    if (t.shortuid != null) map.set(String(t.shortuid), t.pkey ?? t.shortuid)
    if (t.pkey != null) map.set(String(t.pkey), t.pkey)
  }
  return map
})

/** Resolve extension cluster (id or pkey) to tenant pkey for display. Prefer API-provided tenant_pkey when present. */
function tenantPkeyDisplay(e) {
  if (e.tenant_pkey != null && e.tenant_pkey !== '') return String(e.tenant_pkey)
  const clusterValue = e.cluster
  if (clusterValue == null || clusterValue === '') return '—'
  const s = String(clusterValue)
  return clusterToTenantPkey.value.get(s) ?? s
}

/** User/display name: desc or cname, truncated to 24 chars */
function userDisplay(e) {
  const s = (e.desc ?? e.cname ?? e.description ?? '').toString().trim()
  if (!s) return '—'
  if (s.length <= 24) return s
  return s.slice(0, 22) + '…'
}

const filteredExtensions = computed(() => {
  const list = extensions.value
  const q = (filterText.value || '').trim().toLowerCase()
  if (!q) return list
  const map = clusterToTenantPkey.value
  return list.filter((e) => {
    const pkey = (e.pkey ?? '').toString().toLowerCase()
    const clusterRaw = (e.cluster ?? '').toString().toLowerCase()
    const tenantPkey = (e.tenant_pkey ?? map.get(String(e.cluster)) ?? e.cluster ?? '').toString().toLowerCase()
    const desc = (e.desc ?? e.description ?? e.cname ?? '').toString().toLowerCase()
    return pkey.includes(q) || clusterRaw.includes(q) || tenantPkey.includes(q) || desc.includes(q)
  })
})

function sortValue(e, key) {
  if (key === 'desc') return (e.desc ?? e.cname ?? e.description ?? '').toString()
  if (key === 'cluster') return tenantPkeyDisplay(e)
  const v = e[key]
  return v == null ? '' : String(v)
}

/** SIP Identity = shortuid for display */
function sipIdentityDisplay(e) {
  const v = e.shortuid
  return v == null || v === '' ? '—' : String(v)
}

const sortedExtensions = computed(() => {
  const list = [...filteredExtensions.value]
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

async function loadExtensions() {
  loading.value = true
  error.value = ''
  try {
    const [extResponse, tenantResponse] = await Promise.all([
      getApiClient().get('extensions'),
      getApiClient().get('tenants')
    ])
    extensions.value = normalizeList(extResponse)
    tenants.value = normalizeList(tenantResponse, 'tenants')
  } catch (err) {
    error.value = firstErrorMessage(err, 'Failed to load extensions')
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

async function confirmAndDeleteExtension(shortuid) {
  if (confirmDeletePkey.value !== shortuid) return
  deleteError.value = ''
  deletingPkey.value = shortuid
  try {
    await getApiClient().delete(`extensions/${encodeURIComponent(shortuid)}`)
    await loadExtensions()
    toast.show(`Extension deleted`)
  } catch (err) {
    deleteError.value = firstErrorMessage(err, 'Failed to delete extension')
  } finally {
    confirmDeletePkey.value = null
    deletingPkey.value = null
  }
}

onMounted(loadExtensions)
</script>

<template>
  <div class="list-view">
    <header class="list-header">
      <h1>Extensions</h1>
      <p class="toolbar">
        <router-link :to="{ name: 'extension-create' }" class="add-btn">Create</router-link>
        <input
          v-model="filterText"
          type="search"
          class="filter-input"
          placeholder="Filter by pkey, tenant, or description"
          aria-label="Filter extensions"
        />
      </p>
    </header>

    <section v-if="loading || error || deleteError || extensions.length === 0" class="list-states">
      <p v-if="loading" class="loading">Loading extensions from API…</p>
      <p v-else-if="error" class="error">{{ error }}</p>
      <p v-if="deleteError" class="error">{{ deleteError }}</p>
      <div v-else-if="extensions.length === 0" class="empty">No extensions. (API returned an empty list.)</div>
    </section>

    <section v-else class="list-body">
      <p v-if="filterText && filteredExtensions.length === 0" class="empty">No extensions match the filter.</p>
      <table v-else class="table">
        <thead>
          <tr>
            <th class="th-sortable" title="Click to sort" :class="sortClass('pkey')" @click="setSort('pkey')">
              Ext
            </th>
            <th class="th-sortable" title="Click to sort" :class="sortClass('shortuid')" @click="setSort('shortuid')">
              SIP Identity
            </th>
            <th class="th-sortable" title="Click to sort" :class="sortClass('cluster')" @click="setSort('cluster')">
              Tenant
            </th>
            <th class="th-sortable" title="Click to sort" :class="sortClass('desc')" @click="setSort('desc')">
              User
            </th>
            <th class="th-sortable" title="Click to sort" :class="sortClass('device')" @click="setSort('device')">
              Device
            </th>
            <th class="th-sortable" title="Click to sort" :class="sortClass('macaddr')" @click="setSort('macaddr')">
              MAC
            </th>
            <th class="th-sortable" title="Click to sort" :class="sortClass('transport')" @click="setSort('transport')">
              Transport
            </th>
            <th class="th-sortable" title="Click to sort" :class="sortClass('active')" @click="setSort('active')">
              Active?
            </th>
            <th class="th-actions" title="Edit"><span class="action-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg></span></th>
            <th class="th-actions" title="Delete"><span class="action-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg></span></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="e in sortedExtensions" :key="e.pkey">
            <td>{{ e.pkey }}</td>
            <td class="cell-immutable" title="Immutable">{{ sipIdentityDisplay(e) }}</td>
            <td>{{ tenantPkeyDisplay(e) }}</td>
            <td :title="(e.desc ?? e.cname ?? e.description ?? '')">{{ userDisplay(e) }}</td>
            <td class="cell-immutable" title="Immutable">{{ e.device ?? e.technology ?? '—' }}</td>
            <td class="cell-immutable" :title="e.macaddr ? 'Immutable' : undefined">{{ e.macaddr ? e.macaddr : 'N/A' }}</td>
            <td>{{ e.transport ?? '—' }}</td>
            <td>{{ e.active ?? '—' }}</td>
            <td>
              <router-link v-if="e.shortuid" :to="{ name: 'extension-detail', params: { shortuid: e.shortuid } }" class="cell-link cell-link-icon" title="Edit" aria-label="Edit">
                <span class="action-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg></span>
              </router-link>
              <span v-else class="cell-link cell-link-icon" title="No shortuid - cannot edit" style="opacity: 0.5;">—</span>
            </td>
            <td>
              <button
                v-if="e.shortuid"
                type="button"
                class="cell-link cell-link-delete cell-link-icon"
                :title="deletingPkey === e.shortuid ? 'Deleting…' : 'Delete'"
                :aria-label="deletingPkey === e.shortuid ? 'Deleting…' : 'Delete'"
                :disabled="deletingPkey === e.shortuid"
                @click="askConfirmDelete(e.shortuid)"
              >
                <span v-if="deletingPkey === e.shortuid" class="action-icon action-icon-spin" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21h5v-5"/></svg></span>
                <span v-else class="action-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg></span>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <DeleteConfirmModal
      :show="!!confirmDeletePkey"
      title="Delete extension?"
      :loading="deletingPkey === confirmDeletePkey"
      @confirm="confirmAndDeleteExtension(confirmDeletePkey)"
      @cancel="cancelConfirmDelete"
    >
      <template #body>
        <p>Extension <strong>{{ confirmDeletePkey }}</strong> will be permanently deleted. This cannot be undone.</p>
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
