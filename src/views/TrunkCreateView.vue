<script setup>
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { getApiClient } from '@/api/client'
import { useToastStore } from '@/stores/toast'

const router = useRouter()
const toast = useToastStore()

// Type chooser: legacy has 5 options; API currently supports GeneralSIP + GeneralIAX2
// SIP registration mode is encoded in the type (send reg / accept reg / trusted peer)
const trunkType = ref('')
const pkey = ref('')
const cluster = ref('default')
const host = ref('')
const password = ref('')
const regthistrunk = ref('NO')
const error = ref('')
const loading = ref(false)

// Map display type to API carrier (all SIP variants → GeneralSIP)
const carrier = computed(() => {
  if (trunkType.value.startsWith('SIP')) return 'GeneralSIP'
  if (trunkType.value === 'IAX2 trunk') return 'GeneralIAX2'
  return ''
})

// SIP registration mode for when API supports it (legacy pjsipreg: SND / RCV / NONE)
const sipRegistration = computed(() => {
  if (trunkType.value === 'SIP (send registration)') return 'SND'
  if (trunkType.value === 'SIP (accept registration)') return 'RCV'
  if (trunkType.value === 'SIP (trusted peer)') return 'NONE'
  return ''
})

const typeChosen = computed(() => !!carrier.value)
const isSIPSendReg = computed(() => trunkType.value === 'SIP (send registration)')
const isSIPAcceptReg = computed(() => trunkType.value === 'SIP (accept registration)')
const isSIPTrustedPeer = computed(() => trunkType.value === 'SIP (trusted peer)')
const isSIP = computed(() => carrier.value === 'GeneralSIP')
const isIAX2 = computed(() => carrier.value === 'GeneralIAX2')

// Host shown for send reg, trusted peer, IAX2 — not for accept reg (server sets dynamic)
const showHost = computed(() => isSIPSendReg.value || isSIPTrustedPeer.value || isIAX2.value)
// Password: required for send reg & accept reg; optional for trusted peer & IAX2
const passwordRequired = computed(() => isSIPSendReg.value || isSIPAcceptReg.value)

// When type changes, reset IAX2-only field
watch(trunkType, (newVal) => {
  if (newVal !== 'IAX2 trunk') regthistrunk.value = 'NO'
})

function fieldErrors(err) {
  if (!err?.data || typeof err.data !== 'object') return null
  const entries = Object.entries(err.data).filter(([, v]) => Array.isArray(v) && v.length)
  return entries.length ? Object.fromEntries(entries) : null
}

async function onSubmit(e) {
  e.preventDefault()
  error.value = ''
  loading.value = true
  try {
    const body = {
      pkey: pkey.value.trim(),
      carrier: carrier.value,
      cluster: cluster.value.trim()
    }
    if (isSIP.value) {
      // SIP (accept registration): legacy sets host=dynamic, username/password=null; API currently requires username/host so we send host=dynamic, username=pkey (backend can clear when it supports RCV)
      if (isSIPAcceptReg.value) {
        body.host = 'dynamic'
        body.username = pkey.value.trim()
        body.password = password.value || ''
      } else {
        body.host = host.value.trim()
        body.username = pkey.value.trim()
        if (password.value) body.password = password.value
      }
      if (sipRegistration.value) body.sipRegistration = sipRegistration.value
    } else {
      body.host = host.value.trim()
      body.username = pkey.value.trim()
      if (password.value) body.password = password.value
      if (regthistrunk.value === 'YES') body.register = 'yes'
    }
    const trunk = await getApiClient().post('trunks', body)
    const createdPkey = trunk?.pkey ?? trunk?.data?.pkey
    if (createdPkey) {
      toast.show(`Trunk ${createdPkey} created`)
      router.push({ name: 'trunk-detail', params: { pkey: createdPkey } })
    } else {
      toast.show('Trunk created', 'success')
      router.push({ name: 'trunks' })
    }
  } catch (err) {
    const errors = fieldErrors(err)
    if (errors) {
      const first = Object.values(errors).flat()[0]
      error.value = first || err.message
    } else {
      error.value = err.data?.message ?? err.message ?? 'Failed to create trunk'
    }
  } finally {
    loading.value = false
  }
}

function goBack() {
  router.push({ name: 'trunks' })
}
</script>

