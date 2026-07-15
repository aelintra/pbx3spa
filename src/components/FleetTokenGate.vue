<script setup>
/**
 * Fleet gatekeeper auth for Fleet mode panels.
 * Prefer email/password login; break-glass paste stays collapsed (ops/emergency only).
 * S10.1: session must include fleet_read (enforced after login /me).
 * S10.8: form kinship with LoginView credentials.
 */
import { ref, computed } from 'vue'
import {
  hasFleetGatekeeperToken,
  setFleetGatekeeperToken,
  canEnterFleet
} from '@/config/fleetGatekeeper'
import { loginFleet, logoutFleet, refreshFleetSession } from '@/api/fleetGatekeeper'

const emit = defineEmits(['saved', 'cleared'])

const email = ref('')
const password = ref('')
const tokenDraft = ref('')
const error = ref('')
const busy = ref(false)
const showAdvanced = ref(false)
const hasToken = ref(hasFleetGatekeeperToken())
const labDevHint = computed(
  () => import.meta.env.DEV && Boolean((import.meta.env.VITE_FLEET_GATEKEEPER_TOKEN || '').trim())
)

async function doLogin() {
  error.value = ''
  busy.value = true
  try {
    await loginFleet(email.value.trim(), password.value)
    password.value = ''
    hasToken.value = hasFleetGatekeeperToken()
    emit('saved')
  } catch (e) {
    error.value = e?.message || 'Login failed'
    hasToken.value = hasFleetGatekeeperToken()
  } finally {
    busy.value = false
  }
}

async function saveToken() {
  error.value = ''
  busy.value = true
  try {
    setFleetGatekeeperToken(tokenDraft.value)
    tokenDraft.value = ''
    await refreshFleetSession()
    hasToken.value = hasFleetGatekeeperToken()
    if (!canEnterFleet()) {
      throw new Error('This account lacks fleet_read — cannot enter Fleet mode')
    }
    emit('saved')
  } catch (e) {
    error.value = e?.message || 'Could not validate fleet session'
    hasToken.value = hasFleetGatekeeperToken()
  } finally {
    busy.value = false
  }
}

async function clearToken() {
  error.value = ''
  busy.value = true
  try {
    await logoutFleet()
  } finally {
    busy.value = false
    hasToken.value = false
    emit('cleared')
  }
}

defineExpose({
  refresh() {
    hasToken.value = hasFleetGatekeeperToken()
  }
})
</script>

<template>
  <div class="fleet-token-gate">
    <p class="hint">
      Sign in with a fleet operator account on the control plane
      (<code>control.pbx3.com</code>). This is not your PBX3 instance login.
    </p>
    <p v-if="labDevHint" class="hint lab">
      Vite DEV can still load a break-glass token from
      <code>VITE_FLEET_GATEKEEPER_TOKEN</code> in <code>.env.development</code>.
    </p>

    <div v-if="!hasToken" class="token-box">
      <form class="token-form login" @submit.prevent="doLogin">
        <label for="fleet-gate-email">Email</label>
        <input
          id="fleet-gate-email"
          v-model="email"
          type="email"
          autocomplete="username"
          placeholder="fleet@pbx3.com"
          required
        />
        <label for="fleet-gate-password">Password</label>
        <input
          id="fleet-gate-password"
          v-model="password"
          type="password"
          autocomplete="current-password"
          placeholder="Password"
          required
        />
        <button type="submit" class="btn-primary" :disabled="busy">
          {{ busy ? 'Signing in…' : 'Sign in' }}
        </button>
      </form>
      <p v-if="error" class="error">{{ error }}</p>

      <details class="break-glass" :open="showAdvanced" @toggle="showAdvanced = $event.target.open">
        <summary>Break-glass (ops only)</summary>
        <p class="hint break-glass-hint">
          Emergency access with the control-plane <code>GATEKEEPER_API_TOKEN</code>
          (treated as <code>fleet_admin</code>). Day-to-day operators should use Sign in above.
        </p>
        <form class="token-form break-glass-form" @submit.prevent="saveToken">
          <label for="fleet-gate-token">Break-glass token</label>
          <input
            id="fleet-gate-token"
            v-model="tokenDraft"
            type="password"
            autocomplete="off"
            placeholder="Paste break-glass token"
          />
          <button type="submit" class="btn-secondary" :disabled="busy">Save for session</button>
        </form>
      </details>
    </div>
    <p v-else class="hint token-ok">
      Fleet session active.
      <button type="button" class="linkish" :disabled="busy" @click="clearToken">Sign out</button>
    </p>
  </div>
</template>

<style scoped>
.fleet-token-gate {
  margin-bottom: 1rem;
}
.hint {
  color: var(--pbx-text-muted, #64748b);
  font-size: 0.875rem;
  margin: 0.35rem 0;
}
.hint.lab {
  color: var(--pbx-text-muted, #64748b);
}
.error {
  color: #b91c1c;
  font-size: 0.875rem;
  margin: 0.5rem 0 0;
}
.token-box {
  margin: 0.75rem 0;
  padding: 1rem;
  border: 1px solid var(--pbx-border, #e2e8f0);
  border-radius: 0.375rem;
  background: var(--pbx-surface-subtle, #f8fafc);
  max-width: 26rem;
}
.token-form.login,
.break-glass-form {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.token-form label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--pbx-text, #0f172a);
}
.token-form input {
  padding: 0.5rem 0.65rem;
  border: 1px solid var(--pbx-border, #e2e8f0);
  border-radius: 0.375rem;
  font: inherit;
  font-size: 0.875rem;
}
.btn-primary {
  margin-top: 0.25rem;
  padding: 0.5rem 1rem;
  background: #2563eb;
  color: #fff;
  border: none;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
}
.btn-primary:hover:not(:disabled) {
  background: #1d4ed8;
}
.btn-primary:disabled,
.btn-secondary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.btn-secondary {
  margin-top: 0.25rem;
  padding: 0.45rem 0.85rem;
  background: #fff;
  color: var(--pbx-text, #0f172a);
  border: 1px solid var(--pbx-border, #e2e8f0);
  border-radius: 0.375rem;
  font-size: 0.875rem;
  cursor: pointer;
}
.break-glass {
  margin-top: 1rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--pbx-border, #e2e8f0);
  color: var(--pbx-text-muted, #64748b);
  font-size: 0.85rem;
}
.break-glass summary {
  cursor: pointer;
  list-style: none;
  color: var(--pbx-text-muted, #64748b);
}
.break-glass summary::-webkit-details-marker {
  display: none;
}
.break-glass summary::before {
  content: '▸ ';
  display: inline-block;
  width: 0.9em;
}
.break-glass[open] summary::before {
  content: '▾ ';
}
.break-glass-hint {
  margin: 0.5rem 0 0.65rem;
  font-size: 0.8rem;
}
.linkish {
  border: none;
  background: none;
  padding: 0;
  color: var(--pbx-accent, #1d4ed8);
  cursor: pointer;
  font: inherit;
  text-decoration: underline;
}
</style>
