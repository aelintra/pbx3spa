<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'

// Debug form reset: set to true and open browser Console to trace refs/child props when debugging.
const DEBUG_AGENT_RESET = false
function debug(...args) {
  if (DEBUG_AGENT_RESET) console.log('[AgentCreate]', ...args)
}
import { useRouter } from 'vue-router'
import { getApiClient } from '@/api/client'
import { useToastStore } from '@/stores/toast'
import { useFormValidation, validateAll, focusFirstError } from '@/composables/useFormValidation'
import { validateAgentPkey, validateTenant, validateAgentPasswd, validateAgentName } from '@/utils/validation'
import { normalizeList } from '@/utils/listResponse'
import { fieldErrors, firstErrorMessage } from '@/utils/formErrors'
import FormField from '@/components/forms/FormField.vue'
import FormSelect from '@/components/forms/FormSelect.vue'

const router = useRouter()
const toast = useToastStore()
const pkey = ref('')
const cluster = ref('default')
const name = ref('')
const passwd = ref('')
const queue1 = ref('')
const queue2 = ref('')
const queue3 = ref('')
const queue4 = ref('')
const queue5 = ref('')
const queue6 = ref('')
const tenants = ref([])
const queues = ref([])
const tenantsLoading = ref(true)
const queuesLoading = ref(true)
const error = ref('')
const loading = ref(false)
const pkeyInput = ref(null)
const clusterSelect = ref(null)
const nameInput = ref(null)
const passwdInput = ref(null)
const isMounted = ref(true)
const successMessage = ref('')
const fieldsKey = ref(0)

const pkeyValidation = useFormValidation(pkey, validateAgentPkey)
const clusterValidation = useFormValidation(cluster, validateTenant)
const nameValidation = useFormValidation(name, validateAgentName)
const passwdValidation = useFormValidation(passwd, validateAgentPasswd)

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

/** Current tenant's shortuid (queue.cluster stores tenant shortuid). */
const tenantShortuid = computed(() => {
  const clusterVal = String(cluster.value ?? '').trim()
  if (!clusterVal) return ''
  const byPkey = tenants.value.find((x) => String(x.pkey ?? '').trim() === clusterVal)
  if (byPkey?.shortuid) return String(byPkey.shortuid).trim()
  const byShortuid = tenants.value.find((x) => String(x.shortuid ?? '').trim() === clusterVal)
  if (byShortuid) return clusterVal
  return clusterVal
})

/** Queues for the selected tenant only (queue.cluster = tenant shortuid). No leading empty; FormSelect adds "None" via empty-text. */
const queueOptionsForTenant = computed(() => {
  const shortuid = tenantShortuid.value
  const forTenant = queues.value
    .filter((q) => String(q.cluster ?? '').trim() === shortuid)
    .map((q) => q.pkey)
    .filter(Boolean)
  const uniq = [...new Set(forTenant)].sort((a, b) => String(a).localeCompare(String(b)))
  return uniq
})

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

async function loadQueues() {
  queuesLoading.value = true
  try {
    const response = await getApiClient().get('queues')
    queues.value = normalizeList(response, 'queues') || normalizeList(response)
  } catch {
    queues.value = []
  } finally {
    queuesLoading.value = false
  }
}

onMounted(() => {
  loadTenants().then(() => loadQueues())
})
onUnmounted(() => { isMounted.value = false })

watch(cluster, clearQueuesWhenTenantChanges)

function clearQueuesWhenTenantChanges() {
  queue1.value = ''
  queue2.value = ''
  queue3.value = ''
  queue4.value = ''
  queue5.value = ''
  queue6.value = ''
}

function resetForm() {
  debug('resetForm: setting refs to defaults')
  pkey.value = ''
  cluster.value = 'default'
  name.value = ''
  passwd.value = ''
  queue1.value = ''
  queue2.value = ''
  queue3.value = ''
  queue4.value = ''
  queue5.value = ''
  queue6.value = ''
  pkeyValidation.reset()
  clusterValidation.reset()
  nameValidation.reset()
  passwdValidation.reset()
  error.value = ''
  debug('resetForm: refs now', { pkey: pkey.value, cluster: cluster.value, name: name.value, passwd: passwd.value })
}

