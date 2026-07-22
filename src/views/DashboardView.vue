<script setup>
import { ref, computed, onMounted } from 'vue'
import { getApiClient } from '@/api/client'
import ConfirmModal from '@/components/ConfirmModal.vue'
import { getSpaReleases } from '@/config/spaReleases.js'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const spaReleases = getSpaReleases()

const actionMessage = ref('')
const actionError = ref('')
const actionBusy = ref(null)

const actionConfirmShow = ref(false)
const actionConfirmTitle = ref('Please confirm')
const actionConfirmBody = ref('')
const actionConfirmLabel = ref('OK')
const actionConfirmVariant = ref('primary')
const pendingSysCommand = ref(null)

const sysnotes = ref(null)
const sysglobal = ref(null)
const sysnotesLoading = ref(true)
const sysnotesError = ref('')

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

const spaReleaseRows = computed(() => {
  const r = spaReleases
  return [
    { label: 'PBX3 Admin UI', value: r.pbx3spa },
    { label: 'Node.js (build)', value: r.node },
    { label: 'Vue', value: r.vue },
    { label: 'Vue Router', value: r.vueRouter },
    { label: 'Pinia', value: r.pinia }
  ]
})

/** Normalize API system block (snake_case + rare camelCase). */
const systemInfo = computed(() => {
  const s = sysnotes.value?.system
  if (!s || typeof s !== 'object') return null
  return {
    ...s,
    php_version: s.php_version ?? s.phpVersion,
    laravel_version: s.laravel_version ?? s.laravelVersion
  }
})

/** Site label from globals (Network panel); sysnotes may also carry it when API is current. */
const displaySitename = computed(() => {
  const fromGlobals = (sysglobal.value?.sitename ?? '').trim()
  if (fromGlobals) return fromGlobals
  return (systemInfo.value?.sitename ?? '').trim()
})

async function fetchSysnotes() {
  sysnotesLoading.value = true
  sysnotesError.value = ''
  try {
    const notes = await getApiClient().get('syscommands/sysnotes')
    sysnotes.value = notes
    try {
      const globals = await getApiClient().get('sysglobals')
      sysglobal.value = globals
      auth.setGlobalsFqdnFromSysglobal(globals)
    } catch {
      sysglobal.value = null
    }
  } catch (err) {
    sysnotesError.value = err.data?.message || err.message || 'Failed to load system info'
    sysnotes.value = null
    sysglobal.value = null
  } finally {
    sysnotesLoading.value = false
  }
}

function cancelActionConfirm() {
  actionConfirmShow.value = false
  pendingSysCommand.value = null
}

async function executeSysCommand(command) {
  actionError.value = ''
  actionMessage.value = ''
  actionBusy.value = command
  try {
    await getApiClient().get(`syscommands/${command}`)
    actionMessage.value = `Command "${command}" completed.`
    await fetchSysnotes()
  } catch (err) {
    const msg = err.data?.message || err.message || `Failed to run ${command}`
    const detail = err.data?.detail
    actionError.value = detail ? `${msg}: ${detail}` : msg
  } finally {
    actionBusy.value = null
  }
}

function openActionConfirm(command, body, options = {}) {
  pendingSysCommand.value = command
  actionConfirmBody.value = body
  actionConfirmLabel.value = options.confirmLabel ?? 'OK'
  actionConfirmVariant.value = options.variant ?? 'primary'
  actionConfirmTitle.value = options.title ?? 'Please confirm'
  actionConfirmShow.value = true
}

function confirmAction() {
  const command = pendingSysCommand.value
  actionConfirmShow.value = false
  pendingSysCommand.value = null
  if (command) void executeSysCommand(command)
}

function startPbx() {
  openActionConfirm('start', 'Start the PBX?', {
    confirmLabel: 'Start',
    variant: 'primary'
  })
}

function stopPbx() {
  openActionConfirm('stop', 'Stop the PBX?', {
    confirmLabel: 'Stop',
    variant: 'primary'
  })
}

function reboot() {
  openActionConfirm(
    'reboot',
    'Reboot the PBX instance? The system will restart and active calls may drop. This cannot be undone.',
    {
      title: 'Reboot instance?',
      confirmLabel: 'Reboot',
      variant: 'danger'
    }
  )
}

onMounted(() => {
  fetchSysnotes()
})
</script>

