<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { getApiClient } from '@/api/client'
import { useToastStore } from '@/stores/toast'
import { firstErrorMessage } from '@/utils/formErrors'
import ConfirmModal from '@/components/ConfirmModal.vue'

const route = useRoute()
const toast = useToastStore()

const commitDirty = ref(false)
const actionBusy = ref(false)
const showCommitConfirm = ref(false)

async function fetchCommitStatus() {
  try {
    const response = await getApiClient().get('syscommands/commitstatus')
    commitDirty.value = response?.dirty === true
  } catch {
    commitDirty.value = false
  }
}

function openCommitConfirm() {
  showCommitConfirm.value = true
}

function cancelCommitConfirm() {
  showCommitConfirm.value = false
}

async function runCommit() {
  showCommitConfirm.value = false
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
    @click="openCommitConfirm"
  >
    {{ actionBusy ? 'Running…' : commitDirty ? 'Commit (pending)' : 'Commit' }}
  </button>

  <ConfirmModal
    :show="showCommitConfirm"
    title="Apply configuration?"
    body-text="Apply configuration (run Asterisk file generator)?"
    confirm-label="Apply"
    :loading="actionBusy"
    loading-label="Running…"
    variant="primary"
    @confirm="runCommit"
    @cancel="cancelCommitConfirm"
  />
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
