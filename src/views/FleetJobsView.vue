<script setup>
import { ref, onMounted } from 'vue'
import { listTenantMoves, listTenantDeletes, refreshFleetSession } from '@/api/fleetGatekeeper'
import { hasFleetGatekeeperToken, getFleetAbilities } from '@/config/fleetGatekeeper'

const moveJobs = ref([])
const deleteJobs = ref([])
const loading = ref(true)
const error = ref('')

async function load() {
  if (!hasFleetGatekeeperToken()) {
    loading.value = false
    error.value = ''
    moveJobs.value = []
    deleteJobs.value = []
    return
  }
  loading.value = true
  error.value = ''
  try {
    if (getFleetAbilities().length === 0) {
      await refreshFleetSession()
    }
    const [moves, deletes] = await Promise.all([listTenantMoves(50), listTenantDeletes(50)])
    moveJobs.value = moves
    deleteJobs.value = deletes
  } catch (e) {
    error.value = e?.message || 'Failed to load jobs'
    moveJobs.value = []
    deleteJobs.value = []
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="fleet-jobs-view">
    <h1>Fleet jobs</h1>
    <p class="hint">
      Tenant move and delete jobs from the gatekeeper (S3). Reopen a job anytime — you do not need to stay
      on the detail page.
    </p>

    <p v-if="loading">Loading…</p>
    <p v-else-if="error" class="error">{{ error }}</p>

    <template v-else>
      <h2>Delete jobs</h2>
      <table v-if="deleteJobs.length" class="data-table">
        <thead>
          <tr>
            <th>Tenant</th>
            <th>Job</th>
            <th>State</th>
            <th>Started by</th>
            <th>Updated</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="j in deleteJobs" :key="j.job_id">
            <td><code>{{ j.tenant_shortuid }}</code></td>
            <td><code>{{ j.job_id }}</code></td>
            <td>{{ j.state }}</td>
            <td>{{ j.created_by || '—' }}</td>
            <td>{{ j.updated_at || j.created_at || '—' }}</td>
            <td>
              <RouterLink
                :to="{
                  name: 'fleet-tenant-delete-job',
                  params: { jobId: j.job_id },
                  query: { tenant: j.tenant_shortuid }
                }"
              >
                Open
              </RouterLink>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-else class="hint">No delete jobs yet. Start one from Tenants → Delete.</p>

      <h2>Move jobs</h2>
      <table v-if="moveJobs.length" class="data-table">
        <thead>
          <tr>
            <th>Tenant</th>
            <th>Job</th>
            <th>State</th>
            <th>Started by</th>
            <th>Updated</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="j in moveJobs" :key="j.job_id">
            <td><code>{{ j.tenant_shortuid }}</code></td>
            <td><code>{{ j.job_id }}</code></td>
            <td>{{ j.state }}</td>
            <td>{{ j.created_by || '—' }}</td>
            <td>{{ j.updated_at || j.created_at || '—' }}</td>
            <td>
              <RouterLink
                :to="{
                  name: 'fleet-tenant-move-job',
                  params: { jobId: j.job_id },
                  query: { tenant: j.tenant_shortuid }
                }"
              >
                Open
              </RouterLink>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-else class="hint">No move jobs found yet. Start one from Tenants → Move.</p>
    </template>
  </div>
</template>

<style scoped>
.fleet-jobs-view {
  max-width: 56rem;
}
.hint {
  color: var(--pbx-text-muted);
  font-size: 0.9rem;
}
.error {
  color: var(--pbx-danger, #b91c1c);
}
h2 {
  margin-top: 1.5rem;
  font-size: 1.1rem;
}
.data-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 0.5rem;
}
.data-table th,
.data-table td {
  text-align: left;
  padding: 0.5rem 0.65rem;
  border-bottom: 1px solid var(--pbx-border);
  font-size: 0.875rem;
}
</style>
