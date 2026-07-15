<script setup>
/**
 * S10.5 — catalog DID ownership (HoR) + project to SBC inbound dr_rules.
 */
import { ref, computed, onMounted } from 'vue'
import {
  listFleetDids,
  listFleetTenants,
  assignFleetDid,
  releaseFleetDid,
  projectFleetDids,
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
const loading = ref(false)
const error = ref('')
const actionMsg = ref('')
const busy = ref(false)
const canEdge = computed(() => canFleet(FLEET_ABILITY.EDGE))

const showAssign = ref(false)
const form = ref({
  e164: '',
  sip_prefix: '',
  tenant_shortuid: '',
  status: 'active',
  carrier: '',
  notes: '',
  reassign: false
})

async function load() {
  if (!hasFleetGatekeeperToken()) {
    dids.value = []
    tenants.value = []
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
    const [list, tenantRows] = await Promise.all([
      listFleetDids(),
      listFleetTenants()
    ])
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

async function submitAssign() {
  if (!canEdge.value) return
  busy.value = true
  actionMsg.value = ''
  error.value = ''
  try {
    const body = {
      e164: form.value.e164.trim(),
      tenant_shortuid: form.value.tenant_shortuid,
      status: form.value.status,
      reassign: form.value.reassign
    }
    if (form.value.sip_prefix.trim()) body.sip_prefix = form.value.sip_prefix.trim()
    if (form.value.carrier.trim()) body.carrier = form.value.carrier.trim()
    if (form.value.notes.trim()) body.notes = form.value.notes.trim()
    const result = await assignFleetDid(body)
    const prev = result.previous_tenant_shortuid
    actionMsg.value =
      `Catalog: ${result.did?.e164} → ${result.tenant_shortuid}` +
      (prev ? ` (was ${prev})` : '') +
      '.' +
      formatSbc(result.sbc)
    if (result.sbc && result.sbc.ok === false) {
      error.value = (result.sbc.errors || [result.sbc.error || 'SBC project failed']).join(' · ')
    }
    showAssign.value = false
    form.value = {
      e164: '',
      sip_prefix: '',
      tenant_shortuid: '',
      status: 'active',
      carrier: '',
      notes: '',
      reassign: false
    }
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
      'Catalog status → released, then re-project that tenant to the SBC.'
  )
  if (!ok) return
  busy.value = true
  error.value = ''
  actionMsg.value = ''
  try {
    const result = await releaseFleetDid({ e164: row.e164, confirm: true })
    actionMsg.value = `Released ${row.e164}.` + formatSbc(result.sbc)
    await load()
  } catch (e) {
    error.value = e?.message || 'Release failed'
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
    }
  } catch (e) {
    error.value = e?.message || 'Project failed'
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
      <strong>Catalog is home of record</strong> (<code>tenants/*/dids.json</code>).
      Allocate writes the catalog, then projects inbound <code>dr_rules</code> on the SBC
      (fleet-owned rows). Optional <strong>SIP prefix</strong> is the digit string OpenSIPS matches
      (e.g. Magrathea <code>01924918076</code> vs E.164 <code>+441924918076</code>).
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
        @click="showAssign = !showAssign"
      >
        {{ showAssign ? 'Cancel' : 'Allocate DID' }}
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
      <label>
        E.164
        <input v-model="form.e164" type="text" required placeholder="+442071234567" autocomplete="off" />
      </label>
      <label>
        SIP prefix
        <input
          v-model="form.sip_prefix"
          type="text"
          placeholder="optional digits (as carrier sends)"
          autocomplete="off"
        />
      </label>
      <label>
        Tenant
        <select v-model="form.tenant_shortuid" required>
          <option disabled value="">Select tenant…</option>
          <option v-for="t in tenants" :key="t.shortuid" :value="t.shortuid">
            {{ t.name }} ({{ t.shortuid }})
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
      <label class="check">
        <input v-model="form.reassign" type="checkbox" />
        Reassign if already owned by another tenant
      </label>
      <button type="submit" class="primary" :disabled="busy || !form.tenant_shortuid">
        {{ busy ? 'Saving…' : 'Save + project' }}
      </button>
    </form>

    <p v-if="actionMsg" class="ok-msg">{{ actionMsg }}</p>
    <p v-if="error" class="error">{{ error }}</p>

    <table v-if="dids.length" class="data-table">
      <thead>
        <tr>
          <th>E.164</th>
          <th>SIP prefix</th>
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
          <td><code>{{ row.sip_prefix || row.e164_key || '—' }}</code></td>
          <td>{{ row.status }}</td>
          <td>
            <code>{{ row.tenant_shortuid }}</code>
            <span v-if="row.tenant_label" class="muted"> {{ row.tenant_label }}</span>
          </td>
          <td><code>{{ row.instance_id || '—' }}</code></td>
          <td>{{ row.sbc_dispatcher_setid ?? '—' }}</td>
          <td>{{ row.carrier || '—' }}</td>
          <td>
            <button
              v-if="canEdge && row.status !== 'released'"
              type="button"
              class="linkish"
              :disabled="busy"
              @click="doRelease(row)"
            >
              Release
            </button>
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
.secondary {
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
.primary:disabled,
.secondary:disabled {
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
tr.released td {
  opacity: 0.55;
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
.linkish:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
