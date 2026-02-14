<script setup>
import { computed, watch } from 'vue'

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
  optionGroups: {
    type: Object,
    default: null
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
  loading: {
    type: Boolean,
    default: false
  },
  loadingText: {
    type: String,
    default: 'Loading…'
  },
  /** Optional placeholder for an empty option. Default '' so no selectable "—" is shown; use a real default (e.g. "None") in options instead. */
  emptyText: {
    type: String,
    default: ''
  },
  ariaLabel: {
    type: String,
    default: null
  },
  /** When changed, the inner select is re-mounted (use after form reset so display updates). */
  inputKey: {
    type: [String, Number],
    default: null
  },
  /** If true, log modelValue when it is '' or 'default' (for debugging form reset). */
  debugReset: {
    type: Boolean,
    default: false
  },
  /** When true, hide the label (e.g. for inline use in list rows or grids). Use ariaLabel or label for a11y. */
  hideLabel: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'blur'])

const selectValue = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const hasError = computed(() => props.error && props.touched)
const isValid = computed(() => !props.error && props.touched && props.modelValue)
const errorId = computed(() => `${props.id}-error`)
const hintId = computed(() => `${props.id}-hint`)

function handleBlur() {
  emit('blur')
}

// Debug form reset: when debugReset is true, log when this select receives empty/default
watch(() => [props.debugReset, props.modelValue], ([dbg, v]) => {
  if (dbg && (v === '' || v === 'default')) console.log('[FormSelect]', props.id, 'modelValue', JSON.stringify(v))
}, { immediate: true })
</script>

<template>
  <div class="form-field" :class="{ 'form-field-inline': hideLabel }">
    <label v-if="!hideLabel" :for="id" class="form-field-label">
      {{ label }}
      <span v-if="required" class="sr-only"> (required)</span>
    </label>
    <div class="form-field-input-wrapper">
      <select
        :key="inputKey ?? id"
        :id="id"
        v-model="selectValue"
        :class="{
          'form-select': true,
          'form-input-error': hasError,
          'form-input-valid': isValid
        }"
        :aria-invalid="hasError"
        :aria-describedby="hasError ? errorId : (hint ? hintId : null)"
        :aria-label="ariaLabel || label"
        :aria-required="required"
        :required="required"
        :disabled="disabled || loading"
        @blur="handleBlur"
      >
        <option v-if="loading" value="">{{ loadingText }}</option>
        <option v-else-if="!required && emptyText" value="">{{ emptyText }}</option>
        <template v-if="!loading">
          <option v-for="opt in options" :key="opt" :value="opt">{{ opt }}</option>
          <template v-if="optionGroups">
            <optgroup v-for="(pkeys, group) in optionGroups" :key="group" :label="group">
              <option v-for="p in (pkeys && Array.isArray(pkeys) ? pkeys : [])" :key="p" :value="p">{{ p }}</option>
              <option v-if="!pkeys || !pkeys.length" disabled value="">—</option>
            </optgroup>
          </template>
        </template>
      </select>
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

.form-select {
  width: 100%;
  padding: 0.5rem 0.75rem;
  font-size: 0.9375rem;
  line-height: 1.5;
  color: #0f172a;
  background-color: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 0.375rem;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
  cursor: pointer;
}

.form-select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-select:disabled {
  background-color: #f8fafc;
  color: #64748b;
  cursor: not-allowed;
}

.form-input-error {
  border-color: #dc2626;
  border-width: 2px;
}

.form-input-error:focus {
  border-color: #dc2626;
  box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.1);
}

.form-input-valid {
  border-color: #16a34a;
}

.form-input-valid:focus {
  border-color: #16a34a;
  box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.1);
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
