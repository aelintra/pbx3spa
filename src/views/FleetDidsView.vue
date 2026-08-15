<script setup>
/**
 * S10.5 — catalog DID ownership (HoR) + project to SBC inbound dr_rules.
 * Hop-1: singleton or block → tenant (FLEET_DID_HOP1_LOCK).
 */
import { ref, computed, onMounted } from 'vue'
import {
  listFleetDids,
  listFleetTenants,
  getFleetCatalog,
  assignFleetDid,
  releaseFleetDid,
  projectFleetDids,
  reconcileFleetDids,
  refreshFleetSession
} from '@/api/fleetGatekeeper'
import {
  hasFleetGatekeeperToken,
  getFleetAbilities,
  canFleet,
  FLEET_ABILITY
} from '@/config/fleetGatekeeper'

const dids = ref([])
const tenants = ref([])
const instancesById = ref({})
const loading = ref(false)
const error = ref('')
const actionMsg = ref('')
const busy = ref(false)
const canEdge = computed(() => canFleet(FLEET_ABILITY.EDGE))

const showAssign = ref(false)
/** @type {import('vue').Ref<'create'|'edit'|'reallocate'>} */
const formMode = ref('create')
const form = ref({
  e164: '',
  delivery: 'singleton',
  sip_prefix: '',
  tenant_shortuid: '',
  status: 'active',
  carrier: '',
  notes: '',
  reassign: false
})

const didReport = ref(null)
const checkingDrift = ref(false)

const formTitle = computed(() => {
  if (formMode.value === 'edit') return 'Update DID delivery'
  if (formMode.value === 'reallocate') return 'Re-allocate released DID'
  return 'Allocate new DID'
})

const formSubmitLabel = computed(() => {
  if (busy.value) return 'Saving…'
  if (formMode.value === 'edit') return 'Update + project'
  if (formMode.value === 'reallocate') return 'Re-allocate + project'
  return 'Allocate + project'
})

const e164Locked = computed(
  () => formMode.value === 'edit' || formMode.value === 'reallocate'
)

function instanceDisplayName(row) {
  if (row.instance_label && row.instance_label !== row.instance_id) {
    return row.instance_label
  }
  const i = instancesById.value[row.instance_id]
  if (!i) return row.instance_label || row.instance_id || '—'
  return i.label || i.fqdn || row.instance_id || '—'
}

async function load() {
  if (!hasFleetGatekeeperToken()) {
    dids.value = []
    tenants.value = []
    instancesById.value = {}
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
    const [list, tenantRows, catalog] = await Promise.all([
      listFleetDids(),
      listFleetTenants(),
      getFleetCatalog()
    ])
    const map = {}
    for (const i of catalog.instances || []) {
      if (i?.id) map[i.id] = i
    }
    instancesById.value = map
    dids.value = list.dids || []
    tenants.value = tenantRows
  } catch (e) {
    dids.value = []
    error.value = e?.message || 'Failed to load DIDs'
  } finally {
    loading.value = false
  }
}

function formatSbc(sbc) {
  if (!sbc) return ''
  if (sbc.error) return ` SBC: ${sbc.error}`
  const up = (sbc.upserted || []).length
  const rm = (sbc.removed || []).length
  const errs = (sbc.errors || []).join('; ')
  return ` SBC: ${up} upserted, ${rm} removed` + (errs ? ` — ${errs}` : '')
}

function blankForm() {
  return {
    e164: '',
    delivery: 'singleton',
    sip_prefix: '',
    tenant_shortuid: '',
    status: 'active',
    carrier: '',
    notes: '',
    reassign: false
  }
}

function closeForm() {
  showAssign.value = false
  formMode.value = 'create'
  form.value = blankForm()
}

function startCreate() {
  if (showAssign.value && formMode.value === 'create') {
    closeForm()
    return
  }
  formMode.value = 'create'
  form.value = blankForm()
  showAssign.value = true
  error.value = ''
  actionMsg.value = ''
}

function fillFormFromRow(row, { reassign = false } = {}) {
  form.value = {
    e164: row.e164 || '',
    delivery: row.delivery === 'block' ? 'block' : 'singleton',
    sip_prefix:
      row.sip_prefix ||
      (row.match_prefix && row.match_prefix !== row.e164_key ? row.match_prefix : '') ||
      '',
    tenant_shortuid: row.tenant_shortuid || '',
    status: row.status === 'released' ? 'active' : row.status || 'active',
    carrier: row.carrier || '',
    notes: row.notes || '',
    reassign
  }
}

