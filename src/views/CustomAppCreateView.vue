<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { getApiClient } from '@/api/client'
import { useSchema } from '@/composables/useSchema'
import { useToastStore } from '@/stores/toast'
import { useFormValidation, validateAll, focusFirstError } from '@/composables/useFormValidation'
import { validateCustomAppPkey, validateTenant } from '@/utils/validation'
import { fieldErrors, firstErrorMessage } from '@/utils/formErrors'
import { normalizeList } from '@/utils/listResponse'
import FormField from '@/components/forms/FormField.vue'
import FormSelect from '@/components/forms/FormSelect.vue'
import FormToggle from '@/components/forms/FormToggle.vue'

const router = useRouter()
const toast = useToastStore()
const { ensureFetched, applySchemaDefaults } = useSchema()

const pkey = ref('')
const cluster = ref('')
const cname = ref('')
const description = ref('')
const span = ref('Neither')
const active = ref('YES')
const striptags = ref('NO')
const directdial = ref('') // optional integer
const extcode = ref('')

const tenants = ref([])
const tenantsLoading = ref(true)
const error = ref('')
const loading = ref(false)

const pkeyInput = ref(null)

const pkeyValidation = useFormValidation(pkey, validateCustomAppPkey)
const clusterValidation = useFormValidation(cluster, validateTenant)

const spanOptions = ['Internal', 'External', 'Both', 'Neither']

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
    const res = await getApiClient().get('tenants')
    tenants.value = normalizeList(res, 'tenants')
  } catch {
    tenants.value = []
  } finally {
    tenantsLoading.value = false
  }
}

function parseIntOrNull(v) {
  if (v == null) return null
  const s = String(v).trim()
  if (s === '') return null
  const n = parseInt(s, 10)
  return isNaN(n) ? null : n
}

function resetForm() {
  pkey.value = ''
  cluster.value = ''
  cname.value = ''
  description.value = ''
  span.value = 'Neither'
  active.value = 'YES'
  striptags.value = 'NO'
  directdial.value = ''
  extcode.value = ''
  error.value = ''
  pkeyValidation.reset()
  clusterValidation.reset()
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
      ...(cname.value.trim() && { cname: cname.value.trim() }),
      ...(description.value.trim() && { description: description.value.trim() }),
      ...(span.value && { span: span.value }),
      ...(active.value && { active: active.value }),
      ...(striptags.value && { striptags: striptags.value }),
      ...(parseIntOrNull(directdial.value) !== null && { directdial: parseIntOrNull(directdial.value) }),
      ...(extcode.value !== '' && { extcode: extcode.value })
    }
    const cleaned = Object.fromEntries(Object.entries(body).filter(([, v]) => v !== undefined))
    const createdPkey = pkey.value.trim()
    await getApiClient().post('customapps', cleaned)
    toast.show(`Custom app ${createdPkey} created`)
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
      error.value = firstErrorMessage(err, 'Failed to create custom app')
      await nextTick()
      focusFirstError(validations, (id) => {
        if (id === 'pkey' && pkeyInput.value) return pkeyInput.value
        return document.getElementById(id)
      })
    } else {
      error.value = firstErrorMessage(err, 'Failed to create custom app')
    }
  } finally {
    loading.value = false
  }
}

function goBack() {
  window.location.replace(router.resolve({ name: 'customapps' }).href)
}

function onKeydown(e) {
  if (e.key === 'Escape') {
    e.preventDefault()
    goBack()
  }
}

onMounted(async () => {
  await ensureFetched()
  await loadTenants()
  applySchemaDefaults('customapps', { active, cluster, span, striptags, directdial, description, cname, extcode })
  nextTick().then(() => pkeyInput.value?.focus())
})
</script>

<template>
  <div class="create-view">
    <h1>Create custom app</h1>

    <form class="form create-form" @submit="onSubmit" @keydown="onKeydown">
      <p v-if="error" class="error" role="alert">{{ error }}</p>

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
          label="App name"
          :model-value="pkey"
          required
          :error="pkeyValidation.error.value"
          :touched="pkeyValidation.touched.value"
          placeholder="e.g. MyApp_1"
          @update:modelValue="(v) => (pkey.value = v)"
          @blur="pkeyValidation.onBlur"
        />
        <FormField
          id="cname"
          label="Display name"
          :model-value="cname"
          placeholder="Optional"
          @update:modelValue="(v) => (cname.value = v)"
        />
        <FormField
          id="description"
          label="Description"
          :model-value="description"
          placeholder="Optional"
          @update:modelValue="(v) => (description.value = v)"
        />
      </div>

      <h2 class="detail-heading">Settings</h2>
      <div class="form-fields">
        <FormSelect
          id="cluster"
          label="Tenant"
          :model-value="cluster"
          :options="tenantOptionsForSelect"
          required
          :error="clusterValidation.error.value"
          :touched="clusterValidation.touched.value"
          @update:modelValue="(v) => (cluster.value = v)"
          @blur="clusterValidation.onBlur"
        />
        <FormToggle
          id="active"
          label="Active?"
          :model-value="active"
          @update:modelValue="(v) => (active.value = v)"
        />
        <FormSelect
          id="span"
          label="Span"
          :model-value="span"
          :options="spanOptions"
          @update:modelValue="(v) => (span.value = v)"
        />
        <FormToggle
          id="striptags"
          label="Strip tags?"
          :model-value="striptags"
          @update:modelValue="(v) => (striptags.value = v)"
        />
        <FormField
          id="directdial"
          label="Direct dial"
          type="number"
          :model-value="directdial"
          placeholder="Optional (integer)"
          @update:modelValue="(v) => (directdial.value = v)"
        />
      </div>

      <h2 class="detail-heading">Code</h2>
      <div class="form-fields">
        <FormField
          id="extcode"
          label="Extension code"
          :model-value="extcode"
          multiline
          :rows="16"
          placeholder="Dialplan / Asterisk code"
          @update:modelValue="(v) => (extcode.value = v)"
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
.create-form .detail-heading {
  font-size: 1rem;
  font-weight: 600;
  color: #334155;
  margin: 1.5rem 0 0.5rem 0;
}
.create-form .detail-heading:first-of-type {
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
