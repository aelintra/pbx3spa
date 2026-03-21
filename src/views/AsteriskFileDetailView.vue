<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getApiClient } from '@/api/client'
import { useToastStore } from '@/stores/toast'
import { firstErrorMessage } from '@/utils/formErrors'

const route = useRoute()
const router = useRouter()
const toast = useToastStore()

const filename = computed(() => route.params.filename)
const content = ref('')
const readonly = ref(true)
const loading = ref(true)
const error = ref('')
const saving = ref(false)
const saveError = ref('')
const editContent = ref('')

async function loadFile() {
  if (!filename.value) return
  loading.value = true
  error.value = ''
  saveError.value = ''
  try {
    const res = await getApiClient().get(`astfiles/${encodeURIComponent(filename.value)}`)
    content.value = res.content ?? ''
    readonly.value = res.readonly === true
    editContent.value = res.content ?? ''
  } catch (err) {
    error.value = firstErrorMessage(err, 'Failed to load file')
    content.value = ''
    editContent.value = ''
  } finally {
    loading.value = false
  }
}

function goBack() {
  router.push({ name: 'asterisk-files' })
}

async function saveEdit(e) {
  e.preventDefault()
  if (readonly.value) return
  saveError.value = ''
  saving.value = true
  try {
    await getApiClient().put(`astfiles/${encodeURIComponent(filename.value)}`, { content: editContent.value })
    toast.show('File updated')
    content.value = editContent.value
  } catch (err) {
    saveError.value = firstErrorMessage(err, 'Failed to save file')
    toast.show(saveError.value, 'error')
  } finally {
    saving.value = false
  }
}

onMounted(loadFile)
watch(filename, loadFile)
</script>

<template>
  <div class="astfile-detail-view">
    <header class="detail-header">
      <router-link :to="{ name: 'asterisk-files' }" class="back-link">← Asterisk Files</router-link>
      <h1>{{ filename || 'File' }}</h1>
    </header>

    <section v-if="loading || error" class="detail-states">
      <p v-if="loading" class="loading">Loading file…</p>
      <p v-else-if="error" class="error">{{ error }}</p>
    </section>

    <template v-else>
      <p v-if="readonly" class="readonly-badge">Read-only (view only)</p>
      <form v-if="!readonly" class="edit-form" @submit="saveEdit">
        <div class="form-actions form-actions-top">
          <button type="submit" class="action-btn action-btn-primary" :disabled="saving">
            {{ saving ? 'Saving…' : 'Save' }}
          </button>
          <button type="button" class="action-btn" @click="goBack">Cancel</button>
        </div>
        <p v-if="saveError" class="error">{{ saveError }}</p>
        <div class="field">
          <textarea
            v-model="editContent"
            class="file-textarea"
            spellcheck="false"
            rows="24"
            aria-label="File contents"
          />
        </div>
        <div class="form-actions">
          <button type="submit" class="action-btn action-btn-primary" :disabled="saving">
            {{ saving ? 'Saving…' : 'Save' }}
          </button>
          <button type="button" class="action-btn" @click="goBack">Cancel</button>
        </div>
      </form>
      <div v-else class="file-content-wrap">
        <pre class="file-pre">{{ content }}</pre>
      </div>
    </template>
  </div>
</template>

<style scoped>
.astfile-detail-view {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 90rem;
}
.detail-header {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.back-link {
  color: #2563eb;
  text-decoration: none;
  font-size: 0.875rem;
}
.back-link:hover { text-decoration: underline; }
.detail-header h1 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
  color: #0f172a;
}
.detail-states .loading,
.detail-states .error { margin: 0; }
.loading { color: #64748b; }
.error { color: #b91c1c; }
.readonly-badge {
  margin: 0;
  font-size: 0.875rem;
  color: #64748b;
}
.edit-form,
.file-content-wrap {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.form-actions {
  display: flex;
  gap: 0.5rem;
}
.form-actions-top { margin-bottom: 0; }
.action-btn {
  padding: 0.375rem 0.75rem;
  border-radius: 0.375rem;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid #cbd5e1;
  background: #f8fafc;
}
.action-btn-primary {
  background: #0f172a;
  color: #fff;
  border-color: #0f172a;
}
.action-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
.field { margin: 0; }
.file-textarea,
.file-pre {
  width: 100%;
  box-sizing: border-box;
  font-family: ui-monospace, monospace;
  font-size: 0.875rem;
  line-height: 1.5;
  padding: 0.75rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.375rem;
  background: #f8fafc;
}
.file-textarea {
  resize: vertical;
  min-height: 20rem;
}
.file-pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
  overflow-x: auto;
  max-height: 70vh;
  overflow-y: auto;
}
</style>