<template>
  <div class="create-view">
    <p class="back">
      <button type="button" class="back-btn" @click="goBack">← Trunks</button>
    </p>
    <h1>Create trunk</h1>

    <form class="form" @submit="onSubmit">
      <label for="trunk-type" class="form-label">Trunk type</label>
      <select
        id="trunk-type"
        v-model="trunkType"
        class="form-input"
        aria-label="Choose trunk type"
      >
        <option value="">Choose a trunk type</option>
        <option value="SIP (send registration)">SIP (send registration)</option>
        <option value="SIP (accept registration)">SIP (accept registration)</option>
        <option value="SIP (trusted peer)">SIP (trusted peer)</option>
        <option value="IAX2 trunk">IAX2 trunk</option>
      </select>

      <template v-if="typeChosen">
        <label for="pkey" class="form-label">Trunk name</label>
        <input
          id="pkey"
          v-model="pkey"
          type="text"
          class="form-input"
          placeholder="e.g. mytrunk"
          required
          autocomplete="off"
        />

        <label for="cluster" class="form-label">Tenant</label>
        <input
          id="cluster"
          v-model="cluster"
          type="text"
          class="form-input"
          placeholder="e.g. default"
          required
        />

        <label v-if="showHost" for="host" class="form-label">Host</label>
        <input
          v-if="showHost"
          id="host"
          v-model="host"
          type="text"
          class="form-input"
          placeholder="e.g. sip.example.com or IP"
          :required="showHost"
          autocomplete="off"
        />

        <template v-if="isSIPAcceptReg">
          <p class="form-hint">This trunk accepts registration from the provider; host is set to &quot;dynamic&quot; by the system.</p>
        </template>
        <template v-if="isSIPTrustedPeer">
          <p class="form-hint">Trusted peer: no registration (opposite of send/accept); use when the peer has a static IP.</p>
        </template>

        <template v-if="isSIP">
          <label for="password-sip" class="form-label">Password</label>
          <input
            id="password-sip"
            v-model="password"
            type="password"
            class="form-input"
            :placeholder="passwordRequired ? 'Required' : 'Optional'"
            :required="passwordRequired"
            autocomplete="new-password"
          />
        </template>

        <template v-if="isIAX2">
          <label for="password-iax" class="form-label">Password</label>
          <input
            id="password-iax"
            v-model="password"
            type="password"
            class="form-input"
            placeholder="Optional"
            autocomplete="new-password"
          />
          <label class="edit-label-block">Register this trunk?</label>
          <div class="switch-toggle switch-ios">
            <input
              id="reg-yes"
              v-model="regthistrunk"
              type="radio"
              value="YES"
              aria-label="Register this trunk: Yes"
            />
            <label for="reg-yes">YES</label>
            <input
              id="reg-no"
              v-model="regthistrunk"
              type="radio"
              value="NO"
              aria-label="Register this trunk: No"
            />
            <label for="reg-no">NO</label>
          </div>
        </template>
      </template>

      <p v-if="error" class="error">{{ error }}</p>

      <div class="actions">
        <button
          type="submit"
          :disabled="loading || !typeChosen"
        >
          {{ loading ? 'Creating…' : 'Create' }}
        </button>
        <button type="button" class="secondary" @click="goBack">Cancel</button>
      </div>
    </form>
  </div>
</template>

<style scoped>
.create-view {
  max-width: 28rem;
}
.back {
  margin-bottom: 1rem;
}
.back-btn {
  padding: 0.375rem 0.75rem;
  font-size: 0.875rem;
  color: #64748b;
  background: transparent;
  border: 1px solid #e2e8f0;
  border-radius: 0.375rem;
  cursor: pointer;
}
.back-btn:hover {
  color: #0f172a;
  background: #f1f5f9;
}
.form {
  margin-top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.form-label {
  font-size: 0.875rem;
  font-weight: 500;
}
.form-hint {
  font-size: 0.8125rem;
  color: #64748b;
  margin: 0;
}
.form-input {
  padding: 0.5rem 0.75rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.375rem;
  font-size: 1rem;
}
.form-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}
.edit-label-block {
  display: block;
  margin-bottom: 0.25rem;
  font-size: 0.875rem;
  font-weight: 500;
}
.switch-toggle.switch-ios {
  display: flex;
  flex-wrap: wrap;
  background: #e2e8f0;
  border-radius: 0.5rem;
  padding: 0.25rem;
  gap: 0;
}
.switch-toggle.switch-ios input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}
.switch-toggle.switch-ios label {
  flex: 1;
  min-width: 0;
  margin: 0;
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  font-weight: 500;
  text-align: center;
  cursor: pointer;
  border-radius: 0.375rem;
  transition: background-color 0.15s, color 0.15s;
  color: #64748b;
}
.switch-toggle.switch-ios label:hover {
  color: #334155;
}
.switch-toggle.switch-ios input:checked + label {
  background: white;
  color: #0f172a;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}
.error {
  color: #dc2626;
  font-size: 0.875rem;
  margin: 0;
}
.actions {
  display: flex;
  gap: 0.75rem;
  margin-top: 0.25rem;
}
.actions button {
  padding: 0.5rem 1rem;
  font-size: 0.9375rem;
  font-weight: 500;
  border-radius: 0.375rem;
  cursor: pointer;
}
.actions button[type="submit"] {
  color: #fff;
  background: #2563eb;
  border: none;
}
.actions button[type="submit"]:hover:not(:disabled) {
  background: #1d4ed8;
}
.actions button[type="submit"]:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
.actions button.secondary {
  color: #64748b;
  background: transparent;
  border: 1px solid #e2e8f0;
}
.actions button.secondary:hover {
  background: #f1f5f9;
}
</style>
