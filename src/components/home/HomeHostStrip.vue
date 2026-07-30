<script setup>
import { computed } from 'vue'
import {
  formatPct,
  formatMemGb,
  displayOrDash,
  usedPctSwatchColor
} from '@/utils/homePulse'

const props = defineProps({
  system: { type: Object, default: null }
})

const runstate = computed(() => props.system?.pbx_runstate || '—')

function clampPct(n) {
  if (n == null || Number.isNaN(Number(n))) return null
  return Math.min(100, Math.max(0, Number(n)))
}

/** Load average as % of CPU count (capped at 100 for the bar). */
const loadPct = computed(() => {
  const load1 = Number(props.system?.load1)
  const cpus = Math.max(1, Number(props.system?.cpus) || 1)
  if (Number.isNaN(load1)) return null
  return clampPct((load1 / cpus) * 100)
})
const loadFill = computed(() => usedPctSwatchColor(loadPct.value))

const memPct = computed(() => clampPct(props.system?.mem_used_pct))
const memFill = computed(() => usedPctSwatchColor(memPct.value))

const diskPct = computed(() => clampPct(props.system?.disk_used_pct))
const diskFill = computed(() => usedPctSwatchColor(diskPct.value))
</script>

<template>
  <section class="home-strip" aria-label="Host and PBX posture">
    <div class="stat">
      <span class="stat-label">PBX</span>
      <span class="stat-value">{{ displayOrDash(runstate) }}</span>
    </div>
    <div class="stat">
      <span class="stat-label">Load</span>
      <span class="stat-value">
        {{ displayOrDash(system?.load1) }}
        <span class="stat-meta">/ {{ displayOrDash(system?.cpus) }} CPU</span>
      </span>
      <div
        v-if="loadPct != null"
        class="usage-meter"
        role="meter"
        :aria-valuenow="loadPct"
        aria-valuemin="0"
        aria-valuemax="100"
        :aria-label="`Load ${displayOrDash(system?.load1)} of ${displayOrDash(system?.cpus)} CPUs`"
      >
        <div
          class="usage-meter-fill"
          :style="{ width: loadPct + '%', background: loadFill }"
        />
      </div>
    </div>
    <div class="stat">
      <span class="stat-label">Memory</span>
      <span class="stat-value">
        {{ formatPct(system?.mem_used_pct) }}
        <span v-if="system?.mem_total_mb" class="stat-meta">of {{ formatMemGb(system.mem_total_mb) }}</span>
      </span>
      <div
        v-if="memPct != null"
        class="usage-meter"
        role="meter"
        :aria-valuenow="memPct"
        aria-valuemin="0"
        aria-valuemax="100"
        :aria-label="`Memory ${formatPct(memPct)} used`"
      >
        <div
          class="usage-meter-fill"
          :style="{ width: memPct + '%', background: memFill }"
        />
      </div>
    </div>
    <div class="stat">
      <span class="stat-label">Disk</span>
      <span class="stat-value">
        {{ formatPct(system?.disk_used_pct) }}
        <span v-if="system?.disk_total_gb" class="stat-meta">of {{ system.disk_total_gb }} GB</span>
      </span>
      <div
        v-if="diskPct != null"
        class="usage-meter"
        role="meter"
        :aria-valuenow="diskPct"
        aria-valuemin="0"
        aria-valuemax="100"
        :aria-label="`Disk ${formatPct(diskPct)} used`"
      >
        <div
          class="usage-meter-fill"
          :style="{ width: diskPct + '%', background: diskFill }"
        />
      </div>
    </div>
  </section>
</template>

<style scoped>
.home-strip {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.75rem;
}
@media (max-width: 52rem) {
  .home-strip {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
.stat {
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  border: 1px solid #e2e8f0;
  background: var(--pbx-panel);
}
.stat-label {
  display: block;
  font-size: 0.75rem;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  margin-bottom: 0.25rem;
}
.stat-value {
  font-size: 1.125rem;
  font-weight: 600;
  color: #0f172a;
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 0.35rem;
}
.stat-meta {
  font-size: 0.75rem;
  font-weight: 500;
  color: #64748b;
}
.usage-meter {
  margin-top: 0.5rem;
  height: 0.35rem;
  width: 100%;
  border-radius: 999px;
  background: #e2e8f0;
  overflow: hidden;
}
.usage-meter-fill {
  height: 100%;
  border-radius: 999px;
  min-width: 0;
  transition: width 0.25s ease;
}
</style>
