<script setup>
/**
 * Fleet gatekeeper auth for Fleet mode panels.
 * Prefer email/password login; optional advanced paste for break-glass token.
 */
import { ref, computed } from 'vue'
import {
  hasFleetGatekeeperToken,
  setFleetGatekeeperToken,
  clearFleetGatekeeperToken
} from '@/config/fleetGatekeeper'
import { loginFleet, logoutFleet } from '@/api/fleetGatekeeper'

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
  } finally {
    busy.value = false
  }
}

function saveToken() {
  error.value = ''
  setFleetGatekeeperToken(tokenDraft.value)
  tokenDraft.value = ''
  hasToken.value = hasFleetGatekeeperToken()
  emit('saved')
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
        <input
          v-model="email"
          type="email"
          autocomplete="username"
          placeholder="Email"
          required
        />
        <input
          v-model="password"
          type="password"
          autocomplete="current-password"
          placeholder="Password"
          required
        />
        <button type="submit" class="primary" :disabled="busy">
          {{ busy ? 'Signing in…' : 'Sign in' }}
        </button>
      </form>
      <p v-if="error" class="error">{{ error }}</p>

      <button type="button" class="linkish advanced-toggle" @click="showAdvanced = !showAdvanced">
        {{ showAdvanced ? 'Hide' : 'Advanced' }}: paste API token
      </button>
      <form v-if="showAdvanced" class="token-form" @submit.prevent="saveToken">
        <input
          v-model="tokenDraft"
          type="password"
          autocomplete="off"
          placeholder="Paste GATEKEEPER_API_TOKEN (break-glass)"
        />
        <button type="submit" class="primary">Save for session</button>
      </form>
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
  color: var(--pbx-text-muted);
  font-size: 0.9rem;
  margin: 0.35rem 0;
}
.hint.lab {
  color: var(--pbx-text-muted);
}
.error {
  color: #b91c1c;
  font-size: 0.9rem;
  margin: 0.5rem 0 0;
}
.token-box {
  margin: 0.75rem 0;
  padding: 1rem;
  border: 1px solid var(--pbx-border);
  border-radius: 0.5rem;
  background: var(--pbx-surface-subtle, #f8fafc);
}
.token-form {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.token-form.login {
  flex-direction: column;
  max-width: 22rem;
}
.token-form input {
  flex: 1 1 12rem;
  padding: 0.4rem 0.6rem;
}
.token-form.login input {
  flex: none;
  width: 100%;
}
.advanced-toggle {
  display: inline-block;
  margin-top: 0.75rem;
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
