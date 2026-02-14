<script setup>
import { computed } from 'vue'

const props = defineProps({
  id: {
    type: String,
    required: true
  },
  label: {
    type: String,
    required: true
  },
  modelValue: {
    type: String,
    default: ''
  },
  options: {
    type: Array,
    required: true
  },
  /** Display text for empty string option (e.g. "None" or "—") */
  emptyDisplay: {
    type: String,
    default: '—'
  },
  hint: {
    type: String,
    default: ''
  },
  error: {
    type: String,
    default: null
  },
  touched: {
    type: Boolean,
    default: false
  },
  required: {
    type: Boolean,
    default: false
  },
  disabled: {
    type: Boolean,
    default: false
  },
  ariaLabel: {
    type: String,
    default: null
  },
  hideLabel: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'blur'])

const hasError = computed(() => props.error && props.touched)

function displayLabel(opt) {
  return opt === '' ? props.emptyDisplay : opt
}

function select(opt) {
  if (props.disabled) return
  emit('update:modelValue', opt)
  emit('blur')
}

function onBlur() {
  emit('blur')
}

const errorId = computed(() => `${props.id}-error`)
const hintId = computed(() => `${props.id}-hint`)
</script>

<template>
  <div class="form-field" :class="{ 'form-field-inline': hideLabel }">
    <label v-if="!hideLabel" :for="id" class="form-field-label">
      {{ label }}
      <span v-if="required" class="sr-only"> (required)</span>
    </label>
    <div class="form-field-input-wrapper">
      <div
        :id="id"
        role="radiogroup"
        :aria-label="ariaLabel || label"
        :aria-invalid="hasError"
        :aria-describedby="hasError ? errorId : (hint ? hintId : null)"
        :aria-required="required"
        class="pill-group"
        tabindex="-1"
      >
        <button
          v-for="(opt, idx) in options"
          :key="opt === '' ? '__empty__' : opt"
          type="button"
          role="radio"
          :class="[
            'pill',
            { 'pill-selected': modelValue === opt },
            { 'pill-first': idx === 0 },
            { 'pill-last': idx === options.length - 1 }
          ]"
          :aria-checked="modelValue === opt"
          :disabled="disabled"
          @click="select(opt)"
          @blur="onBlur"
        >
          {{ displayLabel(opt) }}
        </button>
      </div>
      <p
        v-if="hasError"
        :id="errorId"
        class="form-field-error"
        role="alert"
      >
        {{ error }}
      </p>
      <p
        v-else-if="hint"
        :id="hintId"
        class="form-field-hint"
      >
        {{ hint }}
      </p>
    </div>
  </div>
</template>

<style scoped>
.form-field {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 2fr;
  gap: 0.375rem 1rem;
  align-items: start;
  margin-bottom: 0.75rem;
}
.form-field-inline {
  grid-template-columns: 1fr;
  margin-bottom: 0;
}

.form-field-label {
  font-weight: 500;
  color: #475569;
  padding-top: 0.375rem;
  white-space: nowrap;
}

.form-field-input-wrapper {
  min-width: 0;
}

.pill-group {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 0;
  border: 1px solid #e2e8f0;
  border-radius: 0.375rem;
  padding: 2px;
  background: #f1f5f9;
}

.pill {
  padding: 0.375rem 0.75rem;
  font-size: 0.9375rem;
  font-weight: 500;
  color: #475569;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}
.pill:hover:not(:disabled) {
  background: #e2e8f0;
  color: #0f172a;
}
.pill:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px #3b82f6;
  z-index: 1;
}
.pill:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.pill-selected {
  background: #fff;
  color: #0f172a;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}
.pill-first {
  border-radius: 0.25rem 0 0 0.25rem;
}
.pill-last {
  border-radius: 0 0.25rem 0.25rem 0;
}
.pill-first.pill-last {
  border-radius: 0.25rem;
}

.form-field-error {
  color: #dc2626;
  font-size: 0.8125rem;
  margin: 0.25rem 0 0 0;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}
.form-field-error::before {
  content: "⚠";
  font-size: 0.875rem;
  flex-shrink: 0;
}
.form-field-hint {
  color: #64748b;
  font-size: 0.8125rem;
  margin: 0.25rem 0 0 0;
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
</style>
