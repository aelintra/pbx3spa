<script setup>
import { ref, computed, onMounted } from 'vue'
import { getApiClient } from '@/api/client'

const extensions = ref([])
const tenants = ref([])
const loading = ref(true)
const error = ref('')
const filterText = ref('')
const sortKey = ref('pkey')
const sortOrder = ref('asc') // 'asc' | 'desc'

function normalizeList(response) {
  if (Array.isArray(response)) return response
  if (response && typeof response === 'object') {
    if (Array.isArray(response.data)) return response.data
    if (Array.isArray(response.extensions)) return response.extensions
    if (Array.isArray(response.tenants)) return response.tenants
    if (Object.keys(response).every((k) => /^\d+$/.test(k))) return Object.values(response)
  }
  return []
}

/** Map cluster id (or pkey) → tenant pkey for display */
const clusterToTenantPkey = computed(() => {
  const map = new Map()
  for (const t of tenants.value) {
    if (t.id != null) map.set(String(t.id), t.pkey ?? t.id)
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

onMounted(async () => {
  loading.value = true
  error.value = ''
  try {
    const [extResponse, tenantResponse] = await Promise.all([
      getApiClient().get('extensions'),
      getApiClient().get('tenants')
    ])
    extensions.value = normalizeList(extResponse)
    tenants.value = normalizeList(tenantResponse)
  } catch (err) {
    error.value = err.data?.message || err.message || 'Failed to load extensions'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div>
    <h1>Extensions</h1>
    <p class="toolbar">
      <router-link :to="{ name: 'extension-create' }" class="add-btn">Add extension</router-link>
      <input
        v-model="filterText"
        type="search"
        class="filter-input"
        placeholder="Filter by pkey, tenant, or description"
        aria-label="Filter extensions"
      />
    </p>

    <p v-if="loading" class="loading">Loading extensions from API…</p>
    <p v-else-if="error" class="error">{{ error }}</p>
    <div v-else-if="extensions.length === 0" class="empty">No extensions. (API returned an empty list.)</div>
    <template v-else>
      <p v-if="filterText && filteredExtensions.length === 0" class="empty">No extensions match the filter.</p>
      <table v-else class="table">
        <thead>
          <tr>
            <th class="th-sortable" :class="sortClass('pkey')" @click="setSort('pkey')">
              Ext
            </th>
            <th class="th-sortable" :class="sortClass('shortuid')" @click="setSort('shortuid')">
              SIP Identity
            </th>
            <th class="th-sortable" :class="sortClass('cluster')" @click="setSort('cluster')">
              Tenant
            </th>
            <th class="th-sortable" :class="sortClass('desc')" @click="setSort('desc')">
              User
            </th>
            <th class="th-sortable" :class="sortClass('device')" @click="setSort('device')">
              Device
            </th>
            <th class="th-sortable" :class="sortClass('macaddr')" @click="setSort('macaddr')">
              MAC
            </th>
            <th class="th-sortable" :class="sortClass('transport')" @click="setSort('transport')">
              Transport
            </th>
            <th class="th-sortable" :class="sortClass('active')" @click="setSort('active')">
              Active?
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="e in sortedExtensions" :key="e.pkey">
            <td>
              <router-link :to="{ name: 'extension-detail', params: { pkey: e.pkey } }" class="cell-link">{{ e.pkey }}</router-link>
            </td>
            <td>{{ sipIdentityDisplay(e) }}</td>
            <td>{{ tenantPkeyDisplay(e) }}</td>
            <td :title="(e.desc ?? e.cname ?? e.description ?? '')">{{ userDisplay(e) }}</td>
            <td>{{ e.device ?? e.technology ?? '—' }}</td>
            <td>{{ e.macaddr ? e.macaddr : 'N/A' }}</td>
            <td>{{ e.transport ?? '—' }}</td>
            <td>{{ e.active ?? '—' }}</td>
          </tr>
        </tbody>
      </table>
    </template>
  </div>
</template>

<style scoped>
.loading,
.error,
.empty {
  margin-top: 1rem;
}
.error {
  color: #dc2626;
}
.table {
  margin-top: 1rem;
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
