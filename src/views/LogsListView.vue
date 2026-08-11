<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { getApiClient } from '@/api/client'
import { useToastStore } from '@/stores/toast'
import { useStickyFilter } from '@/composables/useStickyFilter'
import { firstErrorMessage } from '@/utils/formErrors'
import LogViewerModal from '@/components/LogViewerModal.vue'
import ListLoadingState from '@/components/ListLoadingState.vue'

const { filterText } = useStickyFilter('logs')
const toast = useToastStore()
const logs = ref([])
const loading = ref(true)
const error = ref('')
const filterInputRef = ref(null)
const selectedLogPath = ref(null)

const archiveClass = ref('syslog')
const archiveObjects = ref([])
const archiveAvailable = ref(false)
const archiveLoading = ref(false)
const archiveError = ref('')
const archiveDownloading = ref(null)

const sipStatus = ref(null)
const sipLoading = ref(false)
const sipBusy = ref(false)
const sipTtl = ref(30)
const sipPcap = ref(false)
const sipError = ref('')

const ARCHIVE_CLASSES = [
  { value: 'syslog', label: 'syslog' },
  { value: 'asterisk-messages', label: 'Asterisk messages' },
  { value: 'cdr', label: 'CDR CSV' },
  { value: 'sip-text', label: 'SIP text' },
  { value: 'sip-pcap', label: 'SIP pcap' }
]

const filteredLogs = computed(() => {
  const list = logs.value
  const q = (filterText.value || '').trim().toLowerCase()
  if (!q) return list
  return list.filter((log) => (log.path || '').toLowerCase().includes(q))
})

/** Coerce API/script booleans (avoid string "false" truthiness). */
function asBool(v) {
  return v === true || v === 1 || v === '1' || v === 'true'
}

const sipAvailable = computed(() => asBool(sipStatus.value?.available))
const sipArmed = computed(() => asBool(sipStatus.value?.armed))
const sipPcapOn = computed(() => asBool(sipStatus.value?.pcap))

const sipBadge = computed(() => {
  const s = sipStatus.value
  if (!s || !sipAvailable.value) return 'Scripts not installed'
  if (!sipArmed.value) return 'Off'
  if (sipPcapOn.value) return 'Armed — text + pcap'
  return 'Armed — text'
})

const canArm = computed(() => sipAvailable.value && !sipArmed.value && !sipBusy.value)
const canDisarm = computed(() => sipAvailable.value && sipArmed.value && !sipBusy.value)

function formatSize(bytes) {
  if (!bytes || bytes === 0) return '—'
  const kb = bytes / 1024
  const mb = kb / 1024
  if (mb >= 1) return `${mb.toFixed(1)} MB`
  if (kb >= 1) return `${kb.toFixed(1)} KB`
  return `${bytes} B`
}

