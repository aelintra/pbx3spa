<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getApiClient } from '@/api/client'
import { useToastStore } from '@/stores/toast'
import { firstErrorMessage } from '@/utils/formErrors'
import DeleteConfirmModal from '@/components/DeleteConfirmModal.vue'
import PanelBackLink from '@/components/PanelBackLink.vue'
import { useUnsavedForm } from '@/composables/useUnsavedForm'

const route = useRoute()
const router = useRouter()
const toast = useToastStore()
const { markDirty, beginHydrate, markClean } = useUnsavedForm()

const name = computed(() => decodeURIComponent(String(route.params.name || '')))
const cluster = computed(() => String(route.query.cluster || ''))

const row = ref(null)
const loading = ref(true)
const error = ref('')
const editBody = ref('')
const editNotes = ref('')
const warnings = ref([])
const saving = ref(false)
const saveError = ref('')
const deleting = ref(false)
const deleteError = ref('')
const confirmDeleteOpen = ref(false)
const confirmEmptyOpen = ref(false)
const copyTo = ref('')
const copying = ref(false)

const isSystem = computed(() => row.value?.source === 'system' || row.value?.read_only === true)
const isCustomer = computed(() => row.value?.source === 'customer')

async function fetchRow() {
  if (!name.value || !cluster.value) {
    error.value = 'Missing name or cluster'
    loading.value = false
    return
  }
  beginHydrate()
  loading.value = true
  error.value = ''
  try {
    const enc = encodeURIComponent(name.value)
    row.value = await getApiClient().get(`provision-streams/${enc}`, {
      params: { cluster: cluster.value }
    })
    editBody.value = row.value.body ?? ''
    editNotes.value = row.value.notes ?? ''
    warnings.value = []
    copyTo.value = name.value.startsWith('site.') ? name.value : `site.${name.value}`
    markClean()
  } catch (err) {
    error.value = firstErrorMessage(err, 'Failed to load stream')
    row.value = null
  } finally {
    loading.value = false
  }
}

async function doSave() {
  saving.value = true
  saveError.value = ''
  try {
    const enc = encodeURIComponent(name.value)
    const q = `?cluster=${encodeURIComponent(cluster.value)}`
    const res = await getApiClient().put(`provision-streams/${enc}${q}`, {
      body: editBody.value,
      notes: editNotes.value
    })
    row.value = res
    warnings.value = res.warnings ?? []
    markClean()
    toast.success('Saved')
    if (warnings.value.length) {
      toast.info(warnings.value[0])
    }
  } catch (err) {
    saveError.value = firstErrorMessage(err, 'Save failed')
  } finally {
    saving.value = false
  }
}

function onSaveClick() {
  if (trimEmpty(editBody.value) && !confirmEmptyOpen.value) {
    confirmEmptyOpen.value = true
    return
  }
  confirmEmptyOpen.value = false
  doSave()
}

function trimEmpty(s) {
  return String(s || '').trim() === ''
}

async function doDelete(force = false) {
  deleting.value = true
  deleteError.value = ''
  try {
    const enc = encodeURIComponent(name.value)
    const forceQ = force ? '&force=1' : ''
    await getApiClient().delete(
      `provision-streams/${enc}?cluster=${encodeURIComponent(cluster.value)}${forceQ}`
    )
    toast.success('Deleted')
    router.push({ name: 'provision-streams', query: { cluster: cluster.value } })
  } catch (err) {
    const status = err?.response?.status
    if (status === 409 && !force) {
      deleteError.value =
        firstErrorMessage(err, 'Still referenced') +
        ' — confirm force delete if you intend to break those #INCLUDEs.'
      // leave modal open for force
      return
    }
    deleteError.value = firstErrorMessage(err, 'Delete failed')
  } finally {
    deleting.value = false
  }
}

async function forceDelete() {
  await doDelete(true)
  confirmDeleteOpen.value = false
}

