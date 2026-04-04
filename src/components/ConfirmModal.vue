<template>
  <Teleport to="body">
    <div v-if="show" class="modal-backdrop" @click.self="onCancel">
      <div class="modal" role="dialog" aria-modal="true" :aria-labelledby="titleId">
        <h2 :id="titleId" class="modal-title">{{ title }}</h2>
        <div class="modal-body">
          <slot name="body">
            <p v-if="bodyText">{{ bodyText }}</p>
          </slot>
        </div>
        <div class="modal-actions">
          <button type="button" class="modal-btn modal-btn-cancel" @click="onCancel">
            {{ cancelLabel }}
          </button>
          <button
            type="button"
            :class="['modal-btn', confirmButtonClass]"
            :disabled="loading"
            @click="onConfirm"
          >
            {{ loading ? loadingLabel : confirmLabel }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, useId } from 'vue'

const props = defineProps({
  show: { type: Boolean, default: false },
  title: { type: String, default: 'Confirm' },
  bodyText: { type: String, default: '' },
  confirmLabel: { type: String, default: 'OK' },
  cancelLabel: { type: String, default: 'Cancel' },
  loadingLabel: { type: String, default: 'Working…' },
  loading: { type: Boolean, default: false },
  /** Primary (blue) for neutral actions; danger (red) for destructive. */
  variant: { type: String, default: 'primary', validator: (v) => v === 'primary' || v === 'danger' }
})

const emit = defineEmits(['confirm', 'cancel'])

const titleId = useId()

const confirmButtonClass = computed(() =>
  props.variant === 'danger' ? 'modal-btn-danger' : 'modal-btn-primary'
)

function onCancel() {
  emit('cancel')
}

function onConfirm() {
  emit('confirm')
}
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}
.modal {
  background: white;
  border-radius: 0.5rem;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  padding: 1.5rem;
  max-width: 24rem;
  width: 100%;
}
.modal-title {
  margin: 0 0 0.75rem 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: #0f172a;
}
.modal-body {
  margin: 0 0 1.25rem 0;
  font-size: 0.9375rem;
  color: #475569;
  line-height: 1.5;
}
.modal-body :deep(strong) {
  color: #0f172a;
}
.modal-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
}
.modal-btn {
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  font-weight: 500;
  border-radius: 0.375rem;
  cursor: pointer;
  border: none;
}
.modal-btn-cancel {
  background: #f1f5f9;
  color: #475569;
}
.modal-btn-cancel:hover {
  background: #e2e8f0;
}
.modal-btn-primary {
  background: #2563eb;
  color: white;
}
.modal-btn-primary:hover:not(:disabled) {
  background: #1d4ed8;
}
.modal-btn-danger {
  background: #dc2626;
  color: white;
}
.modal-btn-danger:hover:not(:disabled) {
  background: #b91c1c;
}
.modal-btn-primary:disabled,
.modal-btn-danger:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
</style>
