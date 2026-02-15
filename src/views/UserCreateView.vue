<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getApiClient } from '@/api/client'
import { useToastStore } from '@/stores/toast'
import { fieldErrors } from '@/utils/formErrors'
import FormField from '@/components/forms/FormField.vue'

const router = useRouter()
const toast = useToastStore()
const name = ref('')
const email = ref('')
const password = ref('')
const passwordConfirm = ref('')
const abilityAdmin = ref(false)
const error = ref('')
const loading = ref(false)

function resetForm() {
  name.value = ''
  email.value = ''
  password.value = ''
  passwordConfirm.value = ''
  abilityAdmin.value = false
  error.value = ''
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

  loading.value = true
  try {
    const body = {
      name: name.value.trim(),
      email: email.value.trim(),
      password: password.value,
      abilities: abilityAdmin.value ? ['admin'] : []
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

onMounted(() => {
  resetForm()
})
</script>

<template>
  <div class="create-view">
    <header class="create-header">
      <h1>Create user</h1>
      <p class="back-link">
        <router-link :to="{ name: 'users' }">← Back to Users</router-link>
      </p>
    </header>

    <form class="create-form" @submit="onSubmit">
      <section class="form-section">
        <h2 class="section-title">Identity</h2>
        <FormField label="Name" required>
          <input
            id="name"
            v-model="name"
            type="text"
            required
            placeholder="Display name"
            autocomplete="name"
          />
        </FormField>
        <FormField label="Email" required>
          <input
            id="email"
            v-model="email"
            type="email"
            required
            placeholder="user@example.com"
            autocomplete="email"
          />
        </FormField>
      </section>

      <section class="form-section">
        <h2 class="section-title">Password</h2>
        <FormField label="Password" required>
          <input
            id="password"
            v-model="password"
            type="password"
            required
            placeholder="Password"
            autocomplete="new-password"
          />
        </FormField>
        <FormField label="Confirm password" required>
          <input
            id="passwordConfirm"
            v-model="passwordConfirm"
            type="password"
            required
            placeholder="Confirm password"
            autocomplete="new-password"
          />
        </FormField>
      </section>

      <section class="form-section">
        <h2 class="section-title">Abilities</h2>
        <div class="field-row">
          <input
            id="abilityAdmin"
            v-model="abilityAdmin"
            type="checkbox"
          />
          <label for="abilityAdmin">Admin (full access)</label>
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
}
.create-header {
  margin: 0;
}
.create-header h1 {
  margin: 0;
}
.back-link {
  margin: 0.25rem 0 0 0;
  font-size: 0.9375rem;
}
.back-link a {
  color: #2563eb;
  text-decoration: none;
}
.back-link a:hover {
  text-decoration: underline;
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
.field-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.field-row input[type="checkbox"] {
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
.btn-cancel {
  padding: 0.5rem 1rem;
  font-size: 0.9375rem;
  color: #64748b;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  border-radius: 0.375rem;
  cursor: pointer;
}
.btn-cancel:hover {
  background: #e2e8f0;
}
.btn-submit {
  padding: 0.5rem 1rem;
  font-size: 0.9375rem;
  font-weight: 500;
  color: #fff;
  background: #2563eb;
  border: none;
  border-radius: 0.375rem;
  cursor: pointer;
}
.btn-submit:hover:not(:disabled) {
  background: #1d4ed8;
}
.btn-submit:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
</style>
