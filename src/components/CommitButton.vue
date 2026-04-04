<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { getApiClient } from '@/api/client'
import { useToastStore } from '@/stores/toast'
import { firstErrorMessage } from '@/utils/formErrors'

const route = useRoute()
const toast = useToastStore()

const commitDirty = ref(false)
const actionBusy = ref(false)

async function fetchCommitStatus() {
  try {
    const response = await getApiClient().get('syscommands/commitstatus')
    commitDirty.value = response?.dirty === true
  } catch {
    commitDirty.value = false
  }
}

async function runCommit() {
  if (!confirm('Apply configuration (run Asterisk file generator)?')) return
  actionBusy.value = true
  try {
    await getApiClient().get('syscommands/commit')
    await fetchCommitStatus()
    toast.show('Committed')
  } catch (err) {
    toast.show(firstErrorMessage(err, 'Commit failed'), 'error')
  } finally {
    actionBusy.value = false
  }
}

onMounted(() => {
  fetchCommitStatus()
})

watch(
  () => route.path,
  () => {
    fetchCommitStatus()
  }
)

defineExpose({ refreshCommitStatus: fetchCommitStatus })
</script>

<template>
  <button
    type="button"
    class="commit-btn"
    :class="{ 'commit-btn-dirty': commitDirty }"
    :disabled="actionBusy"
    :title="commitDirty ? 'Uncommitted changes – run generator and reload' : 'Config is in sync'"
    @click="runCommit"
  >
    {{ actionBusy ? 'Running…' : commitDirty ? 'Commit (pending)' : 'Commit' }}
  </button>
</template>

<style scoped>
.commit-btn {
  padding: 0.375rem 0.75rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: #fff;
  background: #2563eb;
  border: none;
  border-radius: 0.375rem;
  cursor: pointer;
}
.commit-btn:hover:not(:disabled) {
  background: #1d4ed8;
}
.commit-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
.commit-btn.commit-btn-dirty {
  background: #dc2626;
}
.commit-btn.commit-btn-dirty:hover:not(:disabled) {
  background: #b91c1c;
}
.commit-btn:focus-visible {
  outline: 2px solid #fbbf24;
  outline-offset: 2px;
}
</style>
