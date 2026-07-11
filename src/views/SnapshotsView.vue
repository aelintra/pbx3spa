<template>
  <div class="snapshots-view">
    <h1>Snapshots</h1>
    <p class="subtitle">
      Point-in-time copies of the PBX database under <code>/opt/pbx3/snap/</code>. A snapshot is also
      taken automatically on every Commit. Oldest copies are pruned (default keep 9).
    </p>

    <div class="snapshot-actions">
      <button
        type="button"
        class="action-btn action-btn-primary"
        :disabled="creatingSnapshot"
        @click="createSnapshot"
      >
        {{ creatingSnapshot ? 'Creating…' : 'Create New Snapshot' }}
      </button>
      <label class="action-btn action-btn-secondary">
        Upload Snapshot
        <input
          type="file"
          accept=".db"
          style="display: none"
          :disabled="uploadingSnapshot"
          @change="handleSnapshotUpload"
        />
      </label>
    </div>

    <p v-if="actionMessage" class="action-message">{{ actionMessage }}</p>
    <p v-if="actionError" class="error">{{ actionError }}</p>

    <div v-if="loading" class="loading">
      <span class="spinner"></span>
      <span>Loading snapshots…</span>
    </div>
    <p v-else-if="error" class="error">{{ error }}</p>
    <div v-else-if="!loading && snapshots.length === 0" class="empty">No snapshots found.</div>

    <div v-else class="snapshot-list">
      <table class="table table-snapshots">
        <thead>
          <tr>
            <th
              class="th-sortable"
              title="Click to sort"
              :class="sortClass('filename')"
              @click="setSort('filename')"
            >
              Filename
            </th>
            <th
              class="th-sortable"
              title="Click to sort"
              :class="sortClass('date')"
              @click="setSort('date')"
            >
              Date
            </th>
            <th
              class="th-sortable"
              title="Click to sort"
              :class="sortClass('size')"
              @click="setSort('size')"
            >
              Size
            </th>
            <th class="th-actions">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="snapshot in sortedSnapshots" :key="snapshot.filename">
            <td class="mono">{{ snapshot.filename }}</td>
            <td>{{ snapshot.date }}</td>
            <td>{{ formatBytes(snapshot.filesize) }}</td>
            <td class="cell-actions">
              <button
                type="button"
                class="cell-link cell-link-icon"
                title="Download"
                :disabled="downloadingSnapshot === snapshot.filename"
                @click="downloadSnapshot(snapshot.filename)"
              >
                <span
                  v-if="downloadingSnapshot === snapshot.filename"
                  class="action-icon action-icon-spin"
                  aria-hidden="true"
                >
                  <svg
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
                    <path d="M16 21h5v-5" />
                  </svg>
                </span>
                <span v-else class="action-icon" aria-hidden="true">
                  <svg
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
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" x2="12" y1="15" y2="3" />
                  </svg>
                </span>
              </button>
              <button
                type="button"
                class="cell-link cell-link-icon"
                title="Restore"
                :disabled="restoringSnapshot === snapshot.filename"
                @click="restoreSnapshot(snapshot.filename)"
              >
                <span
                  v-if="restoringSnapshot === snapshot.filename"
                  class="action-icon action-icon-spin"
                  aria-hidden="true"
                >
                  <svg
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
                    <path d="M16 21h5v-5" />
                  </svg>
                </span>
                <span v-else class="action-icon" aria-hidden="true">
                  <svg
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
                    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                    <path d="M21 3v5h-5" />
                    <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                    <path d="M8 16H3v5" />
                  </svg>
                </span>
              </button>
              <button
                type="button"
                class="cell-link cell-link-delete cell-link-icon"
                title="Delete"
                :disabled="deletingSnapshot === snapshot.filename"
                @click="askConfirmDeleteSnapshot(snapshot.filename)"
              >
                <span
                  v-if="deletingSnapshot === snapshot.filename"
                  class="action-icon action-icon-spin"
                  aria-hidden="true"
                >
                  <svg
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
                    <path d="M16 21h5v-5" />
                  </svg>
                </span>
                <span v-else class="action-icon" aria-hidden="true">
                  <svg
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
                    <line x1="14" x2="14" y1="11" y2="17" />
                  </svg>
                </span>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <ConfirmModal
      :show="genericConfirmShow"
      :title="genericConfirmTitle"
      :body-text="genericConfirmBody"
      :confirm-label="genericConfirmLabel"
      :variant="genericConfirmVariant"
      @confirm="onGenericConfirm"
      @cancel="cancelGenericConfirm"
    />

    <DeleteConfirmModal
      :show="!!confirmDeleteSnapshot"
      title="Delete snapshot?"
      :loading="deletingSnapshot === confirmDeleteSnapshot"
      @confirm="confirmAndDeleteSnapshot(confirmDeleteSnapshot)"
      @cancel="cancelConfirmDeleteSnapshot"
    >
      <template #body>
        <p>
          Snapshot <strong>{{ confirmDeleteSnapshot }}</strong> will be permanently deleted. This
          cannot be undone.
        </p>
      </template>
    </DeleteConfirmModal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { getApiClient } from '@/api/client'
