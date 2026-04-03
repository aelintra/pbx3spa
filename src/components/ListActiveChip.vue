<script setup>
import { computed } from 'vue'
import { isRowActive } from '@/utils/listActive'

const props = defineProps({
  active: { type: [String, Number, Boolean], default: undefined }
})

const on = computed(() => isRowActive(props.active))
</script>

<template>
  <td class="td-list-chip">
    <span
      class="list-chip"
      :class="on ? 'list-chip--on' : 'list-chip--off'"
      :title="on ? 'Active in configuration' : 'Inactive in configuration'"
    >
      {{ on ? 'Active' : 'Inactive' }}
    </span>
  </td>
</template>