async function onSubmit(e) {
  e.preventDefault()
  error.value = ''
  const validations = [
    { ...pkeyValidation, fieldId: 'pkey' },
    { ...clusterValidation, fieldId: 'cluster' },
    { ...nameValidation, fieldId: 'name' },
    { ...passwdValidation, fieldId: 'passwd' }
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
    const pkeyNum = parseInt(String(pkey.value).trim(), 10)
    const passwdNum = parseInt(String(passwd.value).trim(), 10)
    const body = {
      pkey: pkeyNum,
      cluster: String(cluster.value).trim(),
      name: name.value.trim(),
      passwd: passwdNum
    }
    body.queue1 = queue1.value?.trim() || null
    body.queue2 = queue2.value?.trim() || null
    body.queue3 = queue3.value?.trim() || null
    body.queue4 = queue4.value?.trim() || null
    body.queue5 = queue5.value?.trim() || null
    body.queue6 = queue6.value?.trim() || null
    await getApiClient().post('agents', body)
    if (!isMounted.value) return
    successMessage.value = `Agent ${pkeyNum} created. Create another or Cancel to exit.`
    loading.value = false
    // Defer reset to avoid Vue internal emitsOptions error; then bump key in a
    // second tick so fields re-mount after refs have flushed.
    setTimeout(() => {
      if (!isMounted.value) return
      resetForm()
      debug('50ms: refs after reset (before key)', { pkey: pkey.value, cluster: cluster.value, name: name.value, passwd: passwd.value })
      setTimeout(() => {
        if (!isMounted.value) return
        debug('100ms: refs right before fieldsKey++', { pkey: pkey.value, cluster: cluster.value, name: name.value, passwd: passwd.value })
        fieldsKey.value += 1
        debug('100ms: fieldsKey is now', fieldsKey.value)
      }, 50)
    }, 50)
  } catch (err) {
    const errors = fieldErrors(err)
    if (errors) {
      if (errors.pkey) { pkeyValidation.touched.value = true; pkeyValidation.error.value = Array.isArray(errors.pkey) ? errors.pkey[0] : errors.pkey }
      if (errors.cluster) { clusterValidation.touched.value = true; clusterValidation.error.value = Array.isArray(errors.cluster) ? errors.cluster[0] : errors.cluster }
      if (errors.name) { nameValidation.touched.value = true; nameValidation.error.value = Array.isArray(errors.name) ? errors.name[0] : errors.name }
      if (errors.passwd) { passwdValidation.touched.value = true; passwdValidation.error.value = Array.isArray(errors.passwd) ? errors.passwd[0] : errors.passwd }
      await nextTick()
      focusFirstError(
        [
          { ...pkeyValidation, fieldId: 'pkey' },
          { ...clusterValidation, fieldId: 'cluster' },
          { ...nameValidation, fieldId: 'name' },
          { ...passwdValidation, fieldId: 'passwd' }
        ],
        (id) => (id === 'pkey' && pkeyInput.value ? pkeyInput.value : document.getElementById(id))
      )
    }
    error.value = firstErrorMessage(err, 'Failed to create agent')
  } finally {
    loading.value = false
  }
}

function goBack() {
  router.push({ name: 'agents' })
}

function onKeydown(e) {
  if (e.key === 'Escape') {
    e.preventDefault()
    goBack()
  }
}
</script>

