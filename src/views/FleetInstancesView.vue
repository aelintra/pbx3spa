<script setup>
/**
 * Fleet instances catalog (S10.2) — register, edit metadata, maintenance, soft decommission.
 */
import { ref, computed, onMounted, onUnmounted } from 'vue'
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
  canFleet,
  FLEET_ABILITY
} from '@/config/fleetGatekeeper'
import { instanceHealthBadge, probeRttLabel, instanceEgressBadge, freshestProbeAgeMs, formatProbeAge } from '@/utils/fleetInstanceHealth'

const instances = ref([])
const dispatcherSets = ref([])
const loading = ref(true)
const refreshing = ref(false)
const error = ref('')
const actionError = ref('')
const busyId = ref('')
const copiedId = ref('')
let copiedTimer = 0
const canManage = ref(false)
const canEdge = ref(false)

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
    canManage.value = false
    canEdge.value = false
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
    // Always re-read /me. Cached sessionStorage abilities can be stale (e.g. fleet_read
    // from a prior session) and would hide Register instance.
    await refreshFleetSession()
    canManage.value = canFleet(FLEET_ABILITY.INSTANCES)
    canEdge.value = canFleet(FLEET_ABILITY.EDGE)
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

function instanceHasSetid(row) {
  return Number(row?.sbc_dispatcher_setid) >= 1
}

