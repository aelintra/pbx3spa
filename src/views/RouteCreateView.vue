<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { getApiClient } from '@/api/client'
import { useSchema } from '@/composables/useSchema'
import { useToastStore } from '@/stores/toast'
import { useFormValidation, validateAll, focusFirstError } from '@/composables/useFormValidation'
import { validateRoutePkey, validateTenant, validateDialplan } from '@/utils/validation'
import { normalizeList } from '@/utils/listResponse'
import { fieldErrors, firstErrorMessage } from '@/utils/formErrors'
import FormField from '@/components/forms/FormField.vue'
import FormSelect from '@/components/forms/FormSelect.vue'
import FormSegmentedPill from '@/components/forms/FormSegmentedPill.vue'
import FormToggle from '@/components/forms/FormToggle.vue'

const router = useRouter()
const toast = useToastStore()
const { ensureFetched, applySchemaDefaults } = useSchema()
const pkey = ref('')
const cluster = ref('default')
const desc = ref('')
const cname = ref('')
const active = ref('YES')
const auth = ref('NO')
const dialplan = ref('')
const path1 = ref('None')
const path2 = ref('None')
const path3 = ref('None')
const path4 = ref('None')
const strategy = ref('hunt')
const error = ref('')
const loading = ref(false)
const tenants = ref([])
const trunks = ref([])
const tenantsLoading = ref(true)
const trunksLoading = ref(true)
const pkeyInput = ref(null)

const pkeyValidation = useFormValidation(pkey, validateRoutePkey)
const clusterValidation = useFormValidation(cluster, validateTenant)
const dialplanValidation = useFormValidation(dialplan, validateDialplan)

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

const trunkPkeys = computed(() => {
  const list = trunks.value.map((t) => t.pkey).filter(Boolean)
  return [...new Set(list)].sort((a, b) => String(a).localeCompare(String(b)))
})

const pathOptions = computed(() => ['None', ...trunkPkeys.value])

async function loadTenants() {
  tenantsLoading.value = true
  try {
    const response = await getApiClient().get('tenants')
    tenants.value = normalizeList(response, 'tenants')
  } catch {
    tenants.value = []
  } finally {
    tenantsLoading.value = false
  }
}

async function loadTrunks() {
  trunksLoading.value = true
  try {
    const response = await getApiClient().get('trunks')
    trunks.value = normalizeList(response, 'trunks') || normalizeList(response)
  } catch {
    trunks.value = []
  } finally {
    trunksLoading.value = false
  }
}

function resetForm() {
  pkey.value = ''
  cluster.value = 'default'
  desc.value = ''
  cname.value = ''
  active.value = 'YES'
  auth.value = 'NO'
  dialplan.value = ''
  path1.value = 'None'
  path2.value = 'None'
  path3.value = 'None'
  path4.value = 'None'
  strategy.value = 'hunt'
  pkeyValidation.reset()
  clusterValidation.reset()
  dialplanValidation.reset()
  error.value = ''
}

async function onSubmit(e) {
  e.preventDefault()
  error.value = ''
  const validations = [
    { ...pkeyValidation, fieldId: 'pkey' },
    { ...clusterValidation, fieldId: 'cluster' },
    { ...dialplanValidation, fieldId: 'dialplan' }
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
      auth: auth.value,
      dialplan: dialplan.value.trim(),
      strategy: strategy.value
    }
    if (desc.value.trim()) body.description = desc.value.trim()
    if (cname.value.trim()) body.cname = cname.value.trim()
    if (path1.value && path1.value !== 'None') body.path1 = path1.value.trim()
    if (path2.value && path2.value !== 'None') body.path2 = path2.value.trim()
    if (path3.value && path3.value !== 'None') body.path3 = path3.value.trim()
    if (path4.value && path4.value !== 'None') body.path4 = path4.value.trim()
    await getApiClient().post('routes', body)
    toast.show(`Route ${pkey.value.trim()} created`)
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
      if (errors.dialplan) {
        dialplanValidation.touched.value = true
        dialplanValidation.error.value = Array.isArray(errors.dialplan) ? errors.dialplan[0] : errors.dialplan
      }
      await nextTick()
      focusFirstError(
        [
          { ...pkeyValidation, fieldId: 'pkey' },
          { ...clusterValidation, fieldId: 'cluster' },
          { ...dialplanValidation, fieldId: 'dialplan' }
        ],
        (id) => (id === 'pkey' && pkeyInput.value ? pkeyInput.value : document.getElementById(id))
      )
    }
    error.value = firstErrorMessage(err, 'Failed to create route')
  } finally {
    loading.value = false
  }
}

