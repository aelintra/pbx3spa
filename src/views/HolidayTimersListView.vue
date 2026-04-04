<script setup>
import { ref, computed, onMounted } from 'vue'
import { getApiClient } from '@/api/client'
import { useToastStore } from '@/stores/toast'
import { normalizeList } from '@/utils/listResponse'
import { useStickyFilter, useStickySort } from '@/composables/useStickyFilter'
import { firstErrorMessage } from '@/utils/formErrors'
import DeleteConfirmModal from '@/components/DeleteConfirmModal.vue'
import ListLoadingState from '@/components/ListLoadingState.vue'

const { filterText } = useStickyFilter('holidaytimers')
const toast = useToastStore()
const holidaytimers = ref([])
const tenants = ref([])
const loading = ref(true)
const error = ref('')
const deleteError = ref('')
const deletingShortuid = ref(null)
const confirmDeleteShortuid = ref(null)
const { sortKey, sortOrder } = useStickySort('holidaytimers', { defaultKey: 'stime' })

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

/** Format epoch seconds as local date-time string. */
function formatEpoch(epoch) {
  if (epoch == null || epoch === '') return '—'
  const n = Number(epoch)
  if (Number.isNaN(n)) return '—'
  const d = new Date(n * 1000)
  return d.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })
}

/** State: IDLE or *INUSE* when now is between stime and etime. */
function stateDisplay(item) {
  const stime = item.stime != null ? Number(item.stime) : null
  const etime = item.etime != null ? Number(item.etime) : null
  if (stime == null || etime == null) return '—'
  const now = Math.floor(Date.now() / 1000)
  return now >= stime && now < etime ? '*INUSE*' : 'IDLE'
}

const filteredHolidaytimers = computed(() => {
  const list = holidaytimers.value
  const q = (filterText.value || '').trim().toLowerCase()
  if (!q) return list
  const map = clusterToTenantPkey.value
  return list.filter((item) => {
    const shortuid = (item.shortuid ?? '').toString().toLowerCase()
    const cluster = (item.cluster ?? '').toString().toLowerCase()
    const tenant = (map.get(String(item.cluster)) ?? item.cluster ?? '').toString().toLowerCase()
    const desc = (item.description ?? '').toString().toLowerCase()
    const route = (item.route ?? '').toString().toLowerCase()
    const state = stateDisplay(item).toLowerCase()
    const start = formatEpoch(item.stime).toLowerCase()
    const end = formatEpoch(item.etime).toLowerCase()
    return (
      shortuid.includes(q) ||
      cluster.includes(q) ||
      tenant.includes(q) ||
      desc.includes(q) ||
      route.includes(q) ||
      state.includes(q) ||
      start.includes(q) ||
      end.includes(q)
    )
  })
})

function sortValue(item, key) {
  if (key === 'cluster') return tenantPkeyDisplay(item)
  if (key === 'stime' || key === 'etime') {
    const n = Number(item[key])
    return Number.isFinite(n) ? n : 0
  }
  if (key === 'state') return stateDisplay(item)
  const v = item[key]
  if (v == null || v === '') return ''
  return String(v)
}