<template>
  <div class="create-view" @keydown="onKeydown">
    <header class="create-header">
      <h1>Create agent</h1>
    </header>

    <form class="form" @submit="onSubmit" @input="successMessage = ''">
      <p v-if="successMessage" class="success" role="status">{{ successMessage }}</p>
      <p v-if="error" id="agent-create-error" class="error" role="alert">{{ error }}</p>

      <h2 class="detail-heading">Identity</h2>
      <div class="form-fields">
        <FormField
          id="pkey"
          ref="pkeyInput"
          v-model="pkey"
          :input-key="fieldsKey"
          :debug-reset="DEBUG_AGENT_RESET"
          label="Agent number"
          type="number"
          min="1000"
          max="9999"
          placeholder="e.g. 1001"
          :error="pkeyValidation.error.value"
          :touched="pkeyValidation.touched.value"
          :required="true"
          hint="1000–9999."
          @blur="pkeyValidation.onBlur"
        />
        <FormSelect
          ref="clusterSelect"
          id="cluster"
          v-model="cluster"
          :input-key="fieldsKey"
          :debug-reset="DEBUG_AGENT_RESET"
          label="Tenant"
          :options="tenantOptionsForSelect"
          :error="clusterValidation.error.value"
          :touched="clusterValidation.touched.value"
          :required="true"
          :loading="tenantsLoading"
          @blur="clusterValidation.onBlur"
        />
        <FormField
          ref="nameInput"
          id="name"
          v-model="name"
          :input-key="fieldsKey"
          :debug-reset="DEBUG_AGENT_RESET"
          label="Name"
          type="text"
          placeholder="e.g. agent_name"
          :error="nameValidation.error.value"
          :touched="nameValidation.touched.value"
          :required="true"
          hint="Letters, numbers, underscore, hyphen (alpha_dash)."
          @blur="nameValidation.onBlur"
        />
        <FormField
          ref="passwdInput"
          id="passwd"
          v-model="passwd"
          :input-key="fieldsKey"
          :debug-reset="DEBUG_AGENT_RESET"
          label="Password"
          type="number"
          min="1001"
          max="9999"
          placeholder="e.g. 1001"
          :error="passwdValidation.error.value"
          :touched="passwdValidation.touched.value"
          :required="true"
          hint="1001–9999."
          @blur="passwdValidation.onBlur"
        />
      </div>

      <h2 class="detail-heading">Queues</h2>
      <div class="form-fields">
        <FormSelect
          id="create-queue1"
          v-model="queue1"
          :input-key="fieldsKey"
          label="Queue 1"
          :options="queueOptionsForTenant"
          empty-text="None"
          :loading="queuesLoading"
        />
        <FormSelect
          id="create-queue2"
          v-model="queue2"
          :input-key="fieldsKey"
          label="Queue 2"
          :options="queueOptionsForTenant"
          empty-text="None"
          :loading="queuesLoading"
        />
        <FormSelect
          id="create-queue3"
          v-model="queue3"
          :input-key="fieldsKey"
          label="Queue 3"
          :options="queueOptionsForTenant"
          empty-text="None"
          :loading="queuesLoading"
        />
        <FormSelect
          id="create-queue4"
          v-model="queue4"
          :input-key="fieldsKey"
          label="Queue 4"
          :options="queueOptionsForTenant"
          empty-text="None"
          :loading="queuesLoading"
        />
        <FormSelect
          id="create-queue5"
          v-model="queue5"
          :input-key="fieldsKey"
          label="Queue 5"
          :options="queueOptionsForTenant"
          empty-text="None"
          :loading="queuesLoading"
        />
        <FormSelect
          id="create-queue6"
          v-model="queue6"
          :input-key="fieldsKey"
          label="Queue 6"
          :options="queueOptionsForTenant"
          empty-text="None"
          :loading="queuesLoading"
        />
      </div>

      <div class="actions">
        <button type="submit" :disabled="loading || tenantsLoading || queuesLoading">
          {{ loading ? 'Creating…' : 'Create' }}
        </button>
        <button type="button" class="secondary" @click="goBack">Cancel</button>
      </div>
    </form>
  </div>
</template>

<style scoped>
.create-view { max-width: 52rem; }
.create-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.75rem;
  min-height: 2.5rem;
  margin-bottom: 0.25rem;
}
.create-header h1 { margin: 0; }
.form { margin-top: 1rem; display: flex; flex-direction: column; gap: 0.75rem; }
.detail-heading { font-size: 1rem; font-weight: 600; color: #334155; margin: 1.5rem 0 0.5rem 0; }
.detail-heading:first-of-type { margin-top: 0; }
.form-fields { display: flex; flex-direction: column; gap: 0; margin-top: 0.5rem; }
.success { color: #166534; font-size: 0.9375rem; margin: 0; }
.error { color: #dc2626; font-size: 0.875rem; margin: 0; }
.actions { display: flex; gap: 0.75rem; margin-top: 0.25rem; }
.actions button { padding: 0.5rem 1rem; font-size: 0.9375rem; font-weight: 500; border-radius: 0.375rem; cursor: pointer; }
.actions button[type="submit"] { color: #fff; background: #2563eb; border: none; }
.actions button[type="submit"]:hover:not(:disabled) { background: #1d4ed8; }
.actions button[type="submit"]:disabled { opacity: 0.7; cursor: not-allowed; }
.actions button.secondary { color: #64748b; background: transparent; border: 1px solid #e2e8f0; }
.actions button.secondary:hover { background: #f1f5f9; }
</style>
