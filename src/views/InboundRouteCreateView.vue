<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { getApiClient } from '@/api/client'
import { useSchema } from '@/composables/useSchema'
import { useToastStore } from '@/stores/toast'
import { useFormValidation, validateAll, focusFirstError } from '@/composables/useFormValidation'
import { validateInboundRoutePkey, validateTenant, validateInboundCarrier } from '@/utils/validation'
import { normalizeList } from '@/utils/listResponse'
import { fieldErrors, firstErrorMessage } from '@/utils/formErrors'
import FormField from '@/components/forms/FormField.vue'
import FormSelect from '@/components/forms/FormSelect.vue'
import FormSegmentedPill from '@/components/forms/FormSegmentedPill.vue'

const router = useRouter()
const toast = useToastStore()
const { ensureFetched, applySchemaDefaults } = useSchema()
const cluster = ref('')
const carrier = ref('')
const pkey = ref('')
const trunkname = ref('')
const openroute = ref('None')
const closeroute = ref('None')
const tenants = ref([])
const destinations = ref(null)
const routes = ref([])
const destinationsLoading = ref(false)
const error = ref('')
const loading = ref(false)
const tenantsLoading = ref(true)
const pkeyInput = ref(null)

const pkeyValidation = useFormValidation(pkey, validateInboundRoutePkey)
const clusterValidation = useFormValidation(cluster, validateTenant)
const carrierValidation = useFormValidation(carrier, validateInboundCarrier)

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

/** Normalize destinations API response (handles both { Queues: [] } and { queues: [] } shapes). */
function toDestArrays(d) {
  if (!d || typeof d !== 'object') return {}
  return {
    Queues: Array.isArray(d.Queues) ? d.Queues : (Array.isArray(d.queues) ? d.queues : []),
    Extensions: Array.isArray(d.Extensions) ? d.Extensions : (Array.isArray(d.extensions) ? d.extensions : []),
    IVRs: Array.isArray(d.IVRs) ? d.IVRs : (Array.isArray(d.ivrs) ? d.ivrs : []),
    CustomApps: Array.isArray(d.CustomApps) ? d.CustomApps : (Array.isArray(d.customApps) ? d.customApps : [])
  }
}

const destinationGroups = computed(() => {
  const d = destinations.value
  const clusterVal = cluster.value
  const routeList = routes.value || []
  const routesForCluster = clusterVal
    ? routeList.filter((r) => (r.cluster ?? r.tenant_pkey ?? '') === clusterVal).map((r) => r.pkey).filter(Boolean)
    : []
  const base = toDestArrays(d)
  return {
    ...base,
    Routes: [...new Set(routesForCluster)].sort((a, b) => String(a).localeCompare(String(b)))
  }
})

const openrouteOptions = computed(() => ['None', 'Operator'])
const closerouteOptions = computed(() => ['None', 'Operator'])

async function loadTenants() {
  tenantsLoading.value = true
  try {
    const response = await getApiClient().get('tenants')
    tenants.value = normalizeList(response, 'tenants')
    if (tenants.value.length && !cluster.value) {
      const first = tenants.value.find((t) => t.pkey)?.pkey
      if (first) cluster.value = first
    }
  } catch {
    tenants.value = []
  } finally {
    tenantsLoading.value = false
  }
}

async function loadDestinations() {
  const c = cluster.value
  if (!c) {
    destinations.value = null
    routes.value = []
    return
  }
  destinationsLoading.value = true
  try {
    const [destResponse, routeResponse] = await Promise.all([
      getApiClient().get('destinations', { params: { cluster: c } }),
      getApiClient().get('routes')
    ])
    const destBody = destResponse && typeof destResponse === 'object' ? (destResponse.data ?? destResponse) : null
    destinations.value = destBody && typeof destBody === 'object' ? destBody : null
    routes.value = normalizeList(routeResponse, 'routes')
  } catch {
    destinations.value = null
    routes.value = []
  } finally {
    destinationsLoading.value = false
  }
}

function resetForm() {
  cluster.value = ''
  carrier.value = ''
  pkey.value = ''
  trunkname.value = ''
  openroute.value = 'None'
  closeroute.value = 'None'
  pkeyValidation.reset()
  clusterValidation.reset()
  carrierValidation.reset()
  error.value = ''
  loadDestinations()
}

