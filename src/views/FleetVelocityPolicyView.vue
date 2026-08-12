<script setup>
/**
 * Fleet velocity policy editor — Gatekeeper API → S3 catalog/velocity-policy.json.
 * Spec: FLEET_TOLL_FRAUD_VELOCITY_IMPLEMENTATION_PLAN.md WP3 (no Filament).
 */
import { ref, computed, onMounted } from 'vue'
import {
  getFleetVelocityPolicy,
  putFleetVelocityPolicy,
  refreshFleetSession
} from '@/api/fleetGatekeeper'
import { canFleet, FLEET_ABILITY } from '@/config/fleetGatekeeper'

const loading = ref(false)
const saving = ref(false)
const error = ref('')
const msg = ref('')
const policy = ref(null)

const canAdmin = computed(() => canFleet(FLEET_ABILITY.ADMIN))

const n = ref(10)
const tMinutes = ref(5)
const qMinutes = ref(30)
const prefixesText = ref('0900, +44900, 0044900')
const actEnabled = ref(false)
const offHoursEnabled = ref(false)
const allowlistText = ref('')

function applyForm(doc) {
  policy.value = doc
  const irsf = doc?.irsf || {}
  n.value = Number(irsf.n ?? 10)
  tMinutes.value = Number(irsf.t_minutes ?? 5)
  qMinutes.value = Number(irsf.q_minutes ?? 30)
  prefixesText.value = Array.isArray(irsf.prefixes) ? irsf.prefixes.join(', ') : '0900, +44900, 0044900'
  actEnabled.value = !!irsf.act_enabled
  offHoursEnabled.value = !!(doc?.detectors?.off_hours)
  allowlistText.value = Array.isArray(doc?.allowlist_extensions)
    ? doc.allowlist_extensions.join(', ')
    : ''
}

async function load() {
  loading.value = true
  error.value = ''
  msg.value = ''
  try {
    await refreshFleetSession()
    const doc = await getFleetVelocityPolicy()
    applyForm(doc)
  } catch (e) {
    error.value = e?.message || String(e)
  } finally {
    loading.value = false
  }
}

async function save() {
  if (!canAdmin.value) return
  saving.value = true
  error.value = ''
  msg.value = ''
  try {
    const prefixes = prefixesText.value
      .split(/[,\s]+/)
      .map((s) => s.trim())
      .filter(Boolean)
    const allowlist = allowlistText.value
      .split(/[,\s]+/)
      .map((s) => s.trim())
      .filter(Boolean)
    const body = {
      ...(policy.value || {}),
      irsf: {
        n: Number(n.value) || 10,
        t_minutes: Number(tMinutes.value) || 5,
        q_minutes: Number(qMinutes.value) || 30,
        prefixes,
        act_enabled: !!actEnabled.value
      },
      detectors: {
        irsf: true,
        off_hours: !!offHoursEnabled.value
      },
      allowlist_extensions: allowlist
    }
    if (policy.value?.off_hours) {
      body.off_hours = policy.value.off_hours
    }
    const doc = await putFleetVelocityPolicy(body)
    applyForm(doc)
    msg.value = 'Saved to catalog/velocity-policy.json'
  } catch (e) {
    error.value = e?.message || String(e)
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="fleet-velocity">
    <h1>Velocity policy</h1>
    <p class="hint">
      Fleet-wide IRSF knobs in S3 (<code>catalog/velocity-policy.json</code>). Gatekeeper is the only
      writer; nodes pull with cache / env fallback. Node still needs
      <code>PBX3_OPS_VELOCITY_ENABLED=true</code> to run the scanner.
    </p>

    <p v-if="loading" class="muted">Loading…</p>
    <p v-if="error" class="error">{{ error }}</p>
    <p v-if="msg" class="ok">{{ msg }}</p>

    <form v-if="policy && !loading" class="panel" @submit.prevent="save">
      <label>
        Threshold N
        <input v-model.number="n" type="number" min="1" :disabled="!canAdmin" />
      </label>
      <label>
        Window T (minutes)
        <input v-model.number="tMinutes" type="number" min="1" :disabled="!canAdmin" />
      </label>
      <label>
        Quiet Q (minutes)
        <input v-model.number="qMinutes" type="number" min="1" :disabled="!canAdmin" />
      </label>
      <label>
        Prefixes (comma-separated)
        <input v-model="prefixesText" type="text" :disabled="!canAdmin" />
      </label>
      <label class="check">
        <input v-model="actEnabled" type="checkbox" :disabled="!canAdmin" />
        Fleet act_enabled (V5 auto-block when node scanner is on)
      </label>
      <label class="check">
        <input v-model="offHoursEnabled" type="checkbox" :disabled="!canAdmin" />
        Enable off-hours detector flag (WP1 — scanner not shipped yet)
      </label>
      <label>
        Allowlist extensions (never auto-deactivate)
        <input v-model="allowlistText" type="text" :disabled="!canAdmin" />
      </label>

      <div class="actions">
        <button type="button" class="secondary" :disabled="loading" @click="load">Reload</button>
        <button type="submit" class="primary" :disabled="!canAdmin || saving">
          {{ saving ? 'Saving…' : 'Save' }}
        </button>
      </div>
      <p v-if="!canAdmin" class="hint">Requires <code>fleet_admin</code> to save.</p>
      <p v-if="policy.updated_at" class="muted">
        Updated {{ policy.updated_at }}
        <span v-if="policy.updated_by"> by {{ policy.updated_by }}</span>
      </p>
    </form>
  </div>
</template>

<style scoped>
.fleet-velocity {
  max-width: 40rem;
  padding-bottom: 6rem;
}
.hint {
  color: var(--pbx-text-muted);
  font-size: 0.9rem;
}
.muted {
  color: var(--pbx-text-muted);
}
.error {
  color: var(--pbx-danger, #b91c1c);
}
.ok {
  color: var(--pbx-success, #15803d);
}
.panel {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  margin: 1rem 0;
  padding: 1rem;
  border: 1px solid var(--pbx-border);
  border-radius: 4px;
  background: var(--pbx-surface, #fff);
}
label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.875rem;
}
label.check {
  flex-direction: row;
  align-items: center;
  gap: 0.5rem;
}
input[type='text'],
input[type='number'] {
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
.actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.35rem;
}
.primary {
  background: var(--pbx-accent, #2563eb);
  color: #fff;
  border: none;
  border-radius: 4px;
  padding: 0.4rem 0.85rem;
  font: inherit;
  cursor: pointer;
}
.secondary {
  background: transparent;
  color: var(--pbx-text, inherit);
  border: 1px solid var(--pbx-border, #94a3b8);
  border-radius: 4px;
  padding: 0.4rem 0.85rem;
  font: inherit;
  cursor: pointer;
}
.primary:disabled,
.secondary:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
</style>
