<script setup>
/**
 * SBC HA edge pair — health, manual|auto mode, Promote now.
 * API still uses mode=managed|auto; UI says Manual for managed.
 */
import { ref, computed, onMounted } from 'vue'
import {
  listEdgePairs,
  patchEdgePair,
  promoteEdgePair,
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
const canAdmin = computed(() => canFleet(FLEET_ABILITY.ADMIN))

async function load() {
  if (!hasFleetGatekeeperToken()) {
    pairs.value = []
    error.value = ''
    return
  }
  loading.value = true
  error.value = ''
  try {
    if (getFleetAbilities().length === 0) {
      await refreshFleetSession()
    }
    const data = await listEdgePairs()
    pairs.value = data.edge_pairs || []
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

async function setMode(p, mode) {
  if (!canAdmin.value) return
  busyId.value = p.id
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
  }
}

async function promoteNow(p) {
  if (!canAdmin.value) return
  if (
    !confirm(
      `Promote ${p.label}?\nEIP moves to the standby. HTTPS may break until Phase D LE on the new active.`
    )
  ) {
    return
  }
  busyId.value = p.id
  actionMsg.value = ''
  error.value = ''
  try {
    const data = await promoteEdgePair(p.id)
    actionMsg.value = `Promoted ${p.label} → member ${data?.pair?.active_member || '?'}. Run Phase D LE if needed.`
    await load()
  } catch (e) {
    error.value = e?.message || 'Promote failed'
  } finally {
    busyId.value = ''
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
          SBC active–passive pair. Probe = SIP OPTIONS on the VIP.
          <strong>Manual</strong> = alert only (human moves EIP).
          <strong>Auto</strong> = control may move EIP when enabled on control.
          Control-down: AWS Console EIP → warm standby.
        </p>
      </div>
      <button type="button" class="btn" :disabled="loading" @click="load">Refresh</button>
    </header>

    <p v-if="error" class="err">{{ error }}</p>
    <p v-if="actionMsg" class="ok">{{ actionMsg }}</p>
    <p v-if="loading" class="muted">Loading…</p>

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
          class="btn btn-primary"
          :disabled="busyId === p.id"
          @click="promoteNow(p)"
        >
          Promote now
        </button>
      </div>
      <p v-else class="muted">Sign in as fleet_admin to change mode or promote.</p>
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
  background: #1e3a5f;
  color: #fff;
  border-color: #1e3a5f;
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
code {
  font-size: 0.85em;
}
</style>
