<script setup>
/**
 * S10.4 — catalog ↔ SBC domain.setid drift + force-project (catalog → edge).
 */
import { ref, computed, onMounted } from 'vue'
import {
  getFleetReconcile,
  projectFleetReconcile,
  pruneFleetReconcileOrphans,
  refreshFleetSession
} from '@/api/fleetGatekeeper'
import {
  hasFleetGatekeeperToken,
  getFleetAbilities,
  canFleet,
  FLEET_ABILITY
} from '@/config/fleetGatekeeper'

const report = ref(null)
const loading = ref(false)
const projecting = ref(false)
const pruning = ref(false)
const error = ref('')
const actionMsg = ref('')
const canEdge = computed(() => canFleet(FLEET_ABILITY.EDGE))

const projectableCount = computed(() =>
  (report.value?.drifts || []).filter(
    (d) => d.kind === 'setid_mismatch' || d.kind === 'missing_fleet_tag'
  ).length
)

const orphanCount = computed(() =>
  (report.value?.drifts || []).filter((d) => d.kind === 'orphan_on_sbc').length
)

async function load() {
  if (!hasFleetGatekeeperToken()) {
    report.value = null
    error.value = ''
    loading.value = false
    return
  }
  loading.value = true
  error.value = ''
  try {
    if (getFleetAbilities().length === 0) {
      await refreshFleetSession()
    }
    if (!canFleet(FLEET_ABILITY.EDGE)) {
      report.value = null
      error.value = 'This session lacks fleet_edge — cannot run reconcile.'
      return
    }
    report.value = await getFleetReconcile()
  } catch (e) {
    report.value = null
    error.value = e?.message || 'Failed to run reconcile'
  } finally {
    loading.value = false
  }
}

async function forceProject() {
  if (!canEdge.value || projectableCount.value < 1) return
  const ok = window.confirm(
    `Apply catalog → SBC for ${projectableCount.value} tenant domain(s)?\n\n` +
      'This UPDATES THE SBC to match the catalog (home of record).\n' +
      'It does NOT change the catalog, and it is NOT “undo my Instances edit”.\n\n' +
      'If you mistyped an instance SBC setid on Instances, fix that first — then re-check.\n' +
      'Only project when the catalog setid is correct and the SBC has drifted (or you intentionally want the SBC to follow a new valid setid).'
  )
  if (!ok) return

  projecting.value = true
  actionMsg.value = ''
  error.value = ''
  try {
    const result = await projectFleetReconcile({ confirm: true })
    const projected = result.projected || []
    const okN = projected.filter((p) => p.ok).length
    const failN = projected.length - okN
    const skipN = (result.skipped || []).length
    const failDetail = projected
      .filter((p) => !p.ok)
      .map((p) => `${p.domain}: ${p.error || 'failed'}`)
      .join(' · ')
    actionMsg.value =
      `Applied catalog → SBC on ${okN} domain(s)` +
      (failN ? `, ${failN} failed` : '') +
      (skipN ? `; ${skipN} drift(s) not projectable` : '') +
      '.'
    if (failDetail) {
      error.value = failDetail
      actionMsg.value = ''
    }
    report.value = result.after || (await getFleetReconcile())
  } catch (e) {
    error.value = e?.message || 'Project failed'
  } finally {
    projecting.value = false
  }
}

