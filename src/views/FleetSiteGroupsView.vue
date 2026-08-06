<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  listFleetDialCohorts,
  createFleetDialCohort,
  refreshFleetSession
} from '@/api/fleetGatekeeper'
import {
  hasFleetGatekeeperToken,
  canFleet,
  FLEET_ABILITY,
  getFleetAbilities
} from '@/config/fleetGatekeeper'

const router = useRouter()
const cohorts = ref([])
const loading = ref(true)
const error = ref('')
const canManage = ref(false)

const showCreate = ref(false)
const createBusy = ref(false)
const createError = ref('')
const createForm = ref({ name: '', prefix_width: 2 })

const activeCohorts = computed(() =>
  (cohorts.value || []).filter((c) => String(c.status || '').toLowerCase() !== 'decommissioned')
)

async function load() {
  if (!hasFleetGatekeeperToken()) {
    loading.value = false
    error.value = ''
    cohorts.value = []
    canManage.value = false
    return
  }
  loading.value = true
  error.value = ''
  try {
    if (getFleetAbilities().length === 0) {
      await refreshFleetSession()
    }
    canManage.value = canFleet(FLEET_ABILITY.DIAL_COHORTS)
    const data = await listFleetDialCohorts()
    cohorts.value = data?.cohorts || []
  } catch (e) {
    error.value = e?.message || 'Failed to load Site Groups'
    cohorts.value = []
  } finally {
    loading.value = false
  }
}

function openCreate() {
  createError.value = ''
  createForm.value = { name: '', prefix_width: 2 }
  showCreate.value = true
}

function cancelCreate() {
  showCreate.value = false
  createError.value = ''
}

async function submitCreate() {
  createError.value = ''
  const name = (createForm.value.name || '').trim()
  if (!name) {
    createError.value = 'Name is required'
    return
  }
  const width = Number(createForm.value.prefix_width) || 2
  if (width < 2 || width > 4) {
    createError.value = 'Prefix width must be 2–4'
    return
  }
  createBusy.value = true
  try {
    const doc = await createFleetDialCohort({ name, prefix_width: width })
    showCreate.value = false
    await router.push({ name: 'fleet-site-group-detail', params: { id: doc.id } })
  } catch (e) {
    createError.value = e?.message || 'Create failed'
  } finally {
    createBusy.value = false
  }
}

function fmtUpdated(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

onMounted(load)
</script>

<template>
  <div class="fleet-site-groups-view">
    <h1>Site Groups</h1>
    <p class="hint">
      Shared destination routing prefixes among member tenants (full mesh). Isolates stay out until you
      add them. Sync projects dial prefixes onto each home node.
    </p>

    <p v-if="canManage" class="toolbar">
      <button
        type="button"
        class="primary"
        :disabled="loading || createBusy"
        @click="showCreate ? cancelCreate() : openCreate()"
      >
        {{ showCreate ? 'Cancel' : 'Create site group' }}
      </button>
    </p>

    <p v-if="loading">Loading…</p>
    <p v-else-if="error" class="error">{{ error }}</p>

    <form v-if="showCreate" class="create-panel" @submit.prevent="submitCreate">
      <h2>Create site group</h2>
      <label>
        Name
        <input v-model="createForm.name" type="text" required placeholder="e.g. Acme offices" />
      </label>
      <label>
        Prefix width
        <select v-model.number="createForm.prefix_width">
          <option :value="2">2 digits</option>
          <option :value="3">3 digits</option>
          <option :value="4">4 digits</option>
        </select>
      </label>
      <p v-if="createError" class="error">{{ createError }}</p>
      <div class="create-actions">
        <button type="submit" class="primary" :disabled="createBusy">
          {{ createBusy ? 'Creating…' : 'Create' }}
        </button>
        <button type="button" class="secondary" :disabled="createBusy" @click="cancelCreate">
          Cancel
        </button>
      </div>
    </form>

    <table v-if="!loading && !error && activeCohorts.length" class="data-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Members</th>
          <th>Prefixes ready</th>
          <th>Updated</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="c in activeCohorts"
          :key="c.id"
          class="clickable"
          @click="router.push({ name: 'fleet-site-group-detail', params: { id: c.id } })"
        >
          <td>
            <RouterLink
              class="linkish"
              :to="{ name: 'fleet-site-group-detail', params: { id: c.id } }"
              @click.stop
            >
              {{ c.name }}
            </RouterLink>
          </td>
          <td>{{ c.member_count ?? 0 }}</td>
          <td>{{ c.prefixes_ready ?? 0 }}/{{ c.member_count ?? 0 }}</td>
          <td>{{ fmtUpdated(c.updated_at) }}</td>
        </tr>
      </tbody>
    </table>
    <p v-else-if="hasFleetGatekeeperToken() && !loading && !error && !activeCohorts.length">
      No site groups yet.
    </p>
  </div>
</template>

<style scoped>
.fleet-site-groups-view {
  max-width: 56rem;
}
.hint {
  color: var(--pbx-text-muted);
  margin-bottom: 1rem;
}
.toolbar {
  margin-bottom: 1rem;
}
.error {
  color: var(--pbx-danger, #b00020);
}
.create-panel {
  margin: 1rem 0 1.5rem;
  padding: 1rem;
  border: 1px solid var(--pbx-border);
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  max-width: 28rem;
}
.create-panel h2 {
  margin: 0;
  font-size: 1.1rem;
}
.create-panel label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.875rem;
}
/* Match FleetTenants create-panel / FormField heights (native select otherwise tall on macOS). */
.create-panel input,
.create-panel select {
  display: block;
  width: 100%;
  box-sizing: border-box;
  margin: 0;
  min-height: 2.25rem;
  padding: 0.35rem 0.5rem;
  font: inherit;
  font-size: 0.95rem;
  line-height: 1.35;
  color: var(--pbx-text, inherit);
  background-color: var(--pbx-panel, #fff);
  border: 1px solid var(--pbx-border, #e2e8f0);
  border-radius: 4px;
}
.create-panel select {
  height: 2.25rem;
  appearance: auto;
}
.create-panel input:focus,
.create-panel select:focus {
  outline: none;
  border-color: var(--pbx-accent-bright, #3b82f6);
  box-shadow: 0 0 0 3px var(--pbx-focus-ring, rgba(59, 130, 246, 0.1));
}
.create-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.25rem;
}
.data-table {
  width: 100%;
  border-collapse: collapse;
}
.data-table th,
.data-table td {
  text-align: left;
  padding: 0.5rem 0.6rem;
  border-bottom: 1px solid var(--pbx-border, #eee);
}
.clickable {
  cursor: pointer;
}
.clickable:hover {
  background: var(--pbx-row-hover, #f7f7f7);
}
.linkish {
  color: inherit;
  text-decoration: underline;
}
button.primary {
  background: var(--pbx-accent, #2563eb);
  color: #fff;
  border: none;
  padding: 0.4rem 0.8rem;
  border-radius: 4px;
  cursor: pointer;
}
button.secondary {
  background: transparent;
  border: 1px solid var(--pbx-border, #ccc);
  padding: 0.4rem 0.8rem;
  border-radius: 4px;
  cursor: pointer;
}
</style>
