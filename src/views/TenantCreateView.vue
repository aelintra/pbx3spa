<script setup>
import { ref, reactive, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { getApiClient } from '@/api/client'
import { useToastStore } from '@/stores/toast'
import { useFormValidation, validateAll, focusFirstError } from '@/composables/useFormValidation'
import { validateTenantPkey } from '@/utils/validation'
import {
  ADVANCED_FIELDS,
  buildAdvancedPayload,
  buildInitialFormAdvanced,
  parseNum
} from '@/constants/tenantAdvanced'
import { fieldErrors } from '@/utils/formErrors'
import FormField from '@/components/forms/FormField.vue'
import FormSelect from '@/components/forms/FormSelect.vue'
import FormToggle from '@/components/forms/FormToggle.vue'

const router = useRouter()
const toast = useToastStore()
const pkey = ref('')
const description = ref('')
const clusterclid = ref('')
const abstimeout = ref('14400')
const chanmax = ref('30')
const masteroclo = ref('AUTO')
const error = ref('')
const loading = ref(false)
const pkeyInput = ref(null)

// Field-level validation (refs declared before composable)
const pkeyValidation = useFormValidation(pkey, validateTenantPkey)

const formAdvanced = reactive(buildInitialFormAdvanced())

async function onSubmit(e) {
  e.preventDefault()
  error.value = ''

  const validations = [
    { ...pkeyValidation, fieldId: 'pkey' }
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
      description: description.value.trim(),
      ...(parseNum(clusterclid.value) !== undefined && { clusterclid: parseNum(clusterclid.value) }),
      ...(parseNum(abstimeout.value) !== undefined && { abstimeout: parseNum(abstimeout.value) }),
      ...(parseNum(chanmax.value) !== undefined && { chanmax: parseNum(chanmax.value) }),
      ...(masteroclo.value.trim() && { masteroclo: masteroclo.value.trim() }),
      ...buildAdvancedPayload(formAdvanced)
    }
    const cleaned = Object.fromEntries(Object.entries(body).filter(([, v]) => v !== undefined && v !== ''))
    const tenant = await getApiClient().post('tenants', cleaned)
    toast.show(`Tenant ${tenant.pkey} created`)
    router.push({ name: 'tenant-detail', params: { pkey: tenant.pkey } })
  } catch (err) {
    const errors = fieldErrors(err)
    if (errors) {
      if (errors.pkey) {
        pkeyValidation.touched.value = true
        pkeyValidation.error.value = Array.isArray(errors.pkey) ? errors.pkey[0] : errors.pkey
      }
      const first = Object.values(errors).flat()[0]
      error.value = first || err.message
      await nextTick()
      focusFirstError(validations, (id) => {
        if (id === 'pkey' && pkeyInput.value) return pkeyInput.value
        return document.getElementById(id)
      })
    } else {
      error.value = err.data?.Error || err.data?.message || err.message || 'Failed to create tenant'
    }
  } finally {
    loading.value = false
  }
}

function goBack() {
  router.push({ name: 'tenants' })
}

function onKeydown(e) {
  if (e.key === 'Escape') {
    e.preventDefault()
    goBack()
  }
}

onMounted(() => {
  nextTick().then(() => pkeyInput.value?.focus())
})
</script>

<template>
  <div class="create-view">
    <h1>Create tenant</h1>

    <form class="form create-form" @submit="onSubmit" @keydown="onKeydown">
      <p v-if="error" id="tenant-create-error" class="error" role="alert">{{ error }}</p>

      <h2 class="detail-heading">Identity</h2>
      <div class="form-fields">
        <FormField
          id="pkey"
          ref="pkeyInput"
          v-model="pkey"
          label="Name"
          type="text"
          placeholder="e.g. mycluster"
          :error="pkeyValidation.error.value"
          :touched="pkeyValidation.touched.value"
          :required="true"
          hint="Unique tenant identifier."
          @blur="pkeyValidation.onBlur"
        />
        <FormField
          id="description"
          v-model="description"
          label="Description"
          type="text"
          placeholder="Short description"
          :required="true"
        />
      </div>

      <h2 class="detail-heading">Settings</h2>
      <div class="form-fields">
        <FormField
          id="clusterclid"
          v-model="clusterclid"
          label="CLID"
          type="number"
          placeholder="integer"
        />
        <FormField
          id="abstimeout"
          v-model="abstimeout"
          label="Abstime"
          type="number"
          placeholder="integer"
        />
        <FormField
          id="chanmax"
          v-model="chanmax"
          label="ChanMax"
          type="number"
          placeholder="integer"
        />
        <FormSelect
          id="masteroclo"
          v-model="masteroclo"
          label="Timer status"
          :options="['AUTO', 'CLOSED']"
          empty-text=""
        />
      </div>

      <h2 class="detail-heading">Advanced</h2>
      <div class="form-fields">
        <template v-for="f in ADVANCED_FIELDS" :key="f.key">
            <FormToggle
              v-if="f.type === 'boolean'"
              :id="`adv-${f.key}`"
              v-model="formAdvanced[f.key]"
              :label="f.label"
              yes-value="YES"
              no-value="NO"
            />
            <FormSelect
              v-else-if="f.type === 'pill'"
              :id="`adv-${f.key}`"
              v-model="formAdvanced[f.key]"
              :label="f.label"
              :options="f.options"
              :required="false"
              empty-text=""
            />
            <FormField
              v-else-if="f.type === 'number'"
              :id="`adv-${f.key}`"
              v-model="formAdvanced[f.key]"
              :label="f.label"
              type="number"
              :placeholder="f.placeholder || 'number'"
            />
            <FormField
              v-else
              :id="`adv-${f.key}`"
              v-model="formAdvanced[f.key]"
              :label="f.label"
              type="text"
              :placeholder="f.placeholder || ''"
            />
        </template>
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
