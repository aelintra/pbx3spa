<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { getApiClient } from '@/api/client'
import { useToastStore } from '@/stores/toast'
import { useFormValidation } from '@/composables/useFormValidation'
import { validateTenant } from '@/utils/validation'
import { normalizeList } from '@/utils/listResponse'
import { loadTenantOptions } from '@/utils/loadTenantOptions'
import { fieldErrors, firstErrorMessage } from '@/utils/formErrors'
import FormField from '@/components/forms/FormField.vue'
import FormSelect from '@/components/forms/FormSelect.vue'
import FieldHelpIcon from '@/components/FieldHelpIcon.vue'
import PanelBackLink from '@/components/PanelBackLink.vue'
import { ROUTE_PROFILE_DESTINATIONS_HELP } from '@/constants/helpPkeys'

const router = useRouter()
const toast = useToastStore()
const name = ref('')
const cluster = ref('default')
const description = ref('')
const openDest = ref('')
const closedDest = ref('')
const tenants = ref([])
const destinations = ref(null)
const routes = ref([])
const destinationsLoading = ref(false)
const tenantsLoading = ref(true)
const error = ref('')
const loading = ref(false)
const openError = ref('')
const openTouched = ref(false)

const clusterValidation = useFormValidation(cluster, validateTenant)

const tenantOptions = computed(() => {
  const list = tenants.value.map((t) => t.pkey).filter(Boolean)
  return [...new Set(list)].sort((a, b) => String(a).localeCompare(String(b)))
})

const tenantOptionsForSelect = computed(() => {
  const list = tenantOptions.value
  const cur = cluster.value
  if (cur && !list.includes(cur))
    return [cur, ...list].sort((a, b) => String(a).localeCompare(String(b)))
  return list
})

function toDestArrays(d) {
  if (!d || typeof d !== 'object') return {}
  return {
    Queues: Array.isArray(d.Queues) ? d.Queues : Array.isArray(d.queues) ? d.queues : [],
    Extensions: Array.isArray(d.Extensions)
      ? d.Extensions
      : Array.isArray(d.extensions)
        ? d.extensions
        : [],
    IVRs: Array.isArray(d.IVRs) ? d.IVRs : Array.isArray(d.ivrs) ? d.ivrs : [],
    CustomApps: Array.isArray(d.CustomApps)
      ? d.CustomApps
      : Array.isArray(d.customApps)
        ? d.customApps
        : []
  }
}

const destinationGroups = computed(() => {
  const d = destinations.value
  const clusterVal = cluster.value
  const routeList = routes.value || []
  const routesForCluster = clusterVal
    ? routeList
        .filter((r) => (r.cluster ?? r.tenant_pkey ?? '') === clusterVal)
        .map((r) => r.pkey)
        .filter(Boolean)
    : []
  const base = toDestArrays(d)
  return {
    ...base,
    Routes: [...new Set(routesForCluster)].sort((a, b) => String(a).localeCompare(String(b)))
  }
})

const destPickOptions = computed(() => ['', 'Operator'])

function isNoneDest(v) {
  const t = String(v ?? '').trim()
  return !t || t.toLowerCase() === 'none'
}

function validateOpen() {
  openTouched.value = true
  if (isNoneDest(openDest.value)) {
    openError.value = 'Open destination is required'
    return false
  }
  openError.value = ''
  return true
}

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
    const destBody =
      destResponse && typeof destResponse === 'object' ? (destResponse.data ?? destResponse) : null
    destinations.value = destBody && typeof destBody === 'object' ? destBody : null
    routes.value = normalizeList(routeResponse, 'routes')
  } catch {
    destinations.value = null
    routes.value = []
  } finally {
    destinationsLoading.value = false
  }
}

watch(cluster, () => {
  openDest.value = ''
  closedDest.value = ''
  loadDestinations()
})

watch(openDest, (v) => {
  if (!isNoneDest(v) && isNoneDest(closedDest.value)) {
    closedDest.value = v
  }
  if (openTouched.value) validateOpen()
})

onMounted(async () => {
  await loadTenants()
  await loadDestinations()
})

function goBack() {
  router.push({ name: 'routeprofiles' })
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
  if (!clusterValidation.validate()) return
  if (!name.value.trim()) {
    error.value = 'Name is required'
    return
  }
  if (!validateOpen()) return
  loading.value = true
  try {
    const open = openDest.value.trim()
    const closed = isNoneDest(closedDest.value) ? open : closedDest.value.trim()
    const body = {
      name: name.value.trim(),
      cluster: cluster.value.trim(),
      default_mode: 'open',
      description: description.value.trim() || null,
      lines: [
        { mode: 'open', destination: open },
        { mode: 'closed', destination: closed }
      ]
    }
    const created = await getApiClient().post('routeprofiles', body)
    toast.show('Route profile created')
    const su = created?.shortuid
    if (su) {
      router.push({ name: 'routeprofile-detail', params: { shortuid: su } })
    } else {
      router.push({ name: 'routeprofiles' })
    }
  } catch (err) {
    const errors = fieldErrors(err)
    error.value = firstErrorMessage(err, 'Failed to create Route profile')
    if (errors?.cluster) {
      clusterValidation.touched.value = true
      clusterValidation.error.value = Array.isArray(errors.cluster)
        ? errors.cluster[0]
        : errors.cluster
    }
    if (errors?.lines || errors?.['lines.0.destination']) {
      openTouched.value = true
      openError.value = Array.isArray(errors.lines) ? errors.lines[0] : errors.lines || openError.value
    }
    await nextTick()
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="create-view" @keydown="onKeydown">
    <PanelBackLink :to="{ name: 'routeprofiles' }" label="Route Profiles">
      <h1>Create Route profile</h1>
    </PanelBackLink>

    <form class="form" @submit="onSubmit">
      <p v-if="error" class="error" role="alert">{{ error }}</p>
      <div class="actions actions-top">
        <button type="submit" :disabled="loading || tenantsLoading">
          {{ loading ? 'Creating…' : 'Create' }}
        </button>
        <button type="button" class="secondary" @click="goBack">Cancel</button>
      </div>

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
          @blur="clusterValidation.onBlur"
        />
        <FormField
          id="name"
          v-model="name"
          label="Name"
          type="text"
          :required="true"
          placeholder="e.g. Main DID"
        />
        <FormField
          id="description"
          v-model="description"
          label="Description (optional)"
          type="text"
        />
        <h2 class="detail-heading detail-heading-with-help">
          <span>Destinations</span>
          <FieldHelpIcon :pkey="ROUTE_PROFILE_DESTINATIONS_HELP" />
        </h2>
        <FormSelect
          id="open-dest"
          v-model="openDest"
          label="Open destination"
          :options="destPickOptions"
          :option-groups="destinationGroups"
          :loading="destinationsLoading"
          :required="true"
          :error="openError"
          :touched="openTouched"
          hide-help
          @blur="validateOpen"
        />
        <FormSelect
          id="closed-dest"
          v-model="closedDest"
          label="Closed destination"
          :options="destPickOptions"
          :option-groups="destinationGroups"
          :loading="destinationsLoading"
          hide-help
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
  max-width: 40rem;
}
.form {
  margin-top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.form-fields {
  display: flex;
  flex-direction: column;
  gap: 0;
}
.detail-heading {
  margin: 0.75rem 0 0;
  font-size: 1rem;
}
.detail-heading-with-help {
  display: flex;
  align-items: center;
  gap: 0.35rem;
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
</style>
