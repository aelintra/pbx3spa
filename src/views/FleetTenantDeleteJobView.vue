<script setup>
/**
 * Fleet Delete job detail — Rule 14 confirm gate (typed shortuid).
 */
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import PanelBackLink from '@/components/PanelBackLink.vue'
import {
  getTenantDelete,
  runTenantDelete,
  confirmTenantDelete,
  abortTenantDelete,
  retryTenantDelete
} from '@/api/fleetGatekeeper'
import { canFleet, FLEET_ABILITY } from '@/config/fleetGatekeeper'

const route = useRoute()
const jobId = computed(() => String(route.params.jobId || ''))
const tenantShortuid = computed(() => String(route.query.tenant || ''))

const job = ref(null)
const error = ref('')
const busy = ref(false)
/** Which action owns busy — drives spinner copy. */
const busyAction = ref('')
const typedShortuid = ref('')
const canManage = computed(() => canFleet(FLEET_ABILITY.INSTANCES))
let timer = null

/** Automated / in-flight states (not human gates or terminals). */
const WORKING_STATES = ['pending', 'preflight', 'pruning_mesh', 'removing_edge', 'wiping_node', 'catalog']
const TERMINAL_STATES = ['completed', 'failed', 'aborted']

const phases = computed(() => {
  const p = job.value?.phases
  if (!p || typeof p !== 'object') return []
  return Object.entries(p).map(([name, row]) => ({ name, ...(row || {}) }))
})

