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

const router = useRouter()
const toast = useToastStore()
const pkey = ref('')
const cluster = ref('default')
const conf = ref('')
const devicerec = ref('None')
const greetnum = ref('')
const options = ref('')
const tenants = ref([])
const tenantsLoading = ref(true)
const error = ref('')
const loading = ref(false)
const pkeyInput = ref(null)
const clusterSelect = ref(null)

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

const devicerecOptions = ['None', 'OTR', 'OTRR', 'Inbound']

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
  conf.value = ''
  devicerec.value = 'None'
  greetnum.value = ''
  options.value = ''
  pkeyValidation.reset()
  clusterValidation.reset()
  error.value = ''
}

function goBack() {
  router.push({ name: 'queues' })
}

async function onSubmit(e) {
  e.preventDefault()
  error.value = ''
  const valid = validateAll([pkeyValidation, clusterValidation])
  if (!valid) {
    focusFirstError([pkeyInput, clusterSelect])
    return
  }
  loading.value = true
  try {
    const body = {
      pkey: pkey.value.trim(),
      cluster: cluster.value.trim(),
      devicerec: devicerec.value || 'None'
    }
    if (conf.value.trim()) body.conf = conf.value.trim()
    if (greetnum.value.trim()) body.greetnum = greetnum.value.trim()
    if (options.value.trim()) body.options = options.value.trim()
    await getApiClient().post('queues', body)
    toast.show(`Queue ${pkey.value.trim()} created`)
    resetForm()
    await nextTick()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  } catch (err) {
    const errors = fieldErrors(err)
    if (errors) {
      pkeyValidation.setServerError(errors.pkey?.[0] ?? null)
      clusterValidation.setServerError(errors.cluster?.[0] ?? null)
      const first = Object.values(errors).flat()[0]
      error.value = first || err.message
    } else {
      error.value = err.data?.message ?? err.message ?? 'Failed to create queue'
    }
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="create-view">
    <h1>Create queue</h1>

    <form class="form" @submit="onSubmit">
      <div class="actions actions-top">
        <button type="submit" :disabled="loading">
          {{ loading ? 'Creating…' : 'Create' }}
        </button>
        <button type="button" class="secondary" @click="goBack">Cancel</button>
      </div>

      <p v-if="error" id="queue-create-error" class="error" role="alert">{{ error }}</p>

      <h2 class="detail-heading">Identity</h2>
      <div class="form-fields">
        <FormField
          ref="pkeyInput"
          id="create-pkey"
          v-model="pkey"
          label="Queue name"
          type="text"
          placeholder="e.g. sales"
          :required="true"
          :error="pkeyValidation.error"
          :touched="pkeyValidation.touched"
          @blur="pkeyValidation.touch"
        />
        <FormSelect
          ref="clusterSelect"
          id="create-cluster"
          v-model="cluster"
          label="Tenant"
          :options="tenantOptionsForSelect"
          :required="true"
          :error="clusterValidation.error"
          :touched="clusterValidation.touched"
          :disabled="tenantsLoading"
          @blur="clusterValidation.touch"
        />
      </div>

      <h2 class="detail-heading">Options</h2>
      <div class="form-fields">
        <FormSelect
          id="create-devicerec"
          v-model="devicerec"
          label="Device recording"
          :options="devicerecOptions"
          :required="true"
        />
        <FormField
          id="create-greetnum"
          v-model="greetnum"
          label="Greeting number"
          type="text"
          placeholder="usergreeting1234"
        />
        <FormField
          id="create-options"
          v-model="options"
          label="Options"
          type="text"
          placeholder="Alpha options"
        />
        <FormField
          id="create-conf"
          v-model="conf"
          label="Conf"
          multiline
          :rows="10"
          placeholder="Code fragment (optional)"
        />
      </div>

      <div class="actions">
        <button type="submit" :disabled="loading">
          {{ loading ? 'Creating…' : 'Create' }}
        </button>
        <button type="button" class="secondary" @click="goBack">Cancel</button>
      </div>
    </form>
  </div>
</template>

<style scoped>
.create-view { max-width: 52rem; }
.detail-heading { font-size: 1rem; font-weight: 600; color: #334155; margin: 1.5rem 0 0.5rem 0; }
.detail-heading:first-of-type { margin-top: 0; }
.form-fields { display: flex; flex-direction: column; gap: 0; margin-top: 0.5rem; }
.form { margin-top: 1rem; display: flex; flex-direction: column; gap: 0.75rem; }
.error { color: #dc2626; font-size: 0.875rem; margin: 0; }
.actions { display: flex; gap: 0.75rem; margin-top: 0.25rem; }
.actions-top { margin-top: 0; margin-bottom: 0.5rem; }
.actions button { padding: 0.5rem 1rem; font-size: 0.9375rem; font-weight: 500; border-radius: 0.375rem; cursor: pointer; }
.actions button[type="submit"] { color: #fff; background: #2563eb; border: none; }
.actions button[type="submit"]:hover:not(:disabled) { background: #1d4ed8; }
.actions button[type="submit"]:disabled { opacity: 0.7; cursor: not-allowed; }
.actions button.secondary { color: #64748b; background: transparent; border: 1px solid #e2e8f0; }
.actions button.secondary:hover { background: #f1f5f9; }
</style>
