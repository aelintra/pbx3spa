<script setup>
/**
 * SBC HA edge pair — health, Manual|Auto mode, Promote now.
 * Also: SBC admin API URL + create HA pair (fleet_admin).
 * API still uses mode=managed|auto; UI says Manual for managed.
 */
import { ref, computed, onMounted } from 'vue'
import {
  listEdgePairs,
  patchEdgePair,
  promoteEdgePair,
  warmSyncEdgePair,
  createEdgePair,
  deleteEdgePair,
  getEdgeSettings,
  patchEdgeSettings,
  refreshFleetSession
} from '@/api/fleetGatekeeper'
import {
  hasFleetGatekeeperToken,
  getFleetAbilities,
  canFleet,
  FLEET_ABILITY
} from '@/config/fleetGatekeeper'

const pairs = ref([])
const loading = ref(false)
const error = ref('')
const actionMsg = ref('')
const busyId = ref('')
/** 'sync' | 'promote' | 'delete' | 'mode' | '' — which action owns busyId */
const busyAction = ref('')
const syncStartedAt = ref(0)
const syncElapsedSec = ref(0)
let syncTickTimer = null
const canAdmin = computed(() => canFleet(FLEET_ABILITY.ADMIN))

function clearSyncTick() {
  if (syncTickTimer != null) {
    clearInterval(syncTickTimer)
    syncTickTimer = null
  }
  syncStartedAt.value = 0
  syncElapsedSec.value = 0
}

function startSyncTick() {
  clearSyncTick()
  syncStartedAt.value = Date.now()
  syncElapsedSec.value = 0
  syncTickTimer = setInterval(() => {
    syncElapsedSec.value = Math.floor((Date.now() - syncStartedAt.value) / 1000)
  }, 250)
}

const settings = ref(null)
const sbcUrlDraft = ref('')
const settingsBusy = ref(false)
const showAddPair = ref(false)
const createBusy = ref(false)
const createForm = ref({
  id: '',
  label: '',
  fqdn: '',
  eip: '',
  allocation_id: '',
  member_a_instance_id: '',
  member_b_instance_id: '',
  active_member: 'a',
  mode: 'managed',
  region: 'us-east-1'
})

async function load() {
  if (!hasFleetGatekeeperToken()) {
    pairs.value = []
    settings.value = null
    error.value = ''
    return
  }
  loading.value = true
  error.value = ''
  try {
    if (getFleetAbilities().length === 0) {
      await refreshFleetSession()
    }
    const [data, edgeSettings] = await Promise.all([listEdgePairs(), getEdgeSettings()])
    pairs.value = data.edge_pairs || []
    settings.value = edgeSettings
    sbcUrlDraft.value = edgeSettings?.sbc_admin_api_url || ''
  } catch (e) {
    pairs.value = []
    error.value = e?.message || 'Failed to load edge pairs'
  } finally {
    loading.value = false
  }
}

function healthLabel(p) {
  const h = p.health
  if (!h) return 'Unknown'
  if (h.reachable) return 'Healthy'
  return 'Down'
}

function healthClass(p) {
  const h = p.health
  if (!h) return 'badge-muted'
  return h.reachable ? 'badge-ok' : 'badge-bad'
}

/** UI label; API value remains managed|auto */
function modeLabel(mode) {
  return mode === 'auto' ? 'Auto' : 'Manual'
}

function modeClass(mode) {
  return mode === 'auto' ? 'mode-auto' : 'mode-manual'
}

function sourceHint() {
  const s = settings.value
  if (!s) return ''
  if (s.sbc_admin_api_url_source === 'db') return 'Saved in control DB (overrides env)'
  if (s.sbc_admin_api_url_source === 'env') return 'From control .env (PBX3_SBC_ADMIN_API_URL)'
  return 'Not set'
}

async function saveSbcUrl() {
  if (!canAdmin.value) return
  settingsBusy.value = true
  actionMsg.value = ''
  error.value = ''
  try {
    settings.value = await patchEdgeSettings({
      sbc_admin_api_url: sbcUrlDraft.value.trim()
    })
    sbcUrlDraft.value = settings.value.sbc_admin_api_url || ''
    actionMsg.value = sbcUrlDraft.value
      ? 'SBC admin API URL saved'
      : 'SBC admin API URL cleared (env fallback)'
  } catch (e) {
    error.value = e?.message || 'Save settings failed'
  } finally {
    settingsBusy.value = false
  }
}

