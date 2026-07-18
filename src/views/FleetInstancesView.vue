<script setup>
/**
 * Fleet instances catalog (S10.2) — register, edit metadata, maintenance, soft decommission.
 */
import { ref, computed, onMounted } from 'vue'
import {
  getFleetCatalog,
  listFleetDispatcherSets,
  refreshFleetSession,
  registerFleetInstance,
  patchFleetInstance,
  decommissionFleetInstance,
  provisionFleetInstanceEdge
} from '@/api/fleetGatekeeper'
import {
  hasFleetGatekeeperToken,
  getFleetAbilities,
  canFleet,
  FLEET_ABILITY
} from '@/config/fleetGatekeeper'
import { instanceHealthBadge, probeRttLabel } from '@/utils/fleetInstanceHealth'

const instances = ref([])
const dispatcherSets = ref([])
const loading = ref(true)
const refreshing = ref(false)
const error = ref('')
const actionError = ref('')
const busyId = ref('')
const copiedId = ref('')
let copiedTimer = 0
const canManage = computed(() => canFleet(FLEET_ABILITY.INSTANCES))
const canEdge = computed(() => canFleet(FLEET_ABILITY.EDGE))

const showRegister = ref(false)
const registerBusy = ref(false)
const reg = ref({
  id: '',
  fqdn: '',
  api_base_url: '',
  label: '',
  environment: 'lab',
  status: 'active',
  sbc_dispatcher_setid: '',
  sbc_backend_uri: '',
  skip_verify: false
})

const editingId = ref('')
const editDraft = ref({ label: '', notes: '', environment: '' })
const linkingId = ref('')
const linkSetid = ref('')
const provisioningId = ref('')
const provisionUri = ref('')

const provisioningRow = computed(() =>
  instances.value.find((i) => i.id === provisioningId.value) || null
)

