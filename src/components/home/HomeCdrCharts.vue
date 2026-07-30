<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import HomeBarChart from './HomeBarChart.vue'
import HomeDoughnut from './HomeDoughnut.vue'

const props = defineProps({
  cdr: { type: Object, default: null }
})

const volume = computed(() => props.cdr?.volume_24h || null)
const outcome = computed(() => props.cdr?.outcome_today || null)

const outcomeSegments = computed(() => {
  const o = outcome.value || {}
  return [
    { key: 'answered', label: 'Answered', value: o.answered || 0, color: '#2563eb' },
    { key: 'no_answer', label: 'No answer', value: o.no_answer || 0, color: '#94a3b8' },
    { key: 'busy', label: 'Busy', value: o.busy || 0, color: '#d97706' },
    { key: 'failed', label: 'Failed', value: o.failed || 0, color: '#dc2626' },
    { key: 'other', label: 'Other', value: o.other || 0, color: '#64748b' }
  ]
})
</script>

<template>
  <section class="cdr-charts" aria-label="CDR pulse">
    <div v-if="!cdr?.available" class="cdr-empty">
      <p>Asterisk CDR is not available on this node yet.</p>
      <RouterLink class="cdr-link" to="/cdr">Open CDR →</RouterLink>
    </div>
    <template v-else>
      <div class="chart-card">
        <div class="chart-head">
          <h3 class="chart-title">Call volume (24h)</h3>
          <RouterLink class="cdr-link" to="/cdr">Open CDR →</RouterLink>
        </div>
        <p class="chart-legend">
          <span class="lg answered" /> Answered
          <span class="lg other" /> Other
        </p>
        <HomeBarChart
          :labels="volume?.labels || []"
          :answered="volume?.answered || []"
          :other="volume?.other || []"
        />
      </div>
      <div class="chart-card">
        <div class="chart-head">
          <h3 class="chart-title">Outcomes (today)</h3>
          <RouterLink class="cdr-link" to="/cdr">Open CDR →</RouterLink>
        </div>
        <HomeDoughnut :segments="outcomeSegments" />
      </div>
    </template>
  </section>
</template>

<style scoped>
.cdr-charts {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}
@media (max-width: 52rem) {
  .cdr-charts {
    grid-template-columns: 1fr;
  }
}
.chart-card,
.cdr-empty {
  padding: 1rem 1.15rem;
  background: var(--pbx-panel);
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
}
.cdr-empty p {
  margin: 0 0 0.5rem 0;
  color: #64748b;
  font-size: 0.875rem;
}
.chart-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}
.chart-title {
  margin: 0;
  font-size: 0.9375rem;
  font-weight: 600;
  color: #334155;
}
.cdr-link {
  font-size: 0.8125rem;
  font-weight: 500;
  color: #2563eb;
  text-decoration: none;
}
.cdr-link:hover {
  text-decoration: underline;
}
.chart-legend {
  margin: 0 0 0.5rem 0;
  font-size: 0.75rem;
  color: #64748b;
  display: flex;
  gap: 0.75rem;
  align-items: center;
}
.lg {
  display: inline-block;
  width: 0.65rem;
  height: 0.65rem;
  border-radius: 2px;
  margin-right: 0.25rem;
  vertical-align: middle;
}
.lg.answered {
  background: #2563eb;
}
.lg.other {
  background: #cbd5e1;
}
</style>
