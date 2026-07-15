<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PanelBackLink from '@/components/PanelBackLink.vue'
import {
  listFleetTenants,
  getFleetCatalog,
  createTenantMove,
  runTenantMove
} from '@/api/fleetGatekeeper'
import { isFleetGatekeeperEnabled } from '@/config/fleetGatekeeper'

const route = useRoute()
const router = useRouter()

const step = ref(1)
const loading = ref(true)
const submitting = ref(false)
const error = ref('')

const tenants = ref([])
const instances = ref([])

const tenantShortuid = ref(String(route.query.tenant || ''))
const destInstanceId = ref('')
const includeRecordings = ref(false)
const replaceOnDest = ref(false)

const tenant = computed(() =>
  tenants.value.find((t) => t.shortuid === tenantShortuid.value) || null
)

const sourceInstance = computed(() => {
  const id = tenant.value?.instance_id
  if (!id) return null
  return instances.value.find((i) => i.id === id) || null
})

const destChoices = computed(() => {
  const src = tenant.value?.instance_id
  return instances.value.filter((i) => {
    if (i.id === src) return false
    const status = (i.status || 'active').toLowerCase()
    return status !== 'decommissioned' && status !== 'maintenance'
  })
})

const destInstance = computed(() =>
  instances.value.find((i) => i.id === destInstanceId.value) || null
)

const canStart = computed(() => {
  return (
    tenant.value &&
    destInstance.value &&
    destInstance.value.api_base_url &&
    sourceInstance.value?.api_base_url &&
    Number(destInstance.value.sbc_dispatcher_setid) >= 1
  )
})

async function load() {
  if (!isFleetGatekeeperEnabled()) {
    error.value = 'Set VITE_FLEET_GATEKEEPER_URL and a session (or DEV) gatekeeper token to use the move wizard.'
    loading.value = false
    return
  }
  try {
    const [tList, catalog] = await Promise.all([listFleetTenants(), getFleetCatalog()])
    tenants.value = tList
    instances.value = (catalog.instances || []).map((row) => ({
      ...row,
      sbc_dispatcher_setid: row.sbc_dispatcher_setid != null ? Number(row.sbc_dispatcher_setid) : null
    }))
    if (!tenantShortuid.value && tList.length === 1) {
      tenantShortuid.value = tList[0].shortuid
    }
  } catch (e) {
    error.value = e?.message || 'Failed to load fleet data'
  } finally {
    loading.value = false
  }
}

function next() {
  error.value = ''
  if (step.value === 1 && !tenant.value) {
    error.value = 'Select a tenant'
    return
  }
  if (step.value === 2 && !destInstance.value) {
    error.value = 'Select a destination instance'
    return
  }
  if (step.value === 2 && !(Number(destInstance.value.sbc_dispatcher_setid) >= 1)) {
    error.value = 'Destination instance needs sbc_dispatcher_setid in the catalog'
    return
  }
  step.value += 1
}

function back() {
  error.value = ''
  if (step.value > 1) step.value -= 1
}

