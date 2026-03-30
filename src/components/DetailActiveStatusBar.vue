<script setup>
import { computed } from 'vue'
import FormToggle from '@/components/forms/FormToggle.vue'

const model = defineModel({ type: String, default: 'YES' })

const props = defineProps({
  /** When true, show status badge only (e.g. explicit view-only mode). */
  readonly: { type: Boolean, default: false },
  /** Unique id for the toggle input (per page). */
  toggleId: { type: String, required: true },
  yesValue: { type: String, default: 'YES' },
  noValue: { type: String, default: 'NO' }
})

const isActive = computed(() => model.value === props.yesValue)
</script>

<template>
  <div class="detail-active-status-bar">
    <span
      class="detail-active-badge"
      :class="isActive ? 'detail-active-badge--on' : 'detail-active-badge--off'"
      aria-live="polite"
    >
      {{ isActive ? 'Active' : 'Inactive' }}
    </span>
    <FormToggle
      v-if="!readonly"
      :id="toggleId"
      v-model="model"
      label="Active"
      :yes-value="yesValue"
      :no-value="noValue"
      hide-label
      aria-label="Active — enable or disable this record for call processing"
    />
  </div>
</template>

<style scoped>
.detail-active-status-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 0.75rem;
  flex-shrink: 0;
}

.detail-active-badge {
  font-size: 0.8125rem;
  font-weight: 600;
  line-height: 1;
  padding: 0.35rem 0.65rem;
  border-radius: 9999px;
  letter-spacing: 0.02em;
}

.detail-active-badge--on {
  color: #166534;
  background: #dcfce7;
  border: 1px solid #86efac;
}

.detail-active-badge--off {
  color: #9a3412;
  background: #ffedd5;
  border: 1px solid #fdba74;
}
</style>
