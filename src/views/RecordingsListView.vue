<template>
  <div class="recordings-view">
    <h1>Recordings</h1>
    <p class="subtitle">
      One catalog for this node: local archive and S3-backed rows. From / To / Tenant / Search
      filter that list (UTC). Play fetches the blob (S3 proxy can take a second or two). Storage:
      <strong>Spool</strong> → <strong>Local</strong> → <strong>S3</strong>.
    </p>

    <div class="filters">
      <label class="filter">
        <span class="filter-label">Tenant</span>
        <select v-model="filterTenant" class="filter-input">
          <option value="">All tenants</option>
          <option v-for="t in tenantOptions" :key="t.shortuid" :value="t.shortuid">
            {{ t.name }}
          </option>
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
          autocomplete="off"
          autocapitalize="off"
          autocorrect="off"
          spellcheck="false"
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

    <div v-if="nowPlaying || fetchStatus" class="player">
      <div class="player-meta">
        <template v-if="nowPlaying">
          <strong>Playing:</strong> <span class="mono">{{ nowPlaying.filename }}</span>
        </template>
        <span v-else-if="fetchStatus" class="fetch-status">{{ fetchStatus }}</span>
      </div>
      <audio
        v-if="audioSrc"
        ref="audioEl"
        :src="audioSrc"
        controls
        autoplay
        class="player-audio"
      ></audio>
      <button v-if="nowPlaying" type="button" class="clear-btn" @click="stopPlaying">Close</button>
    </div>

    <div v-if="loading" class="loading">
      <span class="spinner" aria-hidden="true"></span>
      <span>Loading recordings…</span>
    </div>
    <p v-else-if="error" class="error">{{ error }}</p>
    <div v-else-if="sortedRecordings.length === 0" class="empty">No recordings found.</div>

    <div v-else class="recordings-list">
      <p class="result-count">{{ sortedRecordings.length }} recording(s)</p>
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
              :class="sortClass('tenant_name')"
              title="Click to sort"
              @click="setSort('tenant_name')"
            >
              Tenant
            </th>
            <th>Caller</th>
            <th>Callee</th>
            <th>Queue / Ext</th>
            <th
              class="th-sortable"
              :class="sortClass('storage')"
              title="Where the recording lives"
              @click="setSort('storage')"
            >
              Storage
            </th>
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
            <td :title="rec.tenant">{{ rec.tenant_name || rec.tenant }}</td>
            <td class="mono">{{ rec.callerid || '—' }}</td>
            <td class="mono">{{ rec.dnid || '—' }}</td>
            <td>
              <span v-if="rec.queue">{{ rec.queue }}<span v-if="rec.extension"> / {{ rec.extension }}</span></span>
              <span v-else-if="rec.is_queue" class="muted">queue</span>
              <span v-else>—</span>
            </td>
            <td>
              <span
                class="storage-badge"
                :class="storageBadgeClass(rec)"
                :title="storageTitle(rec)"
              >{{ storageLabel(rec) }}</span>
            </td>
            <td class="col-size">{{ formatBytes(rec.filesize) }}</td>
            <td class="cell-actions col-actions">
              <button
                type="button"
                class="cell-link"
                :title="nowPlaying?.id === rec.id ? 'Stop' : 'Play'"
                :disabled="loadingAudioId === rec.id"
                :aria-busy="loadingAudioId === rec.id"
                @click="togglePlay(rec)"
              >
                <span
                  v-if="loadingAudioId === rec.id"
                  class="spinner spinner-inline"
                  aria-hidden="true"
                ></span>
                <span v-else-if="nowPlaying?.id === rec.id">■</span>
                <span v-else>▶</span>
              </button>
              <button
                type="button"
                class="cell-link"
                title="Download"
                :disabled="downloadingId === rec.id"
                :aria-busy="downloadingId === rec.id"
                @click="downloadRecording(rec)"
              >
                <span
                  v-if="downloadingId === rec.id"
                  class="spinner spinner-inline"
                  aria-hidden="true"
                ></span>
                <span v-else>↓</span>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { getApiClient } from '@/api/client'
