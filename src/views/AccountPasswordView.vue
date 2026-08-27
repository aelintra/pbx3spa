<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { getApiClient } from '@/api/client'
import { useToastStore } from '@/stores/toast'
import { useAuthStore } from '@/stores/auth'
import FormField from '@/components/forms/FormField.vue'

const router = useRouter()
const toast = useToastStore()
const auth = useAuthStore()

const currentPassword = ref('')
const password = ref('')
const passwordConfirm = ref('')
const error = ref('')
const loading = ref(false)

async function onSubmit(e) {
  e.preventDefault()
  error.value = ''
  if (password.value !== passwordConfirm.value) {
    error.value = 'Password and confirmation do not match'
    return
  }
  if (password.value.length < 8) {
    error.value = 'New password must be at least 8 characters'
    return
  }
  loading.value = true
  try {
    await getApiClient().put('auth/password', {
      current_password: currentPassword.value,
      password: password.value,
      password_confirmation: passwordConfirm.value
    })
    toast.show('Password updated')
    currentPassword.value = ''
    password.value = ''
    passwordConfirm.value = ''
    router.push({ name: 'dashboard' })
  } catch (err) {
    error.value =
      err.data?.message ||
      err.data?.current_password?.[0] ||
      err.data?.password?.[0] ||
      err.message ||
      'Failed to change password'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="account-view">
    <h1>Change password</h1>
    <p class="muted">Signed in as {{ auth.user?.email || '—' }}</p>
    <form class="form" @submit="onSubmit">
      <FormField
        id="currentPassword"
        v-model="currentPassword"
        label="Current password"
        type="password"
        required
        autocomplete="current-password"
        hide-help
      />
      <FormField
        id="password"
        v-model="password"
        label="New password"
        type="password"
        required
        autocomplete="new-password"
      />
      <FormField
        id="passwordConfirm"
        v-model="passwordConfirm"
        label="Confirm new password"
        type="password"
        required
        autocomplete="new-password"
        hide-help
      />
      <p v-if="error" class="form-error">{{ error }}</p>
      <div class="form-actions">
        <button type="button" class="btn-cancel" @click="router.push({ name: 'dashboard' })">
          Cancel
        </button>
        <button type="submit" class="btn-submit" :disabled="loading">
          {{ loading ? 'Saving…' : 'Update password' }}
        </button>
      </div>
    </form>
  </div>
</template>

<style scoped>
.account-view {
  max-width: 28rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.muted {
  margin: 0;
  color: #64748b;
  font-size: 0.9375rem;
}
.form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.form-error {
  color: #dc2626;
  margin: 0;
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