async function clearSbcUrlOverride() {
  if (!canAdmin.value) return
  sbcUrlDraft.value = ''
  await saveSbcUrl()
}

async function setMode(p, mode) {
  if (!canAdmin.value) return
  busyId.value = p.id
  busyAction.value = 'mode'
  actionMsg.value = ''
  error.value = ''
  try {
    await patchEdgePair(p.id, { mode })
    actionMsg.value = `${p.label}: mode → ${modeLabel(mode)}`
    await load()
  } catch (e) {
    error.value = e?.message || 'Patch failed'
  } finally {
    busyId.value = ''
    busyAction.value = ''
  }
}

async function promoteNow(p) {
  if (!canAdmin.value) return
  if (
    !confirm(
      `Promote ${p.label}?\nEIP moves to the standby. HTTPS may break until Phase D LE on the new active.\n\nControl will SIP-OPTIONS the standby’s public IP first and warn if it cannot see SIP.`
    )
  ) {
    return
  }
  busyId.value = p.id
  busyAction.value = 'promote'
  actionMsg.value = ''
  error.value = ''
  try {
    let data = await promoteEdgePair(p.id)
    if (data?.needs_confirm) {
      const warn =
        data.warning ||
        'Cannot confirm SIP on standby. Promote anyway?'
      if (!confirm(`${warn}\n\nPromote anyway?`)) {
        actionMsg.value = 'Promote cancelled — standby SIP not confirmed.'
        return
      }
      data = await promoteEdgePair(p.id, { confirmStandbySipWarning: true })
      if (data?.needs_confirm) {
        error.value = 'Promote still blocked after confirm — unexpected response'
        return
      }
    }
    const sip = data?.result?.standby_sip
    const sipNote =
      sip && sip.ok === false
        ? ' (standby SIP was not confirmed — operator override)'
        : sip && sip.ok
          ? ` (standby SIP OK @ ${sip.host})`
          : ''
    const fenced = data?.result?.fenced
    const fenceNote =
      fenced === true
        ? ' (old active fenced)'
        : fenced === false
          ? ` (fence skipped/failed${data?.result?.fence_detail ? ': ' + data.result.fence_detail : ''})`
          : ''
    const le = data?.result?.le
    const leNote =
      le && le.ok
        ? ` (Phase D LE OK${le.domain ? ': ' + le.domain : ''})`
        : le && le.skipped
          ? ` (Phase D LE skipped: ${le.detail || 'n/a'})`
          : le
            ? ` (Phase D LE failed: ${le.detail || 'n/a'})`
            : ''
    actionMsg.value = `Promoted ${p.label} → member ${data?.pair?.active_member || '?'}${sipNote}${fenceNote}${leNote}.`
    await load()
  } catch (e) {
    error.value = e?.message || 'Promote failed'
  } finally {
    busyId.value = ''
    busyAction.value = ''
  }
}

async function syncNow(p) {
  if (!canAdmin.value) return
  if (
    !confirm(
      `Warm-sync ${p.label}?\nActive creates+uploads a backup; standby pulls it (--db-only). May restart OpenSIPS on standby.\n\nThis often takes 1–3 minutes — leave this tab open.`
    )
  ) {
    return
  }
  busyId.value = p.id
  busyAction.value = 'sync'
  actionMsg.value = ''
  error.value = ''
  startSyncTick()
  try {
    const data = await warmSyncEdgePair(p.id)
    const stamp = data?.result?.backup_stamp || data?.pair?.last_warm_sync_stamp || '?'
    actionMsg.value = `Warm sync OK for ${p.label} (stamp ${stamp}, ${syncElapsedSec.value}s).`
    await load()
  } catch (e) {
    error.value = e?.message || 'Warm sync failed'
    await load()
  } finally {
    clearSyncTick()
    busyId.value = ''
    busyAction.value = ''
  }
}

function warmSyncAge(p) {
  if (busyAction.value === 'sync' && busyId.value === p.id) {
    return `Syncing… ${syncElapsedSec.value}s (backup → S3 → standby)`
  }
  if (p.last_warm_sync_error) {
    return `Error: ${p.last_warm_sync_error}`
  }
  if (!p.last_warm_sync_at) {
    return 'Never synced'
  }
  const stamp = p.last_warm_sync_stamp ? ` · ${p.last_warm_sync_stamp}` : ''
  return `${p.last_warm_sync_at}${stamp}`
}

