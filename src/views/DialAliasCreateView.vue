<script setup>
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { useRouter } from 'vue-router'
import { getApiClient } from '@/api/client'
import { useSchema } from '@/composables/useSchema'
import { useToastStore } from '@/stores/toast'
import { useFormValidation, validateAll, focusFirstError } from '@/composables/useFormValidation'
import { validateDialPrefixPkey, validateTenant } from '@/utils/validation'
import { fieldErrors, firstErrorMessage } from '@/utils/formErrors'
import {
  loadTargetTenantFqdnCatalog,
  callingTenantPkeys,
  callingTenantFqdn,
  targetFqdnSelectOptions
} from '@/utils/loadTargetTenantFqdnCatalog'
import { useFleetPosture } from '@/composables/useFleetPosture'
import FormField from '@/components/forms/FormField.vue'
import FormSelect from '@/components/forms/FormSelect.vue'
import FormToggle from '@/components/forms/FormToggle.vue'
import PanelBackLink from '@/components/PanelBackLink.vue'

const router = useRouter()
const toast = useToastStore()
const { ensureFetched, applySchemaDefaults } = useSchema()
const { loadFleetPosture, isFleetNode, dialCohortFeatureOn } = useFleetPosture()

const pkey = ref('')
const cluster = ref('')
const targetFqdn = ref('')
const description = ref('')
const active = ref('YES')

const localTenants = ref([])
const targetFqdns = ref([])
const targetLabels = ref(new Map())
const catalogAttempted = ref(false)
const catalogOk = ref(false)
const catalogLoading = ref(true)
const error = ref('')
const loading = ref(false)
const fleetBlocked = ref(false)
const cohortFeatureBlocksCreate = ref(false)

const pkeyInput = ref(null)

const pkeyValidation = useFormValidation(pkey, validateDialPrefixPkey)
const clusterValidation = useFormValidation(cluster, validateTenant)
const targetValidation = useFormValidation(targetFqdn, (v) => {
  if (!v || !String(v).trim()) return 'Select a target tenant'
  const known = new Set(targetFqdns.value)
  if (!known.has(String(v).trim().toLowerCase())) {
    return 'Target must be chosen from the known tenant list'
  }
  return null
})

const tenantOptions = computed(() => callingTenantPkeys(localTenants.value))

const targetOptions = computed(() =>
  targetFqdnSelectOptions(targetFqdns.value, targetLabels.value, {
    excludeFqdn: callingTenantFqdn(localTenants.value, cluster.value)
  })
)

const emptyTargetList = computed(() => !catalogLoading.value && targetOptions.value.length === 0)

const catalogHint = computed(() => {
  if (catalogLoading.value) return ''
  if (emptyTargetList.value) {
    if (catalogAttempted.value && !catalogOk.value) {
      return 'No known tenant FQDNs. Fleet catalog is unreachable; only local tenants with an FQDN can be targets until it returns.'
    }
    return 'No known tenant FQDNs yet. Create other tenants locally or wait for fleet catalog.'
  }
  if (catalogAttempted.value && !catalogOk.value) {
    return 'Fleet catalog unavailable — showing local tenants only.'
  }
  return 'Targets are limited to tenants we know (local + fleet catalog).'
})

async function loadCatalog() {
  catalogLoading.value = true
  try {
    const cat = await loadTargetTenantFqdnCatalog()
    localTenants.value = cat.localTenants
    targetFqdns.value = cat.fqdns
    targetLabels.value = cat.labels
    catalogAttempted.value = cat.catalogAttempted
    catalogOk.value = cat.catalogOk
  } catch {
    localTenants.value = []
    targetFqdns.value = []
    targetLabels.value = new Map()
    catalogAttempted.value = false
    catalogOk.value = false
  } finally {
    catalogLoading.value = false
  }
}

watch(cluster, () => {
  const self = callingTenantFqdn(localTenants.value, cluster.value)
  if (self && String(targetFqdn.value).toLowerCase() === self) {
    targetFqdn.value = ''
  }
})

function resetForm() {
  pkey.value = ''
  cluster.value = ''
  targetFqdn.value = ''
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
    { ...targetValidation, fieldId: 'target_fqdn' }
  ]
  if (!validateAll(validations)) {
    await nextTick()
    focusFirstError(validations, (id) => {
      if (id === 'pkey' && pkeyInput.value) return pkeyInput.value
      return document.getElementById(id)
    })
    return
  }

  const fqdn = String(targetFqdn.value).trim().toLowerCase()
  loading.value = true
  try {
    const body = {
      pkey: pkey.value.trim(),
      cluster: cluster.value.trim(),
      target_fqdn: fqdn,
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
      if (errors.target_fqdn) {
        targetValidation.touched.value = true
        targetValidation.error.value = Array.isArray(errors.target_fqdn)
          ? errors.target_fqdn[0]
          : errors.target_fqdn
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
  if (dialCohortFeatureOn()) {
    cohortFeatureBlocksCreate.value = true
    return
  }
  await ensureFetched()
  await loadCatalog()
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

    <section v-else-if="cohortFeatureBlocksCreate" class="create-blocked">
      <p role="status">
        Cross-tenant dial prefixes are managed by Site Groups. Create or edit membership in Fleet →
        Site Groups instead of inventing prefixes here.
      </p>
      <p class="create-blocked-actions">
        <router-link :to="{ name: 'fleet-site-groups' }" class="add-btn">Site Groups</router-link>
        <button type="button" class="secondary" @click="goBack">Back</button>
      </p>
    </section>

    <form v-else class="form create-form" @submit="onSubmit" @keydown="onKeydown">
      <p v-if="error" class="error" role="alert">{{ error }}</p>

      <div class="actions actions-top">
        <button type="submit" :disabled="loading || catalogLoading || emptyTargetList">
          {{ loading ? 'Creating…' : 'Create' }}
        </button>
        <button type="button" class="secondary" @click="goBack">Cancel</button>
      </div>

      <h2 class="detail-heading">Dial prefix</h2>
      <p class="create-hint">
        Prefix is only for the calling tenant. Target is another tenant from the known list (local
        and fleet catalog) — full FQDN, not freeform. Dial prefix + extension digits (e.g. 81 then
        1000 → 811000).
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
          :loading="catalogLoading"
          :error="clusterValidation.error.value"
          :touched="clusterValidation.touched.value"
          @blur="clusterValidation.onBlur"
        />

        <FormSelect
          id="target_fqdn"
          v-model="targetFqdn"
          label="Target tenant"
          help-pkey="dialprefix_target"
          :options="targetOptions"
          empty-text="Select target"
          required
          :loading="catalogLoading"
          :hint="catalogHint"
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
.create-blocked {
  margin-top: 1rem;
  max-width: 40rem;
  color: var(--color-muted, #64748b);
  font-size: 0.95rem;
  line-height: 1.45;
}
.create-blocked-actions {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  margin-top: 1rem;
}
.create-blocked-actions .add-btn {
  display: inline-block;
  padding: 0.5rem 1rem;
  font-size: 0.9375rem;
  font-weight: 500;
  color: #fff;
  background: #2563eb;
  border-radius: 0.375rem;
  text-decoration: none;
}
.create-blocked-actions .secondary {
  padding: 0.5rem 1rem;
  font-size: 0.9375rem;
  font-weight: 500;
  color: #64748b;
  background: transparent;
  border: 1px solid #e2e8f0;
  border-radius: 0.375rem;
  cursor: pointer;
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
