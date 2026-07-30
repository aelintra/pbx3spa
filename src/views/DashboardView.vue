<script setup>
import { ref, computed, onMounted } from 'vue'
import { getApiClient } from '@/api/client'
import ConfirmModal from '@/components/ConfirmModal.vue'
import HomeHostStrip from '@/components/home/HomeHostStrip.vue'
import HomeLivePosture from '@/components/home/HomeLivePosture.vue'
import HomeCdrCharts from '@/components/home/HomeCdrCharts.vue'
import HomeSysnotesDetail from '@/components/home/HomeSysnotesDetail.vue'
import { useHomePulse } from '@/composables/useHomePulse'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()

const actionMessage = ref('')
const actionError = ref('')
const actionBusy = ref(null)

const actionConfirmShow = ref(false)
const actionConfirmTitle = ref('Please confirm')
const actionConfirmBody = ref('')
const actionConfirmLabel = ref('OK')
const actionConfirmVariant = ref('primary')
const pendingSysCommand = ref(null)

const { pulse, loading: pulseLoading, error: pulseError } = useHomePulse({
  include: ['system', 'live', 'cdr']
})

const sysnotes = ref(null)
const sysglobal = ref(null)
const sysnotesLoading = ref(false)
const sysnotesError = ref('')
const sysnotesFetched = ref(false)

const displaySitename = computed(() => {
  const fromGlobals = (sysglobal.value?.sitename ?? '').trim()
  if (fromGlobals) return fromGlobals
  return (sysnotes.value?.system?.sitename ?? '').trim()
})

async function fetchSysnotes() {
  if (sysnotesFetched.value || sysnotesLoading.value) return
  sysnotesLoading.value = true
  sysnotesError.value = ''
  try {
    const notes = await getApiClient().get('syscommands/sysnotes')
    sysnotes.value = notes
    sysnotesFetched.value = true
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

onMounted(() => {
  void fetchSysnotes()
})

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

    <div v-if="auth.isAdmin" class="action-buttons">
      <p v-if="actionMessage" class="message">{{ actionMessage }}</p>
      <p v-if="actionError" class="error">{{ actionError }}</p>
      <button type="button" class="btn-action" :disabled="actionBusy != null" @click="startPbx">
        {{ actionBusy === 'start' ? 'Running…' : 'Start PBX' }}
      </button>
      <button type="button" class="btn-action" :disabled="actionBusy != null" @click="stopPbx">
        {{ actionBusy === 'stop' ? 'Running…' : 'Stop PBX' }}
      </button>
      <button type="button" class="btn-danger" :disabled="actionBusy != null" @click="reboot">
        {{ actionBusy === 'reboot' ? 'Running…' : 'Reboot instance' }}
      </button>
    </div>

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

    <p v-if="pulseLoading && !pulse" class="loading">Loading posture…</p>
    <p v-else-if="pulseError && !pulse" class="error">{{ pulseError }}</p>

    <template v-if="pulse">
      <section v-if="pulse.system" class="pulse-section">
        <HomeHostStrip :system="pulse.system" />
      </section>

      <section v-if="pulse.live" class="pulse-section">
        <HomeLivePosture :live="pulse.live" />
      </section>

      <section v-if="pulse.cdr" class="pulse-section">
        <HomeCdrCharts :cdr="pulse.cdr" />
      </section>
    </template>

    <section class="pulse-section">
      <HomeSysnotesDetail
        :sysnotes="sysnotes"
        :sitename="displaySitename"
        :loading="sysnotesLoading"
        :error="sysnotesError"
      />
    </section>
  </div>
</template>

<style scoped>
.dashboard {
  /* No max-width: single-screen panel fills content area */
}
.dashboard-heading {
  margin: 0 0 1rem 0;
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
.action-buttons {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
  margin: 0 0 1.5rem 0;
}
.action-buttons .message,
.action-buttons .error {
  flex: 1 0 100%;
  margin: 0;
}
.pulse-section {
  margin-bottom: 1.5rem;
}
.loading,
.error {
  margin: 0 0 1rem 0;
}
.error {
  color: #dc2626;
}
.message {
  color: #15803d;
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
.btn-danger {
  margin-left: auto;
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
