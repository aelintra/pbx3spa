<script setup>
import { computed } from 'vue'
import { isRowActive } from '@/utils/listActive'

const props = defineProps({
  active: { type: [String, Number, Boolean], default: undefined },
  /** Optional stamp (e.g. velocity) — surfaces why Inactive */
  updater: { type: String, default: undefined }
})

const on = computed(() => isRowActive(props.active))

const title = computed(() => {
  if (on.value) return 'Active in configuration'
  if (String(props.updater || '').toLowerCase() === 'velocity') {
    return 'Inactive — disabled by toll-fraud velocity'
  }
  return 'Inactive in configuration'
})
</script>

<template>
  <td class="td-list-chip">
    <span
      class="list-chip"
      :class="on ? 'list-chip--on' : 'list-chip--off'"
      :title="title"
    >
      {{ on ? 'Active' : 'Inactive' }}
    </span>
  </td>
</template>