import { useToastStore } from '@/stores/toast'
import { useStickySort } from '@/composables/useStickyFilter'
import { firstErrorMessage } from '@/utils/formErrors'
import { loadTenantOptions } from '@/utils/loadTenantOptions'

const toast = useToastStore()

const recordings = ref([])
const tenants = ref([])
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
const fetchStatus = ref('')
let currentObjectUrl = null
let filterTimer = null

const { sortKey, sortOrder } = useStickySort('recordings-list', {
  defaultKey: 'epoch',
  defaultOrder: 'desc'
})

const tenantOptions = computed(() => {
  const map = new Map()
  for (const t of tenants.value) {
    const shortuid = t.shortuid
    if (!shortuid || map.has(shortuid)) continue
    map.set(shortuid, t.pkey || t.name || shortuid)
  }
  // Keep any tenants that appear in the current result set (scoped users / drift).
  for (const rec of recordings.value) {
    if (rec.tenant && !map.has(rec.tenant)) {
      map.set(rec.tenant, rec.tenant_name || rec.tenant)
    }
  }
  return Array.from(map, ([shortuid, name]) => ({ shortuid, name })).sort((a, b) =>
    a.name.localeCompare(b.name)
  )
})

const hasActiveFilter = computed(
  () =>
    filterTenant.value !== '' ||
    filterFrom.value !== '' ||
    filterTo.value !== '' ||
    filterSearch.value.trim() !== ''
)

const sortedRecordings = computed(() => {
  const list = [...recordings.value]
  const key = sortKey.value
  const order = sortOrder.value
  list.sort((a, b) => {
    let va
    let vb
    if (key === 'storage') {
      va = storageLabel(a).toLowerCase()
      vb = storageLabel(b).toLowerCase()
    } else if (key === 'epoch' || key === 'filesize') {
      va = Number(a[key]) || 0
      vb = Number(b[key]) || 0
    } else {
      va = String(a[key] ?? '').toLowerCase()
      vb = String(b[key] ?? '').toLowerCase()
    }
    let cmp = 0
    if (va < vb) cmp = -1
    else if (va > vb) cmp = 1
    return order === 'asc' ? cmp : -cmp
  })
  return list
})

/** Operator-facing storage tier for a recording row. */
function storageLabel(rec) {
  const loc = rec.location || ''
  const onS3 = !!(rec.on_s3 || rec.archived || loc === 's3_only')
  if (loc === 's3_only' || rec.archived) return 'S3 only'
  if (loc === 'spool') return onS3 ? 'Spool + S3' : 'Spool'
  if (onS3) return 'Local + S3'
  if (loc === 'archive' || loc === 's3') return 'Local'
  return loc || 'Local'
}

function storageTitle(rec) {
  const loc = rec.location || ''
  const onS3 = !!(rec.on_s3 || rec.archived || loc === 's3_only')
  if (loc === 's3_only' || rec.archived) {
    return 'Local copy aged off — play/download via S3 archive (gatekeeper)'
  }
  if (loc === 'spool') {
    return onS3
      ? 'Still in Asterisk spool; also copied to S3'
      : 'Hot capture under /var/spool/asterisk/monitor (not yet offloaded to local archive)'
  }
  if (onS3) {
    return 'On-node archive and copied to the fleet recordings S3 bucket'
  }
  return 'On-node archive under /opt/pbx3/media/recordings (not yet on S3)'
}

function storageBadgeClass(rec) {
  const label = storageLabel(rec)
  if (label === 'S3 only') return 'storage-s3-only'
  if (label.includes('S3')) return 'storage-s3'
  if (label === 'Spool') return 'storage-spool'
  return 'storage-local'
}