function goBack() {
  window.location.replace(router.resolve({ name: 'routes' }).href)
}

function onKeydown(e) {
  if (e.key === 'Escape') {
    e.preventDefault()
    goBack()
  }
}

onMounted(async () => {
  await ensureFetched()
  applySchemaDefaults('routes', { cluster, desc, active, auth, strategy })
  await loadTenants()
  await loadTrunks()
})
</script>

<template>
  <div class="create-view" @keydown="onKeydown">
    <h1>Create route</h1>

    <form class="form" @submit="onSubmit">
      <p v-if="error" id="route-create-error" class="error" role="alert">{{ error }}</p>

      <div class="actions actions-top">
        <button type="submit" :disabled="loading || tenantsLoading || trunksLoading">
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
          label="Route name"
          type="text"
          placeholder="e.g. sales-ring"
          :error="pkeyValidation.error.value"
          :touched="pkeyValidation.touched.value"
          :required="true"
          hint="Unique identifier for this route (ring group)."
          @blur="pkeyValidation.onBlur"
        />
        <FormField
          id="desc"
          v-model="desc"
          label="Description"
          type="text"
          placeholder="Freeform description"
        />
        <FormField
          id="cname"
          v-model="cname"
          label="Common name"
          type="text"
          placeholder="Display name"
        />
      </div>

      <h2 class="detail-heading">Settings</h2>
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
          hint="The tenant this route belongs to."
          @blur="clusterValidation.onBlur"
        />
        <FormToggle
          id="active"
          v-model="active"
          label="Active"
          yes-value="YES"
          no-value="NO"
          hint="If off, the route will not be available."
        />
        <FormToggle
          id="auth"
          v-model="auth"
          label="Auth (PIN dial)"
          yes-value="YES"
          no-value="NO"
          hint="Require PIN for dialing."
        />
        <FormSegmentedPill
          id="strategy"
          v-model="strategy"
          label="Strategy"
          :options="['hunt', 'balance']"
          hint="Ring order: hunt = sequential, balance = round-robin."
        />
      </div>

      <h2 class="detail-heading">Dialplan</h2>
      <div class="form-fields">
        <FormField
          id="dialplan"
          v-model="dialplan"
          label="Dialplan"
          type="text"
          placeholder="_XXXXXX"
          :error="dialplanValidation.error.value"
          :touched="dialplanValidation.touched.value"
          :required="true"
          hint="Required. Example: _XXXXXX for 6-digit extension matching."
          @blur="dialplanValidation.onBlur"
        />
      </div>

      <h2 class="detail-heading">Paths (trunks)</h2>
      <div class="form-fields">
        <FormSelect
          id="path1"
          v-model="path1"
          label="Path 1"
          :options="pathOptions"
        />
        <FormSelect
          id="path2"
          v-model="path2"
          label="Path 2"
          :options="pathOptions"
        />
        <FormSelect
          id="path3"
          v-model="path3"
          label="Path 3"
          :options="pathOptions"
        />
        <FormSelect
          id="path4"
          v-model="path4"
          label="Path 4"
          :options="pathOptions"
        />
      </div>

      <div class="actions">
        <button type="submit" :disabled="loading || tenantsLoading || trunksLoading">
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