const sortedHolidaytimers = computed(() => {
  const list = [...filteredHolidaytimers.value]
  const key = sortKey.value
  const order = sortOrder.value
  list.sort((a, b) => {
    const va = sortValue(a, key)
    const vb = sortValue(b, key)
    let cmp = 0
    if (typeof va === 'number' && typeof vb === 'number') {
      cmp = va - vb
    } else {
      const sa = String(va).toLowerCase()
      const sb = String(vb).toLowerCase()
      if (sa < sb) cmp = -1
      else if (sa > sb) cmp = 1
    }
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

async function loadHolidaytimers() {
  loading.value = true
  error.value = ''
  try {
    const [htRes, tRes] = await Promise.all([
      getApiClient().get('holidaytimers'),
      getApiClient().get('tenants')
    ])
    holidaytimers.value = normalizeList(htRes, 'holidaytimers') || normalizeList(htRes)
    tenants.value = normalizeList(tRes, 'tenants')
  } catch (err) {
    error.value = firstErrorMessage(err, 'Failed to load Holiday timers')
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
    await getApiClient().delete(`holidaytimers/${encodeURIComponent(shortuid)}`)
    await loadHolidaytimers()
    toast.show('Holiday timer deleted')
  } catch (err) {
    deleteError.value = firstErrorMessage(err, 'Failed to delete Holiday timer')
  } finally {
    confirmDeleteShortuid.value = null
    deletingShortuid.value = null
  }
}

onMounted(loadHolidaytimers)
</script>

<template>
  <div class="list-view">
    <header class="list-header">
      <h1>Holiday timers</h1>
      <p class="toolbar">
        <router-link :to="{ name: 'holidaytimer-create' }" class="add-btn">Create</router-link>
        <input
          v-model="filterText"
          type="search"
          class="filter-input"
          placeholder="Filter by UID, tenant, description, route, state, dates"
          aria-label="Filter Holiday timers"
        />
      </p>
    </header>

    <section
      v-if="loading || error || deleteError || holidaytimers.length === 0"
      class="list-states"
    >
      <ListLoadingState v-if="loading" message="Loading Holiday timers from API…" />
      <p v-else-if="error" class="error">{{ error }}</p>
      <p v-if="deleteError" class="error">{{ deleteError }}</p>
      <div v-else-if="holidaytimers.length === 0" class="empty">No Holiday timers.</div>
    </section>

    <section v-else class="list-body">
      <p v-if="filterText && filteredHolidaytimers.length === 0" class="empty">
        No timers match the filter.
      </p>
      <table v-else class="table">
        <thead>
          <tr>
            <th
              class="th-sortable"
              title="Click to sort"
              :class="sortClass('shortuid')"
              @click="setSort('shortuid')"
            >
              UID
            </th>
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
              :class="sortClass('stime')"
              @click="setSort('stime')"
            >
              Start
            </th>
            <th
              class="th-sortable"
              title="Click to sort"
              :class="sortClass('etime')"
              @click="setSort('etime')"
            >
              End
            </th>
            <th
              class="th-sortable"
              title="Click to sort"
              :class="sortClass('description')"
              @click="setSort('description')"
            >
              Description
            </th>
            <th
              class="th-sortable"
              title="Click to sort"
              :class="sortClass('route')"
              @click="setSort('route')"
            >
              Route
            </th>
            <th
              class="th-sortable"
              title="Click to sort"
              :class="sortClass('state')"
              @click="setSort('state')"
            >
              State
            </th>
            <th class="th-actions" title="Edit">
              <span class="action-icon" aria-hidden="true"
                ><svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="1em"
                  height="1em"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /></svg
              ></span>
            </th>
            <th class="th-actions" title="Delete">
              <span class="action-icon" aria-hidden="true"
                ><svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="1em"
                  height="1em"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="M3 6h18" />
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                  <line x1="10" x2="10" y1="11" y2="17" />
                  <line x1="14" x2="14" y1="11" y2="17" /></svg
              ></span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="h in sortedHolidaytimers" :key="h.shortuid || h.id || h.pkey">
            <td class="cell-immutable" title="Immutable">{{ h.shortuid ?? '—' }}</td>
            <td>{{ tenantPkeyDisplay(h) }}</td>
            <td>{{ formatEpoch(h.stime) }}</td>
            <td>{{ formatEpoch(h.etime) }}</td>
            <td>{{ h.description ?? '—' }}</td>
            <td>{{ h.route ?? '—' }}</td>
            <td>{{ stateDisplay(h) }}</td>
            <td>
              <router-link
                v-if="h.shortuid"
                :to="{ name: 'holidaytimer-detail', params: { shortuid: h.shortuid } }"
                class="cell-link cell-link-icon"
                title="Edit"
                aria-label="Edit"
              >
                <span class="action-icon" aria-hidden="true"
                  ><svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="1em"
                    height="1em"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /></svg
                ></span>
              </router-link>
              <span v-else style="opacity: 0.5">—</span>
            </td>
            <td>
              <button
                v-if="h.shortuid"
                type="button"
                class="cell-link cell-link-delete cell-link-icon"
                :disabled="deletingShortuid === h.shortuid"
                :title="deletingShortuid === h.shortuid ? 'Deleting…' : 'Delete'"
                @click="askConfirmDelete(h.shortuid)"
              >
                <span
                  v-if="deletingShortuid === h.shortuid"
                  class="action-icon action-icon-spin"
                  aria-hidden="true"
                  ><svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="1em"
                    height="1em"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                    <path d="M3 3v5h5" />
                    <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                    <path d="M16 21h5v-5" /></svg
                ></span>
                <span v-else class="action-icon" aria-hidden="true"
                  ><svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="1em"
                    height="1em"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path d="M3 6h18" />
                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                    <line x1="10" x2="10" y1="11" y2="17" />
                    <line x1="14" x2="14" y1="11" y2="17" /></svg
                ></span>
              </button>
              <span v-else style="opacity: 0.5">—</span>
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <DeleteConfirmModal
      :show="!!confirmDeleteShortuid"
      title="Delete Holiday timer?"
      :loading="deletingShortuid === confirmDeleteShortuid"
      @confirm="confirmDeleteShortuid && confirmAndDelete(confirmDeleteShortuid)"
      @cancel="cancelConfirmDelete"
    >
      <template #body>
        <p>This Holiday timer will be permanently deleted. This cannot be undone.</p>
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
.list-states,
.list-body {
  margin: 0;
}
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
.action-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.action-icon-spin {
  animation: action-icon-spin 0.8s linear infinite;
}
@keyframes action-icon-spin {
  to {
    transform: rotate(360deg);
  }
}
.cell-link-icon {
  padding: 0.25rem;
}
.table tbody tr:hover {
  background: #f8fafc;
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
.cell-link:hover {
  text-decoration: underline;
}
.cell-link-delete {
  color: #dc2626;
}
.cell-link:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
.toolbar {
  margin: 0.75rem 0 0 0;
  display: flex;
  justify-content: space-between;
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
