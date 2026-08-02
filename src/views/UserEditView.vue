<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getApiClient } from '@/api/client'
import { useToastStore } from '@/stores/toast'
import { fieldErrors, firstErrorMessage } from '@/utils/formErrors'
import FormField from '@/components/forms/FormField.vue'
import ListLoadingState from '@/components/ListLoadingState.vue'
import PanelBackLink from '@/components/PanelBackLink.vue'
import { loadTenantOptions } from '@/utils/loadTenantOptions'

const route = useRoute()
const router = useRouter()
const toast = useToastStore()

const userId = computed(() => route.params.id)

const loading = ref(true)
const loadError = ref('')
const name = ref('')
const email = ref('')
const abilityAdmin = ref(false)
const abilityTenant = ref(false)
const abilityRecordings = ref(false)
const selectedClusters = ref([])
const tenants = ref([])

const saveError = ref('')
const saving = ref(false)

const newPassword = ref('')
const newPasswordConfirm = ref('')
const passwordError = ref('')
const resettingPassword = ref(false)

const showClusterPicker = computed(() => !abilityAdmin.value)

function normalizeAbilities(raw) {
  if (Array.isArray(raw)) return raw.map(String)
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed.map(String)
    } catch {
      /* plain ability string */
    }
    return raw ? [raw] : []
  }
  return []
}

function applyUser(user) {
  name.value = user.name ?? ''
  email.value = user.email ?? ''
  const ab = normalizeAbilities(user.abilities)
  abilityAdmin.value = ab.includes('admin')
  abilityTenant.value = ab.includes('tenant')
  abilityRecordings.value = ab.includes('recordings')
  const clusters = user.allowed_clusters
  selectedClusters.value = Array.isArray(clusters) ? clusters.map(String) : []
}

function buildAbilities() {
  if (abilityAdmin.value) return ['admin']
  const a = []
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

async function loadUser() {
  if (!userId.value) return
  loading.value = true
  loadError.value = ''
  saveError.value = ''
  passwordError.value = ''
  try {
    const response = await getApiClient().get(`auth/users/${encodeURIComponent(userId.value)}`)
    const row = Array.isArray(response) ? response[0] : response
    if (!row || row.id == null) {
      loadError.value = 'User not found'
      return
    }
    applyUser(row)
  } catch (err) {
    loadError.value = firstErrorMessage(err, 'Failed to load user')
  } finally {
    loading.value = false
  }
}

function toggleCluster(id) {
  const s = String(id)
  const i = selectedClusters.value.indexOf(s)
  if (i >= 0) selectedClusters.value.splice(i, 1)
  else selectedClusters.value.push(s)
}

async function onSaveProfile(e) {
  e.preventDefault()
  saveError.value = ''

  const abilities = buildAbilities()
  if (abilities.length === 0) {
    saveError.value = 'Select at least one ability (admin, tenant, and/or recordings)'
    return
  }

  if (!abilityAdmin.value && selectedClusters.value.length === 0) {
    saveError.value = 'Select at least one tenant (allowed clusters) for a non-admin user'
    return
  }

  saving.value = true
  try {
    const body = {
      name: name.value.trim(),
      email: email.value.trim(),
      abilities,
      allowed_clusters: abilityAdmin.value ? [] : selectedClusters.value,
      portable: !abilityAdmin.value
    }
    const updated = await getApiClient().put(`auth/users/${encodeURIComponent(userId.value)}`, body)
    if (updated?.tokens_revoked) {
      toast.show('User saved — sessions revoked (re-login required)')
    } else {
      toast.show('User saved')
    }
    if (updated && !Array.isArray(updated) && updated.id != null) {
      applyUser(updated)
    } else {
      await loadUser()
    }
  } catch (err) {
    const errors = fieldErrors(err)
    if (errors) {
      const first = Object.values(errors).flat()
      saveError.value = Array.isArray(first) ? first[0] : first
    } else {
      saveError.value = firstErrorMessage(err, 'Failed to save user')
    }
  } finally {
    saving.value = false
  }
}

async function onForcePassword(e) {
  e.preventDefault()
  passwordError.value = ''

  if (newPassword.value !== newPasswordConfirm.value) {
    passwordError.value = 'Password and confirmation do not match'
    return
  }
  if (newPassword.value.length < 8) {
    passwordError.value = 'Password must be at least 8 characters'
    return
  }

  resettingPassword.value = true
  try {
    await getApiClient().put(`auth/users/${encodeURIComponent(userId.value)}/password`, {
      password: newPassword.value,
      password_confirmation: newPasswordConfirm.value
    })
    toast.show('Password reset — all sessions revoked')
    newPassword.value = ''
    newPasswordConfirm.value = ''
  } catch (err) {
    const errors = fieldErrors(err)
    if (errors) {
      const first = Object.values(errors).flat()
      passwordError.value = Array.isArray(first) ? first[0] : first
    } else {
      passwordError.value = firstErrorMessage(err, 'Failed to reset password')
    }
  } finally {
    resettingPassword.value = false
  }
}

function goBack() {
  router.push({ name: 'users' })
}

watch(userId, loadUser)

onMounted(async () => {
  await loadTenants()
  await loadUser()
})
</script>

<template>
  <div class="edit-view">
    <PanelBackLink :to="{ name: 'users' }" label="Users" class="edit-header">
      <h1>Edit user</h1>
    </PanelBackLink>

    <ListLoadingState v-if="loading" message="Loading user…" />
    <p v-else-if="loadError" class="form-error">{{ loadError }}</p>

    <template v-else>
      <form class="edit-form" @submit="onSaveProfile">
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

        <p v-if="saveError" class="form-error">{{ saveError }}</p>

        <div class="form-actions">
          <button type="button" class="btn-cancel" @click="goBack">Cancel</button>
          <button type="submit" class="btn-submit" :disabled="saving">
            {{ saving ? 'Saving…' : 'Save' }}
          </button>
        </div>
      </form>

      <form class="edit-form password-form" @submit="onForcePassword">
        <section class="form-section">
          <h2 class="section-title">Force new password</h2>
          <p class="hint">Sets a new password and revokes all of this user’s sessions.</p>
          <FormField
            id="newPassword"
            v-model="newPassword"
            label="New password"
            type="password"
            required
            autocomplete="new-password"
          />
          <FormField
            id="newPasswordConfirm"
            v-model="newPasswordConfirm"
            label="Confirm new password"
            type="password"
            required
            autocomplete="new-password"
          />
        </section>

        <p v-if="passwordError" class="form-error">{{ passwordError }}</p>

        <div class="form-actions">
          <button type="submit" class="btn-submit" :disabled="resettingPassword">
            {{ resettingPassword ? 'Resetting…' : 'Reset password' }}
          </button>
        </div>
      </form>
    </template>
  </div>
</template>

<style scoped>
.edit-view {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 52rem;
}
.edit-header {
  margin: 0;
}
.edit-header h1 {
  margin: 0;
}
.edit-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}
.password-form {
  margin-top: 0.5rem;
  padding-top: 1.25rem;
  border-top: 1px solid #e2e8f0;
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