async function deletePair(p) {
  if (!canAdmin.value) return
  if (
    !confirm(
      `Delete HA pair “${p.label}” (${p.id})?\n\nRemoves it from control only (probe/promote stop). Does not release the EIP or terminate instances.`
    )
  ) {
    return
  }
  busyId.value = p.id
  busyAction.value = 'delete'
  actionMsg.value = ''
  error.value = ''
  try {
    await deleteEdgePair(p.id)
    actionMsg.value = `Deleted edge pair ${p.id}`
    await load()
  } catch (e) {
    error.value = e?.message || 'Delete failed'
  } finally {
    busyId.value = ''
    busyAction.value = ''
  }
}

async function doCreatePair() {
  if (!canAdmin.value) return
  createBusy.value = true
  actionMsg.value = ''
  error.value = ''
  try {
    const f = createForm.value
    const body = {
      label: f.label.trim(),
      fqdn: f.fqdn.trim(),
      eip: f.eip.trim(),
      allocation_id: f.allocation_id.trim(),
      member_a_instance_id: f.member_a_instance_id.trim(),
      member_b_instance_id: f.member_b_instance_id.trim(),
      active_member: f.active_member,
      mode: f.mode,
      region: f.region.trim() || 'us-east-1'
    }
    if (f.id.trim()) body.id = f.id.trim()
    const pair = await createEdgePair(body)
    actionMsg.value = `Created edge pair ${pair.id}`
    showAddPair.value = false
    createForm.value = {
      id: '',
      label: '',
      fqdn: '',
      eip: '',
      allocation_id: '',
      member_a_instance_id: '',
      member_b_instance_id: '',
      active_member: 'a',
      mode: 'managed',
      region: 'us-east-1'
    }
    await load()
  } catch (e) {
    error.value = e?.message || 'Create pair failed'
  } finally {
    createBusy.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="fleet-panel">
    <header class="panel-head">
      <div>
        <h1>Edge HA</h1>
        <p class="lede">
          One active–passive SBC pair. Health probe = SIP OPTIONS on the VIP.
          <strong>Promote now</strong> also OPTIONS the standby’s public IP and warns if SIP is unseen (confirm to proceed).
          <strong>Manual</strong> = alert only (human moves EIP).
          <strong>Auto</strong> = control may promote after probe failures (lab flag).
          <strong>Auto</strong> = control may move EIP when enabled on control.
          <strong>Sync now</strong> = warm standby (S3 dump → DB-only on standby); daily backstop on control.
          To replace the pair: Delete, then Add. Control-down: AWS Console EIP → warm standby.
        </p>
      </div>
      <button type="button" class="btn" :disabled="loading" @click="load">Refresh</button>
    </header>

    <p v-if="error" class="err">{{ error }}</p>
    <p v-if="actionMsg" class="ok">{{ actionMsg }}</p>
    <p v-if="busyAction === 'sync'" class="sync-progress" role="status" aria-live="polite">
      <span class="spinner" aria-hidden="true" />
      Warm sync in progress… {{ syncElapsedSec }}s
      <span class="muted-inline">— active backup → S3 → standby DB. Often 1–3 minutes.</span>
    </p>
    <p v-if="loading" class="muted">Loading…</p>

    <section v-if="settings || canAdmin" class="card settings-card">
      <h2>SBC admin API</h2>
      <p class="hint">
        Control calls this URL for fleet↔SBC (domains, DIDs, moves). Empty clears the DB override and
        falls back to control <code>.env</code>.
      </p>
      <p v-if="settings" class="source">Source: {{ sourceHint() }}</p>
      <form v-if="canAdmin" class="settings-form" @submit.prevent="saveSbcUrl">
        <label>
          Base URL
          <input
            v-model="sbcUrlDraft"
            type="url"
            placeholder="https://sbc.pbx3.com/api"
            autocomplete="off"
          />
        </label>
        <div class="actions">
          <button type="submit" class="btn btn-primary" :disabled="settingsBusy">
            {{ settingsBusy ? 'Saving…' : 'Save URL' }}
          </button>
          <button
            type="button"
            class="btn"
            :disabled="settingsBusy || settings?.sbc_admin_api_url_source !== 'db'"
            @click="clearSbcUrlOverride"
          >
            Clear override
          </button>
        </div>
      </form>
      <p v-else-if="settings" class="mono">{{ settings.sbc_admin_api_url || '— unset —' }}</p>
    </section>

    <div v-if="canAdmin && !pairs.length" class="toolbar">
      <button type="button" class="btn btn-primary" @click="showAddPair = !showAddPair">
        {{ showAddPair ? 'Cancel' : 'Add HA pair' }}
      </button>
    </div>

    <form
      v-if="showAddPair && canAdmin && !pairs.length"
      class="card register-box"
      @submit.prevent="doCreatePair"
    >
      <h2>Add HA pair</h2>
      <p class="hint">
        Registers the pair in control SQLite for probe / promote. Does not provision EIP or instances.
        Only one pair at a time.
      </p>
      <label>
        Label
        <input v-model="createForm.label" required placeholder="Live lab pair" autocomplete="off" />
      </label>
      <label>
        Id (optional)
        <input
          v-model="createForm.id"
          placeholder="auto from label"
          pattern="[a-z0-9][a-z0-9_-]{1,63}"
          autocomplete="off"
        />
      </label>
      <label>
        FQDN
        <input v-model="createForm.fqdn" required placeholder="sbc.pbx3.com" autocomplete="off" />
      </label>
      <label>
        EIP
        <input v-model="createForm.eip" required placeholder="x.x.x.x" autocomplete="off" />
      </label>
      <label>
        Allocation id
        <input
          v-model="createForm.allocation_id"
          required
          placeholder="eipalloc-…"
          autocomplete="off"
        />
      </label>
      <label>
        Member A instance id
        <input
          v-model="createForm.member_a_instance_id"
          required
          placeholder="i-…"
          autocomplete="off"
        />
      </label>
      <label>
        Member B instance id
        <input
          v-model="createForm.member_b_instance_id"
          required
          placeholder="i-…"
          autocomplete="off"
        />
      </label>
      <label>
        Active member
        <select v-model="createForm.active_member">
          <option value="a">a</option>
          <option value="b">b</option>
        </select>
      </label>
      <label>
        Mode
        <select v-model="createForm.mode">
          <option value="managed">Manual</option>
          <option value="auto">Auto</option>
        </select>
      </label>
      <label>
        Region
        <input v-model="createForm.region" placeholder="us-east-1" autocomplete="off" />
      </label>
      <button type="submit" class="btn btn-primary" :disabled="createBusy">
        {{ createBusy ? 'Creating…' : 'Create pair' }}
      </button>
    </form>

    <div v-for="p in pairs" :key="p.id" class="card">
      <div class="card-top">
        <h2>{{ p.label }}</h2>
        <div class="card-badges">
          <span class="mode-badge" :class="modeClass(p.mode)">{{ modeLabel(p.mode) }}</span>
          <span class="badge" :class="healthClass(p)">{{ healthLabel(p) }}</span>
        </div>
      </div>
      <dl class="meta">
        <div><dt>Id</dt><dd><code>{{ p.id }}</code></dd></div>
        <div><dt>FQDN</dt><dd>{{ p.fqdn }}</dd></div>
        <div><dt>EIP</dt><dd><code>{{ p.eip }}</code></dd></div>
        <div><dt>Active</dt><dd>member {{ p.active_member }}</dd></div>
        <div v-if="p.health?.last_rtt_ms != null">
          <dt>RTT</dt><dd>{{ p.health.last_rtt_ms }} ms</dd>
        </div>
        <div v-if="p.health?.last_ok_at">
          <dt>Last OK</dt><dd>{{ p.health.last_ok_at }}</dd>
        </div>
        <div>
          <dt>Last warm sync</dt>
          <dd
            :class="{
              'sync-err': p.last_warm_sync_error && !(busyAction === 'sync' && busyId === p.id),
              'sync-live': busyAction === 'sync' && busyId === p.id
            }"
          >
            <span
              v-if="busyAction === 'sync' && busyId === p.id"
              class="spinner spinner-inline"
              aria-hidden="true"
            />
            {{ warmSyncAge(p) }}
          </dd>
        </div>
      </dl>
      <div v-if="canAdmin" class="actions">
        <button
          type="button"
          class="btn"
          :disabled="busyId === p.id || p.mode === 'managed'"
          @click="setMode(p, 'managed')"
        >
          Switch to Manual
        </button>
        <button
          type="button"
          class="btn"
          :disabled="busyId === p.id || p.mode === 'auto'"
          @click="setMode(p, 'auto')"
        >
          Switch to Auto
        </button>
        <button
          type="button"
          class="btn"
          :disabled="busyId === p.id"
          :aria-busy="busyAction === 'sync' && busyId === p.id"
          @click="syncNow(p)"
        >
          <span
            v-if="busyAction === 'sync' && busyId === p.id"
            class="spinner spinner-inline"
            aria-hidden="true"
          />
          {{
            busyAction === 'sync' && busyId === p.id
              ? `Syncing… ${syncElapsedSec}s`
              : 'Sync now'
          }}
        </button>
        <button
          type="button"
          class="btn btn-primary"
          :disabled="busyId === p.id"
          @click="promoteNow(p)"
        >
          Promote now
        </button>
        <button
          type="button"
          class="btn btn-danger"
          :disabled="busyId === p.id"
          @click="deletePair(p)"
        >
          Delete pair
        </button>
      </div>
      <p v-else class="muted">Sign in as fleet_admin to change mode, sync, or promote.</p>
    </div>

    <p v-if="!loading && !pairs.length && !error" class="muted">No edge pairs registered.</p>
  </div>
</template>

<style scoped>
.fleet-panel {
  max-width: 52rem;
}
.panel-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1.25rem;
}
h1 {
  font-size: 1.5rem;
  font-weight: 650;
  margin: 0 0 0.35rem;
}
.lede {
  margin: 0;
  color: #64748b;
  font-size: 0.9rem;
  line-height: 1.45;
  max-width: 36rem;
}
.card {
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
  padding: 1rem 1.1rem;
  margin-bottom: 1rem;
  background: #fff;
}
.settings-card h2,
.register-box h2 {
  margin: 0 0 0.35rem;
  font-size: 1.05rem;
  font-weight: 600;
}
.hint {
  margin: 0 0 0.5rem;
  color: #64748b;
  font-size: 0.85rem;
  line-height: 1.4;
}
.source {
  margin: 0 0 0.75rem;
  font-size: 0.8rem;
  color: #94a3b8;
}
.settings-form,
.register-box {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-width: 28rem;
}
.settings-form label,
.register-box label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.85rem;
  color: #64748b;
}
.settings-form input,
.register-box input,
.register-box select {
  padding: 0.35rem 0.5rem;
  font: inherit;
  border: 1px solid #cbd5e1;
  border-radius: 0.375rem;
}
.toolbar {
  margin-bottom: 0.75rem;
}
.card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}
.card-top h2 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
}
.card-badges {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}
.mode-badge {
  font-size: 0.95rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  padding: 0.3rem 0.7rem;
  border-radius: 0.375rem;
  line-height: 1.2;
}
.mode-manual {
  background: #e2e8f0;
  color: #0f172a;
  border: 1px solid #94a3b8;
}
.mode-auto {
  background: #dbeafe;
  color: #1e3a8a;
  border: 1px solid #3b82f6;
}
.meta {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(12rem, 1fr));
  gap: 0.5rem 1rem;
  margin: 0 0 1rem;
}
.meta dt {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #94a3b8;
}
.meta dd {
  margin: 0.1rem 0 0;
  font-size: 0.9rem;
}
.sync-err {
  color: #b91c1c;
  font-size: 0.8rem;
  word-break: break-word;
}
.sync-live {
  color: #1e3a8a;
  font-size: 0.85rem;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}
