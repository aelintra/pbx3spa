<script setup>
import { ref, onMounted } from 'vue'
import { listTenantMoves, refreshFleetSession } from '@/api/fleetGatekeeper'
import { hasFleetGatekeeperToken, getFleetAbilities } from '@/config/fleetGatekeeper'

const jobs = ref([])
const loading = ref(true)
const error = ref('')

async function load() {
  if (!hasFleetGatekeeperToken()) {
    loading.value = false
    error.value = ''
    jobs.value = []
    return
  }
  loading.value = true
  error.value = ''
  try {
    if (getFleetAbilities().length === 0) {
      await refreshFleetSession()
    }
    jobs.value = await listTenantMoves(50)
  } catch (e) {
    error.value = e?.message || 'Failed to load move jobs'
    jobs.value = []
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="fleet-jobs-view">
    <h1>Move jobs</h1>
    <p class="hint">
      Recent tenant-move jobs from the gatekeeper (S3 catalog). Open a job in
      <code>awaiting_cleanup</code> to wipe the source after drain — you do not need to stay on the job page.
    </p>

    <p v-if="loading">Loading…</p>
    <p v-else-if="error" class="error">{{ error }}</p>

    <table v-else-if="jobs.length" class="data-table">
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
        <tr v-for="j in jobs" :key="j.job_id">
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
    <p v-else-if="hasFleetGatekeeperToken()">No move jobs found yet. Start one from Tenants → Move.</p>
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
.data-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 1rem;
}
.data-table th,
.data-table td {
  text-align: left;
  padding: 0.5rem 0.65rem;
  border-bottom: 1px solid var(--pbx-border);
  font-size: 0.875rem;
}
</style>