async function startMove() {
  if (!canStart.value) {
    error.value = 'Missing source/dest API URL or SBC setid on destination'
    return
  }
  submitting.value = true
  error.value = ''
  try {
    const t = tenant.value
    const src = sourceInstance.value
    const dst = destInstance.value
    const job = await createTenantMove({
      tenant_shortuid: t.shortuid,
      tenant_fqdn: t.fqdn || t.cname || undefined,
      source_instance_id: t.instance_id,
      dest_instance_id: dst.id,
      source_api_base_url: src.api_base_url,
      dest_api_base_url: dst.api_base_url,
      dest_sbc_dispatcher_setid: Number(dst.sbc_dispatcher_setid),
      options: {
        include_recordings: includeRecordings.value,
        replace_on_dest: replaceOnDest.value
      }
    })
    // Kick automated phases; job view will show result (may fail if nodes not deployed yet)
    let latest = job
    try {
      latest = await runTenantMove(job.job_id, t.shortuid)
    } catch (runErr) {
      // Still open job view so operator can see failed state / retry
      console.warn('Move run failed', runErr)
    }
    await router.push({
      name: 'fleet-tenant-move-job',
      params: { jobId: latest.job_id || job.job_id },
      query: { tenant: t.shortuid }
    })
  } catch (e) {
    error.value = e?.message || 'Failed to start move'
  } finally {
    submitting.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="move-wizard">
    <PanelBackLink :to="{ name: 'fleet-tenants' }" label="Fleet tenants">
      <h1>Move tenant</h1>
    </PanelBackLink>

    <p v-if="loading">Loading…</p>
    <p v-else-if="error && step < 4" class="error">{{ error }}</p>

    <template v-else>
      <ol class="steps">
        <li :class="{ active: step === 1 }">Tenant</li>
        <li :class="{ active: step === 2 }">Destination</li>
        <li :class="{ active: step === 3 }">Options</li>
        <li :class="{ active: step === 4 }">Review</li>
      </ol>

      <section v-if="step === 1" class="panel">
        <h2>Select tenant</h2>
        <label>
          Tenant
          <select v-model="tenantShortuid">
            <option disabled value="">Choose…</option>
            <option v-for="t in tenants" :key="t.shortuid" :value="t.shortuid">
              {{ t.name }} ({{ t.shortuid }}) — {{ t.fqdn || 'no fqdn' }}
            </option>
          </select>
        </label>
      </section>

      <section v-else-if="step === 2" class="panel">
        <h2>Destination instance</h2>
        <p class="hint">Source: {{ sourceInstance?.label || tenant?.instance_id }}</p>
        <label>
          Destination
          <select v-model="destInstanceId">
            <option disabled value="">Choose…</option>
            <option v-for="i in destChoices" :key="i.id" :value="i.id">
              {{ i.label || i.fqdn }} — setid {{ i.sbc_dispatcher_setid ?? 'missing' }}
            </option>
          </select>
        </label>
        <p v-if="destChoices.length === 0" class="hint">No other active instances in catalog.</p>
      </section>

      <section v-else-if="step === 3" class="panel">
        <h2>Options</h2>
        <label class="check">
          <input v-model="includeRecordings" type="checkbox" />
          Include on-node recordings in export
        </label>
        <label class="check">
          <input v-model="replaceOnDest" type="checkbox" />
          Replace if tenant already exists on destination
        </label>
      </section>

      <section v-else class="panel">
        <h2>Review &amp; start</h2>
        <dl class="review">
          <dt>Tenant</dt>
          <dd>{{ tenant?.name || tenant?.fqdn }} ({{ tenant?.shortuid }})</dd>
          <dt>From</dt>
          <dd>{{ sourceInstance?.label || tenant?.instance_id }}</dd>
          <dt>To</dt>
          <dd>
            {{ destInstance?.label || destInstanceId }} (setid
            {{ destInstance?.sbc_dispatcher_setid }})
          </dd>
          <dt>Recordings</dt>
          <dd>{{ includeRecordings ? 'include' : 'skip' }}</dd>
          <dt>Replace on dest</dt>
          <dd>{{ replaceOnDest ? 'yes' : 'no' }}</dd>
        </dl>
        <p class="hint">
          Start runs automated phases until a human gate (verify call, then source delete). Requires
          fleet APIs on nodes/SBC and matching service tokens.
        </p>
        <p v-if="error" class="error">{{ error }}</p>
        <button type="button" class="primary" :disabled="submitting || !canStart" @click="startMove">
          {{ submitting ? 'Starting…' : 'Start move' }}
        </button>
      </section>

      <div class="nav">
        <button v-if="step > 1 && step < 4" type="button" :disabled="submitting" @click="back">
          Back
        </button>
        <button v-if="step < 4" type="button" class="primary" @click="next">Next</button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.move-wizard {
  max-width: 40rem;
}
.steps {
  display: flex;
  gap: 1rem;
  list-style: none;
  padding: 0;
  margin: 1rem 0;
  font-size: 0.85rem;
  color: #64748b;
}
.steps .active {
  color: #0f172a;
  font-weight: 600;
}
.panel {
  margin: 1rem 0;
}
.panel label {
  display: block;
  margin: 0.75rem 0;
}
.panel select {
  display: block;
  width: 100%;
  margin-top: 0.35rem;
  padding: 0.4rem 0.5rem;
}
.check {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.review {
  display: grid;
  grid-template-columns: 8rem 1fr;
  gap: 0.35rem 1rem;
}
.review dt {
  color: #64748b;
}
.hint {
  color: #64748b;
  font-size: 0.9rem;
}
.error {
  color: #b91c1c;
}
.nav {
  display: flex;
  gap: 0.75rem;
  margin-top: 1.25rem;
}
button.primary {
  background: #0f172a;
  color: #fff;
  border: none;
  padding: 0.45rem 0.9rem;
  cursor: pointer;
}
button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
