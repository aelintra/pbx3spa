<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { getApiClient } from '@/api/client'
import { useSchema } from '@/composables/useSchema'
import { useToastStore } from '@/stores/toast'
import { useFormValidation, validateAll, focusFirstError } from '@/composables/useFormValidation'
import { validateDevicePkey } from '@/utils/validation'
import { fieldErrors, firstErrorMessage } from '@/utils/formErrors'
import FormField from '@/components/forms/FormField.vue'
import FormSelect from '@/components/forms/FormSelect.vue'
import PanelBackLink from '@/components/PanelBackLink.vue'

const TECHNOLOGY_OPTIONS = ['SIP', 'Descriptor', 'BLF Template']

const router = useRouter()
const toast = useToastStore()
const { ensureFetched, applySchemaDefaults } = useSchema()

const pkey = ref('')
const desc = ref('')
const technology = ref('SIP')
const provision = ref('')
const owner = ref('system')

const error = ref('')
const loading = ref(false)
const pkeyInput = ref(null)

const pkeyValidation = useFormValidation(pkey, validateDevicePkey)

function resetForm() {
  pkey.value = ''
  desc.value = ''
  technology.value = 'SIP'
  provision.value = ''
  owner.value = 'system'
  error.value = ''
  pkeyValidation.reset()
}

async function onSubmit(e) {
  e.preventDefault()
  error.value = ''

  const validations = [{ ...pkeyValidation, fieldId: 'pkey' }]
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
      ...(desc.value.trim() && { desc: desc.value.trim() }),
      ...(technology.value.trim() && { technology: technology.value.trim() }),
      ...(provision.value.trim() && { provision: provision.value.trim() }),
      ...(owner.value.trim() && { owner: owner.value.trim() })
    }
    const cleaned = Object.fromEntries(Object.entries(body).filter(([, v]) => v !== undefined))
    await getApiClient().post('devices', cleaned)
    toast.show(`Device template ${pkey.value.trim()} created`)
    resetForm()
    await nextTick()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  } catch (err) {
    const errors = fieldErrors(err)
    if (errors?.pkey) {
      pkeyValidation.touched.value = true
      pkeyValidation.error.value = Array.isArray(errors.pkey) ? errors.pkey[0] : errors.pkey
    }
    error.value = firstErrorMessage(err, 'Failed to create device template')
    await nextTick()
    focusFirstError([{ ...pkeyValidation, fieldId: 'pkey' }], (id) => {
      if (id === 'pkey' && pkeyInput.value) return pkeyInput.value
      return document.getElementById(id)
    })
  } finally {
    loading.value = false
  }
}

function goBack() {
  window.location.replace(router.resolve({ name: 'devices' }).href)
}

function onKeydown(e) {
  if (e.key === 'Escape') {
    e.preventDefault()
    goBack()
  }
}

const refsByKey = {
  pkey,
  desc,
  technology,
  provision,
  owner
}

onMounted(async () => {
  await ensureFetched()
  applySchemaDefaults('devices', refsByKey)
  nextTick().then(() => pkeyInput.value?.focus())
})
</script>

<template>
  <div class="create-view">
    <PanelBackLink :to="{ name: 'devices' }" label="Devices">
      <h1>Create device template</h1>
    </PanelBackLink>

    <form class="form create-form" @submit="onSubmit" @keydown="onKeydown">
      <p v-if="error" class="error" role="alert">{{ error }}</p>

      <div class="actions actions-top">
        <button type="submit" :disabled="loading">
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
          label="Template name"
          required
          :error="pkeyValidation.error.value"
          :touched="pkeyValidation.touched.value"
          placeholder="e.g. Yealink_T46"
          @blur="pkeyValidation.onBlur"
        />
        <FormField
          id="desc"
          v-model="desc"
          label="Description"
          placeholder="Optional"
        />
      </div>

      <h2 class="detail-heading">Settings</h2>
      <div class="form-fields">
        <FormSelect
          id="technology"
          v-model="technology"
          label="Technology"
          :options="TECHNOLOGY_OPTIONS"
        />
        <FormField
          id="owner"
          v-model="owner"
          label="Owner"
          placeholder="Optional"
        />
      </div>

      <div class="longtext-section">
        <div class="form-fields provision-section">
          <FormField
            id="provision"
            v-model="provision"
            label="Provision"
            multiline
            :rows="16"
            placeholder="Provisioning template / config"
          />
        </div>
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

.longtext-section .provision-section :deep(.form-input-textarea) {
  min-width: 80ch;
}
</style>
