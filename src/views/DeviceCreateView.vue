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

const router = useRouter()
const toast = useToastStore()
const { ensureFetched, applySchemaDefaults } = useSchema()

const pkey = ref('')
const desc = ref('')
const device = ref('')
const technology = ref('')
const provision = ref('')
const owner = ref('system')
const blfkeyname = ref('')
const blfkeys = ref('')
const fkeys = ref('')
const pkeys = ref('')
const imageurl = ref('')
const legacy = ref('')
const noproxy = ref('')
const sipiaxfriend = ref('')
const tftpname = ref('')
const zapdevfixed = ref('')

const error = ref('')
const loading = ref(false)
const pkeyInput = ref(null)

const pkeyValidation = useFormValidation(pkey, validateDevicePkey)

function parseIntOrNull(v) {
  if (v == null) return null
  const s = String(v).trim()
  if (s === '') return null
  const n = parseInt(s, 10)
  return isNaN(n) ? null : n
}

function resetForm() {
  pkey.value = ''
  desc.value = ''
  device.value = ''
  technology.value = ''
  provision.value = ''
  owner.value = 'system'
  blfkeyname.value = ''
  blfkeys.value = ''
  fkeys.value = ''
  pkeys.value = ''
  imageurl.value = ''
  legacy.value = ''
  noproxy.value = ''
  sipiaxfriend.value = ''
  tftpname.value = ''
  zapdevfixed.value = ''
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
      ...(device.value.trim() && { device: device.value.trim() }),
      ...(technology.value.trim() && { technology: technology.value.trim() }),
      ...(provision.value.trim() && { provision: provision.value.trim() }),
      ...(owner.value.trim() && { owner: owner.value.trim() }),
      ...(blfkeyname.value.trim() && { blfkeyname: blfkeyname.value.trim() }),
      ...(parseIntOrNull(blfkeys.value) !== null && { blfkeys: parseIntOrNull(blfkeys.value) }),
      ...(parseIntOrNull(fkeys.value) !== null && { fkeys: parseIntOrNull(fkeys.value) }),
      ...(parseIntOrNull(pkeys.value) !== null && { pkeys: parseIntOrNull(pkeys.value) }),
      ...(imageurl.value.trim() && { imageurl: imageurl.value.trim() }),
      ...(legacy.value.trim() && { legacy: legacy.value.trim() }),
      ...(noproxy.value.trim() && { noproxy: noproxy.value.trim() }),
      ...(sipiaxfriend.value.trim() && { sipiaxfriend: sipiaxfriend.value.trim() }),
      ...(tftpname.value.trim() && { tftpname: tftpname.value.trim() }),
      ...(zapdevfixed.value.trim() && { zapdevfixed: zapdevfixed.value.trim() })
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
  device,
  technology,
  provision,
  owner,
  blfkeyname,
  blfkeys,
  fkeys,
  pkeys,
  imageurl,
  legacy,
  noproxy,
  sipiaxfriend,
  tftpname,
  zapdevfixed
}

onMounted(async () => {
  await ensureFetched()
  applySchemaDefaults('devices', refsByKey)
  nextTick().then(() => pkeyInput.value?.focus())
})
</script>

<template>
  <div class="create-view">
    <h1>Create device template</h1>

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
        <FormField
          id="device"
          v-model="device"
          label="Device"
          placeholder="Optional"
        />
        <FormField
          id="technology"
          v-model="technology"
          label="Technology"
          placeholder="Optional"
        />
        <FormField
          id="provision"
          v-model="provision"
          label="Provision"
          placeholder="Optional"
        />
        <FormField
          id="owner"
          v-model="owner"
          label="Owner"
          placeholder="Optional"
        />
      </div>

      <h2 class="detail-heading">Advanced</h2>
      <div class="form-fields">
        <FormField
          id="blfkeyname"
          v-model="blfkeyname"
          label="BLF key name"
          placeholder="Optional"
        />
        <FormField
          id="blfkeys"
          v-model="blfkeys"
          label="BLF keys"
          type="number"
          placeholder="Optional"
        />
        <FormField
          id="fkeys"
          v-model="fkeys"
          label="F keys"
          type="number"
          placeholder="Optional"
        />
        <FormField
          id="pkeys"
          v-model="pkeys"
          label="P keys"
          type="number"
          placeholder="Optional"
        />
        <FormField
          id="imageurl"
          v-model="imageurl"
          label="Image URL"
          placeholder="Optional"
        />
        <FormField
          id="legacy"
          v-model="legacy"
          label="Legacy"
          placeholder="Optional"
        />
        <FormField
          id="noproxy"
          v-model="noproxy"
          label="No proxy"
          placeholder="Optional"
        />
        <FormField
          id="sipiaxfriend"
          v-model="sipiaxfriend"
          label="SIP/IAX friend"
          placeholder="Optional"
        />
        <FormField
          id="tftpname"
          v-model="tftpname"
          label="TFTP name"
          placeholder="Optional"
        />
        <FormField
          id="zapdevfixed"
          v-model="zapdevfixed"
          label="Zap dev fixed"
          placeholder="Optional"
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
