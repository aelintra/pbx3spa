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

const sysnotes = ref(null)
const sysnotesLoading = ref(true)
const sysnotesError = ref('')

function formatRunState(data) {
  if (data == null) return '—'
  if (typeof data === 'string') return data
  if (typeof data === 'object') {
    const running = data.running ?? data.pbxrunstate
    if (running !== undefined) return running ? 'Running' : 'Stopped'
    if (data.state !== undefined) return String(data.state)
    return JSON.stringify(data)
  }
  return String(data)
}

function display(val) {
  if (val == null || val === '') return '—'
  return String(val)
}

function displayBytes(val) {
  if (val == null) return '—'
  const n = parseInt(val, 10)
  if (isNaN(n)) return String(val)
  if (n >= 1073741824) return (n / 1073741824).toFixed(1) + ' GB'
  if (n >= 1048576) return (n / 1048576).toFixed(1) + ' MB'
  if (n >= 1024) return (n / 1024).toFixed(1) + ' KB'
  return n + ' B'
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

async function fetchSysnotes() {
  sysnotesLoading.value = true
  sysnotesError.value = ''
  try {
    sysnotes.value = await getApiClient().get('syscommands/sysnotes')
  } catch (err) {
    sysnotesError.value = err.data?.message || err.message || 'Failed to load system info'
    sysnotes.value = null
  } finally {
    sysnotesLoading.value = false
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
    await fetchSysnotes()
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
  fetchSysnotes()
})
</script>

<template>
  <div class="dashboard">
    <h1>Home</h1>

    <section class="status-section">
      <h2 class="detail-heading">PBX status</h2>
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
      <h2 class="detail-heading">Actions</h2>
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

    <section class="sysnotes-section">
      <h2 class="detail-heading">System info</h2>
      <p v-if="sysnotesLoading" class="loading">Loading system info…</p>
      <p v-else-if="sysnotesError" class="error">{{ sysnotesError }}</p>
      <div v-else-if="sysnotes" class="sysnotes-grid">
        <div class="sysnotes-col">
          <h3 class="sysnotes-col-heading">System</h3>
          <dl class="sysnotes-dl">
            <template v-if="sysnotes.system">
              <dt>Distro</dt>
              <dd>{{ display(sysnotes.system.distro) }}</dd>
              <dt>Asterisk release</dt>
              <dd>{{ display(sysnotes.system.asterisk_release) }}</dd>
              <dt>App release</dt>
              <dd>{{ display(sysnotes.system.app_release) }}</dd>
              <dt>Endpoints defined</dt>
              <dd>{{ display(sysnotes.system.endpoints_defined) }}</dd>
              <dt>Serial</dt>
              <dd>{{ display(sysnotes.system.serial) }}</dd>
            </template>
          </dl>
        </div>
        <div class="sysnotes-col">
          <h3 class="sysnotes-col-heading">Network</h3>
          <dl class="sysnotes-dl">
            <template v-if="sysnotes.network">
              <dt>MAC</dt>
              <dd>{{ display(sysnotes.network.mac) }}</dd>
              <dt>Hostname</dt>
              <dd>{{ display(sysnotes.network.hostname) }}</dd>
              <dt>Local IP</dt>
              <dd>{{ display(sysnotes.network.local_ip) }}</dd>
              <dt>Public IP</dt>
              <dd>{{ display(sysnotes.network.public_ip) }}</dd>
            </template>
          </dl>
        </div>
        <div class="sysnotes-col">
          <h3 class="sysnotes-col-heading">Resource</h3>
          <dl class="sysnotes-dl">
            <template v-if="sysnotes.resource">
              <dt>Disk usage</dt>
              <dd>{{ display(sysnotes.resource.disk_usage) }}</dd>
              <dt>RAM size</dt>
              <dd>{{ displayBytes(sysnotes.resource.ram_total) }}</dd>
              <dt>RAM free</dt>
              <dd>{{ displayBytes(sysnotes.resource.ram_free) }}</dd>
              <dt>PBX</dt>
              <dd>{{ display(sysnotes.resource.pbx_runstate) }}</dd>
              <dt>Master timer</dt>
              <dd>{{ display(sysnotes.resource.masteroclo) }}</dd>
              <dt>Timer state</dt>
              <dd>{{ display(sysnotes.resource.timer_state) }}</dd>
            </template>
          </dl>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.dashboard {
  max-width: 56rem;
}
.dashboard h1 {
  margin: 0 0 1.25rem 0;
  font-size: 1.5rem;
  font-weight: 600;
}
.status-section,
.actions-section,
.sysnotes-section {
  margin-bottom: 2rem;
  padding: 1.25rem;
  background: #f8fafc;
  border-radius: 0.5rem;
  border: 1px solid #e2e8f0;
}
.detail-heading {
  font-size: 1rem;
  font-weight: 600;
  color: #334155;
  margin: 0 0 0.75rem 0;
  border-bottom: 1px solid #e2e8f0;
  padding-bottom: 0.5rem;
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
.sysnotes-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
}
.sysnotes-col-heading {
  margin: 0 0 0.5rem 0;
  font-size: 0.9375rem;
  font-weight: 600;
  color: #475569;
}
.sysnotes-dl {
  margin: 0;
  font-size: 0.875rem;
}
.sysnotes-dl dt {
  margin-top: 0.5rem;
  color: #64748b;
  font-weight: 500;
}
.sysnotes-dl dt:first-child {
  margin-top: 0;
}
.sysnotes-dl dd {
  margin: 0.15rem 0 0 0;
  color: #0f172a;
}
</style>
