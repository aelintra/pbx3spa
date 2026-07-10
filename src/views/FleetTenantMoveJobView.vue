<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import PanelBackLink from '@/components/PanelBackLink.vue'
import { getTenantMove, runTenantMove, advanceTenantMove } from '@/api/fleetGatekeeper'

const route = useRoute()
const jobId = computed(() => String(route.params.jobId || ''))
const tenantShortuid = computed(() => String(route.query.tenant || ''))

const job = ref(null)
const error = ref('')
const busy = ref(false)
let timer = null

const phases = computed(() => {
  const p = job.value?.phases
  if (!p || typeof p !== 'object') return []
  return Object.entries(p).map(([name, row]) => ({ name, ...(row || {}) }))
})

async function refresh() {
  if (!jobId.value) return
  try {
    job.value = await getTenantMove(jobId.value, tenantShortuid.value || undefined)
    error.value = ''
  } catch (e) {
    error.value = e?.message || 'Failed to load job'
  }
}

async function retryRun() {
  busy.value = true
  try {
    job.value = await runTenantMove(jobId.value, tenantShortuid.value || undefined)
  } catch (e) {
    error.value = e?.message || 'Run failed'
    await refresh()
  } finally {
    busy.value = false
  }
}

async function confirmGate(gate) {
  busy.value = true
  try {
    job.value = await advanceTenantMove(jobId.value, {
      confirm: gate,
      tenant_shortuid: tenantShortuid.value || undefined
    })
  } catch (e) {
    error.value = e?.message || 'Advance failed'
    await refresh()
  } finally {
    busy.value = false
  }
}

onMounted(async () => {
  await refresh()
  timer = setInterval(refresh, 4000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<template>
  <div class="job-view">
    <PanelBackLink :to="{ name: 'fleet-tenants' }" label="Fleet tenants">
      <h1>Move job</h1>
    </PanelBackLink>

    <p v-if="error" class="error">{{ error }}</p>
    <p v-if="!job && !error">Loading…</p>

    <template v-if="job">
      <p>
        <strong>{{ job.tenant_shortuid }}</strong>
        · <code>{{ job.job_id }}</code>
        · state <strong>{{ job.state }}</strong>
      </p>
      <p v-if="job.next_human_action" class="gate">{{ job.next_human_action }}</p>
      <p v-if="job.error" class="error">{{ job.error }}</p>

      <table v-if="phases.length" class="data-table">
        <thead>
          <tr>
            <th>Phase</th>
            <th>Status</th>
            <th>Message</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in phases" :key="p.name">
            <td>{{ p.name }}</td>
            <td>{{ p.status }}</td>
            <td>{{ p.message || '—' }}</td>
          </tr>
        </tbody>
      </table>

      <div class="actions">
        <button
          v-if="job.state === 'verifying'"
          type="button"
          class="primary"
          :disabled="busy"
          @click="confirmGate('verifying')"
        >
          Confirm test call OK
        </button>
        <button
          v-if="job.state === 'awaiting_cleanup'"
          type="button"
          class="danger"
          :disabled="busy"
          @click="confirmGate('cleanup')"
        >
          Delete tenant on source
        </button>
        <button
          v-if="['pending', 'failed'].includes(job.state)"
          type="button"
          :disabled="busy"
          @click="retryRun"
        >
          {{ job.state === 'failed' ? 'Retry run' : 'Run' }}
        </button>
        <button type="button" :disabled="busy" @click="refresh">Refresh</button>
      </div>

      <p v-if="job.rollback?.hint" class="hint">Rollback: {{ job.rollback.hint }}</p>
    </template>
  </div>
</template>

<style scoped>
.job-view {
  max-width: 48rem;
}
.gate {
  background: #fef3c7;
  padding: 0.75rem 1rem;
  border-radius: 4px;
}
.error {
  color: #b91c1c;
}
.hint {
  color: #64748b;
  font-size: 0.9rem;
  margin-top: 1rem;
}
.data-table {
  width: 100%;
  border-collapse: collapse;
  margin: 1rem 0;
}
.data-table th,
.data-table td {
  text-align: left;
  padding: 0.45rem 0.6rem;
  border-bottom: 1px solid #e2e8f0;
}
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 1rem;
}
button.primary {
  background: #0f172a;
  color: #fff;
  border: none;
  padding: 0.45rem 0.9rem;
  cursor: pointer;
}
button.danger {
  background: #b91c1c;
  color: #fff;
  border: none;
  padding: 0.45rem 0.9rem;
  cursor: pointer;
}
button:disabled {
  opacity: 0.5;
}
</style>