function formatTtl(sec) {
  if (!sec || sec <= 0) return '—'
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}m ${s}s`
}

async function loadSipStatus() {
  sipLoading.value = true
  sipError.value = ''
  try {
    sipStatus.value = await getApiClient().get('syscommands/sipdebug/status')
  } catch (err) {
    sipStatus.value = null
    sipError.value = firstErrorMessage(err, 'Failed to load SIP debug status')
  } finally {
    sipLoading.value = false
  }
}

async function armSip() {
  sipBusy.value = true
  sipError.value = ''
  try {
    sipStatus.value = await getApiClient().post('syscommands/sipdebug/arm', {
      ttl_minutes: sipTtl.value,
      pcap: sipPcap.value
    })
    toast.show('SIP debug armed')
    await loadLogs()
  } catch (err) {
    sipError.value = firstErrorMessage(err, 'Failed to arm SIP debug')
    toast.show(sipError.value, 'error')
  } finally {
    sipBusy.value = false
  }
}

async function disarmSip() {
  sipBusy.value = true
  sipError.value = ''
  try {
    sipStatus.value = await getApiClient().post('syscommands/sipdebug/disarm', {})
    toast.show('SIP debug disarmed')
    await loadLogs()
  } catch (err) {
    sipError.value = firstErrorMessage(err, 'Failed to disarm SIP debug')
    toast.show(sipError.value, 'error')
  } finally {
    sipBusy.value = false
  }
}

async function loadLogs() {
  loading.value = true
  error.value = ''
  try {
    const res = await getApiClient().get('logs')
    if (res.logs && Array.isArray(res.logs)) {
      logs.value = res.logs
    } else if (res.Log) {
      logs.value = []
      error.value = 'Legacy API format detected. Please refresh.'
    } else {
      logs.value = []
      error.value = 'Unexpected API response format'
    }
  } catch (err) {
    console.error('Logs API error:', err)
    error.value = firstErrorMessage(err, 'Failed to load logs')
    logs.value = []
  } finally {
    loading.value = false
  }
}

async function loadArchive() {
  archiveLoading.value = true
  archiveError.value = ''
  try {
    const res = await getApiClient().get('logs/archive', {
      params: { class: archiveClass.value }
    })
    archiveAvailable.value = Boolean(res.available)
    archiveObjects.value = Array.isArray(res.objects) ? res.objects : []
    if (!res.available) {
      archiveError.value = 'Org bucket not configured — S3 archive unavailable on this node.'
    }
  } catch (err) {
    archiveObjects.value = []
    archiveAvailable.value = false
    archiveError.value = firstErrorMessage(err, 'Failed to list S3 archive')
  } finally {
    archiveLoading.value = false
  }
}

function openLogModal(path) {
  selectedLogPath.value = path
}

function closeLogModal() {
  selectedLogPath.value = null
}

async function downloadLog(path, e) {
  e.stopPropagation()
  try {
    const url = `logs/${path}/download`
    const blob = await getApiClient().getBlob(url)
    const downloadUrl = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = downloadUrl
    link.download = path.includes('/') ? path.split('/').pop() : `${path}.log`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(downloadUrl)
    toast.show('Download started')
  } catch (err) {
    toast.show(firstErrorMessage(err, 'Download failed'), 'error')
  }
}

async function downloadArchive(obj) {
  archiveDownloading.value = obj.key
  try {
    const { url, filename } = await getApiClient().get('logs/archive/download-url', {
      params: { key: obj.key }
    })
    const a = document.createElement('a')
    a.href = url
    a.download = filename || obj.basename
    a.rel = 'noopener'
    a.target = '_blank'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    toast.show('Archive download started')
  } catch (err) {
    toast.show(firstErrorMessage(err, 'Archive download failed'), 'error')
  } finally {
    archiveDownloading.value = null
  }
}

watch(archiveClass, () => {
  loadArchive()
})

onMounted(async () => {
  await loadLogs()
  filterInputRef.value?.focus()
  await Promise.all([loadArchive(), loadSipStatus()])
})
</script>

<template>
  <div class="logs-list-view">
    <header class="list-header">
      <h1>System Logs</h1>
      <p class="toolbar">
        <input
          ref="filterInputRef"
          v-model="filterText"
          type="search"
          class="filter-input"
          placeholder="Filter by filename"
          aria-label="Filter by filename"
        />
      </p>
    </header>

    <section class="sip-debug-section">
      <h2 class="section-heading">SIP debug (home)</h2>
      <p class="archive-hint">
        Session-armed capture of <strong>SBC↔Asterisk</strong> only — not desk REGISTER. Text is
        AI-friendly; optional pcap for forensics. Auto-off after TTL.
      </p>
      <ListLoadingState v-if="sipLoading" message="Loading SIP debug status…" />
      <div v-else class="sip-controls">
        <p v-if="sipError" class="error">{{ sipError }}</p>
        <p class="sip-status">
          Status: <strong>{{ sipBadge }}</strong>
          <span v-if="sipArmed" class="sip-ttl">
            · TTL remaining {{ formatTtl(sipStatus?.ttl_remaining_sec) }}
          </span>
        </p>
        <p v-if="sipStatus && !sipAvailable" class="archive-hint">
          Tip-deploy pbx3 sip-debug scripts (or package <code>0.0.5-4</code>) on this home, then Refresh.
        </p>
        <div class="sip-action-row">
          <label class="class-label">
            TTL (min)
            <select
              v-model.number="sipTtl"
              class="class-select"
              :disabled="sipBusy || sipArmed"
              aria-label="SIP debug TTL"
            >
              <option :value="15">15</option>
              <option :value="30">30</option>
              <option :value="45">45</option>
              <option :value="60">60</option>
            </select>
          </label>
          <label class="sip-pcap-label">
            <input v-model="sipPcap" type="checkbox" :disabled="sipBusy || sipArmed" />
            Also capture pcap
          </label>
          <button
            v-if="!sipArmed"
            type="button"
            class="btn btn-primary sip-start-btn"
            :disabled="!canArm"
            @click="armSip"
          >
            {{ sipBusy ? 'Starting…' : 'Start SIP debug' }}
          </button>
          <button
            v-else
            type="button"
            class="btn btn-primary sip-stop-btn"
            :disabled="!canDisarm"
            @click="disarmSip"
          >
            {{ sipBusy ? 'Stopping…' : 'Stop SIP debug' }}
          </button>
          <button type="button" class="btn btn-secondary" :disabled="sipBusy" @click="loadSipStatus">
            Refresh
          </button>
        </div>
      </div>
    </section>

    <section v-if="loading || error" class="list-states">
      <ListLoadingState v-if="loading" message="Loading logs from API…" />
      <p v-else-if="error" class="error">{{ error }}</p>
    </section>

    <section v-else class="list-body">
      <h2 class="section-heading">Local (hot)</h2>
      <div v-if="logs.length === 0" class="empty">No log files found.</div>
      <p v-else-if="filterText && filteredLogs.length === 0" class="empty">
        No logs match the filter.
      </p>
      <table v-else class="table">
        <thead>
          <tr>
            <th>Log File</th>
            <th class="size-col">Size</th>
            <th class="actions-col">Download</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="log in filteredLogs"
            :key="log.path"
            class="log-row"
            :class="{ 'log-missing': !log.exists }"
            @click="log.exists && !String(log.path).includes('siplog/') && openLogModal(log.path)"
          >
            <td class="log-path">
              {{ log.path }}
              <span v-if="!log.exists" class="missing-badge">(not found)</span>
            </td>
            <td class="size-col">{{ log.exists ? formatSize(log.size) : '—' }}</td>
            <td class="actions-col">
              <button
                v-if="log.exists"
                type="button"
                class="download-btn"
                title="Download log file"
                @click="downloadLog(log.path, $event)"
              >
                Download
              </button>
              <span v-else class="no-action">—</span>
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <section class="archive-section">
      <h2 class="section-heading">S3 archive (cold)</h2>
      <p class="archive-hint">
        Rotated files already shipped to the org bucket. Download a file and use local tools to
        inspect it.
      </p>
      <p class="toolbar archive-toolbar">
        <label class="class-label">
          Class
          <select v-model="archiveClass" class="class-select" aria-label="Archive log class">
            <option v-for="c in ARCHIVE_CLASSES" :key="c.value" :value="c.value">
              {{ c.label }}
            </option>
          </select>
        </label>
        <button type="button" class="btn btn-secondary" :disabled="archiveLoading" @click="loadArchive">
          Refresh
        </button>
      </p>
      <ListLoadingState v-if="archiveLoading" message="Listing S3 archive…" />
      <p v-else-if="archiveError && !archiveAvailable" class="empty">{{ archiveError }}</p>
      <p v-else-if="archiveError" class="error">{{ archiveError }}</p>
      <div v-else-if="archiveObjects.length === 0" class="empty">No archived objects for this class.</div>
      <table v-else class="table">
        <thead>
          <tr>
            <th>File</th>
            <th>Stamp</th>
            <th class="size-col">Size</th>
            <th class="actions-col">Download</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="obj in archiveObjects" :key="obj.key">
            <td class="log-path">{{ obj.basename }}</td>
            <td class="mono">{{ obj.stamp }}</td>
            <td class="size-col">{{ formatSize(obj.size) }}</td>
            <td class="actions-col">
              <button
                type="button"
                class="download-btn"
                :disabled="archiveDownloading === obj.key"
                @click="downloadArchive(obj)"
              >
                {{ archiveDownloading === obj.key ? '…' : 'Download' }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <LogViewerModal v-if="selectedLogPath" :log-path="selectedLogPath" @close="closeLogModal" />
  </div>
</template>

<style scoped>
.logs-list-view {
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
.list-body,
.archive-section,
.sip-debug-section {
  margin: 0;
}
.sip-controls {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  padding: 0.85rem 1rem;
  border: 1px solid #cbd5e1;
  border-radius: 0.5rem;
  background: #f8fafc;
}
.sip-status {
  margin: 0;
  color: #334155;
}
.sip-ttl {
  color: #64748b;
  font-size: 0.95rem;
}
.sip-action-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
}
.sip-pcap-label {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.95rem;
  color: #475569;
}
.sip-start-btn,
.sip-stop-btn {
  font-weight: 600;
  min-width: 10rem;
}
.btn {
  padding: 0.35rem 0.75rem;
  border-radius: 0.375rem;
  border: 1px solid #cbd5e1;
  background: #fff;
  color: #0f172a;
  cursor: pointer;
}
.btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.btn.btn-primary {
  background: #0f172a;
  color: #fff;
  border-color: #0f172a;
}
.btn.btn-primary:hover:not(:disabled) {
  background: #1e293b;
}
.btn.sip-stop-btn {
  background: #b91c1c;
  border-color: #b91c1c;
  color: #fff;
}
.btn.sip-stop-btn:hover:not(:disabled) {
  background: #991b1b;
}
.btn.btn-secondary:hover:not(:disabled) {
  background: #f1f5f9;
}
.section-heading {
  margin: 0 0 0.5rem;
  font-size: 1.1rem;
  font-weight: 600;
  color: #334155;
}
.archive-hint {
  margin: 0 0 0.75rem;
  color: #64748b;
  font-size: 0.95rem;
}
.archive-toolbar {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  margin-bottom: 0.75rem;
}
.class-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.95rem;
  color: #475569;
}
.class-select {
  padding: 0.35rem 0.5rem;
  border: 1px solid #cbd5e1;
  border-radius: 0.375rem;
  background: #fff;
  color: #0f172a;
  min-width: 4.5rem;
}
.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.9rem;
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
  font-size: 1rem;
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
.size-col {
  width: 8rem;
  text-align: right;
}
.actions-col {
  width: 8rem;
  text-align: center;
}
.log-row {
  cursor: pointer;
}
.log-row:hover {
  background: #f8fafc;
}
.log-missing {
  cursor: default;
  opacity: 0.6;
}
.log-path {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.9rem;
}
.missing-badge {
  margin-left: 0.5rem;
  color: #94a3b8;
  font-size: 0.85rem;
}
.download-btn {
  padding: 0.25rem 0.6rem;
  font-size: 0.875rem;
  border: 1px solid #cbd5e1;
  border-radius: 0.375rem;
  background: #fff;
  cursor: pointer;
}
.download-btn:hover:not(:disabled) {
  background: #f1f5f9;
}
.download-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.no-action {
  color: #94a3b8;
}
.filter-input {
  min-width: 16rem;
  padding: 0.4rem 0.6rem;
  border: 1px solid #cbd5e1;
  border-radius: 0.375rem;
}
</style>
