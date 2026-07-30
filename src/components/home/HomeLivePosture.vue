<script setup>
import { displayOrDash } from '@/utils/homePulse'

defineProps({
  live: { type: Object, default: null }
})
</script>

<template>
  <section class="live-strip" aria-label="Live Asterisk posture">
    <div class="stat">
      <span class="stat-label">Current calls</span>
      <span class="stat-value">
        {{ live?.ami_ok ? displayOrDash(live?.current_calls) : '—' }}
      </span>
      <span class="stat-hint">
        <template v-if="live?.ami_ok">Node-wide (AMI)</template>
        <template v-else>AMI unavailable</template>
      </span>
    </div>
    <div class="stat">
      <span class="stat-label">Endpoints defined</span>
      <span class="stat-value">{{ displayOrDash(live?.endpoints_defined) }}</span>
      <span class="stat-hint">Configured extensions</span>
    </div>
  </section>
</template>

<style scoped>
.live-strip {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
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
  font-size: 1.25rem;
  font-weight: 600;
  color: #0f172a;
}
.stat-hint {
  display: block;
  margin-top: 0.2rem;
  font-size: 0.75rem;
  color: #94a3b8;
}
</style>
