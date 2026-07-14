<script setup>
/**
 * Shared gatekeeper Bearer paste for Fleet mode panels.
 * Token is GATEKEEPER_API_TOKEN from gatekeeper/.env — not the PBX3 login password.
 */
import { ref, computed } from 'vue'
import {
  hasFleetGatekeeperToken,
  setFleetGatekeeperToken,
  clearFleetGatekeeperToken
} from '@/config/fleetGatekeeper'

const emit = defineEmits(['saved', 'cleared'])

const tokenDraft = ref('')
const hasToken = ref(hasFleetGatekeeperToken())
const labDevHint = computed(
  () => import.meta.env.DEV && Boolean((import.meta.env.VITE_FLEET_GATEKEEPER_TOKEN || '').trim())
)

function saveToken() {
  setFleetGatekeeperToken(tokenDraft.value)
  tokenDraft.value = ''
  hasToken.value = hasFleetGatekeeperToken()
  emit('saved')
}

function clearToken() {
  clearFleetGatekeeperToken()
  hasToken.value = false
  emit('cleared')
}

defineExpose({ refresh() {
  hasToken.value = hasFleetGatekeeperToken()
} })
</script>

<template>
  <div class="fleet-token-gate">
    <p class="hint">
      Fleet APIs use the gatekeeper Bearer token
      (<code>GATEKEEPER_API_TOKEN</code> in
      <code>pbx3-directory/gatekeeper/.env</code>) — not your PBX3 login password.
    </p>
    <p v-if="labDevHint" class="hint lab">
      Vite DEV can also load it from <code>VITE_FLEET_GATEKEEPER_TOKEN</code> in
      <code>.env.development</code> (already set for this lab).
    </p>

    <div v-if="!hasToken" class="token-box">
      <form class="token-form" @submit.prevent="saveToken">
        <input
          v-model="tokenDraft"
          type="password"
          autocomplete="off"
          placeholder="Paste GATEKEEPER_API_TOKEN"
        />
        <button type="submit" class="primary">Save for session</button>
      </form>
    </div>
    <p v-else class="hint token-ok">
      Session has a fleet token.
      <button type="button" class="linkish" @click="clearToken">Clear</button>
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
.token-form input {
  flex: 1 1 12rem;
  padding: 0.4rem 0.6rem;
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
