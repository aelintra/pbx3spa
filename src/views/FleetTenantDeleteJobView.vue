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
const typedShortuid = ref('')
const canManage = computed(() => canFleet(FLEET_ABILITY.INSTANCES))
let timer = null

const phases = computed(() => {
  const p = job.value?.phases
  if (!p || typeof p !== 'object') return []
  return Object.entries(p).map(([name, row]) => ({ name, ...(row || {}) }))
})

const awaitingConfirm = computed(() => job.value?.state === 'awaiting_confirm')
const canAbort = computed(() => {
  if (!job.value || !canManage.value) return false
  const s = job.value.state
  if (['completed', 'aborted'].includes(s)) return false
  if ((job.value.phases?.wiping_node?.status || '') === 'ok') return false
  return job.value.rollback?.safe_to_abort !== false
})

async function refresh() {
  if (!jobId.value) return
  try {
    job.value = await getTenantDelete(jobId.value, tenantShortuid.value || undefined)
    error.value = ''
  } catch (e) {
    error.value = e?.message || 'Failed to load delete job'
  }
}

async function retryRun() {
  busy.value = true
  error.value = ''
  try {
    if (job.value?.state === 'failed') {
      job.value = await retryTenantDelete(jobId.value, tenantShortuid.value || undefined)
    } else {
      job.value = await runTenantDelete(jobId.value, tenantShortuid.value || undefined)
    }
  } catch (e) {
    error.value = e?.message || 'Run failed'
    await refresh()
  } finally {
    busy.value = false
  }
}

async function doConfirm() {
  busy.value = true
  error.value = ''
  try {
    job.value = await confirmTenantDelete(jobId.value, {
      confirm: true,
      typed_shortuid: typedShortuid.value.trim(),
      tenant_shortuid: tenantShortuid.value || undefined
    })
  } catch (e) {
    error.value = e?.message || 'Confirm failed'
    await refresh()
  } finally {
    busy.value = false
  }
}

async function doAbort() {
  if (!window.confirm('Abort this delete job? Catalog tenant stays active if wipe has not run.')) {
    return
  }
  busy.value = true
  try {
    job.value = await abortTenantDelete(jobId.value, tenantShortuid.value || undefined)
  } catch (e) {
    error.value = e?.message || 'Abort failed'
    await refresh()
  } finally {
    busy.value = false
  }
}

onMounted(async () => {
  await refresh()
  timer = setInterval(refresh, 5000)
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
      Durable Fleet Delete (Rule 14). Confirm by typing the shortuid, then SBC domain remove → node wipe →
      catalog soft-decommission. Reopen anytime from Jobs.
    </p>

    <p v-if="error" class="error">{{ error }}</p>
    <p v-if="!job && !error">Loading…</p>

    <template v-if="job">
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
          <dd><strong>{{ job.state }}</strong></dd>
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

      <section v-if="awaitingConfirm && canManage" class="gate">
        <h2>Confirm delete</h2>
        <p>
          Irreversible on the node. Type shortuid
          <code>{{ job.tenant_shortuid }}</code> to continue.
        </p>
        <label>
          Shortuid
          <input v-model="typedShortuid" type="text" autocomplete="off" />
        </label>
        <button
          type="button"
          class="btn-danger"
          :disabled="busy || typedShortuid.trim().toLowerCase() !== String(job.tenant_shortuid).toLowerCase()"
          @click="doConfirm"
        >
          {{ busy ? 'Deleting…' : 'Confirm delete' }}
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
          <tr v-for="p in phases" :key="p.name">
            <td>{{ p.name }}</td>
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
}
.secondary {
  background: transparent;
  border: 1px solid var(--pbx-border);
  padding: 0.4rem 0.75rem;
  border-radius: 0.35rem;
  cursor: pointer;
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
</style>
