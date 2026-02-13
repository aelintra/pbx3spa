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
    default: 'NO'
  },
  yesValue: {
    type: String,
    default: 'YES'
  },
  noValue: {
    type: String,
    default: 'NO'
  },
  hint: {
    type: String,
    default: ''
  },
  ariaLabel: {
    type: String,
    default: null
  },
  /** When true, hide the label (e.g. for inline use in list rows or grids). Use ariaLabel or label for a11y. */
  hideLabel: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue'])

const isChecked = computed(() => props.modelValue === props.yesValue)

function handleChange(event) {
  emit('update:modelValue', event.target.checked ? props.yesValue : props.noValue)
}
</script>

<template>
  <div class="form-field" :class="{ 'form-field-inline': hideLabel }">
    <label v-if="!hideLabel" :for="id" class="form-field-label">
      {{ label }}
    </label>
    <div class="form-field-input-wrapper">
      <label class="toggle-pill-ios" :aria-label="ariaLabel || label">
        <input
          :id="id"
          type="checkbox"
          :checked="isChecked"
          @change="handleChange"
        />
        <span class="toggle-pill-track"><span class="toggle-pill-thumb"></span></span>
      </label>
      <p v-if="hint" class="form-field-hint">
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

.toggle-pill-ios {
  display: inline-flex;
  align-items: center;
  cursor: pointer;
  user-select: none;
}

.toggle-pill-ios input[type="checkbox"] {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-pill-track {
  position: relative;
  width: 3rem;
  height: 1.75rem;
  background-color: #cbd5e1;
  border-radius: 9999px;
  transition: background-color 0.2s ease;
}

.toggle-pill-thumb {
  position: absolute;
  top: 0.125rem;
  left: 0.125rem;
  width: 1.5rem;
  height: 1.5rem;
  background-color: #ffffff;
  border-radius: 50%;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  transition: transform 0.2s ease;
}

.toggle-pill-ios input[type="checkbox"]:checked + .toggle-pill-track {
  background-color: #22c55e;
}

.toggle-pill-ios input[type="checkbox"]:checked + .toggle-pill-track .toggle-pill-thumb {
  transform: translateX(1.25rem);
}

.toggle-pill-ios input[type="checkbox"]:focus + .toggle-pill-track {
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.toggle-pill-ios input[type="checkbox"]:disabled + .toggle-pill-track {
  opacity: 0.5;
  cursor: not-allowed;
}

.form-field-hint {
  color: #64748b;
  font-size: 0.8125rem;
  margin: 0.5rem 0 0 0;
}
</style>
