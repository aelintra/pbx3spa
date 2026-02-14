<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { getApiClient } from '@/api/client'
import { useToastStore } from '@/stores/toast'
import { useFormValidation, validateAll, focusFirstError } from '@/composables/useFormValidation'
import { validateQueuePkey, validateTenant } from '@/utils/validation'
import { normalizeList } from '@/utils/listResponse'
import { fieldErrors, firstErrorMessage } from '@/utils/formErrors'
import FormField from '@/components/forms/FormField.vue'
import FormSelect from '@/components/forms/FormSelect.vue'
import FormToggle from '@/components/forms/FormToggle.vue'

const router = useRouter()
const toast = useToastStore()
const pkey = ref('')
const cluster = ref('default')
const active = ref('YES')
const description = ref('')
const devicerec = ref('None')
const strategy = ref('ringall')
const greetnum = ref('')
const greeting = ref('')
const options = ref('CiIknrtT')
const musicclass = ref('')
const members = ref('')
const timeout = ref('30')
const retry = ref('1')
const wrapuptime = ref('0')
const maxlen = ref('0')
const divert = ref('')
const alertinfo = ref('')
const tenants = ref([])
const tenantsLoading = ref(true)
const error = ref('')
const loading = ref(false)
const pkeyInput = ref(null)

const pkeyValidation = useFormValidation(pkey, validateQueuePkey)
const clusterValidation = useFormValidation(cluster, validateTenant)

const tenantOptions = computed(() => {
  const list = tenants.value.map((t) => t.pkey).filter(Boolean)
  return [...new Set(list)].sort((a, b) => String(a).localeCompare(String(b)))
})

const tenantOptionsForSelect = computed(() => {
  const list = tenantOptions.value
  const cur = cluster.value
  if (cur && !list.includes(cur)) return [cur, ...list].sort((a, b) => String(a).localeCompare(String(b)))
  return list
})

const devicerecOptions = ['None', 'OTR', 'OTRR', 'Inbound', 'default']
const strategyOptions = ['ringall', 'roundrobin', 'leastrecent', 'fewestcalls', 'random', 'rrmemory']

async function loadTenants() {
  tenantsLoading.value = true
  try {
    const response = await getApiClient().get('tenants')
    tenants.value = normalizeList(response, 'tenants')
    if (tenants.value.length && !cluster.value) {
      const first = tenants.value.find((t) => t.pkey === 'default')?.pkey ?? tenants.value[0]?.pkey
      if (first) cluster.value = first
    }
  } catch {
    tenants.value = []
  } finally {
    tenantsLoading.value = false
  }
}

onMounted(loadTenants)

function resetForm() {
  pkey.value = ''
  cluster.value = 'default'
  active.value = 'YES'
  description.value = ''
  devicerec.value = 'None'
  strategy.value = 'ringall'
  greetnum.value = ''
  greeting.value = ''
  options.value = 'CiIknrtT'
  musicclass.value = ''
  members.value = ''
  timeout.value = '30'
  retry.value = '1'
  wrapuptime.value = '0'
  maxlen.value = '0'
  divert.value = ''
  alertinfo.value = ''
  pkeyValidation.reset()
  clusterValidation.reset()
  error.value = ''
}

function goBack() {
  router.push({ name: 'queues' })
}

function onKeydown(e) {
  if (e.key === 'Escape') {
    e.preventDefault()
    goBack()
  }
}

function parseNum(v) {
  if (v === '' || v == null) return undefined
  const n = Number(v)
  return isNaN(n) ? undefined : n
}

