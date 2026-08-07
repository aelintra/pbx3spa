<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getApiClient } from '@/api/client'
import { useToastStore } from '@/stores/toast'
import { useAuthStore } from '@/stores/auth'
import FormField from '@/components/forms/FormField.vue'

const router = useRouter()
const toast = useToastStore()
const auth = useAuthStore()

const enabled = computed(() => Boolean(auth.user?.two_factor_enabled))

const password = ref('')
const code = ref('')
const error = ref('')
const loading = ref(false)

/** @type {import('vue').Ref<'idle'|'setup'|'recovery'|null>} */
const phase = ref('idle')
const secret = ref('')
const otpauthUrl = ref('')
const qrSvg = ref('')
const issuer = ref('')
/** @type {import('vue').Ref<string[]>} */
const recoveryCodes = ref([])

function resetForm() {
  password.value = ''
  code.value = ''
  error.value = ''
}

async function refreshWhoami() {
  try {
    const user = await getApiClient().get('auth/whoami')
    auth.setUser(user)
  } catch {
    /* keep existing */
  }
}

async function startSetup() {
  error.value = ''
  loading.value = true
  recoveryCodes.value = []
  try {
    const res = await getApiClient().post('auth/2fa/setup', {
      password: password.value
    })
    secret.value = res.secret || ''
    otpauthUrl.value = res.otpauth_url || ''
    qrSvg.value = res.qr_svg || ''
    issuer.value = res.issuer || 'Aelintra PBX'
    phase.value = 'setup'
    code.value = ''
  } catch (err) {
    const msg =
      err.data?.password?.[0] ||
      err.data?.message ||
      err.message ||
      'Could not start 2FA setup'
    // Classic when SPA tip hits an instance API that has not been updated yet.
    if (/POST method is not supported|Method Not Allowed|supported methods:\s*GET/i.test(String(msg))) {
      error.value =
        'This instance API does not have 2FA routes yet. Deploy pbx3api branch spa-totp-2fa and run migrations, then retry.'
    } else {
      error.value = msg
    }
  } finally {
    loading.value = false
  }
}

async function confirmSetup() {
  error.value = ''
  loading.value = true
  try {
    const res = await getApiClient().post('auth/2fa/confirm', { code: code.value.trim() })
    recoveryCodes.value = Array.isArray(res.recovery_codes) ? res.recovery_codes : []
    phase.value = 'recovery'
    toast.show('Two-factor authentication enabled')
    await refreshWhoami()
    resetForm()
  } catch (err) {
    error.value =
      err.data?.code?.[0] || err.data?.message || err.message || 'Invalid code'
  } finally {
    loading.value = false
  }
}

async function disableTwoFactor() {
  error.value = ''
  loading.value = true
  try {
    await getApiClient().post('auth/2fa/disable', {
      password: password.value,
      code: code.value.trim()
    })
    toast.show('Two-factor authentication disabled')
    phase.value = 'idle'
    recoveryCodes.value = []
    resetForm()
    await refreshWhoami()
  } catch (err) {
    error.value =
      err.data?.code?.[0] ||
      err.data?.password?.[0] ||
      err.data?.message ||
      err.message ||
      'Could not disable 2FA'
  } finally {
    loading.value = false
  }
}

async function regenerateRecovery() {
  error.value = ''
  loading.value = true
  try {
    const res = await getApiClient().post('auth/2fa/recovery', {
      password: password.value,
      code: code.value.trim()
    })
    recoveryCodes.value = Array.isArray(res.recovery_codes) ? res.recovery_codes : []
    phase.value = 'recovery'
    toast.show('Recovery codes regenerated')
    resetForm()
  } catch (err) {
    error.value =
      err.data?.code?.[0] ||
      err.data?.password?.[0] ||
      err.data?.message ||
      err.message ||
      'Could not regenerate codes'
  } finally {
    loading.value = false
  }
}

function copyRecovery() {
  const text = recoveryCodes.value.join('\n')
  if (!text) return
  navigator.clipboard?.writeText(text).then(
    () => toast.show('Recovery codes copied'),
    () => toast.show('Copy failed')
  )
}

onMounted(() => {
  refreshWhoami()
})
</script>

