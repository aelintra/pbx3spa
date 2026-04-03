<script setup>
defineProps({
  /** True while GET …/live (AMI) is in flight after the list has loaded */
  show: { type: Boolean, default: false }
})
</script>

<template>
  <div
    class="live-data-fetch-strip"
    :class="{ 'live-data-fetch-strip--busy': show }"
    :aria-hidden="show ? undefined : true"
    :role="show ? 'status' : undefined"
    :aria-live="show ? 'polite' : undefined"
    :aria-busy="show ? 'true' : undefined"
  >
    <template v-if="show">
      <span class="live-data-fetch-notice-spinner" aria-hidden="true" />
      <strong class="live-data-fetch-notice-title">Fetching live status from Asterisk</strong>
    </template>
  </div>
</template>

<style scoped>
/* Inline with ListViewMeta: compact pill when busy; idle slot is invisibly empty (toolbar row height follows meta) */
.live-data-fetch-strip {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  box-sizing: border-box;
  flex-shrink: 0;
  border-radius: 0.375rem;
  border: 1px solid transparent;
  background: transparent;
}
.live-data-fetch-strip--busy {
  padding: 0.2rem 0.55rem;
  border-color: rgba(37, 99, 235, 0.25);
  background: #eff6ff;
  color: var(--pbx-text, #0f172a);
  font-size: 0.875rem;
  line-height: 1.35;
}
.live-data-fetch-notice-spinner {
  flex-shrink: 0;
  width: 1rem;
  height: 1rem;
  border: 2px solid rgba(37, 99, 235, 0.2);
  border-top-color: var(--pbx-accent, #2563eb);
  border-radius: 50%;
  animation: live-data-fetch-spin 0.7s linear infinite;
}
@keyframes live-data-fetch-spin {
  to {
    transform: rotate(360deg);
  }
}
.live-data-fetch-notice-title {
  font-weight: 600;
  white-space: nowrap;
}
</style>
