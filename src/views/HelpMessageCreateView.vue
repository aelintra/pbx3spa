<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { getApiClient } from '@/api/client'
import { useSchema } from '@/composables/useSchema'
import { useToastStore } from '@/stores/toast'
import { useFormValidation, validateAll, focusFirstError } from '@/composables/useFormValidation'
import { validateHelpCorePkey } from '@/utils/validation'
import { fieldErrors, firstErrorMessage } from '@/utils/formErrors'
import FormField from '@/components/forms/FormField.vue'
import PanelBackLink from '@/components/PanelBackLink.vue'
import { HELP_TEXT_FORMAT_NOTE } from '@/utils/helpTextFormat'

const router = useRouter()
const toast = useToastStore()
const { ensureFetched, applySchemaDefaults } = useSchema()

const pkey = ref('')
const displayname = ref('')
const htext = ref('')

const error = ref('')
const loading = ref(false)
const pkeyInput = ref(null)

const pkeyValidation = useFormValidation(pkey, validateHelpCorePkey)

function resetForm() {
  pkey.value = ''
  displayname.value = ''
  htext.value = ''
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
      ...(displayname.value.trim() && { displayname: displayname.value.trim() }),
      ...(htext.value.trim() && { htext: htext.value.trim() })
    }
    const cleaned = Object.fromEntries(Object.entries(body).filter(([, v]) => v !== undefined))
    await getApiClient().post('helpcore', cleaned)
    toast.show(`Help message ${pkey.value.trim()} created`)
    resetForm()
    await nextTick()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  } catch (err) {
    const errors = fieldErrors(err)
    if (errors?.pkey) {
      pkeyValidation.touched.value = true
      pkeyValidation.error.value = Array.isArray(errors.pkey) ? errors.pkey[0] : errors.pkey
    }
    error.value = firstErrorMessage(err, 'Failed to create help message')
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
  window.location.replace(router.resolve({ name: 'help-messages' }).href)
}

function onKeydown(e) {
  if (e.key === 'Escape') {
    e.preventDefault()
    goBack()
  }
}

const refsByKey = {
  pkey,
  displayname,
  htext
}

onMounted(async () => {
  await ensureFetched()
  applySchemaDefaults('helpcore', refsByKey)
  nextTick().then(() => pkeyInput.value?.focus())
})
</script>

<template>
  <div class="create-view">
    <PanelBackLink :to="{ name: 'help-messages' }" label="Help Messages">
      <h1>Create help message</h1>
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
          label="Message key"
          required
          :error="pkeyValidation.error.value"
          :touched="pkeyValidation.touched.value"
          placeholder="e.g. tt_help_some_key"
          @blur="pkeyValidation.onBlur"
        />
        <FormField
          id="displayname"
          v-model="displayname"
          label="Display name"
          placeholder="Optional"
        />
      </div>

      <h2 class="detail-heading">Help text</h2>
      <p class="help-text-format-note">{{ HELP_TEXT_FORMAT_NOTE }}</p>
      <div class="longtext-section">
        <div class="form-fields provision-section">
          <FormField
            id="htext"
            v-model="htext"
            label="Help text"
            multiline
            :rows="16"
            placeholder="Help / UI message content"
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
.help-text-format-note {
  margin: 0 0 0.75rem 0;
  font-size: 0.8125rem;
  color: #64748b;
  line-height: 1.5;
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

.longtext-section .provision-section :deep(.form-input-textarea) {
  min-width: 80ch;
}
</style>
