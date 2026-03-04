<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { getApiClient } from '@/api/client'
import { useSchema } from '@/composables/useSchema'
import { useToastStore } from '@/stores/toast'
import { useFormValidation, validateAll, focusFirstError } from '@/composables/useFormValidation'
import { validateGreetingPkey, validateTenant } from '@/utils/validation'
import { normalizeList } from '@/utils/listResponse'
import { fieldErrors, firstErrorMessage } from '@/utils/formErrors'
import FormField from '@/components/forms/FormField.vue'
import FormSelect from '@/components/forms/FormSelect.vue'

const router = useRouter()
const toast = useToastStore()
const { ensureFetched, applySchemaDefaults } = useSchema()

const pkey = ref('')
const cluster = ref('default')
const cname = ref('')
const description = ref('')
const greetingFile = ref(null) // File

const tenants = ref([])
const tenantsLoading = ref(true)
const error = ref('')
const loading = ref(false)
const pkeyInput = ref(null)

const pkeyValidation = useFormValidation(pkey, validateGreetingPkey)
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

onMounted(async () => {
  await ensureFetched()
  applySchemaDefaults('greetingrecords', {
    cluster,
    cname,
    description
  })
  await loadTenants()
})

function resetForm() {
  pkey.value = ''
  cluster.value = 'default'
  cname.value = ''
  description.value = ''
  greetingFile.value = null
  pkeyValidation.reset()
  clusterValidation.reset()
  error.value = ''
}

function goBack() {
  router.push({ name: 'greetings' })
}

function onKeydown(e) {
  if (e.key === 'Escape') {
    e.preventDefault()
    goBack()
  }
}

function onFileChange(event) {
  const file = event?.target?.files?.[0] ?? null
  greetingFile.value = file
}

function validateFile() {
  if (!greetingFile.value) return 'Audio file is required'
  const name = greetingFile.value.name || ''
  const ext = name.split('.').pop()?.toLowerCase()
  if (ext !== 'wav' && ext !== 'mp3') return 'Must be a .wav or .mp3 file'
  return null
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

  const fileErr = validateFile()
  if (fileErr) {
    error.value = fileErr
    return
  }

  loading.value = true
  try {
    const formData = new FormData()
    formData.append('pkey', String(parseInt(pkey.value, 10)))
    formData.append('cluster', cluster.value.trim())
    if (cname.value.trim()) formData.append('cname', cname.value.trim())
    if (description.value.trim()) formData.append('description', description.value.trim())
    formData.append('greeting', greetingFile.value)

    await getApiClient().postFile('greetingrecords', formData)
    toast.show(`Greeting ${pkey.value} created`)
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
    }
    error.value = firstErrorMessage(err, 'Failed to create greeting')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="create-view" @keydown="onKeydown">
    <h1>Create greeting</h1>

    <form class="form" @submit="onSubmit">
      <p v-if="error" id="greeting-create-error" class="error" role="alert">{{ error }}</p>

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
          label="Greeting number"
          type="text"
          inputmode="numeric"
          placeholder="e.g. 40001"
          :error="pkeyValidation.error.value"
          :touched="pkeyValidation.touched.value"
          :required="true"
          hint="Unique per tenant. Positive number."
          @blur="pkeyValidation.onBlur"
        />
        <FormSelect
          id="cluster"
          v-model="cluster"
          label="Tenant"
          :options="tenantOptionsForSelect"
          :error="clusterValidation.error.value"
          :touched="clusterValidation.touched.value"
          :required="true"
          :loading="tenantsLoading"
          hint="The tenant this greeting belongs to."
          @blur="clusterValidation.onBlur"
        />
      </div>

      <h2 class="detail-heading">Metadata</h2>
      <div class="form-fields">
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
          placeholder="Short description (optional)"
        />
      </div>

      <h2 class="detail-heading">Audio</h2>
      <div class="form-fields">
        <label class="file-label" for="greetingFile">Audio file (.wav or .mp3)</label>
        <input id="greetingFile" type="file" accept=".wav,.mp3,audio/wav,audio/mpeg" :disabled="loading" @change="onFileChange" />
        <p class="hint">The original upload name is stored in the greeting record. The file will be saved as <strong>usergreeting{pkey}.wav/mp3</strong> in the tenant's sounds folder.</p>
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
.create-view { max-width: 52rem; }
.form { margin-top: 1rem; display: flex; flex-direction: column; gap: 0.75rem; }
.detail-heading { font-size: 1rem; font-weight: 600; color: #334155; margin: 1.5rem 0 0.5rem 0; }
.detail-heading:first-of-type { margin-top: 0; }
.form-fields { display: flex; flex-direction: column; gap: 0.5rem; margin-top: 0.5rem; }
.error { color: #dc2626; font-size: 0.875rem; margin: 0; }
.actions { display: flex; gap: 0.75rem; margin-top: 0.25rem; }
.actions button { padding: 0.5rem 1rem; font-size: 0.9375rem; font-weight: 500; border-radius: 0.375rem; cursor: pointer; }
.actions button[type="submit"] { color: #fff; background: #2563eb; border: none; }
.actions button[type="submit"]:hover:not(:disabled) { background: #1d4ed8; }
.actions button[type="submit"]:disabled { opacity: 0.7; cursor: not-allowed; }
.actions button.secondary { color: #64748b; background: transparent; border: 1px solid #e2e8f0; }
.actions button.secondary:hover { background: #f1f5f9; }
.file-label { font-size: 0.875rem; font-weight: 500; color: #0f172a; }
.hint { margin: 0; font-size: 0.875rem; color: #64748b; }
</style>

