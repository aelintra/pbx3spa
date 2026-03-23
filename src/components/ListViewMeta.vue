<script setup>
import { computed } from 'vue'

const props = defineProps({
  total: { type: Number, required: true },
  filtered: { type: Number, required: true },
  /** If set, show "· N active" (omit for resources without an active flag, e.g. agents). */
  activeCount: { type: Number, default: undefined },
  /** Extensions: count of rows with Status Unknown (reachability). */
  downCount: { type: Number, default: undefined },
  /** Extensions: count of rows whose Status matches /^OK/ (live AMI). */
  onlineCount: { type: Number, default: undefined }
})

const isFiltered = computed(() => props.total !== props.filtered)
const showActive = computed(() => typeof props.activeCount === 'number')
const showDown = computed(() => typeof props.downCount === 'number')
const showOnline = computed(() => typeof props.onlineCount === 'number')
</script>

<template>
  <p class="list-view-meta" aria-live="polite">
    <template v-if="isFiltered">{{ filtered }} of {{ total }} rows</template>
    <template v-else>{{ total }} rows</template>
    <template v-if="showActive"> · {{ activeCount }} active</template>
    <template v-if="showDown"> · {{ downCount }} down</template>
    <template v-if="showOnline"> · {{ onlineCount }} online</template>
  </p>
</template>

<style scoped>
.list-view-meta {
  margin: 0 0 0.5rem 0;
  font-size: 0.875rem;
  color: #64748b;
}
</style>
