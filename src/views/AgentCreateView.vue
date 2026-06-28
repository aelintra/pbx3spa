<script setup>
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { useRouter } from 'vue-router'
import { getApiClient } from '@/api/client'
import { useSchema } from '@/composables/useSchema'
import { useToastStore } from '@/stores/toast'
import { useFormValidation, validateAll, focusFirstError } from '@/composables/useFormValidation'
import { validateAgentPkey, validateTenant, validateAgentPasswd } from '@/utils/validation'
import { normalizeList } from '@/utils/listResponse'
import { fieldErrors, firstErrorMessage } from '@/utils/formErrors'
import FormField from '@/components/forms/FormField.vue'
import FormSelect from '@/components/forms/FormSelect.vue'
import PanelBackLink from '@/components/PanelBackLink.vue'

const router = useRouter()
const toast = useToastStore()
const { ensureFetched, applySchemaDefaults } = useSchema()
const pkey = ref('')
const cluster = ref('default')
const passwd = ref('')
const cname = ref('')
const description = ref('')
const queue1 = ref('None')
const queue2 = ref('None')
const queue3 = ref('None')
const queue4 = ref('None')
const queue5 = ref('None')
const queue6 = ref('None')
const tenants = ref([])
const queues = ref([])
const tenantsLoading = ref(true)
const queuesLoading = ref(true)
const error = ref('')
const loading = ref(false)
const pkeyInput = ref(null)

const pkeyValidation = useFormValidation(pkey, validateAgentPkey)
const clusterValidation = useFormValidation(cluster, validateTenant)
const passwdValidation = useFormValidation(passwd, validateAgentPasswd)

const tenantOptions = computed(() => {
  const list = tenants.value.map((t) => t.pkey).filter(Boolean)
  return [...new Set(list)].sort((a, b) => String(a).localeCompare(String(b)))
})

const tenantOptionsForSelect = computed(() => {
  const list = tenantOptions.value
  const cur = cluster.value
  if (cur && !list.includes(cur))
    return [cur, ...list].sort((a, b) => String(a).localeCompare(String(b)))
  return list
})

/** Map queue.cluster (id, shortuid, or pkey) → tenant pkey so we can filter queues by current tenant. */
const clusterToTenantPkey = computed(() => {
  const map = new Map()
  for (const t of tenants.value) {
    if (t.id != null) map.set(String(t.id), t.pkey ?? t.id)
    if (t.shortuid != null) map.set(String(t.shortuid), t.pkey ?? t.shortuid)
    if (t.pkey != null) map.set(String(t.pkey), t.pkey)
  }
  return map
})

/** Queues for the selected tenant only. queue.cluster may be tenant id, shortuid, or pkey (resolve to pkey for comparison). Returns full queue objects for labels. */
const queueOptionsForTenant = computed(() => {
  const currentPkey = String(cluster.value ?? '').trim()
  if (!currentPkey) return []
  const forTenant = queues.value
    .filter((q) => clusterToTenantPkey.value.get(String(q.cluster ?? '').trim()) === currentPkey)
    .filter((q) => q.pkey != null && String(q.pkey).trim() !== '')
  const byPkey = new Map()
  for (const q of forTenant) byPkey.set(String(q.pkey), q)
  return [...byPkey.values()].sort((a, b) => String(a.pkey).localeCompare(String(b.pkey)))
})

function queueOptionLabel(q) {
  const name = (q.cname || q.description || q.pkey || '').toString().trim() || String(q.pkey)
  return `${q.pkey} - ${name}`
}

const queueOptions = computed(() => [
  { value: 'None', label: 'None' },
  ...queueOptionsForTenant.value.map((q) => ({ value: String(q.pkey), label: queueOptionLabel(q) }))
])

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

onMounted(async () => {
  await ensureFetched()
  applySchemaDefaults('agents', { cluster, cname, description })
  await loadTenants()
  await loadQueues()
})

watch(cluster, () => {
  queue1.value = 'None'
  queue2.value = 'None'
  queue3.value = 'None'
  queue4.value = 'None'
  queue5.value = 'None'
  queue6.value = 'None'
})