watch(cluster, () => {
  loadDestinations()
  openroute.value = 'None'
  closeroute.value = 'None'
})

onMounted(async () => {
  await ensureFetched()
  applySchemaDefaults('inroutes', { cluster })
  await loadTenants()
})

async function onSubmit(e) {
  e.preventDefault()
  error.value = ''
  const validations = [
    { ...clusterValidation, fieldId: 'cluster' },
    { ...carrierValidation, fieldId: 'carrier' },
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
      cluster: cluster.value.trim(),
      carrier: carrier.value.trim(),
      trunkname: trunkname.value.trim() || undefined,
      openroute: openroute.value && openroute.value !== 'None' ? openroute.value : undefined,
      closeroute: closeroute.value && closeroute.value !== 'None' ? closeroute.value : undefined
    }
    await getApiClient().post('inboundroutes', body)
    toast.show(`Inbound route ${pkey.value.trim()} created`)
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
      if (errors.carrier) {
        carrierValidation.touched.value = true
        carrierValidation.error.value = Array.isArray(errors.carrier) ? errors.carrier[0] : errors.carrier
      }
      await nextTick()
      focusFirstError(
        [
          { ...clusterValidation, fieldId: 'cluster' },
          { ...carrierValidation, fieldId: 'carrier' },
          { ...pkeyValidation, fieldId: 'pkey' }
        ],
        (id) => (id === 'pkey' && pkeyInput.value ? pkeyInput.value : document.getElementById(id))
      )
    }
    error.value = firstErrorMessage(err, 'Failed to create inbound route')
  } finally {
    loading.value = false
  }
}

function goBack() {
  window.location.replace(router.resolve({ name: 'inbound-routes' }).href)
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
    <h1>Create inbound route</h1>

    <form class="form" @submit="onSubmit">
      <p v-if="error" id="inbound-route-create-error" class="error" role="alert">{{ error }}</p>

      <div class="actions actions-top">
        <button type="submit" :disabled="loading || tenantsLoading || carriersLoading">
          {{ loading ? 'Creating…' : 'Create' }}
        </button>
        <button type="button" class="secondary" @click="goBack">Cancel</button>
      </div>

      <h2 class="detail-heading">Identity</h2>
      <div class="form-fields">
        <FormSelect
          id="cluster"
          v-model="cluster"
          label="Tenant"
          :options="tenantOptionsForSelect"
          :error="clusterValidation.error.value"
          :touched="clusterValidation.touched.value"
          :required="true"
          :loading="tenantsLoading"
          hint="The tenant this inbound route belongs to."
          @blur="clusterValidation.onBlur"
        />
        <FormSegmentedPill
          id="carrier"
          v-model="carrier"
          label="DDI type"
          :options="['DiD', 'CLID']"
          :error="carrierValidation.error.value"
          :touched="carrierValidation.touched.value"
          :required="true"
          hint="DiD or CLID."
          aria-label="Choose type"
          @blur="carrierValidation.onBlur"
        />
        <FormField
          id="pkey"
          ref="pkeyInput"
          v-model="pkey"
          label="Number (DiD/CLiD)"
          type="text"
          placeholder="e.g. 0123456789 or _2XXX"
          :error="pkeyValidation.error.value"
          :touched="pkeyValidation.touched.value"
          :required="true"
          hint="Digits, pattern _XZN.! (e.g. _2XXX), or special s/i/t. Cannot be single 0."
          @blur="pkeyValidation.onBlur"
        />
        <FormField
          id="trunkname"
          v-model="trunkname"
          label="Name (optional)"
          type="text"
          placeholder="Defaults to number"
        />
      </div>

      <h2 class="detail-heading">Destinations</h2>
      <div class="form-fields">
        <FormSelect
          id="openroute"
          v-model="openroute"
          label="Open route"
          :options="openrouteOptions"
          :option-groups="destinationGroups"
          :loading="destinationsLoading"
          hint="Destination when line is open."
        />
        <FormSelect
          id="closeroute"
          v-model="closeroute"
          label="Closed route"
          :options="closerouteOptions"
          :option-groups="destinationGroups"
          hint="Destination when line is closed."
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
