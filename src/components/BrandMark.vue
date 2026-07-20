<script setup>
/**
 * Sidebar brand: PBX with glowing superscript 3.
 * Height matches former .sidebar-top-spacer so topbar alignment stays.
 */
defineProps({
  /** Router path when the mark is a link (omit for static). */
  to: { type: String, default: '' },
})
</script>

<template>
  <component
    :is="to ? 'router-link' : 'div'"
    :to="to || undefined"
    class="brand-mark"
    :aria-label="to ? 'PBX3 home' : 'PBX3'"
  >
    <span class="brand-mark-text" aria-hidden="true">
      PBX<sup class="brand-mark-3">3</sup>
    </span>
  </component>
</template>

<style scoped>
.brand-mark {
  flex: 0 0 auto;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: calc(0.75rem * 2 + 2rem * 1.25);
  padding: 0.75rem 0.5rem;
  text-decoration: none;
  color: inherit;
}
.brand-mark-text {
  font-size: 2rem;
  font-weight: 700;
  letter-spacing: -0.03em;
  line-height: 1;
  color: var(--pbx-sidebar-fg);
  user-select: none;
}
.brand-mark-3 {
  font-size: 0.72em;
  font-weight: 800;
  line-height: 1;
  /* Explicit offset so SPA matches SBC (browser <sup> / font metrics differ) */
  vertical-align: baseline;
  position: relative;
  top: -0.52em;
  color: var(--pbx-accent-bright);
}
</style>
