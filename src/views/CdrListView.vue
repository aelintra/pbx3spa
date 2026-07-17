<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { getApiClient } from '@/api/client'
import { useStickyFilter } from '@/composables/useStickyFilter'
import { firstErrorMessage } from '@/utils/formErrors'

const { filterText: filterSearch } = useStickyFilter('cdr-search')
const filterFrom = ref('')
const filterTo = ref('')
const filterAccount = ref('')
const filterDisposition = ref('')

const rows = ref([])
const total = ref(0)
const available = ref(true)
const loading = ref(true)
const error = ref('')
const limit = ref(100)
const offset = ref(0)

const DISPOSITIONS = ['', 'ANSWERED', 'NO ANSWER', 'BUSY', 'FAILED', 'CONGESTION']

const hasActiveFilter = computed(
  () =>
    filterFrom.value !== '' ||
    filterTo.value !== '' ||
    filterAccount.value.trim() !== '' ||
    filterDisposition.value !== '' ||
    filterSearch.value.trim() !== ''
)

const pageLabel = computed(() => {
  if (total.value === 0) return '0 rows'
  const start = offset.value + 1
  const end = Math.min(offset.value + rows.value.length, total.value)
  return `${start}–${end} of ${total.value}`
})

const canPrev = computed(() => offset.value > 0)
const canNext = computed(() => offset.value + rows.value.length < total.value)

function clearFilters() {
  filterFrom.value = ''
  filterTo.value = ''
  filterAccount.value = ''
  filterDisposition.value = ''
  filterSearch.value = ''
  offset.value = 0
}

async function loadCdr() {
  loading.value = true
  error.value = ''
  try {
    const params = {
      limit: limit.value,
      offset: offset.value
    }
    if (filterFrom.value) params.from = filterFrom.value
    if (filterTo.value) params.to = filterTo.value
    if (filterSearch.value.trim()) params.search = filterSearch.value.trim()
    if (filterAccount.value.trim()) params.accountcode = filterAccount.value.trim()
    if (filterDisposition.value) params.disposition = filterDisposition.value

    const res = await getApiClient().get('cdr', { params })
    available.value = res.available !== false
    rows.value = Array.isArray(res.rows) ? res.rows : []
    total.value = Number(res.total) || 0
    if (!available.value) {
      error.value =
        'Asterisk CDR SQLite (master.db) not available on this node yet. Enable cdr_sqlite3_custom and place a test call.'
    }
  } catch (err) {
    error.value = firstErrorMessage(err, 'Failed to load CDR')
    rows.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

function prevPage() {
  offset.value = Math.max(0, offset.value - limit.value)
}

function nextPage() {
  offset.value = offset.value + limit.value
}

function applyFilters() {
  offset.value = 0
  loadCdr()
}

watch([offset], () => {
  loadCdr()
})

onMounted(loadCdr)
</script>

<template>
  <div class="cdr-view">
    <h1>CDR</h1>
    <p class="subtitle">
      Searchable call detail from Asterisk SQLite (<code>master.db</code>). Rotated CSV archive
      remains under System Logs → S3. Times as stored by Asterisk (GMT when configured).
    </p>

    <div class="filters">
      <label class="filter">
        <span class="filter-label">From</span>
        <input v-model="filterFrom" type="date" class="filter-input" />
      </label>
      <label class="filter">
        <span class="filter-label">To</span>
        <input v-model="filterTo" type="date" class="filter-input" />
      </label>
      <label class="filter filter-grow">
        <span class="filter-label">Search</span>
        <input
          v-model="filterSearch"
          type="text"
          class="filter-input"
          placeholder="clid, src, dst, uniqueid, account"
          @keydown.enter="applyFilters"
        />
      </label>
      <label class="filter">
        <span class="filter-label">Account</span>
        <input v-model="filterAccount" type="text" class="filter-input" @keydown.enter="applyFilters" />
      </label>
      <label class="filter">
        <span class="filter-label">Disposition</span>
        <select v-model="filterDisposition" class="filter-input">
          <option v-for="d in DISPOSITIONS" :key="d || 'any'" :value="d">
            {{ d || 'Any' }}
          </option>
        </select>
      </label>
      <button type="button" class="clear-btn" :disabled="loading" @click="applyFilters">Apply</button>
      <button
        v-if="hasActiveFilter"
        type="button"
        class="clear-btn"
        title="Clear filters"
        @click="clearFilters(); loadCdr()"
      >
        Clear
      </button>
      <button type="button" class="clear-btn" :disabled="loading" @click="loadCdr">Refresh</button>
    </div>

    <div v-if="loading" class="loading">Loading CDR…</div>
    <p v-else-if="error && !available" class="empty">{{ error }}</p>
    <p v-else-if="error" class="error">{{ error }}</p>
    <div v-else-if="rows.length === 0" class="empty">No CDR rows match.</div>
    <div v-else class="cdr-list">
      <div class="pager">
        <span class="result-count">{{ pageLabel }}</span>
        <button type="button" class="clear-btn" :disabled="!canPrev || loading" @click="prevPage">
          Prev
        </button>
        <button type="button" class="clear-btn" :disabled="!canNext || loading" @click="nextPage">
          Next
        </button>
      </div>
      <table class="table">
        <thead>
          <tr>
            <th>Call date</th>
            <th>Src</th>
            <th>Dst</th>
            <th>Disposition</th>
            <th class="num">Billsec</th>
            <th class="num">Duration</th>
            <th>Account</th>
            <th>Uniqueid</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, i) in rows" :key="(row.uniqueid || '') + '-' + i">
            <td class="mono">{{ row.calldate }}</td>
            <td>{{ row.src }}</td>
            <td>{{ row.dst }}</td>
            <td>{{ row.disposition }}</td>
            <td class="num">{{ row.billsec }}</td>
            <td class="num">{{ row.duration }}</td>
            <td>{{ row.accountcode || '—' }}</td>
            <td class="mono small">{{ row.uniqueid }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.cdr-view {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.subtitle {
  margin: 0;
  color: #64748b;
  font-size: 0.95rem;
}
.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: flex-end;
  position: sticky;
  top: 0;
  z-index: 2;
  background: #fff;
  padding: 0.5rem 0;
}
.filter {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.filter-grow {
  flex: 1;
  min-width: 12rem;
}
.filter-label {
  font-size: 0.8rem;
  color: #64748b;
}
.filter-input {
  padding: 0.4rem 0.55rem;
  border: 1px solid #cbd5e1;
  border-radius: 0.375rem;
  font-size: 0.95rem;
}
.clear-btn {
  padding: 0.4rem 0.75rem;
  border: 1px solid #cbd5e1;
  border-radius: 0.375rem;
  background: #fff;
  cursor: pointer;
  font-size: 0.9rem;
}
.clear-btn:hover:not(:disabled) {
  background: #f1f5f9;
}
.clear-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.loading,
.empty,
.error {
  margin: 0;
}
.error {
  color: #dc2626;
}
.pager {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  margin-bottom: 0.5rem;
}
.result-count {
  color: #64748b;
  font-size: 0.9rem;
}
.table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.95rem;
}
.table th,
.table td {
  padding: 0.45rem 0.6rem;
  text-align: left;
  border-bottom: 1px solid #e2e8f0;
}
.table th {
  font-weight: 600;
  color: #475569;
  background: #f8fafc;
}
.num {
  text-align: right;
  width: 5rem;
}
.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.9rem;
}
.small {
  font-size: 0.8rem;
  color: #64748b;
}
</style>
