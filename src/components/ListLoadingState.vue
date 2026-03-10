<script setup>
defineProps({
  /** Message shown under the spinner (e.g. "Loading extensions from API…") */
  message: {
    type: String,
    required: true
  }
})
</script>

<template>
  <div class="list-loading">
    <span class="list-loading__spinner" aria-hidden="true"></span>
    <span class="list-loading__text">{{ message }}</span>
  </div>
</template>

<style scoped>
.list-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 14rem;
  gap: 1.25rem;
  margin: 0;
}
.list-loading__text {
  color: #64748b;
  font-size: 0.9375rem;
}
.list-loading__spinner {
  width: 3rem;
  height: 3rem;
  border: 3px solid #e2e8f0;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: list-loading-spin 0.8s linear infinite;
}
@keyframes list-loading-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
