<script setup>
import { computed, ref, watch } from 'vue'

const inputRef = ref(null)
defineExpose({ focus: () => inputRef.value?.focus() })

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
    type: [String, Number],
    default: ''
  },
  type: {
    type: String,
    default: 'text'
  },
  placeholder: {
    type: String,
    default: ''
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
  inputmode: {
    type: String,
    default: null
  },
  pattern: {
    type: String,
    default: null
  },
  autocomplete: {
    type: String,
    default: 'off'
  },
  /** When changed, the inner input is re-mounted (use after form reset so display updates). */
  inputKey: {
    type: [String, Number],
    default: null
  },
  /** If true, log modelValue when it is '' or 'default' (for debugging form reset). */
  debugReset: {
    type: Boolean,
    default: false
  },
  /** If true, render a textarea for freeform multi-line text (e.g. code fragment). */
  multiline: {
    type: Boolean,
    default: false
  },
  /** Rows for textarea when multiline is true. */
  rows: {
    type: Number,
    default: 8
  }
})

const emit = defineEmits(['update:modelValue', 'blur'])

const inputValue = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const hasError = computed(() => props.error && props.touched)
const isValid = computed(() => !props.error && props.touched && String(props.modelValue ?? '').trim() !== '')
const errorId = computed(() => `${props.id}-error`)
const hintId = computed(() => `${props.id}-hint`)

function handleBlur() {
  emit('blur')
}

// Debug form reset: when debugReset is true, log when this field receives empty/default
watch(() => [props.debugReset, props.modelValue], ([dbg, v]) => {
  if (dbg && (v === '' || v === 'default')) console.log('[FormField]', props.id, 'modelValue', JSON.stringify(v))
}, { immediate: true })
</script>

<template>
  <div class="form-field">
    <label :for="id" class="form-field-label">
      {{ label }}
      <span v-if="required" class="sr-only"> (required)</span>
    </label>
    <div class="form-field-input-wrapper">
      <input
        v-if="!multiline"
        :key="inputKey ?? id"
        ref="inputRef"
        :id="id"
        v-model="inputValue"
        :type="type"
        :placeholder="placeholder"
        :class="{
          'form-input': true,
          'form-input-error': hasError,
          'form-input-valid': isValid
        }"
        :aria-invalid="hasError"
        :aria-describedby="hasError ? errorId : (hint ? hintId : null)"
        :aria-required="required"
        :required="required"
        :disabled="disabled"
        :inputmode="inputmode"
        :pattern="pattern"
        :autocomplete="autocomplete"
        @blur="handleBlur"
      />
      <textarea
        v-else
        :key="inputKey ?? id"
        ref="inputRef"
        :id="id"
        v-model="inputValue"
        :placeholder="placeholder"
        :rows="rows"
        :class="{
          'form-input': true,
          'form-input-textarea': true,
          'form-input-error': hasError,
          'form-input-valid': isValid
        }"
        :aria-invalid="hasError"
        :aria-describedby="hasError ? errorId : (hint ? hintId : null)"
        :aria-required="required"
        :required="required"
        :disabled="disabled"
        @blur="handleBlur"
      />
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

.form-field-label {
  font-weight: 500;
  color: #475569;
  padding-top: 0.375rem;
  white-space: nowrap;
}

.form-field-input-wrapper {
  min-width: 0;
}

.form-input {
  width: 100%;
  padding: 0.5rem 0.75rem;
  font-size: 0.9375rem;
  line-height: 1.5;
  color: #0f172a;
  background-color: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 0.375rem;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.form-input-textarea {
  min-height: 8em;
  resize: vertical;
  font-family: ui-monospace, monospace;
}

.form-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-input:disabled {
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
