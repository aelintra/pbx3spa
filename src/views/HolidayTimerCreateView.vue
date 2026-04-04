<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { getApiClient } from '@/api/client'
import { useSchema } from '@/composables/useSchema'
import { useToastStore } from '@/stores/toast'
import { useFormValidation } from '@/composables/useFormValidation'
import { validateTenant } from '@/utils/validation'
import { normalizeList } from '@/utils/listResponse'
import { fieldErrors, firstErrorMessage } from '@/utils/formErrors'
import FormField from '@/components/forms/FormField.vue'
import FormSelect from '@/components/forms/FormSelect.vue'
import PanelBackLink from '@/components/PanelBackLink.vue'

const router = useRouter()
const toast = useToastStore()
const { ensureFetched, applySchemaDefaults } = useSchema()
const description = ref('')
const cluster = ref('default')
const tenants = ref([])
const tenantsLoading = ref(true)
const error = ref('')
const loading = ref(false)

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

onMounted(async () => {
  await ensureFetched()
  applySchemaDefaults('holidaytimers', {
    cluster,
    description
  })
  await loadTenants()
})

function resetForm() {
  description.value = ''
  cluster.value = 'default'
  clusterValidation.reset()
  error.value = ''
}

function goBack() {
  router.push({ name: 'holidaytimers' })
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

  if (!clusterValidation.validate()) {
    await nextTick()
    const el = document.getElementById('cluster')
    if (el) el.focus()
    return
  }

  loading.value = true
  try {
    const body = {
      description: description.value.trim() || null,
      cluster: cluster.value.trim()
    }
    await getApiClient().post('holidaytimers', body)
    toast.show('Holiday timer created')
    resetForm()
    await nextTick()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  } catch (err) {
    const errors = fieldErrors(err)
    if (errors) {
      if (errors.cluster) {
        clusterValidation.touched.value = true
        clusterValidation.error.value = Array.isArray(errors.cluster)
          ? errors.cluster[0]
          : errors.cluster
      }
      await nextTick()
      const el = document.getElementById('cluster')
      if (el) el.focus()
    }
    if (!errors) error.value = firstErrorMessage(err, 'Failed to create Holiday timer')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="create-view" @keydown="onKeydown">
    <PanelBackLink :to="{ name: 'holidaytimers' }" label="Holiday Timers">
      <h1>Create Holiday timer</h1>
    </PanelBackLink>

    <form class="form" @submit="onSubmit">
      <p v-if="error" id="holidaytimer-create-error" class="error" role="alert">{{ error }}</p>

      <div class="actions actions-top">
        <button type="submit" :disabled="loading || tenantsLoading">
          {{ loading ? 'Creating…' : 'Create' }}
        </button>
        <button type="button" class="secondary" @click="goBack">Cancel</button>
      </div>

      <h2 class="detail-heading">Holiday</h2>
      <div class="form-fields">
        <FormField
          id="description"
          v-model="description"
          label="Description"
          type="text"
          placeholder="e.g. Christmas"
          hint="Label for this holiday period."
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
          hint="The tenant this Holiday timer belongs to. Start and end date/time can be set after creation."
          @blur="clusterValidation.onBlur"
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