<template>
  <div class="account-view">
    <h1>Account security</h1>
    <p class="muted">
      Signed in as {{ auth.user?.email || '—' }}. Use any authenticator app (2FAS, Authy, Google
      Authenticator, …). Issuer label: <strong>Aelintra PBX</strong> (separate from SBC).
    </p>

    <p class="status">
      Status:
      <strong>{{ enabled ? 'Two-factor authentication enabled' : 'Not enabled' }}</strong>
    </p>

    <div v-if="phase === 'recovery' && recoveryCodes.length" class="recovery-box" role="status">
      <h2>Save these recovery codes now</h2>
      <p class="warn">
        This is the only time they are shown. Each code works once if you lose your authenticator.
        Copy or write them down before clicking Done.
      </p>
      <ul class="recovery-list">
        <li v-for="c in recoveryCodes" :key="c"><code>{{ c }}</code></li>
      </ul>
      <div class="form-actions">
        <button type="button" class="btn-submit" @click="copyRecovery">Copy all codes</button>
        <button type="button" class="btn-cancel" @click="phase = 'idle'; recoveryCodes = []">
          Done — I saved them
        </button>
      </div>
    </div>

    <template v-else-if="!enabled && phase !== 'setup'">
      <h2>Enable authenticator</h2>
      <p class="muted">Confirm your password, then scan the QR code.</p>
      <FormField
        id="setupPassword"
        v-model="password"
        label="Current password"
        type="password"
        autocomplete="current-password"
      />
      <p v-if="error" class="form-error">{{ error }}</p>
      <div class="form-actions">
        <button type="button" class="btn-cancel" @click="router.push({ name: 'dashboard' })">
          Cancel
        </button>
        <button type="button" class="btn-submit" :disabled="loading || !password" @click="startSetup">
          {{ loading ? 'Working…' : 'Continue' }}
        </button>
      </div>
    </template>

    <template v-else-if="phase === 'setup'">
      <h2>Scan QR code</h2>
      <p class="muted">Issuer: {{ issuer }}. Or enter the secret manually.</p>
      <p class="next-step">
        After you enter a live code and click <strong>Confirm and enable</strong>, recovery codes
        appear on the next screen — save them then.
      </p>
      <img v-if="qrSvg" class="qr-img" :src="qrSvg" alt="TOTP QR code" width="220" height="220" />
      <p class="secret"><code>{{ secret }}</code></p>
      <FormField
        id="confirmCode"
        v-model="code"
        label="Authentication code from your app"
        autocomplete="one-time-code"
      />
      <p v-if="error" class="form-error">{{ error }}</p>
      <div class="form-actions">
        <button
          type="button"
          class="btn-cancel"
          @click="phase = 'idle'; resetForm()"
        >
          Cancel
        </button>
        <button
          type="button"
          class="btn-submit"
          :disabled="loading || !code.trim()"
          @click="confirmSetup"
        >
          {{ loading ? 'Confirming…' : 'Confirm and enable' }}
        </button>
      </div>
    </template>

    <template v-else-if="enabled">
      <h2>Disable two-factor</h2>
      <p class="muted">Password plus a current authenticator or recovery code.</p>
      <FormField
        id="disablePassword"
        v-model="password"
        label="Current password"
        type="password"
        autocomplete="current-password"
      />
      <FormField
        id="disableCode"
        v-model="code"
        label="Authenticator or recovery code"
        autocomplete="one-time-code"
      />
      <p v-if="error" class="form-error">{{ error }}</p>
      <div class="form-actions">
        <button
          type="button"
          class="btn-danger"
          :disabled="loading || !password || !code.trim()"
          @click="disableTwoFactor"
        >
          {{ loading ? 'Working…' : 'Disable 2FA' }}
        </button>
      </div>

      <h2 class="spaced">Regenerate recovery codes</h2>
      <p class="muted">Invalidates previous unused codes.</p>
      <div class="form-actions">
        <button
          type="button"
          class="btn-secondary"
          :disabled="loading || !password || !code.trim()"
          @click="regenerateRecovery"
        >
          Regenerate codes
        </button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.account-view {
  max-width: 32rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.muted {
  margin: 0;
  color: #64748b;
  font-size: 0.9375rem;
}
.next-step {
  margin: 0;
  padding: 0.65rem 0.75rem;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 0.375rem;
  font-size: 0.9375rem;
  color: #1e3a8a;
}
.warn {
  margin: 0;
  font-size: 0.9375rem;
  color: #92400e;
  font-weight: 500;
}
.status {
  margin: 0;
}
.form-error {
  color: #dc2626;
  margin: 0;
}
.form-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 0.5rem;
}
.btn-cancel,
.btn-submit,
.btn-secondary,
.btn-danger {
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  font-size: 0.9375rem;
  cursor: pointer;
}
.btn-cancel {
  border: 1px solid #cbd5e1;
  background: #fff;
}
.btn-submit {
  border: none;
  background: #2563eb;
  color: #fff;
}
.btn-secondary {
  border: 1px solid #cbd5e1;
  background: #f8fafc;
}
.btn-danger {
  border: none;
  background: #dc2626;
  color: #fff;
}
.btn-submit:disabled,
.btn-danger:disabled,
.btn-secondary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.qr-img {
  display: block;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 0.375rem;
}
.secret {
  word-break: break-all;
  font-size: 0.875rem;
}
.recovery-box {
  border: 1px solid #fbbf24;
  background: #fffbeb;
  padding: 1rem;
  border-radius: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.recovery-list {
  margin: 0;
  padding-left: 1.25rem;
  font-family: ui-monospace, monospace;
}
.spaced {
  margin-top: 1.5rem;
}
h2 {
  font-size: 1.125rem;
  margin: 0.5rem 0 0;
}
</style>