function startLink(row) {
  linkingId.value = row.id
  editingId.value = ''
  provisioningId.value = ''
  linkSetid.value = instanceHasSetid(row) ? String(row.sbc_dispatcher_setid) : ''
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
  // Prefer an existing IP URI; never pre-fill sip:{fqdn}:5060 — operators click through
  // and the SBC rejects DNS-name backends. Empty field + IP placeholder forces a real IP.
  const existing = String(row.sbc_backend_uri || '').trim()
  const host = existing.replace(/^sip:/i, '').split(':')[0] || ''
  const looksLikeIp = /^\d{1,3}(?:\.\d{1,3}){3}$/.test(host)
  provisionUri.value = looksLikeIp ? existing : ''
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
  const uri = provisionUri.value.trim()
  if (!uri) {
    actionError.value = 'Backend SIP URI required — use sip:nnn.nnn.nnn.nnn:5060 (public IP, not FQDN)'
    return
  }
  const host = uri.replace(/^sip:/i, '').split(':')[0] || ''
  if (!/^\d{1,3}(?:\.\d{1,3}){3}$/.test(host)) {
    actionError.value =
      'Backend SIP URI must use a public IP (sip:nnn.nnn.nnn.nnn:5060). FQDN backends are rejected.'
    return
  }
  const hasSetid = instanceHasSetid(row)
  if (hasSetid) {
    const ok = window.confirm(
      `Update SBC edge for "${row.label || row.fqdn || row.id}" (setid ${row.sbc_dispatcher_setid})?\n\n` +
        'Changes the dispatcher destination and Asterisk Peer URI. Live calls may be affected.'
    )
    if (!ok) return
  }
  busyId.value = row.id
  try {
    const body = { backend_uri: uri }
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
      throw new Error('Name required')
    }
    if (!body.environment) {
      delete body.environment
    }
    await patchFleetInstance(id, body)
    editingId.value = ''
    await load()
  } catch (e) {
    actionError.value = e?.message || 'Update failed (Name syncs to the node — check fleet token / node /up)'
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
      label: reg.value.label.trim(),
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
    if (!body.label) {
      throw new Error('label (friendly Name) is required — not the FQDN/shortuid')
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

const openStatusId = ref('')
const openMenuId = ref('')

/** @returns {{ health: ReturnType<typeof instanceHealthBadge>, rtt: string|null, egress: ReturnType<typeof instanceEgressBadge> }} */
function statusBits(row) {
  return {
    health: instanceHealthBadge(row),
    rtt: probeRttLabel(row),
    egress: instanceEgressBadge(row)
  }
}

/**
 * One colored word for the Status column; detail lines for the popup.
 * Tone: green / red / yellow / muted (worst of probe + egress; decom → muted).
 * @returns {{ word: string, tone: 'green'|'red'|'yellow'|'muted', lines: string[] }}
 */
function statusSummary(row) {
  const bits = statusBits(row)
  const lifecycle = String(row?.status || 'active').toLowerCase()
  const lines = [`Lifecycle: ${lifecycle}`]
  const ageLabel = formatProbeAge(freshestProbeAgeMs(row))
  const probeParts = [bits.health.label]
  if (ageLabel) probeParts.push(`last ok ${ageLabel} ago`)
  if (bits.rtt) probeParts.push(bits.rtt)
  lines.push(`Probe: ${probeParts.join(' · ')}`)
  if (bits.egress) {
    lines.push(`Egress: ${bits.egress.label.replace(/^Egress\s+/i, '')}`)
  } else if (lifecycle === 'active') {
    lines.push('Egress: —')
  }

  if (lifecycle === 'decommissioned') {
    return { word: 'Decom', tone: 'muted', lines }
  }
  if (lifecycle === 'maintenance') {
    return { word: 'Maint', tone: 'yellow', lines }
  }
  if (bits.health.kind === 'down') {
    return { word: 'Down', tone: 'red', lines }
  }
  if (bits.egress?.kind === 'unavail') {
    return { word: 'Egress', tone: 'yellow', lines }
  }
  if (bits.health.kind === 'degraded') {
    return { word: 'Degraded', tone: 'yellow', lines }
  }
  if (bits.health.kind === 'warning') {
    return { word: 'Warning', tone: 'yellow', lines }
  }
  if (bits.health.kind === 'healthy') {
    return { word: 'Healthy', tone: 'green', lines }
  }
  if (bits.health.kind === 'paused') {
    return { word: 'Paused', tone: 'muted', lines }
  }
  return { word: 'Unknown', tone: 'muted', lines }
}

function toggleStatus(id) {
  openMenuId.value = ''
  openStatusId.value = openStatusId.value === id ? '' : id
}

function toggleMenu(id) {
  openStatusId.value = ''
  openMenuId.value = openMenuId.value === id ? '' : id
}

function closeRowPopups() {
  openStatusId.value = ''
  openMenuId.value = ''
}

function onDocClick(e) {
  const t = e.target
  if (!(t instanceof Element)) return
  if (t.closest('.status-cell, .actions-cell')) return
  closeRowPopups()
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

onMounted(() => {
  load()
  document.addEventListener('click', onDocClick)
})
onUnmounted(() => {
  document.removeEventListener('click', onDocClick)
  window.clearTimeout(copiedTimer)
})
</script>

<template>
  <div class="fleet-instances-view">
    <h1>Fleet instances</h1>
    <p class="hint">
      Org catalog via gatekeeper (S3 home of record). Register upserts the directory row after a live
      <code>/up</code> check. Soft decommission hides from the picker only.
      <strong>Provision edge</strong> creates a dispatcher set + Asterisk Peer on the SBC, registers the
      instance FQDN as a fleet domain route (setid), and writes catalog setid (Rule 13). If the edge already exists (e.g. after rebuild) but Setid is blank, use
      <strong>Link setid</strong> on the row — catch-up only, does not create a dispatcher set.
      Applying catalog setid onto tenant domains is
      <RouterLink to="/fleet/reconcile">Reconcile → Apply catalog → SBC</RouterLink>.
      Status word uses Gatekeeper probe state (click for detail; manual refresh).
    </p>

    <p v-if="actionError" class="error">{{ actionError }}</p>

    <div class="toolbar">
      <button type="button" class="secondary" :disabled="loading || refreshing" @click="refresh">
        {{ refreshing ? 'Refreshing…' : 'Refresh' }}
      </button>
      <button
        type="button"
        class="primary"
        @click="showRegister = !showRegister"
      >
        {{ showRegister ? 'Cancel register' : 'Register instance' }}
      </button>
    </div>

    <form
      v-if="showRegister"
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
        <input v-model="reg.label" placeholder="friendly Name (required for picker)" autocomplete="off" />
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
          placeholder="sip:nnn.nnn.nnn.nnn:5060 — public IP for Provision edge"
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
        Backend SIP URI (public IP — not FQDN)
        <input
          v-model="provisionUri"
          class="inline-input"
          placeholder="sip:nnn.nnn.nnn.nnn:5060"
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
              <label class="notes-edit">
                Name
                <input
                  v-model="editDraft.label"
                  class="inline-input"
                  placeholder="friendly Name (required)"
                  autocomplete="off"
                />
              </label>
              <label class="notes-edit">
                Notes
                <textarea
                  v-model="editDraft.notes"
                  class="inline-input notes-textarea"
                  rows="3"
                  autocomplete="off"
                />
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
            </template>
          </td>
          <td class="cell-fqdn">
            {{ i.fqdn || '—' }}
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
                <option disabled value="">Pick live set…</option>
                <option v-for="s in dispatcherSets" :key="s.setid" :value="String(s.setid)">
                  {{ s.setid }}
                </option>
              </select>
              <p v-if="!dispatcherSets.length" class="setid-warn">
                No live dispatcher sets loaded — refresh or check SBC API.
              </p>
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
              <div class="setid-value" :class="{ 'setid-missing': !instanceHasSetid(i) }">
                {{ instanceHasSetid(i) ? i.sbc_dispatcher_setid : '—' }}
              </div>
              <button
                v-if="canManage && !instanceHasSetid(i)"
                type="button"
                class="linkish setid-link"
                :disabled="busyId === i.id || !dispatcherSets.length"
                :title="
                  dispatcherSets.length
                    ? 'Attach an already-live Magrathea dispatcher set (catalog catch-up)'
                    : 'Live dispatcher sets not loaded'
                "
                @click="startLink(i)"
              >
                Link setid
              </button>
            </template>
          </td>
          <td class="cell-status">
            <div v-for="sum in [statusSummary(i)]" :key="i.id + '-status'" class="status-cell">
              <button
                type="button"
                class="status-word"
                :class="'status-word--' + sum.tone"
                :aria-expanded="openStatusId === i.id"
                @click.stop="toggleStatus(i.id)"
              >
                {{ sum.word }}
              </button>
              <div
                v-if="openStatusId === i.id"
                class="status-panel"
                role="dialog"
                :aria-label="'Status detail for ' + (i.label || i.fqdn || i.id)"
              >
                <div v-for="line in sum.lines" :key="line" class="status-panel-line">{{ line }}</div>
              </div>
            </div>
          </td>
          <td v-if="canManage || canEdge" class="actions actions-cell">
            <template v-if="editingId !== i.id && linkingId !== i.id">
              <div class="row-menu">
                <button
                  type="button"
                  class="row-menu-trigger"
                  :aria-expanded="openMenuId === i.id"
                  :disabled="busyId === i.id"
                  @click.stop="toggleMenu(i.id)"
                >
                  Actions ▾
                </button>
                <div v-if="openMenuId === i.id" class="row-menu-panel" role="menu">
                  <button
                    type="button"
                    role="menuitem"
                    class="row-menu-item"
                    @click="copyId(i.id)"
                  >
                    {{ copiedId === i.id ? 'Copied id' : 'Copy instance id' }}
                  </button>
                  <button
                    v-if="canManage"
                    type="button"
                    role="menuitem"
                    class="row-menu-item"
                    :disabled="busyId === i.id"
                    @click="closeRowPopups(); startEdit(i)"
                  >
                    Edit
                  </button>
                  <button
                    v-if="canManage && !instanceHasSetid(i)"
                    type="button"
                    role="menuitem"
                    class="row-menu-item"
                    :disabled="busyId === i.id || !dispatcherSets.length"
                    :title="
                      dispatcherSets.length
                        ? 'Catalog catch-up: attach already-live dispatcher set'
                        : 'Live dispatcher sets not loaded'
                    "
                    @click="closeRowPopups(); startLink(i)"
                  >
                    Link setid
                  </button>
                  <button
                    v-if="canEdge"
                    type="button"
                    role="menuitem"
                    class="row-menu-item"
                    :disabled="busyId === i.id"
                    @click="closeRowPopups(); startProvision(i)"
                  >
                    {{ instanceHasSetid(i) ? 'Edge' : 'Provision' }}
                  </button>
                  <button
                    v-if="canManage && (i.status || 'active') !== 'maintenance'"
                    type="button"
                    role="menuitem"
                    class="row-menu-item"
                    :disabled="busyId === i.id"
                    @click="closeRowPopups(); setStatus(i.id, 'maintenance')"
                  >
                    Maint
                  </button>
                  <button
                    v-if="canManage && (i.status || 'active') !== 'active'"
                    type="button"
                    role="menuitem"
                    class="row-menu-item"
                    :disabled="busyId === i.id"
                    @click="closeRowPopups(); setStatus(i.id, 'active')"
                  >
                    Activate
                  </button>
                  <button
                    v-if="canManage && (i.status || 'active') !== 'decommissioned'"
                    type="button"
                    role="menuitem"
                    class="row-menu-item row-menu-item--danger"
                    :disabled="busyId === i.id"
                    @click="closeRowPopups(); doDecommission(i)"
                  >
                    Decom
                  </button>
                  <button
                    v-if="canManage && instanceHasSetid(i)"
                    type="button"
                    role="menuitem"
                    class="row-menu-item row-menu-item--muted"
                    :disabled="busyId === i.id || !dispatcherSets.length"
                    title="Change setid only when the catalog pointer is wrong"
                    @click="closeRowPopups(); startLink(i)"
                  >
                    Change setid
                  </button>
                </div>
              </div>
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
  /* Room below the table so last-row popovers are not flush with the scroll clip edge. */
  padding-bottom: 6rem;
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
.register-box input:not([type='checkbox']),
.register-box select,
.inline-input {
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
.register-box select {
  /* Strip macOS native chrome (gradient + extra height). Match text inputs. */
  height: 2.25rem;
  appearance: none;
  -webkit-appearance: none;
  background-color: var(--pbx-panel, #fff);
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'><path d='M3 4.5 6 7.5 9 4.5' fill='none' stroke='%2364748b' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/></svg>");
  background-repeat: no-repeat;
  background-position: right 0.55rem center;
  background-size: 0.75rem;
  padding-right: 1.75rem;
}
.register-box input:not([type='checkbox']):focus,
.register-box select:focus {
  outline: none;
  border-color: var(--pbx-accent-bright, #3b82f6);
  box-shadow: 0 0 0 3px var(--pbx-focus-ring, rgba(59, 130, 246, 0.1));
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
.status-cell {
  position: relative;
  display: inline-block;
}
.status-word {
  border: none;
  background: none;
  padding: 0;
  font: inherit;
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 0.15em;
}
.status-word--green {
  color: #15803d;
}
.status-word--red {
  color: #b91c1c;
}
.status-word--yellow {
  color: #ca8a04;
}
.status-word--muted {
  color: #64748b;
}
.status-panel {
  position: absolute;
  z-index: 20;
  top: auto;
  bottom: calc(100% + 0.25rem);
  left: 0;
  min-width: 11rem;
  padding: 0.5rem 0.65rem;
  border: 1px solid var(--pbx-border, #cbd5e1);
  border-radius: 0.35rem;
  background: var(--pbx-surface, #fff);
  box-shadow: 0 4px 14px rgb(15 23 42 / 0.1);
  white-space: nowrap;
}
.status-panel-line {
  font-size: 0.75rem;
  line-height: 1.45;
  color: var(--pbx-text, inherit);
}
.cell-fqdn {
  max-width: 12rem;
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
.actions {
  white-space: nowrap;
}
.actions-cell {
  position: relative;
}
.row-menu {
  position: relative;
  display: inline-block;
}
.row-menu-trigger {
  border: 1px solid var(--pbx-border, #cbd5e1);
  border-radius: 0.3rem;
  background: var(--pbx-surface, #fff);
  padding: 0.2rem 0.5rem;
  font: inherit;
  font-size: 0.8rem;
  color: var(--pbx-text, inherit);
  cursor: pointer;
}
.row-menu-trigger:disabled {
  opacity: 0.5;
  cursor: default;
}
.row-menu-panel {
  position: absolute;
  z-index: 20;
  top: auto;
  bottom: calc(100% + 0.25rem);
  right: 0;
  min-width: 8.5rem;
  padding: 0.25rem 0;
  border: 1px solid var(--pbx-border, #cbd5e1);
  border-radius: 0.35rem;
  background: var(--pbx-surface, #fff);
  box-shadow: 0 4px 14px rgb(15 23 42 / 0.1);
}
.row-menu-item {
  display: block;
  width: 100%;
  border: none;
  background: none;
  padding: 0.35rem 0.75rem;
  text-align: left;
  font: inherit;
  font-size: 0.85rem;
  color: var(--pbx-accent, #1d4ed8);
  cursor: pointer;
}
.row-menu-item:hover:not(:disabled) {
  background: var(--pbx-surface-subtle, #f8fafc);
}
.row-menu-item:disabled {
  opacity: 0.45;
  cursor: default;
}
.row-menu-item--danger {
  color: var(--pbx-danger, #b91c1c);
}
.row-menu-item--muted {
  color: var(--pbx-text-muted);
  font-size: 0.8rem;
}
.cell-setid .setid-value.setid-missing {
  color: var(--pbx-text-muted);
}
.cell-setid .setid-link {
  display: block;
  margin-top: 0.2rem;
  font-size: 0.8rem;
}
.cell-setid .setid-warn {
  margin: 0.25rem 0 0;
  max-width: 11rem;
  font-size: 0.72rem;
  line-height: 1.3;
  white-space: normal;
  color: var(--pbx-danger, #b91c1c);
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
.notes-edit .notes-textarea {
  display: block;
  width: 100%;
  min-width: 14rem;
  min-height: 4.5rem;
  resize: vertical;
  box-sizing: border-box;
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