async function copyFromSystem() {
  if (!copyTo.value) return
  copying.value = true
  try {
    const res = await getApiClient().post('provision-streams/copy-from-system', {
      cluster: cluster.value,
      from: name.value,
      to: copyTo.value
    })
    toast.success('Copied to customer fragment')
    router.push({
      name: 'provision-stream-detail',
      params: { name: res.name },
      query: { cluster: cluster.value, source: 'customer' }
    })
  } catch (err) {
    toast.error(firstErrorMessage(err, 'Copy failed'))
  } finally {
    copying.value = false
  }
}

onMounted(fetchRow)
watch(() => [route.params.name, route.query.cluster], fetchRow)
</script>

<template>
  <div class="detail-view provision-stream-detail">
    <PanelBackLink :to="{ name: 'provision-streams', query: { cluster } }" label="Provision streams" />

    <header class="detail-header">
      <h1>{{ name }}</h1>
      <p v-if="row" class="meta">
        <span>{{ isSystem ? 'System (read-only)' : 'Customer' }}</span>
        <span v-if="row.refcount != null"> · refcount {{ row.refcount }}</span>
      </p>
    </header>

    <p v-if="loading">Loading…</p>
    <p v-else-if="error" class="error">{{ error }}</p>

    <template v-else-if="row">
      <section v-if="isSystem" class="panel">
        <label class="field">
          <span>Body</span>
          <textarea class="mono" :value="row.body" rows="18" readonly />
        </label>
        <div class="copy-row">
          <label>
            Copy to customer name
            <input v-model="copyTo" type="text" />
          </label>
          <button type="button" class="btn btn-primary" :disabled="copying" @click="copyFromSystem">
            {{ copying ? 'Copying…' : 'Copy to customer…' }}
          </button>
        </div>
      </section>

      <section v-else class="panel">
        <label class="field">
          <span>Notes</span>
          <input
            v-model="editNotes"
            type="text"
            @input="markDirty"
          />
        </label>
        <label class="field">
          <span>Body</span>
          <textarea
            v-model="editBody"
            class="mono"
            rows="18"
            @input="markDirty"
          />
        </label>
        <ul v-if="warnings.length" class="warnings">
          <li v-for="(w, i) in warnings" :key="i">{{ w }}</li>
        </ul>
        <p v-if="saveError" class="error">{{ saveError }}</p>
        <div class="actions">
          <button type="button" class="btn btn-primary" :disabled="saving" @click="onSaveClick">
            {{ saving ? 'Saving…' : 'Save' }}
          </button>
          <button type="button" class="btn btn-danger" @click="confirmDeleteOpen = true">Delete</button>
        </div>
      </section>
    </template>

    <DeleteConfirmModal
      :show="confirmDeleteOpen"
      title="Delete customer fragment?"
      :body-text="
        deleteError ||
        `Delete ${name}? If extensions still #INCLUDE it, you will need force confirm.`
      "
      :loading="deleting"
      @cancel="confirmDeleteOpen = false"
      @confirm="doDelete(false)"
    />
    <DeleteConfirmModal
      :show="!!(deleteError && confirmDeleteOpen)"
      title="Force delete?"
      :body-text="deleteError"
      confirm-label="Force delete"
      :loading="deleting"
      @cancel="confirmDeleteOpen = false"
      @confirm="forceDelete"
    />
    <DeleteConfirmModal
      :show="confirmEmptyOpen"
      title="Save empty body?"
      body-text="Body is empty. Save anyway?"
      confirm-label="Save empty"
      @cancel="confirmEmptyOpen = false"
      @confirm="doSave"
    />
  </div>
</template>

<style scoped>
.meta {
  opacity: 0.8;
  margin-top: 0.25rem;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin-bottom: 1rem;
}
.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.85rem;
  width: 100%;
}
.copy-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: end;
}
.actions {
  display: flex;
  gap: 0.75rem;
}
.warnings {
  color: #a16207;
  margin: 0 0 1rem;
}
.error {
  color: #b91c1c;
}
</style>