.sync-progress {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  margin: 0 0 1rem;
  padding: 0.65rem 0.85rem;
  background: #eff6ff;
  border: 1px solid #93c5fd;
  border-radius: 0.375rem;
  color: #1e3a8a;
  font-size: 0.9rem;
}
.muted-inline {
  color: #64748b;
  font-size: 0.85rem;
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
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.btn {
  border: 1px solid #cbd5e1;
  background: #f8fafc;
  border-radius: 0.375rem;
  padding: 0.4rem 0.75rem;
  font-size: 0.85rem;
  cursor: pointer;
}
.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.btn-primary {
  background: var(--pbx-primary, #2563eb);
  color: #fff;
  border-color: var(--pbx-primary, #2563eb);
}
.btn-danger {
  background: #fff;
  color: #b91c1c;
  border-color: #fca5a5;
}
.badge {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
}
.badge-ok {
  background: #dcfce7;
  color: #166534;
}
.badge-bad {
  background: #fee2e2;
  color: #991b1b;
}
.badge-muted {
  background: #f1f5f9;
  color: #64748b;
}
.err {
  color: #b91c1c;
}
.ok {
  color: #166534;
}
.muted {
  color: #94a3b8;
  font-size: 0.875rem;
}
.mono {
  font-family: ui-monospace, monospace;
  font-size: 0.9rem;
  margin: 0;
}
code {
  font-size: 0.85em;
}
</style>
