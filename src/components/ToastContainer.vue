<script setup>
import { storeToRefs } from 'pinia'
import { useToastStore } from '@/stores/toast'

const toastStore = useToastStore()
const { toasts } = storeToRefs(toastStore)
</script>

<template>
  <div class="toast-container" aria-live="polite" aria-label="Notifications">
    <div
      v-for="t in toasts"
      :key="t.id"
      class="toast"
      :class="'toast-' + t.variant"
      role="status"
    >
      <span class="toast-message">{{ t.message }}</span>
      <button
        type="button"
        class="toast-dismiss"
        aria-label="Dismiss"
        @click="toastStore.dismiss(t.id)"
      >
        ×
      </button>
    </div>
  </div>
</template>

<style scoped>
.toast-container {
  position: fixed;
  bottom: 1.5rem;
  right: 1.5rem;
  z-index: 1100;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-width: 24rem;
  pointer-events: none;
}
.toast-container > * {
  pointer-events: auto;
}
.toast {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  font-size: 0.9375rem;
  background: white;
  border-left: 4px solid #22c55e;
}
.toast-success {
  border-left-color: #22c55e;
}
.toast-error {
  border-left-color: #dc2626;
}
.toast-message {
  flex: 1;
}
.toast-dismiss {
  flex-shrink: 0;
  padding: 0.25rem;
  font-size: 1.25rem;
  line-height: 1;
  color: #64748b;
  background: none;
  border: none;
  cursor: pointer;
  border-radius: 0.25rem;
}
.toast-dismiss:hover {
  color: #0f172a;
  background: #f1f5f9;
}
</style>
