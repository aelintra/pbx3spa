<script setup>
import { computed } from 'vue'
import FieldHelpIcon from '@/components/FieldHelpIcon.vue'
import { deriveHelpPkeyFromFieldId } from '@/utils/formHelpPkey'

const props = defineProps({
  /** When set, show a "?" help icon next to the label that opens a popover with tt_help_core content for this pkey. */
  helpPkey: {
    type: String,
    default: null
  },
  id: {
    type: String,
    required: true
  },
  label: {
    type: String,
    required: true
  },
  /** Coerced to/from string so JSON numeric options (e.g. extension 201) do not break API string validation. */
  modelValue: {
    type: [String, Number],
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
  /** When true, hide the label (e.g. for inline use in list rows or grids). Use ariaLabel or label for a11y. */
  hideLabel: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'blur'])

/** When helpPkey is not set, derive from id; see formHelpPkey.js. */
const effectiveHelpPkey = computed(() => props.helpPkey ?? deriveHelpPkeyFromFieldId(props.id))

const selectValue = computed({
  get: () => {
    const v = props.modelValue
    if (v === null || v === undefined || v === '') return ''
    return String(v)
  },
  set: (value) => {
    if (value === null || value === undefined) {
      emit('update:modelValue', value)
      return
    }
    emit('update:modelValue', value === '' ? '' : String(value))
  }
})

const hasError = computed(() => props.error && props.touched)
const isValid = computed(() => !props.error && props.touched && props.modelValue)
const errorId = computed(() => `${props.id}-error`)
const hintId = computed(() => `${props.id}-hint`)

function handleBlur() {
  emit('blur')
}

/** Support options as primitives or { value, label } objects. */
function optionValue(opt) {
  return opt != null && typeof opt === 'object' && 'value' in opt ? opt.value : opt
}
function optionLabel(opt) {
  return opt != null && typeof opt === 'object' && 'label' in opt ? opt.label : opt
}

/** HTML option value + v-model: always string so axios JSON does not send bare numbers. */
function optionAttrValue(opt) {
  const v = optionValue(opt)
  if (v === null || v === undefined) return ''
  return String(v)
}
</script>

<template>
  <div class="form-field" :class="{ 'form-field-inline': hideLabel }">
    <label v-if="!hideLabel" :for="id" class="form-field-label">
      {{ label }}
      <FieldHelpIcon v-if="effectiveHelpPkey" :pkey="effectiveHelpPkey" />
      <span v-if="required" class="sr-only"> (required)</span>
    </label>
    <div class="form-field-input-wrapper">
      <select
        :id="id"
        :key="inputKey ?? id"
        v-model="selectValue"
        :class="{
          'form-select': true,
          'form-input-error': hasError,
          'form-input-valid': isValid
        }"
        :aria-invalid="hasError"
        :aria-describedby="hasError ? errorId : hint ? hintId : null"
        :aria-label="ariaLabel || label"
        :aria-required="required"
        :required="required"
        :disabled="disabled || loading"
        @blur="handleBlur"
      >
        <option v-if="loading" value="">{{ loadingText }}</option>
        <option v-else-if="emptyText" value="" :disabled="required">{{ emptyText }}</option>
        <template v-if="!loading">
          <option
            v-for="(opt, optIdx) in options"
            :key="`${optionAttrValue(opt)}-${optIdx}`"
            :value="optionAttrValue(opt)"
          >
            {{ optionLabel(opt) }}
          </option>
          <template v-if="optionGroups">
            <optgroup v-for="(pkeys, group) in optionGroups" :key="group" :label="group">
              <option
                v-for="(p, pIdx) in pkeys && Array.isArray(pkeys) ? pkeys : []"
                :key="`${group}-${pIdx}-${String(p)}`"
                :value="String(p)"
              >
                {{ p }}
              </option>
              <option v-if="!pkeys || !pkeys.length" disabled value="">—</option>
            </optgroup>
          </template>
        </template>
      </select>
      <p v-if="hasError" :id="errorId" class="form-field-error" role="alert">
        {{ error }}
      </p>
      <p v-else-if="hint" :id="hintId" class="form-field-hint">
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
  min-width: 0;
  white-space: normal;
}

.form-field-input-wrapper {
  min-width: 0;
}

.form-select {
  display: block;
  width: 100%;
  box-sizing: border-box;
  /* Match FormField .form-input height (native select otherwise mis-sizes on macOS). */
  min-height: 2.5rem;
  height: 2.5rem;
  margin: 0;
  padding: 0.5rem 0.75rem;
  font: inherit;
  font-size: 0.9375rem;
  line-height: 1.25;
  color: var(--pbx-text, #0f172a);
  background-color: var(--pbx-panel, #ffffff);
  border: 1px solid var(--pbx-border, #e2e8f0);
  border-radius: 0.375rem;
  appearance: auto;
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}

.form-select:focus {
  outline: none;
  border-color: var(--pbx-accent-bright, #3b82f6);
  box-shadow: 0 0 0 3px var(--pbx-focus-ring, rgba(59, 130, 246, 0.1));
}

.form-select:disabled {
  background-color: var(--pbx-surface-subtle, #f8fafc);
  color: var(--pbx-text-muted, #64748b);
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
  content: '⚠';
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
