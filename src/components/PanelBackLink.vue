<script setup>
/**
 * Top-of-panel navigation to the parent list (matches Asterisk file editor UX).
 */
defineProps({
  to: { type: [String, Object], required: true },
  label: { type: String, required: true }
})
</script>

<template>
  <header class="panel-back-header">
    <router-link :to="to" class="panel-back-link">← {{ label }}</router-link>
    <slot />
  </header>
</template>

<style scoped>
.panel-back-header {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-bottom: 0.75rem;
}
.panel-back-link {
  color: #2563eb;
  text-decoration: none;
  font-size: 0.875rem;
  align-self: flex-start;
}
.panel-back-link:hover {
  text-decoration: underline;
}
</style>
