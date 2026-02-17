<script setup>
import { ref, onMounted } from 'vue'
import { getApiClient } from '@/api/client'

const runState = ref(null)
const commitDirty = ref(false)
const statusLoading = ref(true)
const statusError = ref('')
const actionMessage = ref('')
const actionError = ref('')
const actionBusy = ref(null)

function formatRunState(data) {
  if (data == null) return '—'
  if (typeof data === 'string') return data
  if (typeof data === 'object') {
    if (data.running !== undefined) return data.running ? 'Running' : 'Stopped'
    if (data.state !== undefined) return String(data.state)
    return JSON.stringify(data)
  }
  return String(data)
}

async function fetchRunState() {
  statusLoading.value = true
  statusError.value = ''
  actionMessage.value = ''
  actionError.value = ''
  try {
    const response = await getApiClient().get('syscommands/pbxrunstate')
    runState.value = response
  } catch (err) {
    statusError.value = err.data?.message || err.message || 'Failed to load PBX status'
    runState.value = null
  } finally {
    statusLoading.value = false
  }
}

async function fetchCommitStatus() {
  try {
    const response = await getApiClient().get('syscommands/commitstatus')
    commitDirty.value = response?.dirty === true
  } catch {
    commitDirty.value = false
  }
}

async function runCommand(command, confirmMessage, isDanger = false) {
  if (confirmMessage && !confirm(confirmMessage)) return
  actionError.value = ''
  actionMessage.value = ''
  actionBusy.value = command
  try {
    await getApiClient().get(`syscommands/${command}`)
    actionMessage.value = `Command "${command}" completed.`
    await fetchRunState()
    if (command === 'commit') await fetchCommitStatus()
  } catch (err) {
    actionError.value = err.data?.message || err.message || `Failed to run ${command}`
  } finally {
    actionBusy.value = null
  }
}

function commit() {
  runCommand('commit', 'Apply configuration (run Asterisk file generator)?')
}

function startPbx() {
  runCommand('start', 'Start the PBX?')
}

function stopPbx() {
  runCommand('stop', 'Stop the PBX?')
}

function reboot() {
  runCommand(
    'reboot',
    'Reboot the PBX instance? The system will restart and active calls may drop. This cannot be undone.',
    true
  )
}

onMounted(() => {
  fetchRunState()
  fetchCommitStatus()
})
</script>

<template>
  <div class="dashboard">
    <h1>Dashboard</h1>

    <section class="status-section">
      <h2>PBX status</h2>
      <p v-if="statusLoading" class="loading">Loading…</p>
      <p v-else-if="statusError" class="error">{{ statusError }}</p>
      <div v-else class="status-row">
        <span class="status-value">{{ formatRunState(runState) }}</span>
        <button type="button" class="btn-refresh" :disabled="statusLoading" @click="fetchRunState">
          Refresh
        </button>
      </div>
    </section>

    <section class="actions-section">
      <h2>Actions</h2>
      <p v-if="actionMessage" class="message">{{ actionMessage }}</p>
      <p v-if="actionError" class="error">{{ actionError }}</p>
      <div class="action-buttons">
        <button
          type="button"
          class="btn-action"
          :class="{ 'btn-commit-dirty': commitDirty }"
          :disabled="actionBusy != null"
          @click="commit"
          :title="commitDirty ? 'Uncommitted changes – run generator and reload' : 'Config is in sync'"
        >
          {{ actionBusy === 'commit' ? 'Running…' : (commitDirty ? 'Commit config (pending)' : 'Commit config') }}
        </button>
        <button
          type="button"
          class="btn-action"
          :disabled="actionBusy != null"
          @click="startPbx"
        >
          {{ actionBusy === 'start' ? 'Running…' : 'Start PBX' }}
        </button>
        <button
          type="button"
          class="btn-action"
          :disabled="actionBusy != null"
          @click="stopPbx"
        >
          {{ actionBusy === 'stop' ? 'Running…' : 'Stop PBX' }}
        </button>
      </div>
      <div class="danger-zone">
        <button
          type="button"
          class="btn-danger"
          :disabled="actionBusy != null"
          @click="reboot"
        >
          {{ actionBusy === 'reboot' ? 'Running…' : 'Reboot instance' }}
        </button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.dashboard {
  max-width: 40rem;
}
.dashboard h1 {
  margin-bottom: 1.25rem;
}
.status-section,
.actions-section {
  margin-bottom: 2rem;
  padding: 1.25rem;
  background: #f8fafc;
  border-radius: 0.5rem;
  border: 1px solid #e2e8f0;
}
.status-section h2,
.actions-section h2 {
  margin: 0 0 0.75rem 0;
  font-size: 1rem;
  font-weight: 600;
  color: #475569;
}
.loading,
.error {
  margin: 0;
}
.error {
  color: #dc2626;
}
.message {
  margin: 0 0 0.75rem 0;
  color: #15803d;
}
.status-row {
  display: flex;
  align-items: center;
  gap: 1rem;
}
.status-value {
  font-size: 1.125rem;
  font-weight: 500;
}
.btn-refresh {
  padding: 0.375rem 0.75rem;
  font-size: 0.875rem;
  color: #64748b;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 0.375rem;
  cursor: pointer;
}
.btn-refresh:hover:not(:disabled) {
  color: #0f172a;
  background: #f1f5f9;
}
.btn-refresh:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
.action-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 1rem;
}
.btn-action {
  padding: 0.5rem 1rem;
  font-size: 0.9375rem;
  font-weight: 500;
  color: #fff;
  background: #2563eb;
  border: none;
  border-radius: 0.375rem;
  cursor: pointer;
}
.btn-action:hover:not(:disabled) {
  background: #1d4ed8;
}
.btn-action:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
.btn-action.btn-commit-dirty {
  background: #dc2626;
}
.btn-action.btn-commit-dirty:hover:not(:disabled) {
  background: #b91c1c;
}
.danger-zone {
  padding-top: 0.75rem;
  border-top: 1px solid #e2e8f0;
}
.btn-danger {
  padding: 0.5rem 1rem;
  font-size: 0.9375rem;
  font-weight: 500;
  color: #fff;
  background: #dc2626;
  border: none;
  border-radius: 0.375rem;
  cursor: pointer;
}
.btn-danger:hover:not(:disabled) {
  background: #b91c1c;
}
.btn-danger:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
</style>