function resetForm() {
  pkey.value = ''
  cluster.value = 'default'
  passwd.value = ''
  cname.value = ''
  description.value = ''
  queue1.value = 'None'
  queue2.value = 'None'
  queue3.value = 'None'
  queue4.value = 'None'
  queue5.value = 'None'
  queue6.value = 'None'
  pkeyValidation.reset()
  clusterValidation.reset()
  passwdValidation.reset()
  error.value = ''
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

async function onSubmit(e) {
  e.preventDefault()
  error.value = ''

  const validations = [
    { ...pkeyValidation, fieldId: 'pkey' },
    { ...clusterValidation, fieldId: 'cluster' },
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
      passwd: passwdNum
    }
    if (cname.value.trim()) body.cname = cname.value.trim()
    if (description.value.trim()) body.description = description.value.trim()
    body.queue1 = queue1.value && queue1.value !== 'None' ? queue1.value.trim() : null
    body.queue2 = queue2.value && queue2.value !== 'None' ? queue2.value.trim() : null
    body.queue3 = queue3.value && queue3.value !== 'None' ? queue3.value.trim() : null
    body.queue4 = queue4.value && queue4.value !== 'None' ? queue4.value.trim() : null
    body.queue5 = queue5.value && queue5.value !== 'None' ? queue5.value.trim() : null
    body.queue6 = queue6.value && queue6.value !== 'None' ? queue6.value.trim() : null

    await getApiClient().post('agents', body)
    toast.show(`Agent ${pkeyNum} created`)
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
        clusterValidation.error.value = Array.isArray(errors.cluster)
          ? errors.cluster[0]
          : errors.cluster
      }
      if (errors.passwd) {
        passwdValidation.touched.value = true
        passwdValidation.error.value = Array.isArray(errors.passwd)
          ? errors.passwd[0]
          : errors.passwd
      }
      await nextTick()
      focusFirstError(validations, (id) => {
        if (id === 'pkey' && pkeyInput.value) return pkeyInput.value
        return document.getElementById(id)
      })
    }
    error.value = firstErrorMessage(err, 'Failed to create agent')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="create-view" @keydown="onKeydown">
    <PanelBackLink :to="{ name: 'agents' }" label="Agents">
      <h1>Create agent</h1>
    </PanelBackLink>

    <form class="form" @submit="onSubmit">
      <p v-if="error" id="agent-create-error" class="error" role="alert">{{ error }}</p>

      <div class="actions actions-top">
        <button type="submit" :disabled="loading || tenantsLoading || queuesLoading">
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
          label="Agent number"
          help-pkey="agent"
          type="number"
          min="1000"
          max="9999"
          placeholder="e.g. 1001"
          :error="pkeyValidation.error.value"
          :touched="pkeyValidation.touched.value"
          :required="true"
          hint="1000–9999, unique per tenant."
          @blur="pkeyValidation.onBlur"
        />
        <FormField
          id="passwd"
          v-model="passwd"
          label="Password"
          type="number"
          min="1001"
          max="9999"
          placeholder="e.g. 1001"
          :error="passwdValidation.error.value"
          :touched="passwdValidation.touched.value"
          :required="true"
          hint="1001–9999 (agent PIN)."
          @blur="passwdValidation.onBlur"
        />
        <FormField
          id="cname"
          v-model="cname"
          label="Common name"
          type="text"
          placeholder="Display name (optional)"
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
          hint="The tenant this agent belongs to."
          @blur="clusterValidation.onBlur"
        />
      </div>

      <h2 class="detail-heading">Queues</h2>
      <div class="form-fields">
        <FormSelect
          id="queue1"
          v-model="queue1"
          label="Queue 1"
          :options="queueOptions"
          :loading="queuesLoading"
        />
        <FormSelect
          id="queue2"
          v-model="queue2"
          label="Queue 2"
          :options="queueOptions"
          :loading="queuesLoading"
        />
        <FormSelect
          id="queue3"
          v-model="queue3"
          label="Queue 3"
          :options="queueOptions"
          :loading="queuesLoading"
        />
        <FormSelect
          id="queue4"
          v-model="queue4"
          label="Queue 4"
          :options="queueOptions"
          :loading="queuesLoading"
        />
        <FormSelect
          id="queue5"
          v-model="queue5"
          label="Queue 5"
          :options="queueOptions"
          :loading="queuesLoading"
        />
        <FormSelect
          id="queue6"
          v-model="queue6"
          label="Queue 6"
          :options="queueOptions"
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
.actions button[type='submit'] {
  color: #fff;
  background: #2563eb;
  border: none;
}
.actions button[type='submit']:hover:not(:disabled) {
  background: #1d4ed8;
}
.actions button[type='submit']:disabled {
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