function isRemoteArchive(rec) {
  const loc = rec.location || ''
  return !!(rec.archived || loc === 's3_only' || (rec.on_s3 && !rec.playable))
}

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

function buildListParams() {
  const params = {}
  if (filterTenant.value) params.tenant = filterTenant.value
  if (filterFrom.value) params.from = filterFrom.value
  if (filterTo.value) params.to = filterTo.value
  if (filterSearch.value.trim()) params.search = filterSearch.value.trim()
  return params
}

async function loadRecordings() {
  if (filterTimer) {
    clearTimeout(filterTimer)
    filterTimer = null
  }
  loading.value = true
  error.value = ''
  try {
    const response = await getApiClient().get('recordings', { params: buildListParams() })
    recordings.value = Array.isArray(response) ? response : []
  } catch (err) {
    error.value = firstErrorMessage(err, 'Failed to load recordings')
    recordings.value = []
  } finally {
    loading.value = false
  }
}

function scheduleReload() {
  if (filterTimer) clearTimeout(filterTimer)
  filterTimer = setTimeout(() => {
    filterTimer = null
    loadRecordings()
  }, 300)
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
  fetchStatus.value = isRemoteArchive(rec) ? 'Fetching from archive…' : 'Loading audio…'
  try {
    const blob = await getApiClient().getBlob(`recordings/${rec.id}/stream`)
    revokeObjectUrl()
    currentObjectUrl = window.URL.createObjectURL(blob)
    audioSrc.value = currentObjectUrl
    nowPlaying.value = rec
    fetchStatus.value = ''
  } catch (err) {
    fetchStatus.value = ''
    toast.show(firstErrorMessage(err, 'Failed to play recording'), 'error')
  } finally {
    loadingAudioId.value = null
  }
}

function stopPlaying() {
  nowPlaying.value = null
  audioSrc.value = ''
  fetchStatus.value = ''
  revokeObjectUrl()
}

async function downloadRecording(rec) {
  downloadingId.value = rec.id
  if (isRemoteArchive(rec)) {
    fetchStatus.value = 'Fetching from archive…'
  }
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
    if (!loadingAudioId.value) fetchStatus.value = ''
  }
}

async function loadTenants() {
  try {
    tenants.value = await loadTenantOptions()
  } catch {
    tenants.value = []
  }
}

watch([filterTenant, filterFrom, filterTo, filterSearch], scheduleReload)

onMounted(async () => {
  await loadTenants()
  await loadRecordings()
})
onBeforeUnmount(() => {
  if (filterTimer) clearTimeout(filterTimer)
  revokeObjectUrl()
})
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
  box-sizing: border-box;
  height: 2.375rem;
  padding: 0.375rem 0.75rem;
  font-size: 0.9375rem;
  line-height: 1.25;
  border: 1px solid #cbd5e1;
  border-radius: 0.375rem;
  background: white;
  color: #0f172a;
}

select.filter-input {
  min-width: 10rem;
}

input[type='date'].filter-input {
  width: 10rem;
  min-width: 0;
  padding-right: 0.5rem;
}

input[type='date'].filter-input::-webkit-datetime-edit {
  padding: 0;
  margin: 0;
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

.fetch-status {
  color: #64748b;
  font-style: italic;
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

.archived-badge,
.storage-badge {
  display: inline-block;
  padding: 0.05rem 0.4rem;
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  border-radius: 0.25rem;
  vertical-align: middle;
  white-space: nowrap;
}

.storage-local {
  color: #334155;
  background: #e2e8f0;
}

.storage-spool {
  color: #9a3412;
  background: #ffedd5;
}

.storage-s3 {
  color: #1e40af;
  background: #dbeafe;
}

.storage-s3-only {
  color: #5b21b6;
  background: #ede9fe;
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
  flex-shrink: 0;
}

.spinner-inline {
  width: 0.85rem;
  height: 0.85rem;
  border-width: 2px;
  display: inline-block;
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
