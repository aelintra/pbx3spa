<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

function goHome() {
  router.push('/')
}
</script>

<template>
  <div class="no-access">
    <h2>No access</h2>
    <p>Your account does not have permission to use this area. Contact an administrator if you need access.</p>
    <button type="button" class="btn-home" @click="goHome">Go to Home</button>
  </div>
</template>

<style scoped>
.no-access {
  max-width: 28rem;
  padding: 1.5rem;
}
.no-access h2 {
  font-size: 1.25rem;
  margin: 0 0 0.5rem 0;
  color: #0f172a;
}
.no-access p {
  color: #64748b;
  font-size: 0.9375rem;
  margin: 0 0 1rem 0;
  line-height: 1.5;
}
.btn-home {
  padding: 0.5rem 1rem;
  font-size: 0.9375rem;
  color: #fff;
  background: #2563eb;
  border: none;
  border-radius: 0.375rem;
  cursor: pointer;
}
.btn-home:hover {
  background: #1d4ed8;
}
</style>
