<script setup>
import { ref } from 'vue'
import { useCounterStore } from '@/stores/counter'

const counter = useCounterStore()
const msg = ref('PBX3 Admin')
</script>

<template>
  <div class="home">
    <div class="welcome">
      <h1>{{ msg }}</h1>
      <p>Vue 3 + Vite + Vue Router + Pinia</p>
      <p class="counter">
        <button type="button" @click="counter.decrement">−</button>
        <span> {{ counter.count }} </span>
        <button type="button" @click="counter.increment">+</button>
      </p>
      <p class="hint">Edit <code>src/views/HomeView.vue</code> to get started.</p>
    </div>
  </div>
</template>

<style scoped>
.home {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}
.welcome {
  text-align: center;
  max-width: 28rem;
}
.welcome h1 {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}
.welcome p {
  color: #64748b;
  margin-bottom: 0.75rem;
}
.welcome .counter {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin: 1rem 0;
}
.welcome .counter button {
  padding: 0.25rem 0.75rem;
  font-size: 1.25rem;
  cursor: pointer;
  border: 1px solid #e2e8f0;
  border-radius: 0.375rem;
  background: #f8fafc;
}
.welcome .counter button:hover {
  background: #f1f5f9;
}
.welcome .counter span {
  min-width: 2rem;
  font-weight: 600;
}
.welcome .hint {
  font-size: 0.875rem;
  margin-top: 1.5rem;
}
.welcome code {
  padding: 0.2em 0.4em;
  background: #f1f5f9;
  border-radius: 0.25rem;
  font-size: 0.9em;
}
</style>