/** Change SIP prefix / tenant / delivery on an existing catalog row. */
function startEdit(row) {
  if (!canEdge.value) return
  formMode.value = 'edit'
  fillFormFromRow(row, { reassign: false })
  showAssign.value = true
  error.value = ''
  actionMsg.value = `Editing ${row.e164} — same catalog row; change fields and Update + project.`
}

function startReallocate(row) {
  if (!canEdge.value) return
  formMode.value = 'reallocate'
  fillFormFromRow(row, { reassign: true })
  showAssign.value = true
  error.value = ''
  actionMsg.value = `Re-allocate ${row.e164} — pick tenant and save (was released).`
}

async function submitAssign() {
  if (!canEdge.value) return
  if (form.value.delivery === 'block' && !form.value.sip_prefix.trim()) {
    error.value = 'Block delivery requires a SIP prefix (OpenSIPS match digits shorter than the E.164).'
    return
  }
  busy.value = true
  actionMsg.value = ''
  error.value = ''
  try {
    const body = {
      e164: form.value.e164.trim(),
      tenant_shortuid: form.value.tenant_shortuid,
      status: form.value.status,
      delivery: form.value.delivery,
      reassign: form.value.reassign || formMode.value !== 'create'
    }
    if (form.value.sip_prefix.trim()) body.sip_prefix = form.value.sip_prefix.trim()
    if (form.value.carrier.trim()) body.carrier = form.value.carrier.trim()
    if (form.value.notes.trim()) body.notes = form.value.notes.trim()
    const result = await assignFleetDid(body)
    const prev = result.previous_tenant_shortuid
    const kind = result.did?.delivery || form.value.delivery
    actionMsg.value =
      `Catalog: ${result.did?.e164} → ${result.tenant_shortuid}` +
      (kind === 'block' ? ` (block ${result.did?.sip_prefix || form.value.sip_prefix})` : '') +
      (prev ? ` (was ${prev})` : '') +
      '.' +
      formatSbc(result.sbc)
    if (result.sbc && result.sbc.ok === false) {
      error.value = (result.sbc.errors || [result.sbc.error || 'SBC project failed']).join(' · ')
    }
    showAssign.value = false
    formMode.value = 'create'
    form.value = blankForm()
    didReport.value = null
    await load()
  } catch (e) {
    error.value = e?.message || 'Assign failed'
  } finally {
    busy.value = false
  }
}

async function doRelease(row) {
  if (!canEdge.value) return
  const ok = window.confirm(
    `Release ${row.e164} from tenant ${row.tenant_shortuid}?\n\n` +
      'This marks the DID released in the catalog and updates Magrathea inbound routes for that tenant. No further action needed.'
  )
  if (!ok) return
  busy.value = true
  error.value = ''
  actionMsg.value = ''
  try {
    const result = await releaseFleetDid({ e164: row.e164, confirm: true })
    actionMsg.value = `Released ${row.e164}.` + formatSbc(result.sbc)
    didReport.value = null
    await load()
  } catch (e) {
    error.value = e?.message || 'Release failed'
  } finally {
    busy.value = false
  }
}

/** Hard-drop a soft-released catalog ghost (API remove:true). */
async function doRemove(row) {
  if (!canEdge.value) return
  const ok = window.confirm(
    `Remove ${row.e164} from the catalog permanently?\n\n` +
      'Deletes this released history row for tenant ' +
      row.tenant_shortuid +
      '. Does not change hand-authored SBC Number routes.'
  )
  if (!ok) return
  busy.value = true
  error.value = ''
  actionMsg.value = ''
  try {
    const result = await releaseFleetDid({ e164: row.e164, confirm: true, remove: true })
    actionMsg.value = `Removed ${row.e164} from catalog.` + formatSbc(result.sbc)
    didReport.value = null
    await load()
  } catch (e) {
    error.value = e?.message || 'Remove failed'
  } finally {
    busy.value = false
  }
}

