<script setup>
import { computed } from 'vue'
import { liveLatencyChipLabel, liveLatencyChipClassSuffix } from '@/utils/liveLatencyChip'

const props = defineProps({
  /** Raw display string from list live helper, e.g. `statusDisplay(row)`. */
  status: { type: String, required: true }
})

const label = computed(() => liveLatencyChipLabel(props.status))
const chipClass = computed(() => liveLatencyChipClassSuffix(props.status))
</script>

<template>
  <td class="td-list-chip">
    <span class="list-chip" :class="chipClass" :title="status">{{ label }}</span>
  </td>
</template>
