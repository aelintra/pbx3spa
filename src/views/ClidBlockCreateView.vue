<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { getApiClient } from '@/api/client'
import { useSchema } from '@/composables/useSchema'
import { useToastStore } from '@/stores/toast'
import { useFormValidation, validateAll, focusFirstError } from '@/composables/useFormValidation'
import { validateClidBlockPkey, validateTenant } from '@/utils/validation'
import { loadTenantOptions } from '@/utils/loadTenantOptions'
import { fieldErrors, firstErrorMessage } from '@/utils/formErrors'
import FormField from '@/components/forms/FormField.vue'
import FormSelect from '@/components/forms/FormSelect.vue'
import FormToggle from '@/components/forms/FormToggle.vue'
import PanelBackLink from '@/components/PanelBackLink.vue'

const router = useRouter()
const toast = useToastStore()
const { ensureFetched, applySchemaDefaults } = useSchema()

const pkey = ref('')
const cluster = ref('default')
const cname = ref('')
const description = ref('')
const active = ref('YES')

const tenants = ref([])
const tenantsLoading = ref(true)
const error = ref('')
const loading = ref(false)
const pkeyInput = ref(null)

const pkeyValidation = useFormValidation(pkey, validateClidBlockPkey)
const clusterValidation = useFormValidation(cluster, validateTenant)

const tenantOptions = computed(() => {
  const list = tenants.value.map((t) => t.pkey).filter(Boolean)
  return [...new Set(list)].sort((a, b) => String(a).localeCompare(String(b)))
})

const tenantOptionsForSelect = computed(() => {
  const list = tenantOptions.value
  const cur = cluster.value
  if (cur && !list.includes(cur)) {
    return [cur, ...list].sort((a, b) => String(a).localeCompare(String(b)))
  }
  return list
})

async function loadTenants() {
  tenantsLoading.value = true
  try {
    tenants.value = await loadTenantOptions()
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
  applySchemaDefaults('clidblocks', { cluster, cname, description, active })
  await loadTenants()
})

function goBack() {
  router.push({ name: 'clidblocks' })
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
      active: active.value,
      action: 'hangup'
    }
    if (cname.value.trim()) body.cname = cname.value.trim()
    if (description.value.trim()) body.description = description.value.trim()

    await getApiClient().post('clidblocks', body)
    toast.show(`Blocked caller ID added`)
    router.push({ name: 'clidblocks' })
  } catch (err) {
    const errors = fieldErrors(err)
    if (errors?.pkey) {
      pkeyValidation.touched.value = true
      pkeyValidation.error.value = Array.isArray(errors.pkey) ? errors.pkey[0] : errors.pkey
    }
    if (errors?.cluster) {
      clusterValidation.touched.value = true
      clusterValidation.error.value = Array.isArray(errors.cluster)
        ? errors.cluster[0]
        : errors.cluster
    }
    error.value = firstErrorMessage(err, 'Failed to create block')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="create-view" @keydown="onKeydown">
    <PanelBackLink :to="{ name: 'clidblocks' }" label="Blocked caller IDs">
      <h1>Block caller ID</h1>
    </PanelBackLink>

    <form class="form" @submit="onSubmit">
      <p v-if="error" id="clidblock-create-error" class="error" role="alert">{{ error }}</p>

      <div class="actions actions-top">
        <button type="submit" :disabled="loading || tenantsLoading">
          {{ loading ? 'Creating…' : 'Create' }}
        </button>
        <button type="button" class="secondary" @click="goBack">Cancel</button>
      </div>

      <FormSelect
        id="cluster"
        v-model="cluster"
        label="Tenant"
        :options="tenantOptionsForSelect"
        :error="clusterValidation.error.value"
        :disabled="tenantsLoading"
        required
      />

      <FormField
        id="pkey"
        ref="pkeyInput"
        v-model="pkey"
        label="Caller ID"
        help="Digits only after save (e.g. +44 1924… → 441924…). Match the form you see in CDR."
        hide-help
        :error="pkeyValidation.error.value"
        required
        autocomplete="off"
        @blur="pkeyValidation.touch()"
      />

      <FormField id="cname" v-model="cname" label="Name" autocomplete="off" />

      <FormField
        id="description"
        v-model="description"
        label="Note"
        autocomplete="off"
        multiline
      />

      <FormToggle id="active" v-model="active" label="Active" active-value="YES" inactive-value="NO" />

      <p class="hint">Action: Hangup (reject inbound call before ring).</p>

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
.actions-top {
  margin-top: 0;
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
.hint {
  font-size: 0.9rem;
  color: var(--pbx-muted, #64748b);
  margin: 0;
}
</style>
