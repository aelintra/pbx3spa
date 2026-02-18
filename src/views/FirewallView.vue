<script setup>
import { ref, onMounted } from 'vue'
import { getApiClient } from '@/api/client'

const ipv4Rules = ref('')
const ipv6Rules = ref('')
const loading = ref(true)
const error = ref('')
const saveMessage = ref('')
const saveError = ref('')
const restartMessage = ref('')
const restartError = ref('')
const saving = ref(false)
const restarting = ref(null) // 'ipv4' | 'ipv6' | null

async function fetchIpv4() {
  try {
    const data = await getApiClient().get('firewalls/ipv4')
    const rules = data?.rules ?? []
    ipv4Rules.value = Array.isArray(rules) ? rules.join('\n') : String(rules)
  } catch (err) {
    ipv4Rules.value = ''
    return err
  }
}

async function fetchIpv6() {
  try {
    const data = await getApiClient().get('firewalls/ipv6')
    const rules = data?.rules ?? []
    ipv6Rules.value = Array.isArray(rules) ? rules.join('\n') : String(rules)
  } catch (err) {
    ipv6Rules.value = ''
    return err
  }
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [e4, e6] = await Promise.all([fetchIpv4(), fetchIpv6()])
    if (e4 && e6) {
      error.value = e4?.data?.message || e4?.message || 'Failed to load firewall rules'
    }
  } finally {
    loading.value = false
  }
}

function rulesToArray(text) {
  return text.split(/\r?\n/).map((line) => line.trimEnd())
}

async function saveIpv4() {
  saveMessage.value = ''
  saveError.value = ''
  saving.value = true
  try {
    await getApiClient().post('firewalls/ipv4', {
      rules: rulesToArray(ipv4Rules.value),
    })
    saveMessage.value = 'IPv4 rules saved. Restart firewall to apply.'
  } catch (err) {
    const detail = err?.data?.detail
    saveError.value = detail ? `${err?.data?.message || err?.message}: ${detail}` : (err?.data?.message || err?.message || 'Save failed')
  } finally {
    saving.value = false
  }
}

async function saveIpv6() {
  saveMessage.value = ''
  saveError.value = ''
  saving.value = true
  try {
    await getApiClient().post('firewalls/ipv6', {
      rules: rulesToArray(ipv6Rules.value),
    })
    saveMessage.value = 'IPv6 rules saved. Restart firewall to apply.'
  } catch (err) {
    const detail = err?.data?.detail
    saveError.value = detail ? `${err?.data?.message || err?.message}: ${detail}` : (err?.data?.message || err?.message || 'Save failed')
  } finally {
    saving.value = false
  }
}

async function restartIpv4() {
  restartMessage.value = ''
  restartError.value = ''
  restarting.value = 'ipv4'
  try {
    await getApiClient().put('firewalls/ipv4')
    restartMessage.value = 'Shorewall (IPv4) restarted OK.'
  } catch (err) {
    const body = err?.data
    if (Array.isArray(body)) {
      restartError.value = body.join('\n')
    } else {
      const detail = body?.detail
      restartError.value = detail ? `${body?.message || err?.message}: ${detail}` : (body?.message || err?.message || 'Restart failed')
    }
  } finally {
    restarting.value = null
  }
}

async function restartIpv6() {
  restartMessage.value = ''
  restartError.value = ''
  restarting.value = 'ipv6'
  try {
    await getApiClient().put('firewalls/ipv6')
    restartMessage.value = 'Shorewall6 (IPv6) restarted OK.'
  } catch (err) {
    const body = err?.data
    if (Array.isArray(body)) {
      restartError.value = body.join('\n')
    } else {
      const detail = body?.detail
      restartError.value = detail ? `${body?.message || err?.message}: ${detail}` : (body?.message || err?.message || 'Restart failed')
    }
  } finally {
    restarting.value = null
  }
}

onMounted(load)
</script>

