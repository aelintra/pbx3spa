<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { getApiClient } from '@/api/client'
import { useToastStore } from '@/stores/toast'
import { useFormValidation } from '@/composables/useFormValidation'
import { validateTenant } from '@/utils/validation'
import { loadTenantOptions } from '@/utils/loadTenantOptions'
import { fieldErrors, firstErrorMessage } from '@/utils/formErrors'
import FormField from '@/components/forms/FormField.vue'
import FormSelect from '@/components/forms/FormSelect.vue'
import PanelBackLink from '@/components/PanelBackLink.vue'

const router = useRouter()
const toast = useToastStore()
const name = ref('')
const cluster = ref('default')
const description = ref('')
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

onMounted(loadTenants)

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
  loading.value = true
  try {
    const body = {
      name: name.value.trim(),
      cluster: cluster.value.trim(),
      // Hidden in SPA: axiomatic open on profile miss (revisit later if needed).
      default_mode: 'open',
      description: description.value.trim() || null,
      lines: [
        { mode: 'open', destination: 'None' },
        { mode: 'closed', destination: 'None' }
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
      <h2 class="detail-heading">Profile</h2>
      <div class="form-fields">
        <FormField id="name" v-model="name" label="Name" type="text" required placeholder="e.g. Standard day" />
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
        <FormField id="description" v-model="description" label="Description" type="text" />
      </div>
      <p class="hint">Open and closed lines are created with destination None — edit them after create.</p>
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
.form-fields {
  display: grid;
  gap: 0.75rem;
  max-width: 28rem;
}
.detail-heading {
  margin: 0.5rem 0 0;
  font-size: 1rem;
}
.actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
}
.actions button,
.secondary {
  padding: 0.4rem 0.85rem;
  border-radius: 0.35rem;
  border: 1px solid var(--color-border, #ccc);
  cursor: pointer;
  font: inherit;
}
.actions button[type='submit'] {
  background: var(--color-accent, #2563eb);
  color: #fff;
  border-color: transparent;
}
.secondary {
  background: transparent;
}
.error {
  color: var(--color-danger, #b91c1c);
}
.hint {
  font-size: 0.85rem;
  opacity: 0.8;
  margin: 0;
}
</style>
