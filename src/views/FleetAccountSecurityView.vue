<script setup>
/**
 * Fleet Gatekeeper opt-in TOTP — separate plane from instance Account Security.
 */
import { ref, computed, onMounted } from 'vue'
import {
  getFleetMe,
  setupFleetTwoFactor,
  confirmFleetTwoFactor,
  disableFleetTwoFactor,
  regenerateFleetRecoveryCodes,
  refreshFleetSession
} from '@/api/fleetGatekeeper'
import { hasFleetGatekeeperToken } from '@/config/fleetGatekeeper'

const enabled = ref(false)
const password = ref('')
const code = ref('')
const error = ref('')
const loading = ref(false)
/** @type {import('vue').Ref<'idle'|'setup'|'recovery'>} */
const phase = ref('idle')
const secret = ref('')
const qrSvg = ref('')
const issuer = ref('Aelintra Fleet')
/** @type {import('vue').Ref<string[]>} */
const recoveryCodes = ref([])

const signedIn = computed(() => hasFleetGatekeeperToken())

function resetForm() {
  password.value = ''
  code.value = ''
  error.value = ''
}

async function refreshMe() {
  if (!hasFleetGatekeeperToken()) {
    enabled.value = false
    return
  }
  try {
    const me = await getFleetMe()
    enabled.value = Boolean(me?.two_factor_enabled ?? me?.user?.two_factor_enabled)
  } catch {
    /* keep */
  }
}

async function startSetup() {
  error.value = ''
  loading.value = true
  recoveryCodes.value = []
  try {
    const res = await setupFleetTwoFactor(password.value)
    secret.value = res.secret || ''
    qrSvg.value = res.qr_svg || ''
    issuer.value = res.issuer || 'Aelintra Fleet'
    phase.value = 'setup'
    code.value = ''
  } catch (e) {
    error.value = e?.message || 'Could not start Fleet 2FA setup'
  } finally {
    loading.value = false
  }
}

async function confirmSetup() {
  error.value = ''
  loading.value = true
  try {
    const res = await confirmFleetTwoFactor(code.value.trim())
    recoveryCodes.value = Array.isArray(res.recovery_codes) ? res.recovery_codes : []
    phase.value = 'recovery'
    enabled.value = true
    resetForm()
  } catch (e) {
    error.value = e?.message || 'Invalid code'
  } finally {
    loading.value = false
  }
}

async function disableTwoFactor() {
  error.value = ''
  loading.value = true
  try {
    await disableFleetTwoFactor(password.value, code.value.trim())
    enabled.value = false
    phase.value = 'idle'
    recoveryCodes.value = []
    resetForm()
  } catch (e) {
    error.value = e?.message || 'Could not disable Fleet 2FA'
  } finally {
    loading.value = false
  }
}

async function regenerateRecovery() {
  error.value = ''
  loading.value = true
  try {
    const res = await regenerateFleetRecoveryCodes(password.value, code.value.trim())
    recoveryCodes.value = Array.isArray(res.recovery_codes) ? res.recovery_codes : []
    phase.value = 'recovery'
    resetForm()
  } catch (e) {
    error.value = e?.message || 'Could not regenerate recovery codes'
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  if (hasFleetGatekeeperToken()) {
    try {
      await refreshFleetSession()
    } catch {
      /* ignore */
    }
  }
  await refreshMe()
})
</script>

<template>
  <div class="fleet-security">
    <h1>Fleet 2FA</h1>
    <p class="hint">
      Opt-in authenticator MFA for the <strong>control plane</strong> (Gatekeeper).
      Separate from instance PBX and SBC 2FA. Issuer:
      <code>{{ issuer }}</code>.
      Use any authenticator app (e.g. 2FAS, Authy, Google Authenticator).
    </p>

    <p v-if="!signedIn" class="error">Sign in to Fleet first.</p>

    <template v-else>
      <p class="status">
        <strong>{{ enabled ? 'Two-factor authentication enabled' : 'Not enabled' }}</strong>
      </p>
      <p v-if="error" class="error">{{ error }}</p>

      <section v-if="phase === 'idle' && !enabled" class="panel">
        <h2>Enable Fleet 2FA</h2>
        <label>
          Confirm password
          <input v-model="password" type="password" autocomplete="current-password" />
        </label>
        <button type="button" class="primary" :disabled="loading || !password" @click="startSetup">
          {{ loading ? 'Starting…' : 'Start setup' }}
        </button>
      </section>

      <section v-if="phase === 'setup'" class="panel">
        <h2>Scan QR</h2>
        <img v-if="qrSvg" class="qr-img" :src="qrSvg" alt="TOTP QR code" width="220" height="220" />
        <p class="hint">Manual secret: <code>{{ secret }}</code></p>
        <label>
          Authenticator code
          <input v-model="code" type="text" inputmode="numeric" autocomplete="one-time-code" />
        </label>
        <button type="button" class="primary" :disabled="loading || !code" @click="confirmSetup">
          {{ loading ? 'Confirming…' : 'Confirm' }}
        </button>
      </section>

      <section v-if="phase === 'recovery'" class="panel">
        <h2>Recovery codes</h2>
        <p class="hint">Save these now — they will not be shown again.</p>
        <ul class="codes">
          <li v-for="c in recoveryCodes" :key="c"><code>{{ c }}</code></li>
        </ul>
        <button type="button" class="primary" @click="phase = 'idle'">Done</button>
      </section>

      <section v-if="phase === 'idle' && enabled" class="panel">
        <h2>Disable / regenerate</h2>
        <label>
          Password
          <input v-model="password" type="password" autocomplete="current-password" />
        </label>
        <label>
          Authenticator or recovery code
          <input v-model="code" type="text" autocomplete="one-time-code" />
        </label>
        <div class="row">
          <button
            type="button"
            class="danger"
            :disabled="loading || !password || !code"
            @click="disableTwoFactor"
          >
            Disable 2FA
          </button>
          <button
            type="button"
            class="secondary"
            :disabled="loading || !password || !code"
            @click="regenerateRecovery"
          >
            New recovery codes
          </button>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.fleet-security {
  max-width: 32rem;
}
.hint {
  color: var(--pbx-text-muted, #64748b);
  font-size: 0.9rem;
}
.status {
  margin: 1rem 0;
}
.error {
  color: #b91c1c;
}
.panel {
  margin: 1rem 0;
  padding: 1rem;
  border: 1px solid var(--pbx-border, #e2e8f0);
  border-radius: 0.375rem;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}
.panel label {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.875rem;
}
.panel input {
  padding: 0.45rem 0.6rem;
  border: 1px solid var(--pbx-border, #e2e8f0);
  border-radius: 0.375rem;
  font: inherit;
}
.qr-img {
  align-self: flex-start;
  background: #fff;
  padding: 0.5rem;
}
.codes {
  margin: 0;
  padding-left: 1.25rem;
}
.row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.primary,
.secondary,
.danger {
  padding: 0.45rem 0.85rem;
  border-radius: 0.375rem;
  font: inherit;
  cursor: pointer;
}
.primary {
  background: #2563eb;
  color: #fff;
  border: none;
}
.secondary {
  background: #fff;
  border: 1px solid var(--pbx-border, #e2e8f0);
}
.danger {
  background: #fff;
  color: #b91c1c;
  border: 1px solid #fecaca;
}
button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