import { useToastStore } from '@/stores/toast'
import { useStickySort } from '@/composables/useStickyFilter'
import { firstErrorMessage } from '@/utils/formErrors'
import DeleteConfirmModal from '@/components/DeleteConfirmModal.vue'
import ConfirmModal from '@/components/ConfirmModal.vue'

const toast = useToastStore()

const genericConfirmShow = ref(false)
const genericConfirmTitle = ref('Confirm')
const genericConfirmBody = ref('')
const genericConfirmLabel = ref('OK')
const genericConfirmVariant = ref('primary')
let genericConfirmRunner = null

function openGenericConfirm(opts) {
  genericConfirmTitle.value = opts.title ?? 'Confirm'
  genericConfirmBody.value = opts.body
  genericConfirmLabel.value = opts.confirmLabel ?? 'OK'
  genericConfirmVariant.value = opts.variant ?? 'primary'
  genericConfirmRunner = opts.onConfirm
  genericConfirmShow.value = true
}

function cancelGenericConfirm() {
  genericConfirmShow.value = false
  genericConfirmRunner = null
}

async function onGenericConfirm() {
  const run = genericConfirmRunner
  genericConfirmRunner = null
  genericConfirmShow.value = false
  if (run) await run()
}

const snapshots = ref([])
const loading = ref(true)
const error = ref('')
const actionMessage = ref('')
const actionError = ref('')
const creatingSnapshot = ref(false)
const uploadingSnapshot = ref(false)
const downloadingSnapshot = ref(null)
const restoringSnapshot = ref(null)
const deletingSnapshot = ref(null)
const confirmDeleteSnapshot = ref(null)

const { sortKey, sortOrder } = useStickySort('snapshots', {
  defaultKey: 'date',
  defaultOrder: 'desc'
})

function formatBytes(bytes) {
  if (bytes == null) return '—'
  const n = parseInt(bytes, 10)
  if (isNaN(n)) return String(bytes)
  if (n >= 1073741824) return (n / 1073741824).toFixed(1) + ' GB'
  if (n >= 1048576) return (n / 1048576).toFixed(1) + ' MB'
  if (n >= 1024) return (n / 1024).toFixed(1) + ' KB'
  return n + ' B'
}

function sortValue(snapshot, key) {
  if (key === 'filename') return snapshot.filename || ''
  if (key === 'date') return snapshot.date || ''
  if (key === 'size') return snapshot.filesize || 0
  return ''
}

