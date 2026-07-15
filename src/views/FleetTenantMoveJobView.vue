<script setup>
/**
 * Tenant move job detail — S8.10 gates + S10.3 abort / retry / rollback.
 */
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import PanelBackLink from '@/components/PanelBackLink.vue'
import {
  getTenantMove,
  runTenantMove,
  advanceTenantMove,
  abortTenantMove,
  retryTenantMove,
  rollbackTenantMove
} from '@/api/fleetGatekeeper'
import { canFleet, FLEET_ABILITY } from '@/config/fleetGatekeeper'

const route = useRoute()
const jobId = computed(() => String(route.params.jobId || ''))
const tenantShortuid = computed(() => String(route.query.tenant || ''))

const job = ref(null)
const error = ref('')
const busy = ref(false)
const canMoves = computed(() => canFleet(FLEET_ABILITY.MOVES))
let timer = null

const phases = computed(() => {
  const p = job.value?.phases
  if (!p || typeof p !== 'object') return []
  return Object.entries(p).map(([name, row]) => ({ name, ...(row || {}) }))
})

const cutoverDone = computed(
  () => (job.value?.phases?.cutover?.status || '') === 'ok'
)

const canAbort = computed(() => {
  if (!job.value || !canMoves.value) return false
  const s = job.value.state
  if (['completed', 'aborted'].includes(s)) return false
  if (cutoverDone.value) return false
  return true
})

const canRollback = computed(() => {
  if (!job.value || !canMoves.value) return false
  if (['completed', 'aborted'].includes(job.value.state)) return false
  return cutoverDone.value
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
    if (job.value?.state === 'failed') {
      job.value = await retryTenantMove(jobId.value, tenantShortuid.value || undefined)
    } else {
      job.value = await runTenantMove(jobId.value, tenantShortuid.value || undefined)
    }
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

async function doAbort() {
  if (!window.confirm('Abort this move job? Source tenant will be left unchanged.')) return
  busy.value = true
  try {
    job.value = await abortTenantMove(jobId.value, tenantShortuid.value || undefined)
  } catch (e) {
    error.value = e?.message || 'Abort failed'
    await refresh()
  } finally {
    busy.value = false
  }
}

async function doRollback() {
  if (
    !window.confirm(
      'Roll back SBC cutover (and catalog home if updated)? Destination tenant data may still exist.'
    )
  ) {
    return
  }
  busy.value = true
  try {
    job.value = await rollbackTenantMove(jobId.value, tenantShortuid.value || undefined)
  } catch (e) {
    error.value = e?.message || 'Rollback failed'
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
      <p v-if="job.created_by || job.last_action_by" class="meta">
        <span v-if="job.created_by">Started by {{ job.created_by }}</span>
        <span v-if="job.last_action_by"> · last action {{ job.last_action_by }}</span>
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
          v-if="job.state === 'verifying' && canMoves"
          type="button"
          class="primary"
          :disabled="busy"
          @click="confirmGate('verifying')"
        >
          Confirm test call OK
        </button>
        <button
          v-if="job.state === 'awaiting_cleanup' && canMoves"
          type="button"
          class="danger"
          :disabled="busy"
          @click="confirmGate('cleanup')"
        >
          Delete tenant on source
        </button>
        <button
          v-if="['pending', 'failed'].includes(job.state) && canMoves"
          type="button"
          :disabled="busy"
          @click="retryRun"
        >
          {{ job.state === 'failed' ? 'Retry' : 'Run' }}
        </button>
        <button
          v-if="canAbort"
          type="button"
          :disabled="busy"
          @click="doAbort"
        >
          Abort
        </button>
        <button
          v-if="canRollback"
          type="button"
          class="danger"
          :disabled="busy"
          @click="doRollback"
        >
          Rollback cutover
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
.meta {
  color: #64748b;
  font-size: 0.9rem;
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
