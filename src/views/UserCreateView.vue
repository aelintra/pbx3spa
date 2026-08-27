<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { getApiClient } from '@/api/client'
import { useToastStore } from '@/stores/toast'
import { fieldErrors } from '@/utils/formErrors'
import FormField from '@/components/forms/FormField.vue'
import PanelBackLink from '@/components/PanelBackLink.vue'
import { loadTenantOptions } from '@/utils/loadTenantOptions'

const router = useRouter()
const toast = useToastStore()
const name = ref('')
const email = ref('')
const password = ref('')
const passwordConfirm = ref('')
const abilityAdmin = ref(false)
const abilityTenant = ref(true)
const abilityRecordings = ref(false)
const selectedClusters = ref([])
const tenants = ref([])
const error = ref('')
const loading = ref(false)

const showClusterPicker = computed(() => !abilityAdmin.value && abilityTenant.value)

function resetForm() {
  name.value = ''
  email.value = ''
  password.value = ''
  passwordConfirm.value = ''
  abilityAdmin.value = false
  abilityTenant.value = true
  abilityRecordings.value = false
  selectedClusters.value = []
  error.value = ''
}

function buildAbilities() {
  const a = []
  if (abilityAdmin.value) {
    a.push('admin')
    return a
  }
  if (abilityTenant.value) a.push('tenant')
  if (abilityRecordings.value) a.push('recordings')
  return a
}

async function loadTenants() {
  try {
    tenants.value = await loadTenantOptions()
  } catch {
    tenants.value = []
  }
}

async function onSubmit(e) {
  e.preventDefault()
  error.value = ''

  if (password.value !== passwordConfirm.value) {
    error.value = 'Password and confirmation do not match'
    return
  }

  if (password.value.length < 1) {
    error.value = 'Password is required'
    return
  }

  const abilities = buildAbilities()
  if (abilities.length === 0) {
    error.value = 'Select at least one ability (admin, tenant, and/or recordings)'
    return
  }

  if (!abilityAdmin.value && abilityTenant.value && selectedClusters.value.length === 0) {
    error.value = 'Select at least one tenant (allowed clusters) for a tenant user'
    return
  }

  loading.value = true
  try {
    const body = {
      name: name.value.trim(),
      email: email.value.trim(),
      password: password.value,
      abilities,
      allowed_clusters: abilityAdmin.value ? [] : selectedClusters.value,
      portable: !abilityAdmin.value
    }
    await getApiClient().post('auth/register', body)
    toast.show(`User ${email.value.trim()} created`)
    resetForm()
    router.push({ name: 'users' })
  } catch (err) {
    const errors = fieldErrors(err)
    if (errors) {
      const first = Object.values(errors).flat()
      error.value = Array.isArray(first) ? first[0] : first
    } else {
      error.value = err.data?.message || err.message || 'Failed to create user'
    }
  } finally {
    loading.value = false
  }
}

function goBack() {
  router.push({ name: 'users' })
}

function toggleCluster(id) {
  const s = String(id)
  const i = selectedClusters.value.indexOf(s)
  if (i >= 0) selectedClusters.value.splice(i, 1)
  else selectedClusters.value.push(s)
}

onMounted(() => {
  resetForm()
  loadTenants()
})
</script>

<template>
  <div class="create-view">
    <PanelBackLink :to="{ name: 'users' }" label="Users" class="create-header">
      <h1>Create user</h1>
    </PanelBackLink>

    <form class="create-form" @submit="onSubmit">
      <section class="form-section">
        <h2 class="section-title">Identity</h2>
        <FormField
          id="name"
          v-model="name"
          label="Name"
          required
          placeholder="Display name"
          autocomplete="name"
        />
        <FormField
          id="email"
          v-model="email"
          label="Email"
          type="email"
          required
          placeholder="user@example.com"
          autocomplete="email"
          hide-help
        />
      </section>

      <section class="form-section">
        <h2 class="section-title">Password</h2>
        <FormField
          id="password"
          v-model="password"
          label="Password"
          type="password"
          required
          placeholder="Password"
          autocomplete="new-password"
          hide-help
        />
        <FormField
          id="passwordConfirm"
          v-model="passwordConfirm"
          label="Confirm password"
          type="password"
          required
          placeholder="Confirm password"
          autocomplete="new-password"
          hide-help
        />
      </section>

      <section class="form-section">
        <h2 class="section-title">Abilities</h2>
        <div class="field-row">
          <input id="abilityAdmin" v-model="abilityAdmin" type="checkbox" />
          <label for="abilityAdmin">Admin (full instance — not portable with tenant)</label>
        </div>
        <div class="field-row">
          <input
            id="abilityTenant"
            v-model="abilityTenant"
            type="checkbox"
            :disabled="abilityAdmin"
          />
          <label for="abilityTenant">Tenant (day-to-day panels + Commit)</label>
        </div>
        <div class="field-row">
          <input
            id="abilityRecordings"
            v-model="abilityRecordings"
            type="checkbox"
            :disabled="abilityAdmin"
          />
          <label for="abilityRecordings">Recordings (listen / download)</label>
        </div>
      </section>

      <section v-if="showClusterPicker" class="form-section">
        <h2 class="section-title">Allowed tenants</h2>
        <p class="hint">Customer users are scoped to these clusters and should move with the tenant.</p>
        <div v-if="!tenants.length" class="hint">No tenants loaded.</div>
        <div v-for="t in tenants" :key="t.shortuid || t.pkey || t.id" class="field-row">
          <input
            :id="'cluster-' + (t.shortuid || t.pkey)"
            type="checkbox"
            :checked="selectedClusters.includes(String(t.shortuid || t.pkey))"
            @change="toggleCluster(t.shortuid || t.pkey)"
          />
          <label :for="'cluster-' + (t.shortuid || t.pkey)">
            {{ t.pkey || t.name || t.shortuid }}
            <span v-if="t.shortuid" class="muted">({{ t.shortuid }})</span>
          </label>
        </div>
      </section>

      <p v-if="error" class="form-error">{{ error }}</p>

      <div class="form-actions">
        <button type="button" class="btn-cancel" @click="goBack">Cancel</button>
        <button type="submit" class="btn-submit" :disabled="loading">
          {{ loading ? 'Creating…' : 'Create' }}
        </button>
      </div>
    </form>
  </div>
</template>

<style scoped>
.create-view {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 52rem;
}
.create-header {
  margin: 0;
}
.create-header h1 {
  margin: 0;
}
.create-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}
.form-section {
  margin: 0;
}
.section-title {
  font-size: 1rem;
  font-weight: 600;
  margin: 0 0 0.75rem 0;
  color: #0f172a;
}
.hint {
  margin: 0 0 0.75rem;
  font-size: 0.875rem;
  color: #64748b;
}
.muted {
  color: #94a3b8;
  font-size: 0.8125rem;
}
.field-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.35rem;
}
.field-row input[type='checkbox'] {
  width: 1rem;
  height: 1rem;
}
.field-row label {
  font-size: 0.9375rem;
}
.form-error {
  margin: 0;
  color: #dc2626;
  font-size: 0.9375rem;
}
.form-actions {
  display: flex;
  gap: 0.75rem;
  margin-top: 0.5rem;
}
.btn-cancel,
.btn-submit {
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  font-size: 0.9375rem;
  cursor: pointer;
}
.btn-cancel {
  border: 1px solid #cbd5e1;
  background: #fff;
  color: #334155;
}
.btn-submit {
  border: none;
  background: #2563eb;
  color: #fff;
}
.btn-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
