<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { getApiClient } from '@/api/client'
import { useToastStore } from '@/stores/toast'
import { firstErrorMessage } from '@/utils/formErrors'

const props = defineProps({
  logPath: { type: String, required: true },
})

const emit = defineEmits(['close'])

const toast = useToastStore()
const lines = ref([])
const loading = ref(true)
const loadingMore = ref(false)
const error = ref('')
const offset = ref(0)
const limit = ref(100)
const totalLines = ref(0)
const hasMore = ref(false)
const scrollContainer = ref(null)

const displayLines = computed(() => {
  return lines.value
})

async function loadLog(loadOffset = 0) {
  if (loadOffset === 0) {
    loading.value = true
    lines.value = []
  } else {
    loadingMore.value = true
  }
  error.value = ''

  try {
    const res = await getApiClient().get(`logs/${encodeURIComponent(props.logPath)}`, {
      params: {
        offset: loadOffset,
        limit: limit.value,
      },
    })
    
    if (loadOffset === 0) {
      lines.value = res.lines || []
      offset.value = 0
    } else {
      // Prepend older lines (they come before current offset)
      lines.value = [...(res.lines || []), ...lines.value]
    }
    
    totalLines.value = res.totalLines || 0
    hasMore.value = res.hasMore || false
    offset.value = loadOffset + (res.lines?.length || 0)
  } catch (err) {
    error.value = firstErrorMessage(err, 'Failed to load log')
    if (loadOffset === 0) {
      lines.value = []
    }
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

function handleScroll() {
  if (!scrollContainer.value || loadingMore.value || !hasMore.value) return
  
  const el = scrollContainer.value
  const scrollTop = el.scrollTop
  const scrollHeight = el.scrollHeight
  const clientHeight = el.clientHeight
  
  // Load more when scrolled to top (older lines)
  if (scrollTop < 200 && hasMore.value) {
    loadMore()
  }
}

async function loadMore() {
  if (loadingMore.value || !hasMore.value) return
  const oldScrollHeight = scrollContainer.value?.scrollHeight || 0
  await loadLog(offset.value)
  // Maintain scroll position after prepending older lines
  if (scrollContainer.value) {
    const newScrollHeight = scrollContainer.value.scrollHeight
    scrollContainer.value.scrollTop = newScrollHeight - oldScrollHeight
  }
}

async function refresh() {
  await loadLog(0)
  if (scrollContainer.value) {
    scrollContainer.value.scrollTop = scrollContainer.value.scrollHeight
  }
}

async function download() {
  try {
    const url = `logs/${encodeURIComponent(props.logPath)}/download`
    const blob = await getApiClient().getBlob(url)
    const downloadUrl = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = downloadUrl
    link.download = props.logPath.split('/').pop() || 'log'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(downloadUrl)
    toast.show('Download started')
  } catch (err) {
    toast.show(firstErrorMessage(err, 'Download failed'), 'error')
  }
}

function close() {
  emit('close')
}

function handleEscape(e) {
  if (e.key === 'Escape') {
    close()
  }
}

onMounted(async () => {
  await loadLog(0)
  if (scrollContainer.value) {
    scrollContainer.value.scrollTop = scrollContainer.value.scrollHeight
  }
  window.addEventListener('keydown', handleEscape)
  if (scrollContainer.value) {
    scrollContainer.value.addEventListener('scroll', handleScroll)
  }
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleEscape)
  if (scrollContainer.value) {
    scrollContainer.value.removeEventListener('scroll', handleScroll)
  }
})

watch(() => props.logPath, () => {
  loadLog(0)
})
</script>

<template>
  <Teleport to="body">
    <div class="modal-backdrop" @click.self="close">
      <div class="log-viewer-modal" role="dialog" aria-modal="true">
        <header class="modal-header">
          <h2 class="modal-title">{{ logPath }}</h2>
          <button type="button" class="close-btn" @click="close" aria-label="Close">×</button>
        </header>

        <div v-if="loading && lines.length === 0" class="modal-loading">
          <p>Loading log…</p>
        </div>

        <div v-else-if="error && lines.length === 0" class="modal-error">
          <p>{{ error }}</p>
        </div>

        <div
          v-else
          ref="scrollContainer"
          class="log-content"
        >
          <div v-if="loadingMore" class="loading-more">
            Loading older lines…
          </div>
          <div class="log-lines">
            <div
              v-for="(line, index) in displayLines"
              :key="`${offset - displayLines.length + index}-${index}`"
              class="log-line"
            >
              {{ line }}
            </div>
          </div>
          <div v-if="!hasMore && lines.length > 0" class="log-end">
            End of log (showing {{ lines.length }} of {{ totalLines }} lines)
          </div>
        </div>

        <footer class="modal-footer">
          <div class="modal-info">
            <span v-if="totalLines > 0">{{ lines.length }} of {{ totalLines }} lines</span>
            <span v-else>—</span>
          </div>
          <div class="modal-actions">
            <button type="button" class="action-btn" @click="refresh" :disabled="loading">
              Refresh
            </button>
            <button type="button" class="action-btn action-btn-primary" @click="download">
              Download
            </button>
            <button type="button" class="action-btn" @click="close">Close</button>
          </div>
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.log-viewer-modal {
  background: white;
  border-radius: 0.5rem;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  display: flex;
  flex-direction: column;
  max-width: 90vw;
  max-height: 90vh;
  width: 100%;
  min-width: 50rem;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #e2e8f0;
}

.modal-title {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: #0f172a;
  font-family: 'Courier New', monospace;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  line-height: 1;
  color: #64748b;
  cursor: pointer;
  padding: 0;
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  color: #0f172a;
}

.modal-loading,
.modal-error {
  padding: 2rem;
  text-align: center;
  color: #64748b;
}

.modal-error {
  color: #b91c1c;
}

.log-content {
  flex: 1;
  overflow-y: auto;
  padding: 0;
  background: #1e293b;
  color: #e2e8f0;
  font-family: 'Courier New', monospace;
  font-size: 0.875rem;
  line-height: 1.5;
}

.loading-more {
  padding: 0.5rem 1rem;
  background: #334155;
  color: #cbd5e1;
  text-align: center;
  font-size: 0.8125rem;
}

.log-lines {
  padding: 0.5rem 0;
}

.log-line {
  padding: 0.125rem 1rem;
  white-space: pre-wrap;
  word-break: break-all;
}

.log-line:hover {
  background: #334155;
}

.log-end {
  padding: 0.5rem 1rem;
  background: #334155;
  color: #94a3b8;
  text-align: center;
  font-size: 0.8125rem;
}

.modal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1.5rem;
  border-top: 1px solid #e2e8f0;
  gap: 1rem;
}

.modal-info {
  font-size: 0.875rem;
  color: #64748b;
}

.modal-actions {
  display: flex;
  gap: 0.5rem;
}

.action-btn {
  padding: 0.375rem 0.75rem;
  font-size: 0.875rem;
  font-weight: 500;
  border-radius: 0.375rem;
  cursor: pointer;
  border: 1px solid #cbd5e1;
  background: #f8fafc;
  color: #475569;
}

.action-btn:hover:not(:disabled) {
  background: #e2e8f0;
}

.action-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.action-btn-primary {
  background: #0f172a;
  color: #fff;
  border-color: #0f172a;
}

.action-btn-primary:hover:not(:disabled) {
  background: #1e293b;
}
</style>
