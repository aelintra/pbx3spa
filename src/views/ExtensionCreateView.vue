<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { getApiClient } from '@/api/client'
import { useToastStore } from '@/stores/toast'
import { useFormValidation, validateAll, focusFirstError } from '@/composables/useFormValidation'
import { validateExtensionPkey, validateTenant } from '@/utils/validation'
import { normalizeList } from '@/utils/listResponse'
import { fieldErrors, firstErrorMessage } from '@/utils/formErrors'
import FormField from '@/components/forms/FormField.vue'
import FormSelect from '@/components/forms/FormSelect.vue'

const router = useRouter()
const toast = useToastStore()
const protocol = ref('')
const pkey = ref('')
const cluster = ref('')
const desc = ref('')
const macaddr = ref('')
const tenants = ref([])
const tenantsLoading = ref(true)
const error = ref('')
const loading = ref(false)
const pkeyInput = ref(null)

const pkeyValidation = useFormValidation(pkey, validateExtensionPkey)
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

const protocolOptions = ['SIP', 'WebRTC', 'Mailbox']
const protocolChosen = computed(() => !!protocol.value)

function resetForm() {
  protocol.value = ''
  pkey.value = ''
  cluster.value = ''
  desc.value = ''
  macaddr.value = ''
  pkeyValidation.reset()
  clusterValidation.reset()
  error.value = ''
}

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

async function onSubmit(e) {
  e.preventDefault()
  error.value = ''
  if (!protocolChosen.value) {
    error.value = 'Please choose a protocol'
    return
  }
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
      protocol: protocol.value
    }
    if (desc.value.trim()) body.desc = desc.value.trim()
    if (macaddr.value.trim()) body.macaddr = macaddr.value.trim().replace(/[^0-9a-fA-F]/g, '')
    await getApiClient().post('extensions', body)
    toast.show(`Extension ${pkey.value.trim()} created`)
    resetForm()
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
      focusFirstError(
        [{ ...pkeyValidation, fieldId: 'pkey' }, { ...clusterValidation, fieldId: 'cluster' }],
        (id) => (id === 'pkey' && pkeyInput.value ? pkeyInput.value : document.getElementById(id))
      )
    }
    error.value = firstErrorMessage(err, 'Failed to create extension')
  } finally {
    loading.value = false
  }
}

function goBack() {
  window.location.replace(router.resolve({ name: 'extensions' }).href)
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
    <h1>Create extension</h1>

    <form class="form" @submit="onSubmit">
      <p v-if="error" id="extension-create-error" class="error" role="alert">{{ error }}</p>

      <h2 class="detail-heading">Type</h2>
      <div class="form-fields">
        <FormSelect
          id="protocol"
          v-model="protocol"
          label="Protocol"
          :options="protocolOptions"
          empty-text="Choose protocol"
          hint="SIP, WebRTC, or Mailbox."
          aria-label="Choose protocol"
        />
      </div>

      <template v-if="protocolChosen">
        <h2 class="detail-heading">Identity</h2>
        <div class="form-fields">
          <FormField
            id="pkey"
            ref="pkeyInput"
            v-model="pkey"
            label="Extension number"
            type="text"
            placeholder="e.g. 1001"
            :error="pkeyValidation.error.value"
            :touched="pkeyValidation.touched.value"
            :required="true"
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
            @blur="clusterValidation.onBlur"
          />
          <FormField
            id="desc"
            v-model="desc"
            label="Name (optional)"
            type="text"
            placeholder="Short description or display name"
          />
          <FormField
            id="macaddr"
            v-model="macaddr"
            label="MAC address (optional)"
            type="text"
            placeholder="e.g. 001122334455 (12 hex digits)"
            hint="SIP/WebRTC only. Leave blank for Mailbox."
          />
        </div>
      </template>

      <div class="actions">
        <button type="submit" :disabled="loading || !protocolChosen || tenantsLoading">
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
