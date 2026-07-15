<script setup>
/**
 * Fleet instances catalog (S10.2) — register, edit metadata, maintenance, soft decommission.
 */
import { ref, computed, onMounted } from 'vue'
import {
  getFleetCatalog,
  refreshFleetSession,
  registerFleetInstance,
  patchFleetInstance,
  decommissionFleetInstance
} from '@/api/fleetGatekeeper'
import {
  hasFleetGatekeeperToken,
  getFleetAbilities,
  canFleet,
  FLEET_ABILITY
} from '@/config/fleetGatekeeper'
import FleetTokenGate from '@/components/FleetTokenGate.vue'

const instances = ref([])
const loading = ref(true)
const error = ref('')
const actionError = ref('')
const busyId = ref('')
const canManage = computed(() => canFleet(FLEET_ABILITY.INSTANCES))

const showRegister = ref(false)
const registerBusy = ref(false)
const reg = ref({
  id: '',
  fqdn: '',
  api_base_url: '',
  label: '',
  environment: 'lab',
  status: 'active',
  skip_verify: false
})

const editingId = ref('')
const editDraft = ref({ label: '', notes: '', environment: '' })

async function load() {
  if (!hasFleetGatekeeperToken()) {
    loading.value = false
    error.value = ''
    instances.value = []
    return
  }
  loading.value = true
  error.value = ''
  actionError.value = ''
  try {
    if (getFleetAbilities().length === 0) {
      await refreshFleetSession()
    }
    const catalog = await getFleetCatalog()
    instances.value = catalog.instances || []
  } catch (e) {
    error.value = e?.message || 'Failed to load fleet instances'
  } finally {
    loading.value = false
  }
}

function startEdit(row) {
  editingId.value = row.id
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

onMounted(load)
</script>

<template>
  <div class="fleet-instances-view">
    <h1>Fleet instances</h1>
    <p class="hint">
      Org catalog via gatekeeper. Register upserts the S3 directory row after a live
      <code>/up</code> check. Soft decommission hides from the picker only.
    </p>

    <FleetTokenGate @saved="load" @cleared="load" />

    <p v-if="actionError" class="error">{{ actionError }}</p>

    <div v-if="canManage && hasFleetGatekeeperToken()" class="toolbar">
      <button type="button" class="primary" @click="showRegister = !showRegister">
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

    <p v-if="loading">Loading…</p>
    <p v-else-if="error" class="error">{{ error }}</p>

    <table v-else-if="instances.length" class="data-table">
      <thead>
        <tr>
          <th>Label</th>
          <th>FQDN</th>
          <th>Environment</th>
          <th>Status</th>
          <th>ID</th>
          <th v-if="canManage"></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="i in instances" :key="i.id">
          <td>
            <template v-if="editingId === i.id">
              <input v-model="editDraft.label" class="inline-input" />
            </template>
            <template v-else>
              {{ i.label || i.fqdn || i.id }}
            </template>
          </td>
          <td>{{ i.fqdn || '—' }}</td>
          <td>
            <template v-if="editingId === i.id">
              <select v-model="editDraft.environment" class="inline-input">
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
          <td>
            <span :class="statusClass(i.status)">{{ i.status || 'active' }}</span>
          </td>
          <td><code>{{ i.id }}</code></td>
          <td v-if="canManage" class="actions">
            <template v-if="editingId === i.id">
              <label class="notes-edit">
                Notes
                <input v-model="editDraft.notes" class="inline-input" />
              </label>
              <button
                type="button"
                class="linkish"
                :disabled="busyId === i.id"
                @click="saveEdit(i.id)"
              >
                Save
              </button>
              <button type="button" class="linkish" :disabled="busyId === i.id" @click="cancelEdit">
                Cancel
              </button>
            </template>
            <template v-else>
              <button
                type="button"
                class="linkish"
                :disabled="busyId === i.id"
                @click="startEdit(i)"
              >
                Edit
              </button>
              <button
                v-if="(i.status || 'active') !== 'maintenance'"
                type="button"
                class="linkish"
                :disabled="busyId === i.id"
                @click="setStatus(i.id, 'maintenance')"
              >
                Maintenance
              </button>
              <button
                v-if="(i.status || 'active') !== 'active'"
                type="button"
                class="linkish"
                :disabled="busyId === i.id"
                @click="setStatus(i.id, 'active')"
              >
                Activate
              </button>
              <button
                v-if="(i.status || 'active') !== 'decommissioned'"
                type="button"
                class="linkish danger"
                :disabled="busyId === i.id"
                @click="doDecommission(i)"
              >
                Decommission
              </button>
            </template>
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
.data-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 1rem;
}
.data-table th,
.data-table td {
  text-align: left;
  padding: 0.5rem 0.65rem;
  border-bottom: 1px solid var(--pbx-border);
  font-size: 0.875rem;
  vertical-align: top;
}
.actions {
  white-space: nowrap;
}
.actions .linkish {
  margin-right: 0.65rem;
}
.notes-edit {
  display: block;
  margin-bottom: 0.35rem;
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
.badge--warn {
  background: #fef3c7;
  color: #92400e;
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
  cursor: default;
}
</style>