async function onSubmit(e) {
  e.preventDefault()
  error.value = ''

  const validations = [
    { ...pkeyValidation, fieldId: 'pkey' },
    { ...clusterValidation, fieldId: 'cluster' }
  ]
  if (!validateAll(validations)) {
    await nextTick()
    focusFirstError(validations, (id) => {
      if (id === 'pkey' && pkeyInput.value) return pkeyInput.value
      return document.getElementById(id)
    })
    return
  }

  loading.value = true
  try {
    const body = {
      pkey: pkey.value.trim(),
      cluster: cluster.value.trim(),
      active: active.value,
      devicerec: devicerec.value || 'None',
      strategy: strategy.value
    }
    if (description.value.trim()) body.description = description.value.trim()
    if (greetnum.value.trim()) body.greetnum = greetnum.value.trim()
    if (greeting.value.trim()) body.greeting = greeting.value.trim()
    if (options.value.trim()) body.options = options.value.trim()
    if (musicclass.value.trim()) body.musicclass = musicclass.value.trim()
    if (members.value.trim()) body.members = members.value.trim()
    if (alertinfo.value.trim()) body.alertinfo = alertinfo.value.trim()
    const timeoutNum = parseNum(timeout.value)
    if (timeoutNum !== undefined) body.timeout = timeoutNum
    const retryNum = parseNum(retry.value)
    if (retryNum !== undefined) body.retry = retryNum
    const wrapuptimeNum = parseNum(wrapuptime.value)
    if (wrapuptimeNum !== undefined) body.wrapuptime = wrapuptimeNum
    const maxlenNum = parseNum(maxlen.value)
    if (maxlenNum !== undefined) body.maxlen = maxlenNum
    const divertNum = parseNum(divert.value)
    if (divertNum !== undefined) body.divert = divertNum

    await getApiClient().post('queues', body)
    toast.show(`Queue ${pkey.value.trim()} created`)
    resetForm()
    await nextTick()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  } catch (err) {
    const errors = fieldErrors(err)
    if (errors) {
      if (errors.pkey) {
        pkeyValidation.touched.value = true
        pkeyValidation.error.value = Array.isArray(errors.pkey) ? errors.pkey[0] : errors.pkey
      }
      if (errors.cluster) {
        clusterValidation.touched.value = true
        clusterValidation.error.value = Array.isArray(errors.cluster) ? errors.cluster[0] : errors.cluster
      }
      await nextTick()
      focusFirstError(validations, (id) => {
        if (id === 'pkey' && pkeyInput.value) return pkeyInput.value
        return document.getElementById(id)
      })
    }
    error.value = firstErrorMessage(err, 'Failed to create queue')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="create-view" @keydown="onKeydown">
    <h1>Create queue</h1>

    <form class="form" @submit="onSubmit">
      <p v-if="error" id="queue-create-error" class="error" role="alert">{{ error }}</p>

      <div class="actions actions-top">
        <button type="submit" :disabled="loading || tenantsLoading">
          {{ loading ? 'Creating…' : 'Create' }}
        </button>
        <button type="button" class="secondary" @click="goBack">Cancel</button>
      </div>

      <h2 class="detail-heading">Identity</h2>
      <div class="form-fields">
        <FormField
          id="pkey"
          ref="pkeyInput"
          v-model="pkey"
          label="Queue name"
          type="text"
          placeholder="e.g. sales"
          :error="pkeyValidation.error.value"
          :touched="pkeyValidation.touched.value"
          :required="true"
          hint="Unique queue identifier."
          @blur="pkeyValidation.onBlur"
        />
        <FormField
          id="description"
          v-model="description"
          label="Description"
          type="text"
          placeholder="Short description"
        />
      </div>

      <h2 class="detail-heading">Settings</h2>
      <div class="form-fields">
        <FormSelect
          id="cluster"
          v-model="cluster"
          label="Tenant"
          :options="tenantOptionsForSelect"
          :error="clusterValidation.error.value"
          :touched="clusterValidation.touched.value"
          :required="true"
          :loading="tenantsLoading"
          hint="The tenant this queue belongs to."
          @blur="clusterValidation.onBlur"
        />
        <FormToggle
          id="active"
          v-model="active"
          label="Active"
          yes-value="YES"
          no-value="NO"
          hint="If off, the queue will not be available."
        />
        <FormSelect
          id="devicerec"
          v-model="devicerec"
          label="Device recording"
          :options="devicerecOptions"
          hint="Recording options for this queue."
        />
        <FormSelect
          id="strategy"
          v-model="strategy"
          label="Strategy"
          :options="strategyOptions"
          hint="How calls are distributed to queue members."
        />
        <FormField
          id="greetnum"
          v-model="greetnum"
          label="Greeting number"
          type="text"
          placeholder="e.g. usergreeting1234"
          hint="Audio file to play when call enters queue."
        />
        <FormField
          id="greeting"
          v-model="greeting"
          label="Greeting"
          type="text"
          placeholder="Override greetnum"
          hint="Alternative greeting (overrides greetnum)."
        />
        <FormField
          id="options"
          v-model="options"
          label="Options"
          type="text"
          placeholder="e.g. CiIknrtT"
          hint="Queue options flags."
        />
        <FormField
          id="musicclass"
          v-model="musicclass"
          label="Music class"
          type="text"
          hint="Music on hold class to play."
        />
        <FormField
          id="members"
          v-model="members"
          label="Members"
          type="text"
          placeholder="Comma-separated member list"
          hint="Queue members (comma-separated)."
        />
      </div>

      <h2 class="detail-heading">Timing &amp; limits</h2>
      <div class="form-fields">
        <FormField
          id="timeout"
          v-model="timeout"
          label="Timeout (seconds)"
          type="text"
          inputmode="numeric"
          placeholder="e.g. 30"
          hint="How long to ring before timeout."
        />
        <FormField
          id="retry"
          v-model="retry"
          label="Retry"
          type="text"
          inputmode="numeric"
          placeholder="e.g. 1"
          hint="Retry attempts."
        />
        <FormField
          id="wrapuptime"
          v-model="wrapuptime"
          label="Wrap-up time"
          type="text"
          inputmode="numeric"
          placeholder="seconds"
          hint="Time before agent can receive next call."
        />
        <FormField
          id="maxlen"
          v-model="maxlen"
          label="Max length"
          type="text"
          inputmode="numeric"
          placeholder="0 = unlimited"
          hint="Maximum queue length (0 = unlimited)."
        />
        <FormField
          id="divert"
          v-model="divert"
          label="Divert"
          type="text"
          inputmode="numeric"
          hint="Divert option."
        />
      </div>

      <h2 class="detail-heading">Advanced</h2>
      <div class="form-fields">
        <FormField
          id="alertinfo"
          v-model="alertinfo"
          label="Alert info"
          type="text"
          hint="Distinctive ring information."
        />
      </div>

      <div class="actions">
        <button type="submit" :disabled="loading || tenantsLoading">
          {{ loading ? 'Creating…' : 'Create' }}
        </button>
        <button type="button" class="secondary" @click="goBack">Cancel</button>
      </div>
    </form>
  </div>
</template>

<style scoped>
.create-view {
  max-width: 52rem;
}
.form {
  margin-top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.detail-heading {
  font-size: 1rem;
  font-weight: 600;
  color: #334155;
  margin: 1.5rem 0 0.5rem 0;
}
.detail-heading:first-of-type {
  margin-top: 0;
}
.form-fields {
  display: flex;
  flex-direction: column;
  gap: 0;
  margin-top: 0.5rem;
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