<template>
  <div class="firewall-view">
    <h1>Firewall</h1>
    <p class="firewall-intro">Edit raw Shorewall rules. Save writes the file; Restart runs <code>shorewall check</code> then applies if valid. Shorewall will accept or reject the config on restart.</p>

    <p v-if="loading" class="loading">Loading rules…</p>
    <p v-else-if="error" class="error">{{ error }}</p>

    <template v-else>
      <section class="firewall-section">
        <h2 class="detail-heading">IPv4 (pbx3_rules)</h2>
        <textarea
          v-model="ipv4Rules"
          class="firewall-textarea"
          rows="14"
          placeholder="One rule per line…"
          spellcheck="false"
        />
        <div class="firewall-actions">
          <button type="button" class="btn-save" :disabled="saving" @click="saveIpv4">Save IPv4</button>
          <button type="button" class="btn-restart" :disabled="restarting != null" @click="restartIpv4">
            {{ restarting === 'ipv4' ? 'Restarting…' : 'Restart IPv4' }}
          </button>
        </div>
      </section>

      <section class="firewall-section">
        <h2 class="detail-heading">IPv6 (pbx3_rules6)</h2>
        <textarea
          v-model="ipv6Rules"
          class="firewall-textarea"
          rows="14"
          placeholder="One rule per line…"
          spellcheck="false"
        />
        <div class="firewall-actions">
          <button type="button" class="btn-save" :disabled="saving" @click="saveIpv6">Save IPv6</button>
          <button type="button" class="btn-restart" :disabled="restarting != null" @click="restartIpv6">
            {{ restarting === 'ipv6' ? 'Restarting…' : 'Restart IPv6' }}
          </button>
        </div>
      </section>

      <p v-if="saveMessage" class="message">{{ saveMessage }}</p>
      <p v-if="saveError" class="error">{{ saveError }}</p>
      <p v-if="restartMessage" class="message">{{ restartMessage }}</p>
      <p v-if="restartError" class="error firewall-error-pre">{{ restartError }}</p>
    </template>
  </div>
</template>

<style scoped>
.firewall-view {
  max-width: 56rem;
}
.firewall-view h1 {
  margin: 0 0 1rem 0;
  font-size: 1.5rem;
  font-weight: 600;
}
.firewall-intro {
  margin: 0 0 1.5rem 0;
  font-size: 0.875rem;
  color: #64748b;
}
.firewall-intro code {
  font-size: 0.8125rem;
  padding: 0.125rem 0.375rem;
  background: #f1f5f9;
  border-radius: 0.25rem;
}
.detail-heading {
  font-size: 1rem;
  font-weight: 600;
  color: #334155;
  margin: 1.5rem 0 0.5rem 0;
  border-bottom: 1px solid #e2e8f0;
  padding-bottom: 0.5rem;
}
.detail-heading:first-of-type {
  margin-top: 0;
}
.firewall-section {
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: #f8fafc;
  border-radius: 0.5rem;
  border: 1px solid #e2e8f0;
}
.firewall-textarea {
  width: 100%;
  box-sizing: border-box;
  font-family: ui-monospace, monospace;
  font-size: 0.8125rem;
  line-height: 1.4;
  padding: 0.5rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.375rem;
  resize: vertical;
}
.firewall-actions {
  display: flex;
  gap: 0.75rem;
  margin-top: 0.75rem;
}
.btn-save,
.btn-restart {
  padding: 0.5rem 1rem;
  font-size: 0.9375rem;
  font-weight: 500;
  border: none;
  border-radius: 0.375rem;
  cursor: pointer;
}
.btn-save {
  color: #fff;
  background: #0f172a;
}
.btn-save:hover:not(:disabled) {
  background: #334155;
}
.btn-restart {
  color: #fff;
  background: #1d4ed8;
}
.btn-restart:hover:not(:disabled) {
  background: #2563eb;
}
.btn-save:disabled,
.btn-restart:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
.loading,
.error,
.message {
  margin: 0.5rem 0 0 0;
}
.error {
  color: #dc2626;
}
.message {
  color: #15803d;
}
.firewall-error-pre {
  white-space: pre-wrap;
  font-size: 0.875rem;
}
</style>