const sortedSnapshots = computed(() => {
  const list = [...snapshots.value]
  const key = sortKey.value
  const order = sortOrder.value
  list.sort((a, b) => {
    let va = sortValue(a, key)
    let vb = sortValue(b, key)
    let cmp = 0
    if (typeof va === 'string' && typeof vb === 'string') {
      va = va.toLowerCase()
      vb = vb.toLowerCase()
    }
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

async function loadSnapshots() {
  loading.value = true
  error.value = ''
  try {
    const response = await getApiClient().get('snapshots')
    snapshots.value = Object.entries(response || {}).map(([filename, data]) => ({
      filename,
      filesize: data.filesize,
      date: data.date
    }))
  } catch (err) {
    error.value = firstErrorMessage(err, 'Failed to load snapshots')
    snapshots.value = []
  } finally {
    loading.value = false
  }
}

function createSnapshot() {
  openGenericConfirm({
    title: 'Create snapshot?',
    body: 'Create a new snapshot? This will copy the current database.',
    confirmLabel: 'Create',
    variant: 'primary',
    onConfirm: runCreateSnapshot
  })
}

async function runCreateSnapshot() {
  creatingSnapshot.value = true
  actionError.value = ''
  actionMessage.value = ''
  try {
    const response = await getApiClient().get('snapshots/new')
    actionMessage.value = `Snapshot created: ${response.newsnapshotname || 'success'}`
    toast.show('Snapshot created successfully')
    await loadSnapshots()
  } catch (err) {
    const msg = firstErrorMessage(err, 'Failed to create snapshot')
    actionError.value = msg
    toast.show(msg, 'error')
  } finally {
    creatingSnapshot.value = false
  }
}

async function handleSnapshotUpload(event) {
  const file = event.target.files?.[0]
  if (!file) return
  if (!file.name.toLowerCase().endsWith('.db')) {
    actionError.value = 'Please select a .db file'
    return
  }
  uploadingSnapshot.value = true
  actionError.value = ''
  actionMessage.value = ''
  try {
    const formData = new FormData()
    formData.append('uploadsnap', file)
    await getApiClient().postFile('snapshots', formData)
    actionMessage.value = `Snapshot uploaded: ${file.name}`
    toast.show('Snapshot uploaded successfully')
    await loadSnapshots()
  } catch (err) {
    const msg = firstErrorMessage(err, 'Failed to upload snapshot')
    actionError.value = msg
    toast.show(msg, 'error')
  } finally {
    uploadingSnapshot.value = false
    event.target.value = ''
  }
}

async function downloadSnapshot(filename) {
  downloadingSnapshot.value = filename
  try {
    const blob = await getApiClient().getBlob(`snapshots/${filename}`)
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
    toast.show('Snapshot download started')
  } catch (err) {
    const msg = firstErrorMessage(err, 'Failed to download snapshot')
    toast.show(msg, 'error')
  } finally {
    downloadingSnapshot.value = null
  }
}

function restoreSnapshot(filename) {
  openGenericConfirm({
    title: 'Restore snapshot?',
    body: `Restore database from ${filename}? This will overwrite the current database.`,
    confirmLabel: 'Restore',
    variant: 'danger',
    onConfirm: () => runRestoreSnapshot(filename)
  })
}

async function runRestoreSnapshot(filename) {
  restoringSnapshot.value = filename
  actionError.value = ''
  try {
    await getApiClient().put(`snapshots/${filename}`, {})
    toast.show('Snapshot restored successfully')
    await loadSnapshots()
  } catch (err) {
    const msg = firstErrorMessage(err, 'Failed to restore snapshot')
    actionError.value = msg
    toast.show(msg, 'error')
  } finally {
    restoringSnapshot.value = null
  }
}

function askConfirmDeleteSnapshot(filename) {
  confirmDeleteSnapshot.value = filename
}

function cancelConfirmDeleteSnapshot() {
  confirmDeleteSnapshot.value = null
}

async function confirmAndDeleteSnapshot(filename) {
  deletingSnapshot.value = filename
  try {
    await getApiClient().delete(`snapshots/${filename}`)
    toast.show('Snapshot deleted successfully')
    cancelConfirmDeleteSnapshot()
    await loadSnapshots()
  } catch (err) {
    const msg = firstErrorMessage(err, 'Failed to delete snapshot')
    toast.show(msg, 'error')
    cancelConfirmDeleteSnapshot()
  } finally {
    deletingSnapshot.value = null
  }
}

onMounted(() => {
  loadSnapshots()
})
</script>

<style scoped>
.snapshots-view {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.subtitle {
  margin: 0;
  color: #64748b;
  font-size: 0.9375rem;
  max-width: 42rem;
  line-height: 1.45;
}

.subtitle code {
  font-size: 0.875em;
  background: #f1f5f9;
  padding: 0.1em 0.35em;
  border-radius: 0.25rem;
}

.snapshot-list .mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.875rem;
}

.snapshot-actions {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.action-btn {
  padding: 0.5rem 1rem;
  font-size: 0.9375rem;
  font-weight: 500;
  border-radius: 0.375rem;
  cursor: pointer;
  border: 1px solid #cbd5e1;
  background: white;
  color: #475569;
  transition: all 0.15s;
}

.action-btn:hover:not(:disabled) {
  background: #f8fafc;
  border-color: #94a3b8;
}

.action-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.action-btn-primary {
  background: #3b82f6;
  color: white;
  border-color: #3b82f6;
}

.action-btn-primary:hover:not(:disabled) {
  background: #2563eb;
  border-color: #2563eb;
}

.action-btn-secondary {
  background: white;
  color: #475569;
  border-color: #cbd5e1;
}

.action-message {
  color: #059669;
  margin: 0;
}

.error {
  color: #dc2626;
  margin: 0;
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
  margin: 0;
}

.snapshot-list {
  margin: 0;
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
}

.table th {
  font-weight: 600;
  color: #475569;
  background: #f8fafc;
}

.table-snapshots th:nth-child(1),
.table-snapshots td:nth-child(1) {
  width: 40%;
}

.table-snapshots th:nth-child(2),
.table-snapshots td:nth-child(2) {
  width: 30%;
}

.table-snapshots th:nth-child(3),
.table-snapshots td:nth-child(3) {
  width: 15%;
}

.table-snapshots th:nth-child(4),
.table-snapshots td:nth-child(4) {
  width: 15%;
}

.cell-actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
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

.cell-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.25rem;
  background: none;
  border: none;
  cursor: pointer;
  color: #64748b;
  text-decoration: none;
  border-radius: 0.25rem;
  transition: all 0.15s;
}

.cell-link:hover:not(:disabled) {
  background: #f1f5f9;
  color: #475569;
}

.cell-link:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.cell-link-delete {
  color: #dc2626;
}

.cell-link-delete:hover:not(:disabled) {
  background: #fee2e2;
  color: #b91c1c;
}

.cell-link-icon {
  width: 1.75rem;
  height: 1.75rem;
}

.action-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1em;
  height: 1em;
}

.action-icon-spin {
  animation: spin 0.8s linear infinite;
}
</style>
