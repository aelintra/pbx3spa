<script setup>
import { ref, onMounted } from 'vue'
import { getApiClient } from '@/api/client'
import { useToastStore } from '@/stores/toast'
import { firstErrorMessage } from '@/utils/formErrors'

const toast = useToastStore()
const files = ref([])
const loading = ref(true)
const error = ref('')
const committing = ref(false)

async function loadFiles() {
  loading.value = true
  error.value = ''
  try {
    const res = await getApiClient().get('astfiles')
    files.value = res.files ?? []
  } catch (err) {
    error.value = firstErrorMessage(err, 'Failed to load Asterisk files')
    files.value = []
  } finally {
    loading.value = false
  }
}

async function doCommit() {
  if (!confirm('Commit will apply configuration changes and reload Asterisk. Continue?')) return
  committing.value = true
  try {
    await getApiClient().get('syscommands/commit')
    toast.show('Committed')
  } catch (err) {
    toast.show(firstErrorMessage(err, 'Commit failed'), 'error')
  } finally {
    committing.value = false
  }
}

onMounted(loadFiles)
</script>

<template>
  <div class="astfiles-list-view">
    <header class="list-header">
      <h1>Asterisk Files</h1>
      <p class="toolbar">
        <button
          type="button"
          class="action-btn action-btn-primary"
          :disabled="committing"
          @click="doCommit"
        >
          {{ committing ? 'Committing…' : 'Commit' }}
        </button>
      </p>
    </header>

    <section v-if="loading || error" class="list-states">
      <p v-if="loading" class="loading">Loading Asterisk files…</p>
      <p v-else-if="error" class="error">{{ error }}</p>
    </section>

    <section v-else class="list-body">
      <div v-if="files.length === 0" class="empty">No files found in /etc/asterisk.</div>
      <table v-else class="table">
        <thead>
          <tr>
            <th>Filename</th>
            <th>Read-only</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="f in files" :key="f.filename">
            <td>
              <router-link :to="{ name: 'asterisk-file-detail', params: { filename: f.filename } }" class="cell-link">
                {{ f.filename }}
              </router-link>
            </td>
            <td>{{ f.readonly ? 'Yes' : 'No' }}</td>
          </tr>
        </tbody>
      </table>
    </section>
  </div>
</template>

<style scoped>
.astfiles-list-view {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.list-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1rem;
}
.list-header h1 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
  color: #0f172a;
}
.toolbar {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
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
.list-states .loading,
.list-states .error {
  margin: 0;
}
.loading { color: #64748b; }
.error { color: #b91c1c; }
.empty { color: #64748b; }
.table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}
.table th,
.table td {
  padding: 0.5rem 0.75rem;
  text-align: left;
  border-bottom: 1px solid #e2e8f0;
}
.table th { font-weight: 600; color: #0f172a; }
.cell-link {
  color: #2563eb;
  text-decoration: none;
}
.cell-link:hover { text-decoration: underline; }
</style>
