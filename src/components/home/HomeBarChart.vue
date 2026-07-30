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

const totals = computed(() => {
  let answered = 0
  let other = 0
  let peak = 0
  for (let i = 0; i < props.answered.length; i++) {
    const a = Number(props.answered[i]) || 0
    const o = Number(props.other[i]) || 0
    answered += a
    other += o
    peak = Math.max(peak, a + o)
  }
  return { answered, other, total: answered + other, peak }
})

const yTicks = computed(() => {
  const max = maxY.value
  if (max <= 1) return [0, 1]
  if (max === 2) return [0, 1, 2]
  const mid = Math.round(max / 2)
  return mid > 0 && mid < max ? [0, mid, max] : [0, max]
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
      o,
      showLabel: i === 0 || i === n - 1 || i % 6 === 0
    }
  })
})
</script>

<template>
  <div class="bar-wrap">
    <p class="bar-summary">
      <strong>{{ totals.total }}</strong> calls
      <span class="sep">·</span>
      peak <strong>{{ totals.peak }}</strong>/h
      <span class="sep">·</span>
      answered {{ totals.answered }}
      <span class="sep">·</span>
      other {{ totals.other }}
    </p>
    <div class="bar-plot">
      <div class="y-axis" aria-hidden="true">
        <span v-for="t in [...yTicks].reverse()" :key="t">{{ t }}</span>
      </div>
      <div class="plot-main">
        <svg
          class="bar-chart"
          :viewBox="`0 0 100 ${height}`"
          preserveAspectRatio="none"
          role="img"
          :aria-label="`Call volume last 24 hours: ${totals.total} calls, peak ${totals.peak} per hour`"
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
        <div class="x-axis" aria-hidden="true">
          <span
            v-for="(b, i) in bars"
            :key="i"
            class="x-tick"
            :class="{ show: b.showLabel }"
          >{{ b.showLabel ? b.label : '' }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.bar-wrap {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}
.bar-summary {
  margin: 0;
  font-size: 0.75rem;
  color: #64748b;
}
.bar-summary strong {
  color: #0f172a;
  font-weight: 600;
}
.sep {
  margin: 0 0.15rem;
  color: #cbd5e1;
}
.bar-plot {
  display: grid;
  grid-template-columns: 1.75rem 1fr;
  gap: 0.35rem;
  align-items: stretch;
}
.y-axis {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: flex-end;
  padding: 0.1rem 0 1.1rem;
  font-size: 0.65rem;
  line-height: 1;
  color: #94a3b8;
  font-variant-numeric: tabular-nums;
}
.plot-main {
  min-width: 0;
}
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
.x-axis {
  display: flex;
  margin-top: 0.2rem;
  height: 0.9rem;
}
.x-tick {
  flex: 1 1 0;
  min-width: 0;
  font-size: 0.6rem;
  line-height: 1;
  color: #94a3b8;
  text-align: center;
  overflow: hidden;
}
.x-tick:not(.show) {
  visibility: hidden;
}
</style>