const awaitingConfirm = computed(() => job.value?.state === 'awaiting_confirm')
const isWorking = computed(() => {
  if (busy.value) return true
  const s = job.value?.state
  return !!s && WORKING_STATES.includes(s)
})
const isCompleted = computed(() => job.value?.state === 'completed')
const isFailed = computed(() => job.value?.state === 'failed')
const isAborted = computed(() => job.value?.state === 'aborted')
const workingLabel = computed(() => {
  if (busyAction.value === 'confirm') {
    return 'Deleting — Site Group prune → SBC domain → node wipe → catalog…'
  }
  if (busyAction.value === 'abort') return 'Aborting…'
  if (busyAction.value === 'run') return 'Running…'
  const s = job.value?.state
  if (s === 'pruning_mesh') return 'Pruning Site Group mesh…'
  if (s === 'removing_edge') return 'Removing SBC domain…'
  if (s === 'wiping_node') return 'Wiping tenant on the node…'
  if (s === 'catalog') return 'Soft-decommissioning catalog…'
  if (s === 'preflight' || s === 'pending') return 'Running preflight…'
  return 'Delete job in progress…'
})
const wipeTables = computed(() => {
  const tables = job.value?.wipe_counts?.tables
  if (!tables || typeof tables !== 'object') return []
  return Object.entries(tables)
    .filter(([, n]) => Number(n) > 0)
    .map(([name, count]) => ({ name, count: Number(count) }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
})
const wipeTotal = computed(() => Number(job.value?.wipe_counts?.total_rows ?? 0))
const canAbort = computed(() => {
  if (!job.value || !canManage.value) return false
  const s = job.value.state
  if (['completed', 'aborted'].includes(s)) return false
  if ((job.value.phases?.wiping_node?.status || '') === 'ok') return false
  return job.value.rollback?.safe_to_abort !== false
})

function phaseRowClass(p) {
  const st = String(p.status || '')
  if (st === 'running') return 'phase-running'
  if (st === 'ok' || st === 'skipped') return 'phase-ok'
  if (st === 'failed') return 'phase-failed'
  if (job.value?.state === p.name && isWorking.value) return 'phase-running'
  return ''
}

function schedulePoll() {
  if (timer) clearInterval(timer)
  const ms = isWorking.value ? 1500 : TERMINAL_STATES.includes(job.value?.state) ? 15000 : 5000
  timer = setInterval(refresh, ms)
}

async function refresh() {
  if (!jobId.value) return
  try {
    job.value = await getTenantDelete(jobId.value, tenantShortuid.value || undefined)
    error.value = ''
    schedulePoll()
  } catch (e) {
    error.value = e?.message || 'Failed to load delete job'
  }
}

async function retryRun() {
  busy.value = true
  busyAction.value = 'run'
  error.value = ''
  try {
    if (job.value?.state === 'failed') {
      job.value = await retryTenantDelete(jobId.value, tenantShortuid.value || undefined)
    } else {
      job.value = await runTenantDelete(jobId.value, tenantShortuid.value || undefined)
    }
    schedulePoll()
  } catch (e) {
    error.value = e?.message || 'Run failed'
    await refresh()
  } finally {
    busy.value = false
    busyAction.value = ''
    schedulePoll()
  }
}

async function doConfirm() {
  busy.value = true
  busyAction.value = 'confirm'
  error.value = ''
  schedulePoll()
  try {
    job.value = await confirmTenantDelete(jobId.value, {
      confirm: true,
      typed_shortuid: typedShortuid.value.trim(),
      tenant_shortuid: tenantShortuid.value || undefined
    })
    schedulePoll()
  } catch (e) {
    error.value = e?.message || 'Confirm failed'
    await refresh()
  } finally {
    busy.value = false
    busyAction.value = ''
    schedulePoll()
  }
}

async function doAbort() {
  if (!window.confirm('Abort this delete job? Catalog tenant stays active if wipe has not run.')) {
    return
  }
  busy.value = true
  busyAction.value = 'abort'
  try {
    job.value = await abortTenantDelete(jobId.value, tenantShortuid.value || undefined)
    schedulePoll()
  } catch (e) {
    error.value = e?.message || 'Abort failed'
    await refresh()
  } finally {
    busy.value = false
    busyAction.value = ''
    schedulePoll()
  }
}

onMounted(async () => {
  await refresh()
})
onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<template>
  <div class="fleet-delete-job">
    <PanelBackLink :to="{ name: 'fleet-jobs' }" label="Jobs" />
    <h1>Delete job</h1>
    <p class="hint">
      Durable Fleet Delete (Rule 14). Confirm by typing the shortuid, then Site Group mesh prune →
      SBC domain remove → node wipe → catalog soft-decommission. Reopen anytime from Jobs.
      Unreachable peer homes warn — retry this job or Site Group Sync now when they are back.
    </p>

    <p v-if="error" class="error">{{ error }}</p>
    <p v-if="!job && !error">Loading…</p>

    <template v-if="job">
      <p
        v-if="isWorking"
        class="status-banner status-working"
        role="status"
        aria-live="polite"
        :aria-busy="true"
      >
        <span class="spinner" aria-hidden="true" />
        <span>{{ workingLabel }}</span>
      </p>
      <p v-else-if="isCompleted" class="status-banner status-done" role="status">
        Delete finished — SBC domain removed, node wiped, catalog soft-decommissioned.
      </p>
      <p v-else-if="isFailed" class="status-banner status-failed" role="status">
        Delete failed — see Error and Phases below. Retry when ready.
      </p>
      <p v-else-if="isAborted" class="status-banner status-aborted" role="status">
        Delete aborted.
      </p>
      <p v-else-if="awaitingConfirm" class="status-banner status-wait" role="status">
        Waiting for confirm — type the shortuid below to continue.
      </p>

      <dl class="meta">
        <div>
          <dt>Job</dt>
          <dd><code>{{ job.job_id }}</code></dd>
        </div>
        <div>
          <dt>Tenant</dt>
          <dd>
            <code>{{ job.tenant_shortuid }}</code>
            <span v-if="job.tenant_pkey"> ({{ job.tenant_pkey }})</span>
          </dd>
        </div>
        <div>
          <dt>FQDN</dt>
          <dd>{{ job.tenant_fqdn || '—' }}</dd>
        </div>
        <div>
          <dt>State</dt>
          <dd>
            <strong>{{ job.state }}</strong>
            <span v-if="isWorking" class="state-live"> (in progress)</span>
            <span v-else-if="isCompleted" class="state-live"> (done)</span>
          </dd>
        </div>
        <div v-if="job.next_human_action">
          <dt>Next</dt>
          <dd>{{ job.next_human_action }}</dd>
        </div>
        <div v-if="job.error">
          <dt>Error</dt>
          <dd class="error">{{ job.error }}</dd>
        </div>
      </dl>

      <ul v-if="(job.warnings || []).length" class="warnings">
        <li v-for="(w, i) in job.warnings" :key="i">{{ w }}</li>
      </ul>

      <section v-if="awaitingConfirm && canManage && !isWorking" class="gate">
        <h2>Confirm delete</h2>
        <p>
          Irreversible on the node. Type shortuid
          <code>{{ job.tenant_shortuid }}</code> to continue.
        </p>
        <div v-if="job.wipe_counts" class="wipe-counts">
          <p>
            Node wipe will remove
            <strong>{{ wipeTotal }}</strong> child row(s) plus the cluster row.
          </p>
          <ul v-if="wipeTables.length" class="wipe-list">
            <li v-for="row in wipeTables" :key="row.name">
              <code>{{ row.name }}</code>: {{ row.count }}
            </li>
          </ul>
          <p v-else class="hint">No cluster-scoped child rows found (cluster row only).</p>
        </div>
        <p v-else class="hint">Wipe row counts unavailable — see warnings if any.</p>
        <label>
          Shortuid
          <input v-model="typedShortuid" type="text" autocomplete="off" />
        </label>
        <button
          type="button"
          class="btn-danger"
          :disabled="busy || typedShortuid.trim().toLowerCase() !== String(job.tenant_shortuid).toLowerCase()"
          :aria-busy="busyAction === 'confirm'"
          @click="doConfirm"
        >
          <span v-if="busyAction === 'confirm'" class="spinner spinner-inline" aria-hidden="true" />
          {{ busyAction === 'confirm' ? 'Deleting…' : 'Confirm delete' }}
        </button>
      </section>

      <p v-if="canManage" class="toolbar">
        <button
          v-if="job.state === 'failed' || ['pending', 'preflight'].includes(job.state)"
          type="button"
          class="secondary"
          :disabled="busy"
          @click="retryRun"
        >
          {{ job.state === 'failed' ? 'Retry' : 'Run' }}
        </button>
        <button v-if="canAbort" type="button" class="secondary" :disabled="busy" @click="doAbort">
          Abort
        </button>
        <button type="button" class="secondary" :disabled="busy" @click="refresh">Refresh</button>
      </p>

      <h2>Phases</h2>
      <table v-if="phases.length" class="data-table">
        <thead>
          <tr>
            <th>Phase</th>
            <th>Status</th>
            <th>Message</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in phases" :key="p.name" :class="phaseRowClass(p)">
            <td>
              <span v-if="phaseRowClass(p) === 'phase-running'" class="spinner spinner-inline" aria-hidden="true" />
              {{ p.name }}
            </td>
            <td>{{ p.status }}</td>
            <td>{{ p.message || '—' }}</td>
          </tr>
        </tbody>
      </table>
      <p v-else class="hint">No phases yet.</p>
    </template>
  </div>
</template>

<style scoped>
.fleet-delete-job {
  max-width: 40rem;
}
.hint {
  color: var(--pbx-text-muted);
  font-size: 0.9rem;
}
.error {
  color: var(--pbx-danger, #b91c1c);
}
.status-banner {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin: 1rem 0 0;
  padding: 0.75rem 1rem;
  border-radius: 0.35rem;
  font-size: 0.9rem;
}
.status-working {
  background: #eff6ff;
  color: #1e3a8a;
  border: 1px solid #bfdbfe;
}
.status-done {
  background: #ecfdf5;
  color: #065f46;
  border: 1px solid #a7f3d0;
}
.status-failed {
  background: #fef2f2;
  color: #991b1b;
  border: 1px solid #fecaca;
}
.status-aborted {
  background: #f8fafc;
  color: #475569;
  border: 1px solid #e2e8f0;
}
.status-wait {
  background: #fffbeb;
  color: #92400e;
  border: 1px solid #fde68a;
}
.state-live {
  font-weight: 400;
  color: var(--pbx-text-muted);
  font-size: 0.9rem;
}
.spinner {
  width: 1rem;
  height: 1rem;
  border: 2px solid #93c5fd;
  border-top-color: #1e3a8a;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  flex-shrink: 0;
}
.spinner-inline {
  width: 0.85rem;
  height: 0.85rem;
  display: inline-block;
  vertical-align: -0.1rem;
  margin-right: 0.25rem;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
.meta {
  display: grid;
  gap: 0.5rem;
  margin: 1rem 0;
}
.meta dt {
  font-size: 0.75rem;
  color: var(--pbx-text-muted);
}
.meta dd {
  margin: 0;
}
.warnings {
  color: #92400e;
  background: #fffbeb;
  padding: 0.75rem 1rem;
  border-radius: 0.35rem;
}
.gate {
  border: 1px solid var(--pbx-danger, #b91c1c);
  padding: 1rem;
  border-radius: 0.35rem;
  margin: 1rem 0;
}
.wipe-counts {
  margin: 0.75rem 0;
  font-size: 0.9rem;
}
.wipe-list {
  margin: 0.35rem 0 0;
  padding-left: 1.25rem;
  columns: 2;
  column-gap: 1.5rem;
}
.wipe-list li {
  break-inside: avoid;
}
.gate label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin: 0.75rem 0;
}
.gate input {
  max-width: 16rem;
  padding: 0.4rem 0.5rem;
}
.btn-danger {
  display: inline-flex;
  align-items: center;
  background: var(--pbx-danger, #b91c1c);
  color: #fff;
  border: none;
  padding: 0.5rem 0.9rem;
  border-radius: 0.35rem;
  cursor: pointer;
}
.btn-danger:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.toolbar {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.secondary {
  background: transparent;
  border: 1px solid var(--pbx-border);
  padding: 0.4rem 0.75rem;
  border-radius: 0.35rem;
  cursor: pointer;
}
.secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.data-table {
  width: 100%;
  border-collapse: collapse;
}
.data-table th,
.data-table td {
  text-align: left;
  padding: 0.4rem 0.5rem;
  border-bottom: 1px solid var(--pbx-border);
  font-size: 0.875rem;
}
.phase-running {
  background: #eff6ff;
}
.phase-ok {
  color: #065f46;
}
.phase-failed {
  background: #fef2f2;
  color: #991b1b;
}
</style>
