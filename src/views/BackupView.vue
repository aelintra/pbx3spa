<template>
  <div class="backup-view">
    <h1>Backup</h1>
    <p class="subtitle">
      Full instance archives (local zip + optional S3). Database point-in-time copies live on the
      Snapshots panel.
    </p>

    <section class="backup-section">
      <div class="backup-actions">
        <button
          type="button"
          class="action-btn action-btn-primary"
          :disabled="creatingBackup"
          @click="createBackup"
        >
          {{ creatingBackup ? 'Creating…' : 'Create New Backup' }}
        </button>
        <label class="action-btn action-btn-secondary">
          Upload Backup
          <input
            type="file"
            accept=".zip"
            style="display: none"
            :disabled="uploadingBackup"
            @change="handleFileUpload"
          />
        </label>
      </div>

      <p v-if="actionMessage" class="action-message">{{ actionMessage }}</p>
      <p v-if="actionError" class="error">{{ actionError }}</p>

      <div v-if="loading" class="loading">
        <span class="spinner"></span>
        <span>Loading backups…</span>
      </div>
      <p v-else-if="error" class="error">{{ error }}</p>
      <div v-else-if="!loading && backups.length === 0" class="empty">No backups found.</div>

      <div v-else class="backup-list">
        <table class="table table-backups">
          <thead>
            <tr>
              <th
                class="th-sortable col-created"
                title="Click to sort"
                :class="sortClass('created_at')"
                @click="setSort('created_at')"
              >
                Created (UTC)
              </th>
              <th
                class="th-sortable col-archive"
                title="S3 folder (off-box)"
                :class="sortClass('backup_stamp')"
                @click="setSort('backup_stamp')"
              >
                Archive ID
              </th>
              <th
                class="th-sortable col-file"
                title="Local zip on this node"
                :class="sortClass('filename')"
                @click="setSort('filename')"
              >
                Local file
              </th>
              <th
                class="th-sortable col-size"
                title="Click to sort"
                :class="sortClass('size')"
                @click="setSort('size')"
              >
                Size
              </th>
              <th class="th-actions col-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="backup in sortedBackups" :key="backup.backup_stamp || backup.filename">
              <td class="mono col-created" :title="backup.created_at">
                {{ backup.created_at || '—' }}
              </td>
              <td class="mono col-archive" :title="backup.backup_stamp">
                {{ backup.backup_stamp || '—' }}
              </td>
              <td class="mono col-file" :title="localFileLabel(backup)">
                {{ localFileLabel(backup) }}
                <span v-if="backup.source === 's3' && !backup.has_local" class="source-tag" title="Archive only on S3"
                  >S3</span
                >
                <span v-else-if="backup.source === 'both'" class="source-tag source-tag-both" title="Local and S3"
                  >local+S3</span
                >
              </td>
              <td class="col-size">{{ formatBytes(backup.filesize) }}</td>
              <td class="cell-actions col-actions">
                <button
                  type="button"
                  class="cell-link cell-link-icon"
                  :title="downloadTitle(backup)"
                  :disabled="!canDownload(backup) || downloadingBackup === downloadKey(backup)"
                  @click="downloadBackup(backup)"
                >
                  <span
                    v-if="downloadingBackup === downloadKey(backup)"
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
                  :title="restoreTitle(backup)"
                  :disabled="!canRestore(backup) || restoringBackup === restoreKey(backup)"
                  @click="openRestoreModal(backup)"
                >
                  <span
                    v-if="restoringBackup === restoreKey(backup)"
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
                  :disabled="!backup.has_local || deletingBackup === backup.filename"
                  @click="askConfirmDelete(backup.filename)"
                >
                  <span
                    v-if="deletingBackup === backup.filename"
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
    </section>

    <!-- Restore Modal -->
    <Teleport to="body">
      <div v-if="showRestoreModal" class="modal-backdrop" @click.self="closeRestoreModal">
        <div class="modal modal-restore" role="dialog" aria-modal="true">
          <h2 class="modal-title">Restore Backup</h2>
          <div class="modal-body">
            <p>
              Select what to restore from
              <strong>{{ restoreFromArchive ? restoreBackupStamp : restoreBackupName }}</strong
              ><span v-if="restoreFromArchive"> (S3 archive)</span>:
            </p>
            <div class="restore-options">
              <label class="restore-option">
                <input v-model="restoreOptions.restoredb" type="checkbox" />
                <span>Database</span>
              </label>
              <label class="restore-option">
                <input v-model="restoreOptions.restoreasterisk" type="checkbox" />
                <span>Asterisk files</span>
              </label>
              <label class="restore-option">
                <input v-model="restoreOptions.restoreusergreeting" type="checkbox" />
                <span>User greetings</span>
              </label>
              <label class="restore-option">
                <input v-model="restoreOptions.restorevmail" type="checkbox" />
                <span>Voicemail</span>
              </label>
              <label class="restore-option">
                <input v-model="restoreOptions.restoreldap" type="checkbox" />
                <span>LDAP contacts</span>
              </label>
            </div>
            <p v-if="restoreError" class="error">{{ restoreError }}</p>
          </div>
          <div class="modal-actions">
            <button type="button" class="modal-btn modal-btn-cancel" @click="closeRestoreModal">
              Cancel
            </button>
            <button
              type="button"
              class="modal-btn modal-btn-primary"
              :disabled="
                restoringBackup === (restoreFromArchive ? restoreBackupStamp : restoreBackupName) ||
                !hasRestoreOptionSelected
              "
              @click="confirmRestore"
            >
              {{
                restoringBackup === (restoreFromArchive ? restoreBackupStamp : restoreBackupName)
                  ? 'Restoring…'
                  : 'Restore'
              }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

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
      :show="!!confirmDeleteBackup"
      title="Delete backup?"
      :loading="deletingBackup === confirmDeleteBackup"
      @confirm="confirmAndDeleteBackup(confirmDeleteBackup)"
      @cancel="cancelConfirmDelete"
    >
      <template #body>
        <p>
          Backup <strong>{{ confirmDeleteBackup }}</strong> will be permanently deleted. This cannot
          be undone.
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
const backups = ref([])
const loading = ref(true)
const error = ref('')
const actionMessage = ref('')
const actionError = ref('')
const creatingBackup = ref(false)
const uploadingBackup = ref(false)
const downloadingBackup = ref(null)
const restoringBackup = ref(null)
const deletingBackup = ref(null)
const confirmDeleteBackup = ref(null)
const restoreError = ref('')

const showRestoreModal = ref(false)
const restoreBackupName = ref('')
const restoreBackupStamp = ref('')
const restoreFromArchive = ref(false)
const restoreOptions = ref({
  restoredb: false,
  restoreasterisk: false,
  restoreusergreeting: false,
  restorevmail: false,
  restoreldap: false
})

const { sortKey, sortOrder } = useStickySort('backup-backups', {
  defaultKey: 'created_at',
  defaultOrder: 'desc'
})

const hasRestoreOptionSelected = computed(() => {
  return Object.values(restoreOptions.value).some((v) => v === true)
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

function localFileLabel(backup) {
  if (backup.local_file) return backup.local_file
  if (backup.source === 's3' || backup.has_local === false) return '—'
  return backup.filename || '—'
}

function downloadKey(backup) {
  return backup.backup_stamp || backup.filename
}

function restoreKey(backup) {
  return backup.backup_stamp || backup.filename
}

function canDownload(backup) {
  return Boolean(backup.has_local || (backup.has_s3 && backup.backup_stamp))
}

function canRestore(backup) {
  return canDownload(backup)
}

function downloadTitle(backup) {
  if (backup.has_local) return 'Download local backup to your computer'
  if (backup.has_s3) {
    return 'Download archive copy to your computer (does not add a local zip on the PBX)'
  }
  return 'Download unavailable'
}

function restoreTitle(backup) {
  if (backup.has_local) return 'Restore selected items from local backup on this PBX'
  if (backup.has_s3) {
    return 'Copy archive to this PBX, then restore (row becomes LOCAL+S3)'
  }
  return 'Restore unavailable'
}

/** Derive ISO time + S3 archive id from pbx3bak.{epoch}.zip when API has not been upgraded yet. */
function enrichBackupRow(filename, data = {}) {
  const match = filename.match(/^pbx3bak\.(\d+)\.zip$/)
  const epoch =
    data.epoch != null ? Number(data.epoch) : match ? parseInt(match[1], 10) : null

  let created_at = data.created_at
  let backup_stamp = data.backup_stamp
  if (epoch != null && Number.isFinite(epoch) && epoch > 0) {
    if (!created_at) {
      created_at = new Date(epoch * 1000).toISOString().replace(/\.\d{3}Z$/, 'Z')
    }
    if (!backup_stamp) {
      const d = new Date(epoch * 1000)
      const p = (n) => String(n).padStart(2, '0')
      backup_stamp = `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}T${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}Z`
    }
  }

  const hasLocal = data.has_local !== undefined ? Boolean(data.has_local) : true
  const source = data.source || (hasLocal ? 'local' : 's3')

  return {
    filename,
    local_file: data.local_file ?? (hasLocal ? filename : null),
    filesize: data.filesize,
    date: data.date,
    epoch,
    created_at: created_at || null,
    backup_stamp: backup_stamp || null,
    source,
    has_local: hasLocal,
    has_s3: Boolean(data.has_s3)
  }
}

function sortValue(backup, key) {
  if (key === 'filename') return backup.filename || ''
  if (key === 'created_at') return backup.created_at || ''
  if (key === 'backup_stamp') return backup.backup_stamp || ''
  if (key === 'date') return backup.date || ''
  if (key === 'size') return backup.filesize || 0
  return ''
}

const sortedBackups = computed(() => {
  const list = [...backups.value]
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

async function loadBackups() {
  loading.value = true
  error.value = ''
  try {
    const response = await getApiClient().get('backups')
    // API returns object keyed by filename: { "pbx3bak.1234567890.zip": { filesize: ..., date: ... }, ... }
    backups.value = Object.entries(response || {}).map(([filename, data]) =>
      enrichBackupRow(filename, data)
    )
  } catch (err) {
    error.value = firstErrorMessage(err, 'Failed to load backups')
    backups.value = []
  } finally {
    loading.value = false
  }
}

function createBackup() {
  openGenericConfirm({
    title: 'Create backup?',
    body: 'Create a new backup? This may take a moment.',
    confirmLabel: 'Create',
    variant: 'primary',
    onConfirm: runCreateBackup
  })
}

async function runCreateBackup() {
  creatingBackup.value = true
  actionError.value = ''
  actionMessage.value = ''
  try {
    const response = await getApiClient().get('backups/new')
    actionMessage.value = `Backup created: ${response.newbackupname || 'success'}`
    toast.show('Backup created successfully')
    await loadBackups()
  } catch (err) {
    const msg = firstErrorMessage(err, 'Failed to create backup')
    actionError.value = msg
    toast.show(msg, 'error')
  } finally {
    creatingBackup.value = false
  }
}

async function handleFileUpload(event) {
  const file = event.target.files?.[0]
  if (!file) return
  if (!file.name.toLowerCase().endsWith('.zip')) {
    actionError.value = 'Please select a .zip file'
    return
  }
  uploadingBackup.value = true
  actionError.value = ''
  actionMessage.value = ''
  try {
    const formData = new FormData()
    formData.append('uploadzip', file)
    await getApiClient().postFile('backups', formData)
    actionMessage.value = `Backup uploaded: ${file.name}`
    toast.show('Backup uploaded successfully')
    await loadBackups()
  } catch (err) {
    const msg = firstErrorMessage(err, 'Failed to upload backup')
    actionError.value = msg
    toast.show(msg, 'error')
  } finally {
    uploadingBackup.value = false
    // Reset file input
    event.target.value = ''
  }
}

async function downloadBackup(backup) {
  const key = downloadKey(backup)
  downloadingBackup.value = key
  try {
    if (backup.has_local && backup.filename) {
      const blob = await getApiClient().getBlob(`backups/${backup.filename}`)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = backup.filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      toast.show('Backup download started')
      return
    }

    if (!backup.backup_stamp) {
      throw new Error('Missing archive ID for S3 download')
    }
    const { url, filename } = await getApiClient().get(
      `backups/archive/${backup.backup_stamp}/download-url`
    )
    const a = document.createElement('a')
    a.href = url
    a.download = filename || `pbx3bak-${backup.backup_stamp}.zip`
    a.rel = 'noopener'
    a.target = '_blank'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    toast.show(
      'Archive download started on your computer — use Restore to copy the zip onto this PBX'
    )
  } catch (err) {
    const msg = firstErrorMessage(err, 'Failed to download backup')
    toast.show(msg, 'error')
  } finally {
    downloadingBackup.value = null
  }
}

function openRestoreModal(backup) {
  restoreBackupName.value = backup.filename || ''
  restoreBackupStamp.value = backup.backup_stamp || ''
  restoreFromArchive.value = Boolean(!backup.has_local && backup.has_s3 && backup.backup_stamp)
  restoreOptions.value = {
    restoredb: false,
    restoreasterisk: false,
    restoreusergreeting: false,
    restorevmail: false,
    restoreldap: false
  }
  restoreError.value = ''
  showRestoreModal.value = true
}

function closeRestoreModal() {
  showRestoreModal.value = false
  restoreBackupName.value = ''
  restoreBackupStamp.value = ''
  restoreFromArchive.value = false
  restoreError.value = ''
}

function confirmRestore() {
  if (!hasRestoreOptionSelected.value) {
    restoreError.value = 'Please select at least one option to restore'
    return
  }
  const label = restoreFromArchive.value
    ? restoreBackupStamp.value
    : restoreBackupName.value
  openGenericConfirm({
    title: restoreFromArchive.value ? 'Restore from archive?' : 'Restore backup?',
    body: restoreFromArchive.value
      ? `Download archive ${restoreBackupStamp.value} from S3, then restore selected items? This will overwrite existing data.`
      : `Restore selected items from ${label}? This will overwrite existing data.`,
    confirmLabel: 'Restore',
    variant: 'danger',
    onConfirm: runRestoreBackup
  })
}

async function runRestoreBackup() {
  const key = restoreFromArchive.value ? restoreBackupStamp.value : restoreBackupName.value
  restoringBackup.value = key
  restoreError.value = ''
  try {
    const payload = {}
    for (const [key, value] of Object.entries(restoreOptions.value)) {
      payload[key] = value ? 1 : 0
    }
    if (restoreFromArchive.value) {
      payload.backup_stamp = restoreBackupStamp.value
      await getApiClient().post('backups/restore-from-archive', payload)
    } else {
      await getApiClient().put(`backups/${restoreBackupName.value}`, payload)
    }
    toast.show('Backup restored successfully')
    closeRestoreModal()
    await loadBackups()
  } catch (err) {
    const msg = firstErrorMessage(err, 'Failed to restore backup')
    restoreError.value = msg
    toast.show(msg, 'error')
  } finally {
    restoringBackup.value = null
  }
}

function askConfirmDelete(filename) {
  confirmDeleteBackup.value = filename
}

function cancelConfirmDelete() {
  confirmDeleteBackup.value = null
}

async function confirmAndDeleteBackup(filename) {
  deletingBackup.value = filename
  try {
    await getApiClient().delete(`backups/${filename}`)
    toast.show('Backup deleted successfully')
    cancelConfirmDelete()
    await loadBackups()
  } catch (err) {
    const msg = firstErrorMessage(err, 'Failed to delete backup')
    toast.show(msg, 'error')
    cancelConfirmDelete()
  } finally {
    deletingBackup.value = null
  }
}

onMounted(() => {
  loadBackups()
})
</script>

<style scoped>
.backup-view {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.subtitle {
  margin: 0;
  color: #64748b;
  font-size: 0.9375rem;
  max-width: 42rem;
  line-height: 1.45;
}

.backup-list .mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.875rem;
}

.backup-actions {
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

.backup-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
  box-sizing: border-box;
}

.backup-list {
  margin: 0;
  max-width: 100%;
  overflow-x: auto;
}

.table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9375rem;
}

.backup-list .table-backups {
  width: auto;
  max-width: 100%;
  table-layout: auto;
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

/* Backups: shrink-to-fit columns (no full-width stretch) */
.table-backups th,
.table-backups td {
  padding: 0.4rem 0.65rem;
  vertical-align: middle;
}

.table-backups .col-created,
.table-backups .col-archive {
  white-space: nowrap;
}

.table-backups .col-file {
  max-width: 12rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.table-backups .source-tag {
  margin-left: 0.35rem;
  font-size: 0.65rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: #0369a1;
  vertical-align: middle;
}

.table-backups .source-tag-both {
  color: #15803d;
}

.table-backups .col-size {
  white-space: nowrap;
  text-align: right;
  padding-left: 1rem;
}

.table-backups .col-actions {
  width: 1%;
  white-space: nowrap;
  padding-left: 0.5rem;
}

.table-backups tbody tr {
  height: auto;
}

.table-backups .cell-actions {
  gap: 0.35rem;
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

/* Restore Modal */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal {
  background: white;
  border-radius: 0.5rem;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  padding: 1.5rem;
  max-width: 28rem;
  width: 100%;
}

.modal-title {
  margin: 0 0 1rem 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: #0f172a;
}

.modal-body {
  margin: 0 0 1.25rem 0;
  font-size: 0.9375rem;
  color: #475569;
  line-height: 1.5;
}

.modal-body :deep(strong) {
  color: #0f172a;
}

.restore-options {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 1rem;
}

.restore-option {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 0.25rem;
  transition: background 0.15s;
}

.restore-option:hover {
  background: #f8fafc;
}

.restore-option input[type='checkbox'] {
  width: 1rem;
  height: 1rem;
  cursor: pointer;
}

.restore-option span {
  flex: 1;
  user-select: none;
}

.modal-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
}

.modal-btn {
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  font-weight: 500;
  border-radius: 0.375rem;
  cursor: pointer;
  border: none;
}

.modal-btn-cancel {
  background: #f1f5f9;
  color: #475569;
}

.modal-btn-cancel:hover {
  background: #e2e8f0;
}

.modal-btn-primary {
  background: #3b82f6;
  color: white;
}

.modal-btn-primary:hover:not(:disabled) {
  background: #2563eb;
}

.modal-btn-primary:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
</style>
