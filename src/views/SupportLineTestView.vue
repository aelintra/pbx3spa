<script setup>
/**
 * Support line quality test (Phase 2) — hidden tenant WebRTC caller + dial any ext + hold/MOH.
 */
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getApiClient } from '@/api/client'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import { normalizeList } from '@/utils/listResponse'
import { loadTenantOptions } from '@/utils/loadTenantOptions'
import { firstErrorMessage } from '@/utils/formErrors'
import LineTestPanel from '@/components/LineTestPanel.vue'
import FormField from '@/components/forms/FormField.vue'
import FormSelect from '@/components/forms/FormSelect.vue'
import FormReadonly from '@/components/forms/FormReadonly.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const toast = useToastStore()

const tenants = ref([])
const extensions = ref([])
const cluster = ref('')
const ensuring = ref(false)
const loadingExt = ref(false)
const errorMsg = ref('')
const lineTestCaller = ref(null)
const dialTarget = ref('')
const createdNeedsCommit = ref(false)

const tenantSelectOptions = computed(() => {
  const list = tenants.value
    .map((t) => ({
      value: String(t.pkey ?? t.shortuid ?? ''),
      label: String(t.pkey ?? t.shortuid ?? ''),
      shortuid: t.shortuid != null ? String(t.shortuid) : '',
      fqdn: t.fqdn != null ? String(t.fqdn).trim() : ''
    }))
    .filter((o) => o.value)
  return list.sort((a, b) => a.label.localeCompare(b.label))
})

const selectedTenant = computed(() => {
  const v = cluster.value
  return tenantSelectOptions.value.find((o) => o.value === v || o.shortuid === v) || null
})

const sipDomain = computed(() => selectedTenant.value?.fqdn || '')

const extensionSelectOptions = computed(() => {
  return [...extensions.value]
    .filter((e) => {
      const d = (e.description ?? '').toString().trim()
      return d !== 'system:line-test'
    })
    .sort((a, b) =>
      String(a.pkey ?? '').localeCompare(String(b.pkey ?? ''), undefined, { numeric: true })
    )
    .map((e) => {
      const pkey = String(e.pkey ?? '')
      const name = (e.desc || e.cname || e.shortuid || '').toString().trim()
      return {
        value: pkey || String(e.shortuid || ''),
        label: name ? `${pkey} · ${name}` : pkey
      }
    })
    .filter((o) => o.value)
})

async function fetchTenants() {
  try {
    tenants.value = await loadTenantOptions()
  } catch {
    tenants.value = []
  }
  if (!cluster.value) {
    const fromQuery = route.query.cluster
    if (
      fromQuery &&
      tenantSelectOptions.value.some(
        (o) => o.value === String(fromQuery) || o.shortuid === String(fromQuery)
      )
    ) {
      cluster.value = String(fromQuery)
    } else {
      const ctx = auth.tenantContext?.pkey
      if (ctx && tenantSelectOptions.value.some((o) => o.value === ctx || o.shortuid === ctx)) {
        cluster.value = ctx
      } else if (tenantSelectOptions.value.length === 1) {
        cluster.value = tenantSelectOptions.value[0].value
      } else if (tenantSelectOptions.value.length > 0) {
        cluster.value = tenantSelectOptions.value[0].value
      }
    }
  }
}

async function fetchExtensions() {
  loadingExt.value = true
  try {
    const raw = await getApiClient().get('extensions')
    const list = normalizeList(raw)
    const cl = cluster.value
    const t = selectedTenant.value
    extensions.value = list.filter((e) => {
      if (!cl) return true
      const ids = [e.cluster, e.tenant_pkey].filter(Boolean).map(String)
      const match = [cl, t?.shortuid, t?.value].filter(Boolean).map(String)
      return ids.some((id) => match.includes(id))
    })
  } catch {
    extensions.value = []
  } finally {
    loadingExt.value = false
  }
}

async function ensureCaller() {
  errorMsg.value = ''
  if (!cluster.value) {
    errorMsg.value = 'Select a tenant first.'
    return
  }
  ensuring.value = true
  createdNeedsCommit.value = false
  try {
    const res = await getApiClient().post('extensions/line-test/ensure', {
      cluster: cluster.value
    })
    lineTestCaller.value = res
    if (res?.created) {
      createdNeedsCommit.value = true
      toast.show(
        'Support WebRTC created — Commit on this instance before Register will succeed.'
      )
    }
  } catch (err) {
    lineTestCaller.value = null
    errorMsg.value = firstErrorMessage(err) || 'Could not prepare support line-test WebRTC.'
  } finally {
    ensuring.value = false
  }
}

function applyRouteTarget() {
  const q = route.query.target ?? route.query.dial
  if (q != null && String(q).trim() !== '') {
    dialTarget.value = String(q).trim()
  }
}

watch(cluster, async () => {
  lineTestCaller.value = null
  createdNeedsCommit.value = false
  await fetchExtensions()
  if (cluster.value) await ensureCaller()
})

onMounted(async () => {
  applyRouteTarget()
  await fetchTenants()
  if (cluster.value) {
    await fetchExtensions()
    await ensureCaller()
  }
})

watch(
  () => route.query,
  () => applyRouteTarget()
)

function clearTargetQuery() {
  if (route.query.target || route.query.dial) {
    const q = { ...route.query }
    delete q.target
    delete q.dial
    router.replace({ name: 'support-line-test', query: q })
  }
}
</script>

