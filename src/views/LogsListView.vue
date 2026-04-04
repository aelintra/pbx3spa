<script setup>
import { ref, computed, onMounted } from 'vue'
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

const filteredLogs = computed(() => {
  const list = logs.value
  const q = (filterText.value || '').trim().toLowerCase()
  if (!q) return list
  return list.filter((log) => (log.path || '').toLowerCase().includes(q))
})

function formatSize(bytes) {
  if (!bytes || bytes === 0) return '—'
  const kb = bytes / 1024
  const mb = kb / 1024
  if (mb >= 1) return `${mb.toFixed(1)} MB`
  if (kb >= 1) return `${kb.toFixed(1)} KB`
  return `${bytes} B`
}

async function loadLogs() {
  loading.value = true
  error.value = ''
  try {
    const res = await getApiClient().get('logs')
    // Handle both old format { Log: 'Master.csv' } and new format { logs: [...] }
    if (res.logs && Array.isArray(res.logs)) {
      logs.value = res.logs
    } else if (res.Log) {
      // Old format - return empty for now
      logs.value = []
      error.value = 'Legacy API format detected. Please refresh.'
    } else {
      logs.value = []
      error.value = 'Unexpected API response format'
    }
  } catch (err) {
    console.error('Logs API error:', err) // Debug
    error.value = firstErrorMessage(err, 'Failed to load logs')
    logs.value = []
  } finally {
    loading.value = false
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
    // path is now a symbolic name (e.g., astmessages) - no encoding needed
    const url = `logs/${path}/download`
    const blob = await getApiClient().getBlob(url)
    const downloadUrl = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = downloadUrl
    // Extract filename from path (symbolic names don't have slashes, so just use the name)
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

onMounted(async () => {
  await loadLogs()
  filterInputRef.value?.focus()
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

    <section v-if="loading || error" class="list-states">
      <ListLoadingState v-if="loading" message="Loading logs from API…" />
      <p v-else-if="error" class="error">{{ error }}</p>
    </section>

    <section v-else class="list-body">
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
            @click="log.exists && openLogModal(log.path)"
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
.log-row.log-missing {
  opacity: 0.6;
  cursor: not-allowed;
}
.log-row.log-missing:hover {
  background: transparent;
}
.log-path {
  color: #2563eb;
}
.missing-badge {
  font-size: 0.875rem;
  color: #94a3b8;
  font-weight: normal;
  margin-left: 0.5rem;
}
.no-action {
  color: #94a3b8;
}
.download-btn {
  padding: 0.375rem 0.75rem;
  font-size: 0.875rem;
  font-weight: 500;
  border: 1px solid #cbd5e1;
  border-radius: 0.375rem;
  background: #f8fafc;
  color: #475569;
  cursor: pointer;
}
.download-btn:hover {
  background: #e2e8f0;
}
.toolbar {
  margin: 0.75rem 0 0 0;
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
}
.filter-input {
  padding: 0.5rem 0.75rem;
  font-size: 1rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.375rem;
  min-width: 16rem;
}
.filter-input:focus {
  outline: none;
  border-color: #2563eb;
}
</style>
