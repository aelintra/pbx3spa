<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { getApiClient } from '@/api/client'
import { useStickyFilter } from '@/composables/useStickyFilter'
import { loadTenantOptions } from '@/utils/loadTenantOptions'
import { firstErrorMessage } from '@/utils/formErrors'
import ListLoadingState from '@/components/ListLoadingState.vue'

const router = useRouter()
const { filterText } = useStickyFilter('provision-streams')
const streams = ref([])
const tenants = ref([])
const cluster = ref('')
const loading = ref(true)
const error = ref('')

const tenantOptions = computed(() => {
  const list = tenants.value.map((t) => ({
    shortuid: t.shortuid,
    pkey: t.pkey ?? t.shortuid
  }))
  return list.filter((t) => t.shortuid)
})

const filtered = computed(() => {
  const q = (filterText.value || '').trim().toLowerCase()
  if (!q) return streams.value
  return streams.value.filter((s) => {
    return (
      (s.name || '').toLowerCase().includes(q) ||
      (s.source || '').toLowerCase().includes(q) ||
      (s.notes || '').toLowerCase().includes(q)
    )
  })
})

async function fetchTenants() {
  try {
    tenants.value = await loadTenantOptions()
    if (!cluster.value && tenants.value.length) {
      cluster.value = String(tenants.value[0].shortuid || tenants.value[0].pkey || '')
    }
  } catch {
    tenants.value = []
  }
}

async function loadStreams() {
  if (!cluster.value) {
    streams.value = []
    loading.value = false
    return
  }
  loading.value = true
  error.value = ''
  try {
    const res = await getApiClient().get('provision-streams', {
      params: { cluster: cluster.value }
    })
    streams.value = res.streams ?? []
  } catch (err) {
    error.value = firstErrorMessage(err, 'Failed to load provision streams')
    streams.value = []
  } finally {
    loading.value = false
  }
}

function openRow(row) {
  router.push({
    name: 'provision-stream-detail',
    params: { name: row.name },
    query: { cluster: cluster.value, source: row.source }
  })
}

onMounted(async () => {
  await fetchTenants()
  await loadStreams()
})

watch(cluster, () => {
  loadStreams()
})
</script>

<template>
  <div class="list-view provision-streams-list">
    <header class="list-header">
      <div class="list-header-row">
        <h1>Provision streams</h1>
        <button
          type="button"
          class="btn btn-primary"
          :disabled="!cluster"
          @click="router.push({ name: 'provision-stream-create', query: { cluster } })"
        >
          New customer fragment
        </button>
      </div>
      <p class="toolbar toolbar-filter">
        <label class="tenant-pick">
          Tenant
          <select v-model="cluster" aria-label="Tenant">
            <option v-for="t in tenantOptions" :key="t.shortuid" :value="t.shortuid">
              {{ t.pkey }}
            </option>
          </select>
        </label>
        <input
          v-model="filterText"
          type="search"
          class="filter-input"
          placeholder="Filter by name or source"
          aria-label="Filter provision streams"
        />
      </p>
      <p class="list-help">
        <strong>System</strong> = package stock (read-only). <strong>Customer</strong> = this tenant’s
        fragments (survive upgrade). Prefer
        <code>#INCLUDE</code> System first, then <code>site.…</code> Customer.
      </p>
    </header>

    <section v-if="loading || error" class="list-states">
      <ListLoadingState v-if="loading" message="Loading provision streams…" />
      <p v-else-if="error" class="error">{{ error }}</p>
    </section>

    <section v-else class="list-body">
      <div v-if="!cluster" class="empty">Select a tenant.</div>
      <div v-else-if="streams.length === 0" class="empty">No streams found.</div>
      <p v-else-if="filterText && filtered.length === 0" class="empty">No streams match the filter.</p>
      <table v-else class="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Source</th>
            <th>Refcount</th>
            <th>Updated</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in filtered"
            :key="row.source + ':' + row.name"
            class="click-row"
            @click="openRow(row)"
          >
            <td>{{ row.name }}</td>
            <td>
              <span :class="row.source === 'system' ? 'chip system' : 'chip customer'">{{
                row.source === 'system' ? 'System' : 'Customer'
              }}</span>
            </td>
            <td>{{ row.refcount ?? 0 }}</td>
            <td>{{ row.updated_at || '—' }}</td>
          </tr>
        </tbody>
      </table>
    </section>
  </div>
</template>

<style scoped>
.list-help {
  margin: 0.5rem 0 0;
  font-size: 0.9rem;
  opacity: 0.85;
  max-width: 48rem;
}
.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
}
.tenant-pick {
  display: flex;
  gap: 0.4rem;
  align-items: center;
  font-size: 0.9rem;
}
.click-row {
  cursor: pointer;
}
.chip {
  display: inline-block;
  padding: 0.1rem 0.45rem;
  border-radius: 0.25rem;
  font-size: 0.8rem;
}
.chip.system {
  background: color-mix(in srgb, var(--pbx-fg, #222) 12%, transparent);
}
.chip.customer {
  background: color-mix(in srgb, var(--pbx-accent, #2563eb) 18%, transparent);
}
</style>
