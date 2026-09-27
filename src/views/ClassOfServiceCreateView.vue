<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { getApiClient } from '@/api/client'
import { useSchema } from '@/composables/useSchema'
import { useToastStore } from '@/stores/toast'
import { useFormValidation, validateAll, focusFirstError } from '@/composables/useFormValidation'
import { validateTenant, validateCosPkey } from '@/utils/validation'
import { loadTenantOptions } from '@/utils/loadTenantOptions'
import { fieldErrors, firstErrorMessage } from '@/utils/formErrors'
import FormField from '@/components/forms/FormField.vue'
import FormSelect from '@/components/forms/FormSelect.vue'
import FormToggle from '@/components/forms/FormToggle.vue'
import PanelBackLink from '@/components/PanelBackLink.vue'
import { useUnsavedForm } from '@/composables/useUnsavedForm'
import { refreshCommitStatusUi } from '@/utils/commitStatus'

const router = useRouter()
const toast = useToastStore()
const { ensureFetched, applySchemaDefaults } = useSchema()
const { markDirty, beginHydrate, markClean } = useUnsavedForm()
const cluster = ref('default')
const active = ref('YES')
const defaultopen = ref('NO')
const defaultclosed = ref('NO')
const orideopen = ref('NO')
const orideclosed = ref('NO')
const cname = ref('')
const pkey = ref('')
const description = ref('')
const dialplan = ref('')
const tenants = ref([])
const tenantsLoading = ref(true)
const error = ref('')
const loading = ref(false)

const clusterValidation = useFormValidation(cluster, validateTenant)
const pkeyValidation = useFormValidation(pkey, validateCosPkey)

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
  beginHydrate()
  await ensureFetched()
  applySchemaDefaults('cosrules', {
    cluster,
    active,
    defaultopen,
    defaultclosed,
    orideopen,
    orideclosed,
    cname,
    pkey,
    description,
    dialplan
  })
  await loadTenants()
  await markClean()
})

function resetForm() {
  cluster.value = 'default'
  active.value = 'YES'
  defaultopen.value = 'NO'
  defaultclosed.value = 'NO'
  orideopen.value = 'NO'
  orideclosed.value = 'NO'
  cname.value = ''
  pkey.value = ''
  description.value = ''
  dialplan.value = ''
  clusterValidation.reset()
  pkeyValidation.reset()
  error.value = ''
}

function goBack() {
  router.push({ name: 'cosrules' })
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
  if (!dialplan.value || !String(dialplan.value).trim()) {
    error.value = 'Dialplan is required'
    return
  }
  if (!validateAll(validations)) {
    await nextTick()
    focusFirstError(validations, (id) => document.getElementById(id))
    return
  }

  loading.value = true
  try {
    const body = {
      pkey: pkey.value.trim(),
      cluster: cluster.value.trim(),
      active: active.value,
      defaultopen: defaultopen.value,
      defaultclosed: defaultclosed.value,
      orideopen: orideopen.value,
      orideclosed: orideclosed.value,
      cname: cname.value.trim() || null,
      description: description.value.trim() || null,
      dialplan: dialplan.value.trim()
    }
    const created = await getApiClient().post('cosrules', body)
    const label =
      (created?.cname && String(created.cname).trim()) ||
      created?.pkey ||
      created?.shortuid ||
      'rule'
    toast.show(`Class of Service rule ${label} created`)
    refreshCommitStatusUi()
    beginHydrate()
    resetForm()
    await markClean()
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
      if (errors.dialplan) {
        error.value = Array.isArray(errors.dialplan) ? errors.dialplan[0] : errors.dialplan
      }
      await nextTick()
      focusFirstError(validations, (id) => document.getElementById(id))
    }
    if (!errors) error.value = firstErrorMessage(err, 'Failed to create Class of Service rule')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="create-view" @keydown="onKeydown" @input="markDirty" @change="markDirty">
    <PanelBackLink :to="{ name: 'cosrules' }" label="CoS rules">
      <h1>Create CoS rule</h1>
    </PanelBackLink>

    <form class="form" @submit="onSubmit">
      <p v-if="error" id="cos-create-error" class="error" role="alert">{{ error }}</p>

      <div class="actions actions-top">
        <button type="submit" :disabled="loading || tenantsLoading">
          {{ loading ? 'Creating…' : 'Create' }}
        </button>
        <button type="button" class="secondary" @click="goBack">Cancel</button>
      </div>

      <h2 class="detail-heading">Identity</h2>
      <div class="form-fields">
        <FormField
          id="pkey"
          v-model="pkey"
          label="Key"
          help-pkey="cosname"
          type="text"
          placeholder="Stable key (e.g. PREMIUM_0900, HR_UK070)"
          :error="pkeyValidation.error.value"
          :touched="pkeyValidation.touched.value"
          :required="true"
          @blur="pkeyValidation.onBlur"
        />
        <FormField
          id="cname"
          v-model="cname"
          label="Common name"
          type="text"
          placeholder="Display name (e.g. Block premium)"
        />
        <FormField
          id="description"
          v-model="description"
          label="Description"
          multiline
          :rows="4"
          placeholder="Short description"
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
          @blur="clusterValidation.onBlur"
        />
        <FormToggle
          id="active"
          v-model="active"
          label="Active"
          yes-value="YES"
          no-value="NO"
        />
        <FormField
          id="dialplan"
          v-model="dialplan"
          label="Dialplan"
          help-pkey="cosdialplan"
          multiline
          :rows="10"
          placeholder="Space-separated Asterisk patterns (required)"
          :required="true"
        />
        <p class="floor-heading">Tenant-wide</p>
        <p class="floor-lede">
          When ON, this rule is applied to every CoS profile at Commit (not only profiles that list
          it). Defaults OFF.
        </p>
        <div class="cos-toggle-grid">
          <FormToggle
            id="orideopen"
            v-model="orideopen"
            label="Standard"
            hint="Business hours — including Unrestricted profiles."
            help-pkey="orideopen"
            yes-value="YES"
            no-value="NO"
          />
          <FormToggle
            id="orideclosed"
            v-model="orideclosed"
            label="After-hours"
            hint="When the site is CLOSED."
            help-pkey="orideclosed"
            yes-value="YES"
            no-value="NO"
          />
        </div>
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
.floor-heading {
  font-size: 0.9375rem;
  font-weight: 600;
  color: #334155;
  margin: 1rem 0 0.25rem 0;
}
.floor-lede {
  margin: 0 0 0.5rem 0;
  color: #64748b;
  font-size: 0.8125rem;
}
.cos-toggle-grid {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  max-width: 32rem;
}
/* Fixed label column so Standard / After-hours pills share one vertical edge */
.cos-toggle-grid :deep(.form-field) {
  margin-bottom: 0.35rem;
  grid-template-columns: 7.5rem minmax(0, 1fr);
  align-items: center;
}
.cos-toggle-grid :deep(.form-field-label) {
  padding-top: 0;
}
.cos-toggle-grid :deep(.form-field-hint) {
  margin-top: 0.25rem;
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
