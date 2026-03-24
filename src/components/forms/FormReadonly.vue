<script setup>
import { computed } from 'vue'
import FieldHelpIcon from '@/components/FieldHelpIcon.vue'
import { deriveHelpPkeyFromFieldId } from '@/utils/formHelpPkey'

const props = defineProps({
  id: {
    type: String,
    required: true
  },
  label: {
    type: String,
    required: true
  },
  value: {
    type: String,
    default: '—'
  },
  /** Override tt_help_core pkey; when unset, derived from id (same as FormField). */
  helpPkey: {
    type: String,
    default: null
  },
  /** When true, do not show contextual help (e.g. wrong pkey for this context). */
  hideHelp: {
    type: Boolean,
    default: false
  }
})

const effectiveHelpPkey = computed(() =>
  props.hideHelp ? null : (props.helpPkey ?? deriveHelpPkeyFromFieldId(props.id))
)
</script>

<template>
  <div class="form-field">
    <label :for="id" class="form-field-label">
      {{ label }}
      <FieldHelpIcon v-if="effectiveHelpPkey" :pkey="effectiveHelpPkey" />
    </label>
    <div class="form-field-input-wrapper">
      <p :id="id" class="form-readonly value-immutable" title="Immutable">
        {{ value }}
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

.form-readonly {
  padding: 0.5rem 0.75rem;
  font-size: 0.9375rem;
  color: #64748b;
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 0.375rem;
  margin: 0;
}
</style>