async function load({ soft = false } = {}) {
  if (!hasFleetGatekeeperToken()) {
    loading.value = false
    refreshing.value = false
    error.value = ''
    instances.value = []
    dispatcherSets.value = []
    return
  }
  if (soft) {
    refreshing.value = true
  } else {
    loading.value = true
  }
  error.value = ''
  actionError.value = ''
  try {
    if (getFleetAbilities().length === 0) {
      await refreshFleetSession()
    }
    const [catalog, sets] = await Promise.all([
      getFleetCatalog(),
      listFleetDispatcherSets().catch(() => [])
    ])
    instances.value = catalog.instances || []
    dispatcherSets.value = sets
  } catch (e) {
    error.value = e?.message || 'Failed to load fleet instances'
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

function refresh() {
  return load({ soft: true })
}

function startEdit(row) {
  editingId.value = row.id
  linkingId.value = ''
  provisioningId.value = ''
  editDraft.value = {
    label: row.label || '',
    notes: row.notes || '',
    environment: row.environment || ''
  }
  actionError.value = ''
}

function cancelEdit() {
  editingId.value = ''
}

function startLink(row) {
  linkingId.value = row.id
  editingId.value = ''
  provisioningId.value = ''
  linkSetid.value =
    row.sbc_dispatcher_setid != null && row.sbc_dispatcher_setid !== ''
      ? String(row.sbc_dispatcher_setid)
      : ''
  actionError.value = ''
}

function cancelLink() {
  linkingId.value = ''
  linkSetid.value = ''
}

function startProvision(row) {
  provisioningId.value = row.id
  editingId.value = ''
  linkingId.value = ''
  provisionUri.value =
    row.sbc_backend_uri ||
    (row.fqdn ? `sip:${String(row.fqdn).toLowerCase()}:5060` : '')
  actionError.value = ''
}

function cancelProvision() {
  provisioningId.value = ''
  provisionUri.value = ''
}

async function doProvision() {
  const row = provisioningRow.value
  if (!row) return
  actionError.value = ''
  const hasSetid = Number(row.sbc_dispatcher_setid) >= 1
  if (hasSetid) {
    const ok = window.confirm(
      `Update SBC edge for "${row.label || row.fqdn || row.id}" (setid ${row.sbc_dispatcher_setid})?\n\n` +
        'Changes the dispatcher destination and Asterisk Peer URI. Live calls may be affected.'
    )
    if (!ok) return
  }
  busyId.value = row.id
  try {
    const body = {}
    const uri = provisionUri.value.trim()
    if (uri) {
      body.backend_uri = uri
    }
    if (hasSetid) {
      body.confirm = true
    }
    await provisionFleetInstanceEdge(row.id, body)
    provisioningId.value = ''
    provisionUri.value = ''
    await load()
  } catch (e) {
    actionError.value = e?.message || 'Provision edge failed'
  } finally {
    busyId.value = ''
  }
}

async function saveEdit(id) {
  actionError.value = ''
  busyId.value = id
  try {
    const body = {
      label: editDraft.value.label.trim(),
      notes: editDraft.value.notes.trim(),
      environment: editDraft.value.environment.trim() || undefined
    }
    if (!body.label) {
      throw new Error('Label required')
    }
    if (!body.environment) {
      delete body.environment
    }
    await patchFleetInstance(id, body)
    editingId.value = ''
    await load()
  } catch (e) {
    actionError.value = e?.message || 'Update failed'
  } finally {
    busyId.value = ''
  }
}

async function saveLink(id) {
  actionError.value = ''
  busyId.value = id
  try {
    const setid = Number(linkSetid.value)
    if (!Number.isInteger(setid) || setid < 1) {
      throw new Error('Pick a live SBC dispatcher set')
    }
    await patchFleetInstance(id, { sbc_dispatcher_setid: setid })
    linkingId.value = ''
    await load()
  } catch (e) {
    actionError.value = e?.message || 'Link setid failed'
  } finally {
    busyId.value = ''
  }
}

async function setStatus(id, status) {
  actionError.value = ''
  busyId.value = id
  try {
    await patchFleetInstance(id, { status })
    await load()
  } catch (e) {
    actionError.value = e?.message || 'Status update failed'
  } finally {
    busyId.value = ''
  }
}

async function doDecommission(row) {
  const ok = window.confirm(
    `Soft-decommission "${row.label || row.fqdn || row.id}"?\n\n` +
      'Hides it from the instance picker. Does not stop the node or delete S3 backups.'
  )
  if (!ok) return
  actionError.value = ''
  busyId.value = row.id
  try {
    await decommissionFleetInstance(row.id)
    await load()
  } catch (e) {
    actionError.value = e?.message || 'Decommission failed'
  } finally {
    busyId.value = ''
  }
}

async function doRegister() {
  actionError.value = ''
  registerBusy.value = true
  try {
    const body = {
      id: reg.value.id.trim(),
      fqdn: reg.value.fqdn.trim(),
      api_base_url: reg.value.api_base_url.trim().replace(/\/$/, ''),
      label: (reg.value.label.trim() || reg.value.fqdn.trim()),
      status: reg.value.status || 'active',
      verify_up: !reg.value.skip_verify
    }
    if (reg.value.environment) {
      body.environment = reg.value.environment
    }
    if (reg.value.sbc_dispatcher_setid !== '') {
      const setid = Number(reg.value.sbc_dispatcher_setid)
      if (!Number.isInteger(setid) || setid < 1) {
        throw new Error('Pick a live SBC dispatcher set')
      }
      body.sbc_dispatcher_setid = setid
    }
    if (reg.value.sbc_backend_uri.trim()) {
      body.sbc_backend_uri = reg.value.sbc_backend_uri.trim()
    }
    if (!body.id || !body.fqdn || !body.api_base_url) {
      throw new Error('id, fqdn, and api_base_url are required')
    }
    await registerFleetInstance(body)
    showRegister.value = false
    reg.value = {
      id: '',
      fqdn: '',
      api_base_url: '',
      label: '',
      environment: 'lab',
      status: 'active',
      sbc_dispatcher_setid: '',
      sbc_backend_uri: '',
      skip_verify: false
    }
    await load()
  } catch (e) {
    actionError.value = e?.message || 'Register failed'
  } finally {
    registerBusy.value = false
  }
}

function statusClass(status) {
  const s = (status || 'active').toLowerCase()
  if (s === 'maintenance') return 'badge badge--warn'
  if (s === 'decommissioned') return 'badge badge--muted'
  return 'badge'
}

function healthClass(kind) {
  if (kind === 'healthy') return 'badge badge--ok'
  if (kind === 'warning') return 'badge badge--warn'
  if (kind === 'degraded') return 'badge badge--degraded'
  if (kind === 'down') return 'badge badge--down'
  if (kind === 'paused') return 'badge badge--muted'
  return 'badge badge--muted'
}

/** @returns {{ health: ReturnType<typeof instanceHealthBadge>, rtt: string|null }} */
function statusBits(row) {
  return {
    health: instanceHealthBadge(row),
    rtt: probeRttLabel(row)
  }
}

async function copyId(id) {
  actionError.value = ''
  try {
    await navigator.clipboard.writeText(id)
    copiedId.value = id
    window.clearTimeout(copiedTimer)
    copiedTimer = window.setTimeout(() => {
      if (copiedId.value === id) copiedId.value = ''
    }, 1500)
  } catch {
    actionError.value = 'Could not copy instance id'
  }
}

onMounted(load)
</script>

<template>
  <div class="fleet-instances-view">
    <h1>Fleet instances</h1>
    <p class="hint">
      Org catalog via gatekeeper (S3 home of record). Register upserts the directory row after a live
      <code>/up</code> check. Soft decommission hides from the picker only.
      <strong>Provision edge</strong> creates a dispatcher set + Asterisk Peer on the SBC and writes
      catalog setid (Rule 13). Applying catalog setid onto tenant domains is
      <RouterLink to="/fleet/reconcile">Reconcile → Apply catalog → SBC</RouterLink>.
      Health badges use Gatekeeper probe state (manual refresh).
    </p>

    <p v-if="actionError" class="error">{{ actionError }}</p>

    <div v-if="hasFleetGatekeeperToken()" class="toolbar">
      <button type="button" class="secondary" :disabled="loading || refreshing" @click="refresh">
        {{ refreshing ? 'Refreshing…' : 'Refresh' }}
      </button>
      <button
        v-if="canManage"
        type="button"
        class="primary"
        @click="showRegister = !showRegister"
      >
        {{ showRegister ? 'Cancel register' : 'Register instance' }}
      </button>
    </div>

    <form
      v-if="showRegister && canManage"
      class="register-box"
      @submit.prevent="doRegister"
    >
      <h2>Register instance</h2>
      <p class="hint">
        <code>id</code> must match node <code>globals.id</code> (KSUID). Probe uses
        <code>api_base_url</code> → <code>/up</code>.
      </p>
      <label>
        Instance id (KSUID)
        <input v-model="reg.id" required autocomplete="off" />
      </label>
      <label>
        FQDN
        <input v-model="reg.fqdn" required placeholder="08jzwn.pbx3.com" autocomplete="off" />
      </label>
      <label>
        API base URL
        <input
          v-model="reg.api_base_url"
          required
          placeholder="https://08jzwn.pbx3.com:44300/api"
          autocomplete="off"
        />
      </label>
      <label>
        Label
        <input v-model="reg.label" placeholder="defaults to FQDN" autocomplete="off" />
      </label>
      <label>
        Environment
        <select v-model="reg.environment">
          <option value="lab">lab</option>
          <option value="staging">staging</option>
          <option value="production">production</option>
        </select>
      </label>
      <label>
        SBC dispatcher setid
        <select v-model="reg.sbc_dispatcher_setid">
          <option value="">— unset (provision / link later) —</option>
          <option v-for="s in dispatcherSets" :key="s.setid" :value="String(s.setid)">
            set {{ s.setid }} ({{ s.destinations }} dest)
          </option>
        </select>
      </label>
      <label>
        SBC backend URI (optional)
        <input
          v-model="reg.sbc_backend_uri"
          placeholder="sip:fqdn:5060 — used by Provision edge"
          autocomplete="off"
        />
      </label>
      <label class="checkbox-row">
        <input v-model="reg.skip_verify" type="checkbox" />
        Skip /up verify (lab if control cannot reach node :44300)
      </label>
      <button type="submit" class="primary" :disabled="registerBusy">
        {{
          registerBusy
            ? reg.skip_verify
              ? 'Registering…'
              : 'Verifying /up…'
            : reg.skip_verify
              ? 'Register (no /up)'
              : 'Register (verify /up)'
        }}
      </button>
    </form>

    <div v-if="provisioningRow" class="edge-panel">
      <div class="edge-panel__title">
        {{ Number(provisioningRow.sbc_dispatcher_setid) >= 1 ? 'Update' : 'Provision' }} edge —
        {{ provisioningRow.label || provisioningRow.fqdn || provisioningRow.id }}
        <span v-if="provisioningRow.sbc_dispatcher_setid" class="muted">
          (setid {{ provisioningRow.sbc_dispatcher_setid }})
        </span>
      </div>
      <label class="edge-panel__field">
        Backend SIP URI
        <input
          v-model="provisionUri"
          class="inline-input"
          placeholder="sip:host:5060"
          autocomplete="off"
        />
      </label>
      <div class="edge-panel__actions">
        <button
          type="button"
          class="primary"
          :disabled="busyId === provisioningRow.id"
          @click="doProvision"
        >
          {{ Number(provisioningRow.sbc_dispatcher_setid) >= 1 ? 'Confirm update' : 'Create edge' }}
        </button>
        <button type="button" class="linkish" :disabled="busyId === provisioningRow.id" @click="cancelProvision">
          Cancel
        </button>
      </div>
    </div>

    <p v-if="loading">Loading…</p>
    <p v-else-if="error" class="error">{{ error }}</p>

    <table v-else-if="instances.length" class="data-table">
      <thead>
        <tr>
          <th>Instance</th>
          <th>FQDN</th>
          <th>Env</th>
          <th>Setid</th>
          <th>Status</th>
          <th v-if="canManage || canEdge">Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="i in instances"
          :key="i.id"
          :class="{ 'row-active': provisioningId === i.id || linkingId === i.id || editingId === i.id }"
        >
          <td>
            <template v-if="editingId === i.id">
              <input v-model="editDraft.label" class="inline-input" />
              <label class="notes-edit">
                Notes
                <input v-model="editDraft.notes" class="inline-input" />
              </label>
              <div class="action-row">
                <button type="button" class="linkish" :disabled="busyId === i.id" @click="saveEdit(i.id)">
                  Save
                </button>
                <button type="button" class="linkish" :disabled="busyId === i.id" @click="cancelEdit">
                  Cancel
                </button>
              </div>
            </template>
            <template v-else>
              <div class="inst-label">{{ i.label || i.fqdn || i.id }}</div>
              <div class="inst-id-row">
                <code class="inst-id">{{ i.id }}</code>
                <button
                  type="button"
                  class="copy-id"
                  :title="copiedId === i.id ? 'Copied' : 'Copy instance id'"
                  @click="copyId(i.id)"
                >
                  {{ copiedId === i.id ? 'Copied' : 'Copy' }}
                </button>
              </div>
            </template>
          </td>
          <td class="cell-fqdn">
            {{ i.fqdn || '—' }}
            <div v-if="i.sbc_backend_uri" class="muted tiny" :title="i.sbc_backend_uri">
              {{ i.sbc_backend_uri }}
            </div>
          </td>
          <td>
            <template v-if="editingId === i.id">
              <select v-model="editDraft.environment" class="inline-input env-input">
                <option value="">—</option>
                <option value="lab">lab</option>
                <option value="staging">staging</option>
                <option value="production">production</option>
              </select>
            </template>
            <template v-else>
              {{ i.environment || '—' }}
            </template>
          </td>
          <td class="cell-setid">
            <template v-if="linkingId === i.id">
              <select v-model="linkSetid" class="inline-input setid-input">
                <option disabled value="">…</option>
                <option v-for="s in dispatcherSets" :key="s.setid" :value="String(s.setid)">
                  {{ s.setid }}
                </option>
              </select>
              <div class="action-row">
                <button
                  type="button"
                  class="linkish"
                  :disabled="busyId === i.id || !linkSetid"
                  @click="saveLink(i.id)"
                >
                  Save
                </button>
                <button type="button" class="linkish" :disabled="busyId === i.id" @click="cancelLink">
                  Cancel
                </button>
              </div>
            </template>
            <template v-else>
              {{ i.sbc_dispatcher_setid ?? '—' }}
            </template>
          </td>
          <td>
            <div v-for="bits in [statusBits(i)]" :key="i.id + '-status'" class="status-stack">
              <span :class="statusClass(i.status)">{{ i.status || 'active' }}</span>
              <span :class="healthClass(bits.health.kind)">{{ bits.health.label }}</span>
              <span v-if="bits.rtt" class="rtt" title="Last /up probe round-trip">{{ bits.rtt }}</span>
            </div>
          </td>
          <td v-if="canManage || canEdge" class="actions">
            <template v-if="editingId !== i.id && linkingId !== i.id">
              <button
                v-if="canManage"
                type="button"
                class="linkish"
                :disabled="busyId === i.id"
                @click="startEdit(i)"
              >
                Edit
              </button>
              <button
                v-if="canEdge"
                type="button"
                class="linkish"
                :disabled="busyId === i.id"
                @click="startProvision(i)"
              >
                {{ Number(i.sbc_dispatcher_setid) >= 1 ? 'Edge' : 'Provision' }}
              </button>
              <button
                v-if="canManage && (i.status || 'active') !== 'maintenance'"
                type="button"
                class="linkish"
                :disabled="busyId === i.id"
                @click="setStatus(i.id, 'maintenance')"
              >
                Maint
              </button>
              <button
                v-if="canManage && (i.status || 'active') !== 'active'"
                type="button"
                class="linkish"
                :disabled="busyId === i.id"
                @click="setStatus(i.id, 'active')"
              >
                Activate
              </button>
              <button
                v-if="canManage && (i.status || 'active') !== 'decommissioned'"
                type="button"
                class="linkish danger"
                :disabled="busyId === i.id"
                @click="doDecommission(i)"
              >
                Decom
              </button>
              <details v-if="canManage" class="advanced-actions">
                <summary>Advanced</summary>
                <p class="advanced-hint">
                  Link setid attaches an <strong>already-live</strong> dispatcher set (catch-up). Prefer
                  Provision for new nodes.
                </p>
                <button
                  type="button"
                  class="linkish muted-action"
                  :disabled="busyId === i.id || !dispatcherSets.length"
                  @click="startLink(i)"
                >
                  Link setid
                </button>
              </details>
            </template>
            <span v-else class="muted">…</span>
          </td>
        </tr>
      </tbody>
    </table>
    <p v-else-if="hasFleetGatekeeperToken()">No instances in catalog yet.</p>
  </div>
</template>

<style scoped>
.fleet-instances-view {
  max-width: 64rem;
}
.hint {
  color: var(--pbx-text-muted);
  font-size: 0.9rem;
}
.error {
  color: var(--pbx-danger, #b91c1c);
}
.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
  margin: 0.75rem 0;
}
.register-box {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-width: 28rem;
  margin: 0.75rem 0 1.25rem;
  padding: 1rem;
  border: 1px solid var(--pbx-border);
  border-radius: 0.5rem;
  background: var(--pbx-surface-subtle, #f8fafc);
}
.register-box h2 {
  margin: 0;
  font-size: 1.05rem;
}
.register-box label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.85rem;
  color: var(--pbx-text-muted);
}
.register-box .checkbox-row {
  flex-direction: row;
  align-items: center;
  gap: 0.5rem;
}
.register-box input,
.register-box select,
.inline-input {
  padding: 0.35rem 0.5rem;
  font: inherit;
  color: var(--pbx-text, inherit);
}
.edge-panel {
  margin: 0.75rem 0 1rem;
  padding: 0.85rem 1rem;
  border: 1px solid var(--pbx-border);
  border-radius: 0.5rem;
  background: var(--pbx-surface-subtle, #f8fafc);
  max-width: 32rem;
}
.edge-panel__title {
  font-size: 0.95rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
}
.edge-panel__field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.8rem;
  color: var(--pbx-text-muted);
  margin-bottom: 0.65rem;
}
.edge-panel__field .inline-input {
  width: 100%;
  box-sizing: border-box;
}
.edge-panel__actions {
  display: flex;
  align-items: center;
  gap: 0.85rem;
}
.data-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 1rem;
}
.data-table th,
.data-table td {
  text-align: left;
  padding: 0.45rem 0.5rem;
  border-bottom: 1px solid var(--pbx-border);
  font-size: 0.875rem;
  vertical-align: middle;
}
.data-table th {
  color: var(--pbx-text-muted);
  font-weight: 600;
  font-size: 0.8rem;
}
.row-active {
  background: var(--pbx-surface-subtle, #f8fafc);
}
.inst-label {
  font-weight: 500;
}
.inst-id-row {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.45rem;
  margin-top: 0.15rem;
}
.inst-id {
  font-size: 0.7rem;
  color: var(--pbx-text-muted);
  word-break: break-all;
  white-space: normal;
}
.copy-id {
  border: none;
  background: none;
  padding: 0;
  color: var(--pbx-accent, #1d4ed8);
  cursor: pointer;
  font: inherit;
  font-size: 0.7rem;
  text-decoration: underline;
}
.status-stack {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.25rem;
}
.rtt {
  font-size: 0.75rem;
  color: var(--pbx-text-muted);
  font-variant-numeric: tabular-nums;
}
.cell-fqdn {
  max-width: 12rem;
}
.cell-fqdn .tiny {
  max-width: 12rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.cell-setid {
  width: 4.5rem;
  white-space: nowrap;
}
.setid-input,
.env-input {
  max-width: 4.5rem;
}
.muted {
  color: var(--pbx-text-muted);
}
.muted.tiny {
  font-size: 0.75rem;
  margin-top: 0.15rem;
}
.actions {
  white-space: nowrap;
}
.actions .linkish {
  margin-right: 0.55rem;
}
.advanced-actions {
  display: inline-block;
  margin-top: 0.35rem;
  font-size: 0.8rem;
  color: var(--pbx-text-muted);
}
.advanced-actions summary {
  cursor: pointer;
  list-style: none;
}
.advanced-actions summary::-webkit-details-marker {
  display: none;
}
.advanced-actions summary::before {
  content: '▸ ';
}
.advanced-actions[open] summary::before {
  content: '▾ ';
}
.advanced-hint {
  margin: 0.35rem 0 0.45rem;
  max-width: 16rem;
  white-space: normal;
  font-size: 0.75rem;
  line-height: 1.35;
  color: var(--pbx-text-muted);
}
.muted-action {
  opacity: 0.85;
}
.action-row {
  display: flex;
  gap: 0.55rem;
  margin-top: 0.35rem;
}
.notes-edit {
  display: block;
  margin: 0.35rem 0;
  font-size: 0.8rem;
  color: var(--pbx-text-muted);
}
.badge {
  display: inline-block;
  padding: 0.1rem 0.45rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  background: #e0f2fe;
  color: #075985;
}
.badge--ok {
  background: #dcfce7;
  color: #166534;
}
.badge--warn {
  background: #fef3c7;
  color: #92400e;
}
.badge--degraded {
  background: #ffedd5;
  color: #9a3412;
}
.badge--down {
  background: #fee2e2;
  color: #991b1b;
}
.badge--muted {
  background: #f1f5f9;
  color: #64748b;
}
.linkish {
  border: none;
  background: none;
  padding: 0;
  color: var(--pbx-accent, #1d4ed8);
  cursor: pointer;
  font: inherit;
  text-decoration: underline;
}
.linkish.danger {
  color: var(--pbx-danger, #b91c1c);
}
.linkish:disabled {
  opacity: 0.5;
  cursor: default;
}
button.primary {
  align-self: flex-start;
  padding: 0.4rem 0.85rem;
  border: none;
  border-radius: 0.35rem;
  background: var(--pbx-accent, #1d4ed8);
  color: #fff;
  font: inherit;
  cursor: pointer;
}
button.primary:disabled {
  opacity: 0.6;
}
button.secondary {
  align-self: flex-start;
  padding: 0.4rem 0.85rem;
  border: 1px solid var(--pbx-border, #cbd5e1);
  border-radius: 0.35rem;
  background: var(--pbx-surface, #fff);
  color: var(--pbx-text, inherit);
  font: inherit;
  cursor: pointer;
}
button.secondary:disabled {
  opacity: 0.6;
  cursor: default;
}
</style>
