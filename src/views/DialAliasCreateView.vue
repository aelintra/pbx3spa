<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { getApiClient } from '@/api/client'
import { useSchema } from '@/composables/useSchema'
import { useToastStore } from '@/stores/toast'
import { useFormValidation, validateAll, focusFirstError } from '@/composables/useFormValidation'
import { validateDialPrefixPkey, validateTenant } from '@/utils/validation'
import { fieldErrors, firstErrorMessage } from '@/utils/formErrors'
import { loadTenantOptions } from '@/utils/loadTenantOptions'
import { useFleetPosture } from '@/composables/useFleetPosture'
import FormField from '@/components/forms/FormField.vue'
import FormSelect from '@/components/forms/FormSelect.vue'
import FormToggle from '@/components/forms/FormToggle.vue'
import PanelBackLink from '@/components/PanelBackLink.vue'

const router = useRouter()
const toast = useToastStore()
const { ensureFetched, applySchemaDefaults } = useSchema()
const { loadFleetPosture, isFleetNode } = useFleetPosture()

const pkey = ref('')
const cluster = ref('')
const targetCluster = ref('')
const description = ref('')
const active = ref('YES')

const tenants = ref([])
const tenantsLoading = ref(true)
const error = ref('')
const loading = ref(false)
const fleetBlocked = ref(false)

const pkeyInput = ref(null)

const pkeyValidation = useFormValidation(pkey, validateDialPrefixPkey)
const clusterValidation = useFormValidation(cluster, validateTenant)
const targetValidation = useFormValidation(targetCluster, (v) => {
  const base = validateTenant(v)
  if (base) return base
  if (v && cluster.value && String(v).trim() === String(cluster.value).trim()) {
    return 'Target must differ from calling tenant'
  }
  return null
})

const tenantOptions = computed(() => {
  const list = tenants.value.map((t) => t.pkey).filter(Boolean)
  return [...new Set(list)].sort((a, b) => String(a).localeCompare(String(b)))
})

async function loadTenants() {
  tenantsLoading.value = true
  try {
    tenants.value = await loadTenantOptions()
  } catch {
    tenants.value = []
  } finally {
    tenantsLoading.value = false
  }
}

function resetForm() {
  pkey.value = ''
  cluster.value = ''
  targetCluster.value = ''
  description.value = ''
  active.value = 'YES'
  error.value = ''
  pkeyValidation.reset()
  clusterValidation.reset()
  targetValidation.reset()
}

async function onSubmit(e) {
  e.preventDefault()
  error.value = ''

  const validations = [
    { ...pkeyValidation, fieldId: 'pkey' },
    { ...clusterValidation, fieldId: 'cluster' },
    { ...targetValidation, fieldId: 'target_cluster' }
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
      target_cluster: targetCluster.value.trim(),
      active: active.value || 'YES',
      ...(description.value.trim() && { description: description.value.trim() })
    }
    const created = pkey.value.trim()
    await getApiClient().post('dialaliases', body)
    toast.show(`Dial prefix ${created} created`)
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
      if (errors.target_cluster) {
        targetValidation.touched.value = true
        targetValidation.error.value = Array.isArray(errors.target_cluster)
          ? errors.target_cluster[0]
          : errors.target_cluster
      }
      error.value = firstErrorMessage(err, 'Failed to create dial prefix')
    } else {
      error.value = firstErrorMessage(err, 'Failed to create dial prefix')
    }
  } finally {
    loading.value = false
  }
}

function goBack() {
  router.push({ name: 'dialaliases' })
}

function onKeydown(e) {
  if (e.key === 'Escape') {
    e.preventDefault()
    goBack()
  }
}

onMounted(async () => {
  await loadFleetPosture()
  if (!isFleetNode()) {
    fleetBlocked.value = true
    return
  }
  await ensureFetched()
  await loadTenants()
  applySchemaDefaults('dialaliases', {
    active,
    cluster,
    description
  })
  nextTick().then(() => pkeyInput.value?.focus())
})
</script>

<template>
  <div class="create-view">
    <PanelBackLink :to="{ name: 'dialaliases' }" label="Dial prefixes">
      <h1>Create dial prefix</h1>
    </PanelBackLink>

    <p v-if="fleetBlocked" class="error" role="alert">
      Dial prefixes are fleet-only in v1. This node is not in fleet mode.
    </p>

    <form v-else class="form create-form" @submit="onSubmit" @keydown="onKeydown">
      <p v-if="error" class="error" role="alert">{{ error }}</p>

      <div class="actions actions-top">
        <button type="submit" :disabled="loading || tenantsLoading">
          {{ loading ? 'Creating…' : 'Create' }}
        </button>
        <button type="button" class="secondary" @click="goBack">Cancel</button>
      </div>

      <h2 class="detail-heading">Dial prefix</h2>
      <p class="create-hint">
        Prefix is only for the calling tenant. Dial prefix + extension digits (e.g. 81 then 1000 →
        811000). No feature codes after the prefix. Live dial path lands in a later release (slice C).
      </p>
      <div class="form-fields">
        <FormField
          id="pkey"
          ref="pkeyInput"
          v-model="pkey"
          label="Prefix"
          help-pkey="dialprefix"
          placeholder="e.g. 81"
          inputmode="numeric"
          pattern="[0-9]{2,4}"
          required
          :error="pkeyValidation.error.value"
          :touched="pkeyValidation.touched.value"
          @blur="pkeyValidation.onBlur"
        />

        <FormSelect
          id="cluster"
          v-model="cluster"
          label="Calling tenant"
          :options="tenantOptions"
          empty-text="Select tenant"
          required
          :loading="tenantsLoading"
          :error="clusterValidation.error.value"
          :touched="clusterValidation.touched.value"
          @blur="clusterValidation.onBlur"
        />

        <FormSelect
          id="target_cluster"
          v-model="targetCluster"
          label="Target tenant"
          help-pkey="dialprefix_target"
          :options="tenantOptions"
          empty-text="Select target"
          required
          :loading="tenantsLoading"
          :error="targetValidation.error.value"
          :touched="targetValidation.touched.value"
          @blur="targetValidation.onBlur"
        />

        <FormToggle id="active" v-model="active" label="Active" />

        <FormField
          id="description"
          v-model="description"
          label="Description"
          help-pkey="description"
          placeholder="Optional"
        />
      </div>
    </form>
  </div>
</template>

<style scoped>
.create-view {
  max-width: 52rem;
}
.create-hint {
  margin: 0 0 1rem;
  max-width: 40rem;
  color: var(--color-muted, #64748b);
  font-size: 0.9rem;
  line-height: 1.4;
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
</style>