async function doProjectAll() {
  if (!canEdge.value) return
  const ok = window.confirm(
    'Project all catalog DIDs → SBC inbound Number routes (groupid 1)?\n\n' +
      'Updates fleet-owned dr_rules only. Requires Asterisk Peer matching each instance setid.'
  )
  if (!ok) return
  busy.value = true
  error.value = ''
  actionMsg.value = ''
  try {
    const result = await projectFleetDids({})
    actionMsg.value = 'Projected catalog → SBC.' + formatSbc(result)
    if (result.ok === false) {
      error.value = (result.errors || [result.error || 'Project failed']).join(' · ')
    } else {
      didReport.value = null
    }
  } catch (e) {
    error.value = e?.message || 'Project failed'
  } finally {
    busy.value = false
  }
}

async function checkDidDrift() {
  if (!canEdge.value) return
  checkingDrift.value = true
  error.value = ''
  actionMsg.value = ''
  try {
    didReport.value = await reconcileFleetDids()
    if (didReport.value?.ok) {
      actionMsg.value = 'DID delivery in sync (catalog ↔ fleet=did rules).'
    }
  } catch (e) {
    didReport.value = null
    error.value = e?.message || 'DID reconcile failed'
  } finally {
    checkingDrift.value = false
  }
}

async function applyDidDrift() {
  if (!canEdge.value || !didReport.value || didReport.value.ok) return
  const ok = window.confirm(
    'Apply catalog → SBC for DID delivery?\n\n' +
      'Projects active/porting catalog rows onto fleet-owned dr_rules and removes orphans the projector owns.\n' +
      'Does not change the catalog. The SBC must not be treated as home of record for fleet-owned DID routes.'
  )
  if (!ok) return
  busy.value = true
  error.value = ''
  actionMsg.value = ''
  try {
    const result = await projectFleetDids({})
    actionMsg.value = 'Applied catalog → SBC (DID delivery).' + formatSbc(result)
    if (result.ok === false) {
      error.value = (result.errors || [result.error || 'Project failed']).join(' · ')
    }
    didReport.value = await reconcileFleetDids()
  } catch (e) {
    error.value = e?.message || 'Apply failed'
  } finally {
    busy.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="fleet-dids-view">
    <h1>DID ownership</h1>
    <p class="hint">
      <strong>Catalog is home of record</strong> (<code>tenants/*/dids.json</code>) — this list is
      <strong>catalog intent</strong>, not a live SBC scrape.
      Allocate / reassign writes the catalog, then projects inbound <code>dr_rules</code>
      (fleet-owned rows). Retarget hop-1 delivery here only — the SBC admin UI must not edit
      <code>fleet=did</code> routes. Choose <strong>singleton</strong> or <strong>block</strong>:
      SIP prefix is the digit string OpenSIPS matches (e.g. block <code>019249264</code> vs
      E.164 <code>+441924918076</code>).       Allocate writes a <strong>new</strong> catalog row; use <strong>Edit</strong> on a row to
      change SIP prefix / tenant (same object). Soft <em>released</em> rows stay grey —
      <strong>Re-allocate</strong> or <strong>Remove</strong>.
    </p>

    <div v-if="hasFleetGatekeeperToken()" class="toolbar">
      <button type="button" class="primary" :disabled="loading" @click="load">
        {{ loading ? 'Loading…' : 'Refresh' }}
      </button>
      <button
        v-if="canEdge"
        type="button"
        class="primary"
        :disabled="busy"
        @click="showAssign ? closeForm() : startCreate()"
      >
        {{ showAssign ? 'Cancel' : 'Allocate DID' }}
      </button>
      <button
        v-if="canEdge"
        type="button"
        class="secondary"
        :disabled="busy || loading || checkingDrift"
        @click="checkDidDrift"
      >
        {{ checkingDrift ? 'Checking…' : 'Check DID drift' }}
      </button>
      <button
        v-if="canEdge"
        type="button"
        class="secondary"
        :disabled="busy || loading"
        @click="doProjectAll"
      >
        {{ busy ? 'Working…' : 'Project all → SBC' }}
      </button>
      <span v-if="!canEdge" class="muted">Need <code>fleet_edge</code> to allocate.</span>
    </div>

    <form v-if="showAssign && canEdge" class="assign-form" @submit.prevent="submitAssign">
      <h2 class="form-title">{{ formTitle }}</h2>
      <p v-if="formMode === 'edit'" class="form-note">
        Same catalog row — change SIP prefix or tenant, then update. Not a new DID.
      </p>
      <label>
        E.164
        <input
          v-model="form.e164"
          type="text"
          required
          placeholder="+442071234567"
          autocomplete="off"
          :readonly="e164Locked"
        />
      </label>
      <label>
        Delivery
        <select v-model="form.delivery">
          <option value="singleton">singleton (one number)</option>
          <option value="block">block (prefix → tenant)</option>
        </select>
      </label>
      <label>
        SIP prefix
        <input
          v-model="form.sip_prefix"
          type="text"
          :required="form.delivery === 'block'"
          :placeholder="
            form.delivery === 'block'
              ? 'required block digits (e.g. 019249264)'
              : 'as carrier sends (e.g. 01924918076)'
          "
          autocomplete="off"
        />
      </label>
      <label>
        Tenant
        <select v-model="form.tenant_shortuid" required>
          <option disabled value="">Select tenant…</option>
          <option v-for="t in tenants" :key="t.shortuid" :value="t.shortuid">
            {{ t.shortuid }} / {{ t.name }}
          </option>
        </select>
      </label>
      <label>
        Status
        <select v-model="form.status">
          <option value="active">active</option>
          <option value="reserved">reserved</option>
          <option value="porting">porting</option>
        </select>
      </label>
      <label>
        Carrier
        <input v-model="form.carrier" type="text" placeholder="optional" />
      </label>
      <label class="notes">
        Notes
        <input v-model="form.notes" type="text" placeholder="optional" />
      </label>
      <label v-if="formMode === 'create'" class="check">
        <input v-model="form.reassign" type="checkbox" />
        Take over if already owned by another tenant
      </label>
      <button type="submit" class="primary" :disabled="busy || !form.tenant_shortuid">
        {{ formSubmitLabel }}
      </button>
    </form>

    <p v-if="actionMsg" class="ok-msg">{{ actionMsg }}</p>
    <p v-if="error" class="error">{{ error }}</p>

    <template v-if="didReport">
      <div class="summary" :class="didReport.ok ? 'ok' : 'drift'">
        <strong>{{ didReport.ok ? 'DID delivery in sync' : 'DID drift detected' }}</strong>
        <span>
          catalog {{ didReport.summary?.catalog_deliverable ?? 0 }} ·
          SBC rules {{ didReport.summary?.sbc_fleet_rules ?? 0 }} ·
          {{ didReport.summary?.errors ?? 0 }} errors ·
          {{ didReport.summary?.warnings ?? 0 }} warnings
        </span>
        <button
          v-if="canEdge && !didReport.ok"
          type="button"
          class="danger"
          :disabled="busy"
          @click="applyDidDrift"
        >
          Apply catalog → SBC
        </button>
      </div>
      <table v-if="didReport.drifts?.length" class="data-table drift-table">
        <thead>
          <tr>
            <th>Severity</th>
            <th>Kind</th>
            <th>Prefix</th>
            <th>E.164</th>
            <th>Tenant</th>
            <th>Expected setid</th>
            <th>Actual setid</th>
            <th>Detail</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(d, i) in didReport.drifts" :key="i" :class="d.severity">
            <td>{{ d.severity }}</td>
            <td><code>{{ d.kind }}</code></td>
            <td><code>{{ d.prefix || '—' }}</code></td>
            <td><code>{{ d.e164 || '—' }}</code></td>
            <td><code>{{ d.tenant_shortuid || '—' }}</code></td>
            <td>{{ d.expected_setid ?? '—' }}</td>
            <td>{{ d.actual_setid ?? '—' }}</td>
            <td>{{ d.detail }}</td>
          </tr>
        </tbody>
      </table>
    </template>

    <table v-if="dids.length" class="data-table">
      <thead>
        <tr>
          <th>E.164</th>
          <th>Delivery</th>
          <th>Match prefix</th>
          <th>Status</th>
          <th>Tenant</th>
          <th>Instance</th>
          <th>Setid</th>
          <th>Carrier</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in dids" :key="row.e164 + row.tenant_shortuid" :class="row.status">
          <td><code>{{ row.e164 }}</code></td>
          <td>{{ row.delivery || '—' }}</td>
          <td><code>{{ row.match_prefix || row.sip_prefix || row.e164_key || '—' }}</code></td>
          <td>{{ row.status }}</td>
          <td>
            <code>{{ row.tenant_shortuid }}</code>
            <span v-if="row.tenant_label" class="muted"> / {{ row.tenant_label }}</span>
          </td>
          <td>{{ instanceDisplayName(row) }}</td>
          <td>{{ row.sbc_dispatcher_setid ?? '—' }}</td>
          <td>{{ row.carrier || '—' }}</td>
          <td class="actions">
            <template v-if="canEdge && row.status !== 'released'">
              <button type="button" class="linkish" :disabled="busy" @click="startEdit(row)">
                Edit
              </button>
              <button type="button" class="linkish" :disabled="busy" @click="doRelease(row)">
                Release
              </button>
            </template>
            <template v-else-if="canEdge && row.status === 'released'">
              <button type="button" class="linkish" :disabled="busy" @click="startReallocate(row)">
                Re-allocate
              </button>
              <button type="button" class="linkish danger-link" :disabled="busy" @click="doRemove(row)">
                Remove
              </button>
            </template>
          </td>
        </tr>
      </tbody>
    </table>
    <p v-else-if="hasFleetGatekeeperToken() && !loading && !error" class="ok-msg">
      No DIDs in catalog yet. Allocate one to seed <code>dids.json</code>.
    </p>
  </div>
</template>

<style scoped>
.fleet-dids-view {
  max-width: 64rem;
}
.hint {
  color: var(--pbx-text-muted);
  font-size: 0.9rem;
}
.toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
  margin: 1rem 0;
}
.primary,
.secondary,
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
.secondary {
  background: #fff;
  color: var(--pbx-text, #0f172a);
}
.danger {
  background: #fff;
  color: var(--pbx-danger, #b91c1c);
  border-color: #fca5a5;
  margin-top: 0.5rem;
  align-self: flex-start;
}
.primary:disabled,
.secondary:disabled,
.danger:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.assign-form {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(11rem, 1fr));
  gap: 0.75rem 1rem;
  align-items: end;
  padding: 1rem;
  margin-bottom: 1rem;
  border: 1px solid var(--pbx-border);
  border-radius: 4px;
  background: var(--pbx-surface, #f8fafc);
}
.form-title {
  grid-column: 1 / -1;
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--pbx-text, #0f172a);
}
.form-note {
  grid-column: 1 / -1;
  margin: 0;
  font-size: 0.85rem;
  color: var(--pbx-text-muted);
}
.assign-form input[readonly] {
  background: #e2e8f0;
  color: var(--pbx-text, #0f172a);
}
.assign-form label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.8rem;
  color: var(--pbx-text-muted);
}
.assign-form input,
.assign-form select {
  font: inherit;
  padding: 0.35rem 0.5rem;
  border: 1px solid var(--pbx-border);
  border-radius: 4px;
}
.assign-form .notes {
  grid-column: 1 / -1;
}
.assign-form .check {
  flex-direction: row;
  align-items: center;
  gap: 0.5rem;
  grid-column: 1 / -1;
}
.muted {
  color: var(--pbx-text-muted);
  font-size: 0.85rem;
}
.error {
  color: var(--pbx-danger, #b91c1c);
}
.ok-msg {
  color: var(--pbx-text-muted);
}
.summary {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.75rem 1rem;
  border-radius: 4px;
  border: 1px solid var(--pbx-border);
  margin: 1rem 0;
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
.data-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 0.5rem;
}
.drift-table {
  margin-bottom: 1.25rem;
}
.data-table th,
.data-table td {
  text-align: left;
  padding: 0.45rem 0.55rem;
  border-bottom: 1px solid var(--pbx-border);
  font-size: 0.825rem;
  vertical-align: top;
}
tr.released td {
  opacity: 0.55;
}
tr.released td.actions {
  opacity: 1;
}
tr.error td:first-child {
  color: var(--pbx-danger, #b91c1c);
  font-weight: 600;
}
tr.warning td:first-child {
  color: #b45309;
  font-weight: 600;
}
.actions {
  white-space: nowrap;
}
.actions .linkish + .linkish {
  margin-left: 0.75rem;
}
.linkish {
  background: none;
  border: none;
  color: var(--pbx-primary, #2563eb);
  cursor: pointer;
  font: inherit;
  padding: 0;
  text-decoration: underline;
}
.linkish.danger-link {
  color: var(--pbx-danger, #b91c1c);
}
.linkish:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