<template>
  <div class="support-line-test detail-content">
    <header class="list-header">
      <h1 class="detail-panel-title">Line quality test</h1>
      <p class="list-legend">
        Ops diagnostic — call any extension from a hidden tenant WebRTC, Hold for MOH, then copy the
        post-call report for tickets.
      </p>
    </header>

    <section class="setup-section">
      <h2 class="detail-heading">Caller</h2>
      <div class="form-fields">
        <FormSelect
          id="slt-tenant"
          v-model="cluster"
          label="Tenant"
          :options="tenantSelectOptions"
          hint="One hidden WebRTC per tenant (not shown on Extensions)."
          :disabled="ensuring"
        />
        <div class="form-field form-field-actions">
          <span class="form-field-label" aria-hidden="true" />
          <div class="form-field-input-wrapper">
            <button
              type="button"
              class="btn-primary"
              :disabled="ensuring || !cluster"
              @click="ensureCaller"
            >
              {{ ensuring ? 'Preparing…' : 'Refresh caller' }}
            </button>
          </div>
        </div>
      </div>
      <p v-if="errorMsg" class="error" role="alert">{{ errorMsg }}</p>
      <p v-if="createdNeedsCommit" class="commit-hint" role="status">
        New support WebRTC — run <strong>Commit</strong> before Register.
      </p>
      <div v-if="lineTestCaller" class="form-fields caller-readonly">
        <FormReadonly
          id="slt-sip-user"
          label="SIP user"
          :value="String(lineTestCaller.shortuid || '—')"
          hide-help
        />
        <FormReadonly
          id="slt-dialable"
          label="Dialable"
          :value="String(lineTestCaller.pkey || '—')"
          hide-help
        />
        <FormReadonly
          id="slt-sip-domain"
          label="SIP domain"
          :value="sipDomain || String(lineTestCaller.tenant_fqdn || '—')"
          hide-help
        />
      </div>
    </section>

    <section class="setup-section">
      <h2 class="detail-heading">Dial target</h2>
      <div class="form-fields">
        <FormSelect
          id="slt-pick"
          v-model="dialTarget"
          label="Extension"
          :options="extensionSelectOptions"
          :loading="loadingExt"
          hint="Pick an extension, or type a dialable / shortuid below."
        />
        <FormField
          id="slt-target"
          v-model="dialTarget"
          label="Or type dialable"
          type="text"
          placeholder="e.g. 101"
        />
      </div>
      <button
        v-if="route.query.target || route.query.dial"
        type="button"
        class="linkish"
        @click="clearTargetQuery"
      >
        Clear deep-link target
      </button>
    </section>

    <section v-if="lineTestCaller" class="setup-section">
      <h2 class="detail-heading">Dialler</h2>
      <LineTestPanel
        embedded
        support-mode
        title="Support line test"
        :sip-user="String(lineTestCaller.shortuid || '')"
        :sip-domain="sipDomain || String(lineTestCaller.tenant_fqdn || '')"
        :dialable-label="String(lineTestCaller.pkey || '')"
        :initial-password="lineTestCaller.passwd != null ? String(lineTestCaller.passwd) : ''"
        :initial-dial-target="dialTarget"
      />
    </section>
    <p v-else-if="cluster && !ensuring" class="list-legend">
      Preparing support caller… or click Refresh caller.
    </p>
  </div>
</template>

<style scoped>
.support-line-test {
  max-width: 40rem;
}
.list-header {
  margin-bottom: 1rem;
}
.list-header .detail-panel-title {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--pbx-text, #0f172a);
  letter-spacing: -0.02em;
}
.list-legend {
  margin: 0.25rem 0 0;
  max-width: 48rem;
  color: var(--pbx-text-muted, #64748b);
  font-size: 0.95rem;
  line-height: 1.4;
}
.setup-section {
  margin-bottom: 1.25rem;
}
.setup-section .detail-heading {
  margin: 0 0 0.75rem;
}
.form-fields {
  display: flex;
  flex-direction: column;
}
.form-field-actions {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 2fr;
  gap: 0.375rem 1rem;
  align-items: start;
  margin-bottom: 0.75rem;
}
.form-field-label {
  font-weight: 500;
  color: #475569;
  padding-top: 0.375rem;
}
.form-field-input-wrapper {
  min-width: 0;
}
.caller-readonly {
  margin-top: 0.25rem;
}
.error {
  margin: 0.5rem 0 0;
  color: #b91c1c;
  font-size: 0.875rem;
}
.commit-hint {
  margin: 0.5rem 0 0.75rem;
  font-size: 0.875rem;
  color: #92400e;
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 0.375rem;
  padding: 0.45rem 0.6rem;
}
.linkish {
  margin-top: 0.25rem;
  border: none;
  background: none;
  color: #4338ca;
  font-size: 0.875rem;
  cursor: pointer;
  padding: 0;
  text-decoration: underline;
}
.secondary {
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: #64748b;
  background: transparent;
  border: 1px solid #e2e8f0;
  border-radius: 0.375rem;
  cursor: pointer;
}
.secondary:hover:not(:disabled) {
  background: #f1f5f9;
}
.secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.btn-primary {
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: #fff;
  background: #2563eb;
  border: none;
  border-radius: 0.375rem;
  cursor: pointer;
}
.btn-primary:hover:not(:disabled) {
  background: #1d4ed8;
}
.btn-primary:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
</style>
