<script setup>
import { computed } from 'vue'

const props = defineProps({
  segments: {
    type: Array,
    default: () => []
    // { key, label, value, color }
  },
  size: { type: Number, default: 140 }
})

const total = computed(() =>
  props.segments.reduce((sum, s) => sum + (Number(s.value) || 0), 0)
)

const arcs = computed(() => {
  const t = total.value
  if (t <= 0) return []
  const r = 40
  const cx = 50
  const cy = 50
  let angle = -Math.PI / 2
  const out = []
  for (const s of props.segments) {
    const v = Number(s.value) || 0
    if (v <= 0) continue
    const sweep = (v / t) * Math.PI * 2
    const end = angle + sweep
    const large = sweep > Math.PI ? 1 : 0
    const x1 = cx + r * Math.cos(angle)
    const y1 = cy + r * Math.sin(angle)
    const x2 = cx + r * Math.cos(end)
    const y2 = cy + r * Math.sin(end)
    out.push({
      ...s,
      d: `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`
    })
    angle = end
  }
  return out
})
</script>

<template>
  <div class="doughnut-wrap">
    <svg
      class="doughnut"
      :viewBox="'0 0 100 100'"
      :width="size"
      :height="size"
      role="img"
      aria-label="Call outcomes today"
    >
      <circle v-if="total === 0" cx="50" cy="50" r="40" class="empty-ring" />
      <path v-for="a in arcs" :key="a.key" :d="a.d" :fill="a.color">
        <title>{{ a.label }}: {{ a.value }}</title>
      </path>
      <circle cx="50" cy="50" r="22" class="hole" />
      <text x="50" y="52" text-anchor="middle" class="center-text">{{ total }}</text>
    </svg>
    <ul class="legend">
      <li v-for="s in segments" :key="s.key">
        <span class="swatch" :style="{ background: s.color }" />
        {{ s.label }}
        <strong>{{ s.value }}</strong>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.doughnut-wrap {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1rem;
}
.doughnut {
  flex-shrink: 0;
}
.empty-ring {
  fill: none;
  stroke: #e2e8f0;
  stroke-width: 16;
}
.hole {
  fill: #fff;
}
.center-text {
  font-size: 12px;
  font-weight: 700;
  fill: #0f172a;
}
.legend {
  list-style: none;
  margin: 0;
  padding: 0;
  font-size: 0.8125rem;
  color: #475569;
}
.legend li {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin-bottom: 0.25rem;
}
.legend strong {
  margin-left: auto;
  color: #0f172a;
  min-width: 1.5rem;
  text-align: right;
}
.swatch {
  width: 0.65rem;
  height: 0.65rem;
  border-radius: 2px;
  flex-shrink: 0;
}
</style>
