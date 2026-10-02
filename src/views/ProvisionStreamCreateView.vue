<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getApiClient } from '@/api/client'
import { useToastStore } from '@/stores/toast'
import { loadTenantOptions } from '@/utils/loadTenantOptions'
import { firstErrorMessage } from '@/utils/formErrors'
import PanelBackLink from '@/components/PanelBackLink.vue'
import DeleteConfirmModal from '@/components/DeleteConfirmModal.vue'

const route = useRoute()
const router = useRouter()
const toast = useToastStore()

const tenants = ref([])
const cluster = ref(String(route.query.cluster || ''))
const pkey = ref('')
const body = ref('')
const notes = ref('')
const saving = ref(false)
const saveError = ref('')
const confirmEmptyOpen = ref(false)

const tenantOptions = computed(() =>
  tenants.value
    .map((t) => ({ shortuid: t.shortuid, pkey: t.pkey ?? t.shortuid }))
    .filter((t) => t.shortuid)
)

async function fetchTenants() {
  try {
    tenants.value = await loadTenantOptions()
    if (!cluster.value && tenants.value.length) {
      cluster.value = String(tenants.value[0].shortuid)
    }
  } catch {
    tenants.value = []
  }
}

async function doCreate() {
  saving.value = true
  saveError.value = ''
  try {
    const res = await getApiClient().post('provision-streams', {
      cluster: cluster.value,
      pkey: pkey.value.trim(),
      body: body.value,
      notes: notes.value || null
    })
    toast.success('Created')
    if (res.warnings?.length) toast.info(res.warnings[0])
    router.push({
      name: 'provision-stream-detail',
      params: { name: res.name },
      query: { cluster: cluster.value, source: 'customer' }
    })
  } catch (err) {
    saveError.value = firstErrorMessage(err, 'Create failed')
  } finally {
    saving.value = false
  }
}

function onCreateClick() {
  if (!pkey.value.trim()) {
    saveError.value = 'Name is required'
    return
  }
  if (String(body.value || '').trim() === '') {
    confirmEmptyOpen.value = true
    return
  }
  doCreate()
}

onMounted(fetchTenants)
</script>

<template>
  <div class="create-view provision-stream-create">
    <PanelBackLink :to="{ name: 'provision-streams', query: { cluster } }" label="Provision streams" />
    <header><h1>New customer fragment</h1></header>

    <label class="field">
      <span>Tenant</span>
      <select v-model="cluster">
        <option v-for="t in tenantOptions" :key="t.shortuid" :value="t.shortuid">
          {{ t.pkey }}
        </option>
      </select>
    </label>
    <label class="field">
      <span>Name</span>
      <input v-model="pkey" type="text" placeholder="site.ReceptionBLF" />
      <span class="hint">Prefer site.… — must not match a System filename.</span>
    </label>
    <label class="field">
      <span>Notes</span>
      <input v-model="notes" type="text" />
    </label>
    <label class="field">
      <span>Body</span>
      <textarea v-model="body" class="mono" rows="14" placeholder="Only lines to add or change…" />
    </label>
    <p v-if="saveError" class="error">{{ saveError }}</p>
    <button type="button" class="btn btn-primary" :disabled="saving" @click="onCreateClick">
      {{ saving ? 'Creating…' : 'Create' }}
    </button>

    <DeleteConfirmModal
      :show="confirmEmptyOpen"
      title="Create with empty body?"
      body-text="Body is empty. Create anyway?"
      confirm-label="Create empty"
      @cancel="confirmEmptyOpen = false"
      @confirm="doCreate"
    />
  </div>
</template>

<style scoped>
.field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin-bottom: 1rem;
  max-width: 48rem;
}
.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.85rem;
}
.hint {
  font-size: 0.85rem;
  opacity: 0.75;
}
.error {
  color: #b91c1c;
}
</style>
