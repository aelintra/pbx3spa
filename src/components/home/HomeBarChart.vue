<script setup>
import { computed } from 'vue'

const props = defineProps({
  labels: { type: Array, default: () => [] },
  answered: { type: Array, default: () => [] },
  other: { type: Array, default: () => [] },
  height: { type: Number, default: 120 }
})

const maxY = computed(() => {
  let m = 1
  for (let i = 0; i < props.answered.length; i++) {
    m = Math.max(m, Number(props.answered[i]) || 0, Number(props.other[i]) || 0)
  }
  return m
})

const bars = computed(() => {
  const n = props.labels.length
  if (!n) return []
  const gap = 2
  const w = 100 / n
  const h = props.height
  return props.labels.map((label, i) => {
    const a = Number(props.answered[i]) || 0
    const o = Number(props.other[i]) || 0
    const aH = (a / maxY.value) * (h - 4)
    const oH = (o / maxY.value) * (h - 4)
    const x = i * w + gap / 2
    const barW = Math.max(1, w - gap)
    return {
      label,
      x,
      barW,
      aY: h - aH,
      aH,
      oY: h - oH,
      oH,
      a,
      o
    }
  })
})
</script>

<template>
  <svg
    class="bar-chart"
    :viewBox="`0 0 100 ${height}`"
    preserveAspectRatio="none"
    role="img"
    :aria-label="'Call volume last 24 hours'"
  >
    <g v-for="(b, i) in bars" :key="i">
      <title>{{ b.label }}: answered {{ b.a }}, other {{ b.o }}</title>
      <rect
        :x="b.x"
        :y="b.oY"
        :width="b.barW"
        :height="b.oH"
        class="bar-other"
      />
      <rect
        :x="b.x"
        :y="b.aY"
        :width="b.barW * 0.55"
        :height="b.aH"
        class="bar-answered"
      />
    </g>
  </svg>
</template>

<style scoped>
.bar-chart {
  width: 100%;
  height: 7.5rem;
  display: block;
}
.bar-answered {
  fill: #2563eb;
}
.bar-other {
  fill: #cbd5e1;
}
</style>