<template>
  <div class="dashboard">
    <h1 class="dashboard-heading">
      <span class="dashboard-heading-main">Home</span>
      <template v-if="auth.displayInstanceLabel?.trim()">
        <span class="dashboard-heading-sep" aria-hidden="true">—</span>
        <span class="dashboard-heading-instance">{{ auth.displayInstanceLabel }}</span>
      </template>
    </h1>

    <section v-if="auth.isAdmin" class="actions-section">
      <h2 class="detail-heading">Actions</h2>
      <p v-if="actionMessage" class="message">{{ actionMessage }}</p>
      <p v-if="actionError" class="error">{{ actionError }}</p>
      <div class="action-buttons">
        <button type="button" class="btn-action" :disabled="actionBusy != null" @click="startPbx">
          {{ actionBusy === 'start' ? 'Running…' : 'Start PBX' }}
        </button>
        <button type="button" class="btn-action" :disabled="actionBusy != null" @click="stopPbx">
          {{ actionBusy === 'stop' ? 'Running…' : 'Stop PBX' }}
        </button>
      </div>
      <div class="danger-zone">
        <button type="button" class="btn-danger" :disabled="actionBusy != null" @click="reboot">
          {{ actionBusy === 'reboot' ? 'Running…' : 'Reboot instance' }}
        </button>
      </div>
    </section>

    <ConfirmModal
      v-if="auth.isAdmin"
      :show="actionConfirmShow"
      :title="actionConfirmTitle"
      :body-text="actionConfirmBody"
      :confirm-label="actionConfirmLabel"
      :variant="actionConfirmVariant"
      :loading="actionBusy != null"
      loading-label="Running…"
      @confirm="confirmAction"
      @cancel="cancelActionConfirm"
    />

    <section class="sysnotes-section">
      <h2 class="detail-heading">System info</h2>
      <p v-if="sysnotesLoading" class="loading">Loading system info…</p>
      <p v-else-if="sysnotesError" class="error">{{ sysnotesError }}</p>
      <div v-else-if="sysnotes" class="sysnotes-grid">
        <div class="sysnotes-col">
          <h3 class="sysnotes-col-heading">System</h3>
          <dl class="sysnotes-dl">
            <template v-if="systemInfo">
              <template v-if="displaySitename">
                <dt>Site name</dt>
                <dd>{{ display(displaySitename) }}</dd>
              </template>
              <dt>Distro</dt>
              <dd>{{ display(systemInfo.distro) }}</dd>
              <dt>Asterisk release</dt>
              <dd>{{ display(systemInfo.asterisk_release) }}</dd>
              <dt>PBX3 release</dt>
              <dd>{{ display(systemInfo.app_release) }}</dd>
              <dt>PHP (API)</dt>
              <dd>{{ display(systemInfo.php_version) }}</dd>
              <dt>Laravel (API)</dt>
              <dd>{{ display(systemInfo.laravel_version) }}</dd>
              <template v-for="row in spaReleaseRows" :key="row.label">
                <dt>{{ row.label }}</dt>
                <dd>{{ display(row.value) }}</dd>
              </template>
              <dt>Endpoints defined</dt>
              <dd>{{ display(systemInfo.endpoints_defined) }}</dd>
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
  /* No max-width: single-screen panel fills content area (PANEL_PATTERN: Single-screen panels: use full content width) */
}
.dashboard-heading {
  margin: 0 0 1.25rem 0;
  font-weight: 600;
  font-size: 1.5rem;
  line-height: 1.3;
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.35rem 0.65rem;
}
.dashboard-heading-instance {
  color: #475569;
  font-weight: 600;
  font-size: 0.92em;
  word-break: break-word;
}
.actions-section,
.sysnotes-section {
  margin-bottom: 2rem;
  padding: 1.25rem;
  background: #f8fafc;
  border-radius: 0.5rem;
  border: 1px solid #e2e8f0;
}
.sysnotes-section {
  /* Stack columns when *this* card is narrow (sidebar shrinks main; viewport can still be “wide”). */
  container-type: inline-size;
  container-name: sysnotes;
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
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1.5rem;
}
/* Stack only when this card is fairly narrow; 80rem matched almost all real mains → always 1 col. */
@container sysnotes (max-width: 52rem) {
  .sysnotes-grid {
    grid-template-columns: 1fr;
  }
}
/* No container queries: use viewport (imperfect with sidebar, but better than never stacking on phones). */
@supports not (container-type: inline-size) {
  @media (max-width: 52rem) {
    .sysnotes-grid {
      grid-template-columns: 1fr;
    }
  }
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
  display: grid;
  grid-template-columns: auto 1fr;
  column-gap: 1.25rem;
  row-gap: 0.35rem;
  align-items: baseline;
}
.sysnotes-dl dt {
  margin: 0;
  color: #64748b;
  font-weight: 500;
}
.sysnotes-dl dt::after {
  content: ':';
}
.sysnotes-dl dd {
  margin: 0;
  color: #0f172a;
  min-width: 0;
  overflow-wrap: break-word;
  word-break: normal;
}
</style>