async function pruneOrphans() {
  if (!canEdge.value || orphanCount.value < 1) return
  const ok = window.confirm(
    `Remove ${orphanCount.value} orphan SBC domain row(s)?\n\n` +
      'These domains are on the SBC but not in the active catalog ' +
      '(leftover from prior tenants, deleted installs, or decommissioned instances).\n\n' +
      'Fleet-owned rows only. Dispatcher sets are not removed.'
  )
  if (!ok) return

  pruning.value = true
  actionMsg.value = ''
  error.value = ''
  try {
    const result = await pruneFleetReconcileOrphans({ confirm: true, fleet_owned_only: true })
    const pruned = result.pruned || []
    const okN = pruned.filter((p) => p.ok).length
    const failN = pruned.length - okN
    const skipN = (result.skipped || []).length
    const failDetail = pruned
      .filter((p) => !p.ok)
      .map((p) => `${p.domain}: ${p.error || 'failed'}`)
      .join(' · ')
    actionMsg.value =
      `Removed ${okN} orphan domain(s)` +
      (failN ? `, ${failN} failed` : '') +
      (skipN ? `; ${skipN} skipped (not fleet-owned)` : '') +
      '.'
    if (failDetail) {
      error.value = failDetail
      actionMsg.value = ''
    }
    report.value = result.after || (await getFleetReconcile())
  } catch (e) {
    error.value = e?.message || 'Prune failed'
  } finally {
    pruning.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="fleet-reconcile-view">
    <h1>Catalog reconcile</h1>
    <p class="hint">
      <strong>Fleet Instances = catalog (S3), not the SBC.</strong>
      Drift means catalog expected setid ≠ live SBC <code>domain.setid</code>.
      Catalog is home of record (Rule 13).
    </p>
    <ul class="hint-list">
      <li>
        Changed an instance <strong>SBC setid</strong> by mistake? Fix it on
        <RouterLink to="/fleet/instances">Instances</RouterLink> — do not project.
      </li>
      <li>
        Catalog is correct and SBC is wrong (break-glass Filament edit, failed move, etc.)?
        Use <strong>Apply catalog → SBC</strong> to push catalog onto the edge.
      </li>
      <li>
        Project never “undoes” a catalog edit. It makes the SBC match whatever the catalog
        currently says (including a wrong setid — that will fail or break routing).
      </li>
      <li>
        <strong>Orphan domains</strong> (prior lab cycles, Fleet Delete skipped, decommissioned
        instances) are removed automatically on <strong>Provision edge</strong>, or manually here.
      </li>
    </ul>

    <div v-if="hasFleetGatekeeperToken()" class="toolbar">
      <button type="button" class="primary" :disabled="loading || projecting || pruning || !canEdge" @click="load">
        {{ loading ? 'Checking…' : 'Run check' }}
      </button>
      <button
        v-if="projectableCount > 0"
        type="button"
        class="danger"
        :disabled="loading || projecting || pruning || !canEdge"
        @click="forceProject"
      >
        {{ projecting ? 'Applying…' : `Apply catalog → SBC (${projectableCount})` }}
      </button>
      <button
        v-if="orphanCount > 0"
        type="button"
        class="danger"
        :disabled="loading || projecting || pruning || !canEdge"
        @click="pruneOrphans"
      >
        {{ pruning ? 'Removing…' : `Remove orphan domains (${orphanCount})` }}
      </button>
      <span v-if="report?.checked_at" class="checked-at">Last check {{ report.checked_at }}</span>
    </div>

    <p v-if="actionMsg" class="ok-msg">{{ actionMsg }}</p>
    <p v-if="error" class="error">{{ error }}</p>

    <template v-if="report">
      <div class="summary" :class="report.ok ? 'ok' : 'drift'">
        <strong>{{ report.ok ? 'In sync' : 'Drift detected' }}</strong>
        <span>
          matched {{ report.summary?.matched ?? 0 }} /
          {{ report.summary?.tenants ?? 0 }} tenants ·
          {{ report.summary?.errors ?? 0 }} errors ·
          {{ report.summary?.warnings ?? 0 }} warnings ·
          {{ report.summary?.sbc_domains ?? 0 }} SBC domains
        </span>
      </div>

      <table v-if="report.drifts?.length" class="data-table">
        <thead>
          <tr>
            <th>Severity</th>
            <th>Kind</th>
            <th>Tenant</th>
            <th>Domain</th>
            <th>Expected</th>
            <th>Actual</th>
            <th>Detail</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(d, i) in report.drifts" :key="i" :class="d.severity">
            <td>{{ d.severity }}</td>
            <td><code>{{ d.kind }}</code></td>
            <td><code>{{ d.shortuid || '—' }}</code></td>
            <td><code>{{ d.domain || '—' }}</code></td>
            <td>{{ d.expected_setid ?? '—' }}</td>
            <td>{{ d.actual_setid ?? '—' }}</td>
            <td>{{ d.detail }}</td>
          </tr>
        </tbody>
      </table>
      <p v-else class="ok-msg">No drifts. Catalog matches SBC domain projection.</p>
    </template>
  </div>
</template>

<style scoped>
.fleet-reconcile-view {
  max-width: 64rem;
}
.hint {
  color: var(--pbx-text-muted);
  font-size: 0.9rem;
}
.hint-list {
  color: var(--pbx-text-muted);
  font-size: 0.85rem;
  margin: 0.5rem 0 1rem;
  padding-left: 1.25rem;
}
.hint-list li {
  margin: 0.35rem 0;
}
.toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
  margin: 1rem 0;
}
.primary,
.danger {
  padding: 0.4rem 0.85rem;
  border-radius: 4px;
  border: 1px solid var(--pbx-border);
  cursor: pointer;
  font: inherit;
}
.primary {
  background: var(--pbx-primary, #2563eb);
  color: #fff;
}
.danger {
  background: #fff;
  color: var(--pbx-danger, #b91c1c);
  border-color: #fca5a5;
}
.primary:disabled,
.danger:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.checked-at {
  font-size: 0.85rem;
  color: var(--pbx-text-muted);
}
.error {
  color: var(--pbx-danger, #b91c1c);
}
.summary {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.75rem 1rem;
  border-radius: 4px;
  border: 1px solid var(--pbx-border);
  margin-bottom: 1rem;
  font-size: 0.9rem;
}
.summary.ok {
  border-color: #86efac;
  background: #f0fdf4;
}
.summary.drift {
  border-color: #fcd34d;
  background: #fffbeb;
}
.ok-msg {
  color: var(--pbx-text-muted);
}
.data-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 0.5rem;
}
.data-table th,
.data-table td {
  text-align: left;
  padding: 0.45rem 0.55rem;
  border-bottom: 1px solid var(--pbx-border);
  font-size: 0.825rem;
  vertical-align: top;
}
tr.error td:first-child {
  color: var(--pbx-danger, #b91c1c);
  font-weight: 600;
}
tr.warning td:first-child {
  color: #b45309;
  font-weight: 600;
}
</style>
