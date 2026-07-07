<template>
  <div class="recordings-view">
    <h1>Recordings</h1>
    <p class="subtitle">Call recordings stored on this node. Times shown in UTC.</p>

    <div class="filters">
      <label class="filter">
        <span class="filter-label">Tenant</span>
        <select v-model="filterTenant" class="filter-input">
          <option value="">All tenants</option>
          <option v-for="t in tenantOptions" :key="t" :value="t">{{ t }}</option>
        </select>
      </label>
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
          placeholder="Caller, callee, queue, extension, filename"
        />
      </label>
      <button
        v-if="hasActiveFilter"
        type="button"
        class="clear-btn"
        title="Clear filters"
        @click="clearFilters"
      >
        Clear
      </button>
      <button
        type="button"
        class="clear-btn"
        title="Reload from server"
        :disabled="loading"
        @click="loadRecordings"
      >
        Refresh
      </button>
    </div>

    <div v-if="nowPlaying" class="player">
      <div class="player-meta">
        <strong>Playing:</strong> <span class="mono">{{ nowPlaying.filename }}</span>
      </div>
      <audio ref="audioEl" :src="audioSrc" controls autoplay class="player-audio"></audio>
      <button type="button" class="clear-btn" @click="stopPlaying">Close</button>
    </div>

    <div v-if="loading" class="loading">
      <span class="spinner"></span>
      <span>Loading recordings…</span>
    </div>
    <p v-else-if="error" class="error">{{ error }}</p>
    <div v-else-if="filteredRecordings.length === 0" class="empty">No recordings found.</div>

    <div v-else class="recordings-list">
      <p class="result-count">{{ filteredRecordings.length }} recording(s)</p>
      <table class="table">
        <thead>
          <tr>
            <th
              class="th-sortable"
              :class="sortClass('epoch')"
              title="Click to sort"
              @click="setSort('epoch')"
            >
              Date (UTC)
            </th>
            <th
              class="th-sortable"
              :class="sortClass('tenant')"
              title="Click to sort"
              @click="setSort('tenant')"
            >
              Tenant
            </th>
            <th>Caller</th>
            <th>Callee</th>
            <th>Queue / Ext</th>
            <th
              class="th-sortable col-size"
              :class="sortClass('filesize')"
              title="Click to sort"
              @click="setSort('filesize')"
            >
              Size
            </th>
            <th class="th-actions col-actions">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="rec in sortedRecordings" :key="rec.id" :class="{ playing: nowPlaying?.id === rec.id }">
            <td class="mono" :title="rec.created_at || ''">{{ formatDate(rec) }}</td>
            <td>{{ rec.tenant }}</td>
            <td class="mono">{{ rec.callerid || '—' }}</td>
            <td class="mono">{{ rec.dnid || '—' }}</td>
            <td>
              <span v-if="rec.queue">{{ rec.queue }}<span v-if="rec.extension"> / {{ rec.extension }}</span></span>
              <span v-else-if="rec.is_queue" class="muted">queue</span>
              <span v-else>—</span>
            </td>
            <td class="col-size">{{ formatBytes(rec.filesize) }}</td>
            <td class="cell-actions col-actions">
              <button
                type="button"
                class="cell-link"
                :title="nowPlaying?.id === rec.id ? 'Stop' : 'Play'"
                :disabled="loadingAudioId === rec.id"
                @click="togglePlay(rec)"
              >
                <span v-if="loadingAudioId === rec.id">…</span>
                <span v-else-if="nowPlaying?.id === rec.id">■</span>
                <span v-else>▶</span>
              </button>
              <button
                type="button"
                class="cell-link"
                title="Download"
                :disabled="downloadingId === rec.id"
                @click="downloadRecording(rec)"
              >
                {{ downloadingId === rec.id ? '…' : '↓' }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { getApiClient } from '@/api/client'
import { useToastStore } from '@/stores/toast'
import { useStickySort } from '@/composables/useStickyFilter'
import { firstErrorMessage } from '@/utils/formErrors'

const toast = useToastStore()

const recordings = ref([])
const loading = ref(true)
const error = ref('')

const filterTenant = ref('')
const filterFrom = ref('')
const filterTo = ref('')
const filterSearch = ref('')

const nowPlaying = ref(null)
const audioSrc = ref('')
const loadingAudioId = ref(null)
const downloadingId = ref(null)
let currentObjectUrl = null

const { sortKey, sortOrder } = useStickySort('recordings-list', {
  defaultKey: 'epoch',
  defaultOrder: 'desc'
})

const tenantOptions = computed(() => {
  const set = new Set()
  for (const rec of recordings.value) {
    if (rec.tenant) set.add(rec.tenant)
  }
  return Array.from(set).sort()
})

const hasActiveFilter = computed(
  () =>
    filterTenant.value !== '' ||
    filterFrom.value !== '' ||
    filterTo.value !== '' ||
    filterSearch.value.trim() !== ''
)

const filteredRecordings = computed(() => {
  const tenant = filterTenant.value
  const search = filterSearch.value.trim().toLowerCase()
  const fromEpoch = filterFrom.value ? Date.parse(filterFrom.value + 'T00:00:00Z') / 1000 : null
  const toEpoch = filterTo.value ? Date.parse(filterTo.value + 'T23:59:59Z') / 1000 : null

  return recordings.value.filter((rec) => {
    if (tenant && rec.tenant !== tenant) return false
    if (fromEpoch && rec.epoch > 0 && rec.epoch < fromEpoch) return false
    if (toEpoch && rec.epoch > 0 && rec.epoch > toEpoch) return false
    if (search) {
      const hay = [rec.filename, rec.callerid, rec.dnid, rec.queue, rec.extension]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      if (!hay.includes(search)) return false
    }
    return true
  })
})

const sortedRecordings = computed(() => {
  const list = [...filteredRecordings.value]
  const key = sortKey.value
  const order = sortOrder.value
  list.sort((a, b) => {
    let va = a[key]
    let vb = b[key]
    if (key === 'epoch' || key === 'filesize') {
      va = Number(va) || 0
      vb = Number(vb) || 0
    } else {
      va = String(va ?? '').toLowerCase()
      vb = String(vb ?? '').toLowerCase()
    }
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
    sortOrder.value = key === 'epoch' || key === 'filesize' ? 'desc' : 'asc'
  }
}

function sortClass(key) {
  if (sortKey.value !== key) return ''
  return sortOrder.value === 'asc' ? 'sort-asc' : 'sort-desc'
}

function clearFilters() {
  filterTenant.value = ''
  filterFrom.value = ''
  filterTo.value = ''
  filterSearch.value = ''
}

function formatDate(rec) {
  if (!rec.created_at) return rec.epoch ? String(rec.epoch) : '—'
  return rec.created_at.replace('T', ' ').replace('Z', '')
}

function formatBytes(bytes) {
  if (bytes == null) return '—'
  const n = parseInt(bytes, 10)
  if (isNaN(n)) return String(bytes)
  if (n >= 1073741824) return (n / 1073741824).toFixed(1) + ' GB'
  if (n >= 1048576) return (n / 1048576).toFixed(1) + ' MB'
  if (n >= 1024) return (n / 1024).toFixed(1) + ' KB'
  return n + ' B'
}

async function loadRecordings() {
  loading.value = true
  error.value = ''
  try {
    const response = await getApiClient().get('recordings')
    recordings.value = Array.isArray(response) ? response : []
  } catch (err) {
    error.value = firstErrorMessage(err, 'Failed to load recordings')
    recordings.value = []
  } finally {
    loading.value = false
  }
}

function revokeObjectUrl() {
  if (currentObjectUrl) {
    window.URL.revokeObjectURL(currentObjectUrl)
    currentObjectUrl = null
  }
}

async function togglePlay(rec) {
  if (nowPlaying.value?.id === rec.id) {
    stopPlaying()
    return
  }
  loadingAudioId.value = rec.id
  try {
    const blob = await getApiClient().getBlob(`recordings/${rec.id}/stream`)
    revokeObjectUrl()
    currentObjectUrl = window.URL.createObjectURL(blob)
    audioSrc.value = currentObjectUrl
    nowPlaying.value = rec
  } catch (err) {
    toast.show(firstErrorMessage(err, 'Failed to play recording'), 'error')
  } finally {
    loadingAudioId.value = null
  }
}

function stopPlaying() {
  nowPlaying.value = null
  audioSrc.value = ''
  revokeObjectUrl()
}

async function downloadRecording(rec) {
  downloadingId.value = rec.id
  try {
    const blob = await getApiClient().getBlob(`recordings/${rec.id}/download`)
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = rec.filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
    toast.show('Recording download started')
  } catch (err) {
    toast.show(firstErrorMessage(err, 'Failed to download recording'), 'error')
  } finally {
    downloadingId.value = null
  }
}

onMounted(loadRecordings)
onBeforeUnmount(revokeObjectUrl)
</script>

<style scoped>
.recordings-view {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.subtitle {
  margin: 0;
  color: #64748b;
  font-size: 0.9375rem;
}

.filters {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 0.75rem;
}

.filter {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.filter-grow {
  flex: 1 1 16rem;
}

.filter-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: #475569;
}

.filter-input {
  padding: 0.4rem 0.6rem;
  font-size: 0.9375rem;
  border: 1px solid #cbd5e1;
  border-radius: 0.375rem;
  background: white;
  color: #0f172a;
}

.filter-grow .filter-input {
  width: 100%;
  box-sizing: border-box;
}

.clear-btn {
  padding: 0.45rem 0.9rem;
  font-size: 0.875rem;
  font-weight: 500;
  border-radius: 0.375rem;
  border: 1px solid #cbd5e1;
  background: white;
  color: #475569;
  cursor: pointer;
}

.clear-btn:hover:not(:disabled) {
  background: #f8fafc;
  border-color: #94a3b8;
}

.clear-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.player {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
  padding: 0.75rem 1rem;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
}

.player-meta {
  font-size: 0.9375rem;
  color: #334155;
}

.player-audio {
  flex: 1 1 20rem;
  height: 2.25rem;
}

.result-count {
  margin: 0 0 0.25rem 0;
  font-size: 0.8125rem;
  color: #64748b;
}

.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.875rem;
}

.muted {
  color: #94a3b8;
  font-style: italic;
}

.loading {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.spinner {
  width: 1.25rem;
  height: 1.25rem;
  border: 2px solid #e2e8f0;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.empty {
  color: #64748b;
}

.error {
  color: #dc2626;
}

.recordings-list {
  max-width: 100%;
  overflow-x: auto;
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
  white-space: nowrap;
}

.table th {
  font-weight: 600;
  color: #475569;
  background: #f8fafc;
}

.table tbody tr.playing {
  background: #eff6ff;
}

.col-size {
  text-align: right;
}

.col-actions {
  width: 1%;
  white-space: nowrap;
}

.cell-actions {
  display: flex;
  gap: 0.5rem;
}

.th-sortable {
  cursor: pointer;
  user-select: none;
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

.cell-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  padding: 0.25rem;
  background: none;
  border: 1px solid #e2e8f0;
  border-radius: 0.25rem;
  cursor: pointer;
  color: #475569;
  font-size: 0.9375rem;
}

.cell-link:hover:not(:disabled) {
  background: #f1f5f9;
  border-color: #cbd5e1;
}

.cell-link:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
