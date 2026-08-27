<script setup>
import { ref, computed, onMounted } from 'vue'
import { getApiClient } from '@/api/client'
import FormField from '@/components/forms/FormField.vue'
import FormSelect from '@/components/forms/FormSelect.vue'
import ConfirmModal from '@/components/ConfirmModal.vue'
import { FIREWALL_ALLOW_RULES_HELP } from '@/constants/helpPkeys'
import FieldHelpIcon from '@/components/FieldHelpIcon.vue'
import {
  adminPortsWideOpen as adminPortsWideOpenFromRules,
  showAdminPortWarn as showAdminPortWarnFromRules
} from '@/utils/firewallAdminWarn'

const PROTO_OPTIONS = ['tcp', 'udp', 'icmp', 'all']

const profile = ref('fleet')
const rules = ref([])
const loading = ref(true)
const error = ref('')
const saving = ref(false)
const applying = ref(false)

const modalShow = ref(false)
const modalTitle = ref('')
const modalBody = ref('')
const modalIsError = ref(false)

const applyConfirmShow = ref(false)

const applyConfirmBody = computed(
  () =>
    'Apply the saved allow-list with UFW now? This rewrites pbx3-managed rules (SSH/API/RTP/SIP and any extras). LE :80 rules are left alone.'
)

/** Live: true while :22 or :44300 still allow from any (tcp/all). */
const showAdminPortWarn = computed(() => showAdminPortWarnFromRules(rules.value))
const adminPortsWideOpen = computed(() => adminPortsWideOpenFromRules(rules.value))

function emptyRule() {
  return { action: 'allow', proto: 'tcp', port: '', from: 'any', comment: '' }
}

function showResultModal(title, body, isError = false) {
  modalTitle.value = title
  modalBody.value = body
  modalIsError.value = isError
  modalShow.value = true
}

function closeModal() {
  modalShow.value = false
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const data = await getApiClient().get('firewalls')
    profile.value = data?.profile || 'fleet'
    const list = Array.isArray(data?.rules) ? data.rules : []
    rules.value = list.map((r) => ({
      action: 'allow',
      proto: (r.proto || 'tcp').toLowerCase(),
      port: r.port != null ? String(r.port) : '',
      from: r.from || 'any',
      comment: r.comment || ''
    }))
    if (rules.value.length === 0) {
      rules.value.push(emptyRule())
    }
  } catch (err) {
    error.value = err?.data?.message || err?.message || 'Failed to load firewall allow-list'
    rules.value = []
  } finally {
    loading.value = false
  }
}

function addRule() {
  rules.value.push(emptyRule())
}

function removeRule(index) {
  rules.value.splice(index, 1)
}

function portDisabled(row) {
  return row.proto === 'icmp' || row.proto === 'all'
}

async function save() {
  saving.value = true
  try {
    const payload = {
      profile: profile.value || 'fleet',
      rules: rules.value.map((r) => ({
        action: 'allow',
        proto: r.proto,
        port: portDisabled(r) ? '' : String(r.port || '').trim(),
        from: String(r.from || 'any').trim() || 'any',
        comment: String(r.comment || '').trim()
      }))
    }
    await getApiClient().post('firewalls', payload)
    showResultModal(
      'Allow-list saved',
      'Rules written to the server. Click Apply firewall to push them into UFW.',
      false
    )
  } catch (err) {
    const body = err?.data
    let msg = body?.message || err?.message || 'Save failed'
    if (body && typeof body === 'object' && !body.message) {
      const first = Object.values(body).flat?.() ?? Object.values(body)
      if (Array.isArray(first) && first[0]) msg = String(first[0])
    } else if (body?.detail) {
      msg = `${msg}: ${body.detail}`
    } else if (body?.rules) {
      msg = Array.isArray(body.rules) ? body.rules.join('; ') : String(body.rules)
    }
    showResultModal('Save failed', msg, true)
  } finally {
    saving.value = false
  }
}

function requestApply() {
  applyConfirmShow.value = true
}

function cancelApply() {
  applyConfirmShow.value = false
}

async function onApplyConfirmed() {
  applyConfirmShow.value = false
  applying.value = true
  try {
    await getApiClient().put('firewalls')
    showResultModal('Firewall applied', 'UFW rules are now in effect.', false)
    await load()
  } catch (err) {
    const body = err?.data
    const msg = body?.detail
      ? `${body?.message || err?.message}: ${body.detail}`
      : Array.isArray(body?.output)
        ? body.output.join('\n')
        : body?.message || err?.message || 'Apply failed'
    showResultModal('Apply failed', msg, true)
  } finally {
    applying.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="firewall-view">
    <h1>Firewall</h1>
    <p class="firewall-intro">
      One allow-list drives <strong>UFW</strong> for both <strong>IPv4 and IPv6</strong>
      (no separate IPv6 panel — UFW is dual-stack).
      <code>any</code> or an address/CIDR in Source applies on that stack;
      IPv6 examples: <code>2001:db8::1</code>, <code>2001:db8::/32</code>.
      Save writes <code>/etc/pbx3/firewall.allows.json</code>; Apply runs the UFW baseline.
      Fleet SIP should stay limited to SBC IP(s). Port 80 is managed only by Let’s Encrypt scripts.
    </p>

    <p v-if="loading" class="loading">Loading rules…</p>
    <p v-else-if="error" class="error">{{ error }}</p>

    <template v-else>
      <p v-if="showAdminPortWarn" class="firewall-warn" role="status">
        <strong>Narrow SSH / API while Source is still <code>any</code>.</strong>
        Port{{ adminPortsWideOpen.length > 1 ? 's' : '' }}
        <strong>{{ adminPortsWideOpen.map((p) => ':' + p).join(' and ') }}</strong>
        {{ adminPortsWideOpen.length > 1 ? 'are' : 'is' }} open from anywhere
        (install default so you are not locked out). Set Source to your ops/VPN
        CIDR(s), then Save and Apply. On cloud, also tighten the security group
        for the same ports.
      </p>
      <p class="firewall-profile">
        Profile: <strong>{{ profile || '—' }}</strong>
      </p>

      <section class="firewall-section" aria-labelledby="firewall-allows-heading">
        <div class="section-header">
          <h2 id="firewall-allows-heading" class="section-heading-with-help">
            <span>Allow rules (IPv4 + IPv6)</span>
            <FieldHelpIcon :pkey="FIREWALL_ALLOW_RULES_HELP" />
          </h2>
        </div>

      <div class="rules-table-wrap">
        <div class="rules-table">
          <div class="rules-row rules-header">
            <span class="rule-cell rule-proto">Proto</span>
            <span class="rule-cell rule-port">Port</span>
            <span class="rule-cell rule-from">Source</span>
            <span class="rule-cell rule-comment">Comment</span>
            <span class="rule-cell rule-del" title="Delete">
              <span class="action-icon" aria-hidden="true"
                ><svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="1em"
                  height="1em"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="M3 6h18" />
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                  <line x1="10" x2="10" y1="11" y2="17" />
                  <line x1="14" x2="14" y1="11" y2="17" /></svg
              ></span>
            </span>
          </div>
          <div v-for="(row, index) in rules" :key="index" class="rules-row">
            <span class="rule-cell rule-proto">
              <FormSelect
                :id="`fw-proto-${index}`"
                v-model="row.proto"
                label="Proto"
                hide-label
                hide-help
                :options="PROTO_OPTIONS"
                aria-label="Proto"
              />
            </span>
            <span class="rule-cell rule-port">
              <FormField
                :id="`fw-port-${index}`"
                v-model="row.port"
                label="Port"
                hide-label
                hide-help
                :disabled="portDisabled(row)"
                :placeholder="portDisabled(row) ? 'N/A' : '5060 or 10000:20000'"
                aria-label="Port"
              />
            </span>
            <span class="rule-cell rule-from">
              <FormField
                :id="`fw-from-${index}`"
                v-model="row.from"
                label="Source"
                hide-label
                hide-help
                placeholder="any, 192.168.1.85, or 2001:db8::1"
                aria-label="Source"
              />
            </span>
            <span class="rule-cell rule-comment">
              <FormField
                :id="`fw-comment-${index}`"
                v-model="row.comment"
                label="Comment"
                hide-label
                hide-help
                placeholder="optional"
                aria-label="Comment"
              />
            </span>
            <span class="rule-cell rule-del">
              <button
                type="button"
                class="cell-link cell-link-delete cell-link-icon"
                title="Delete rule"
                :aria-label="'Delete rule ' + (index + 1)"
                :disabled="rules.length <= 1"
                @click="removeRule(index)"
              >
                <span class="action-icon" aria-hidden="true"
                  ><svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="1em"
                    height="1em"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path d="M3 6h18" />
                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                    <line x1="10" x2="10" y1="11" y2="17" />
                    <line x1="14" x2="14" y1="11" y2="17" /></svg
                ></span>
              </button>
            </span>
          </div>
        </div>
      </div>

      <div class="firewall-actions">
        <button type="button" class="btn secondary" @click="addRule">Add rule</button>
        <button type="button" class="btn primary" :disabled="saving" @click="save">
          {{ saving ? 'Saving…' : 'Save' }}
        </button>
        <button type="button" class="btn primary" :disabled="applying" @click="requestApply">
          {{ applying ? 'Applying…' : 'Apply firewall' }}
        </button>
      </div>
      </section>
    </template>

    <ConfirmModal
      :show="applyConfirmShow"
      title="Apply firewall?"
      :body-text="applyConfirmBody"
      confirm-label="Apply"
      @confirm="onApplyConfirmed"
      @cancel="cancelApply"
    />

    <div v-if="modalShow" class="firewall-modal-overlay" @click.self="closeModal">
      <div
        class="firewall-modal"
        :class="{ 'firewall-modal-error': modalIsError }"
        role="dialog"
        aria-modal="true"
        aria-labelledby="firewall-modal-title"
      >
        <h2 id="firewall-modal-title" class="firewall-modal-title">{{ modalTitle }}</h2>
        <p class="firewall-modal-body">{{ modalBody }}</p>
        <div class="firewall-modal-actions">
          <button type="button" class="btn primary" @click="closeModal">OK</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.firewall-view {
  max-width: 960px;
}
.firewall-intro {
  color: var(--color-text-muted, #555);
  margin-bottom: 1rem;
  line-height: 1.45;
}
.firewall-warn {
  color: #92400e;
  background: #fffbeb;
  border: 1px solid #fcd34d;
  border-radius: 0.375rem;
  padding: 0.65rem 0.85rem;
  font-size: 0.9375rem;
  line-height: 1.45;
  margin: 0 0 1rem;
}
.firewall-profile {
  margin-bottom: 0.75rem;
}
.firewall-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.section-header h2 {
  margin: 0 0 0.25rem;
  font-size: 1.5rem;
  font-weight: 700;
  color: #0f172a;
}
.section-heading-with-help {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}
.loading,
.error {
  margin: 1rem 0;
}
.error {
  color: var(--color-danger, #b00020);
}
.rules-table-wrap {
  overflow-x: auto;
  margin-bottom: 1rem;
}
.rules-table {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  min-width: 640px;
  font-size: 0.9375rem;
}
.rules-row {
  display: grid;
  grid-template-columns: 7rem 9rem 1fr 1fr 2.5rem;
  gap: 0.5rem;
  align-items: start;
}
.rules-header {
  font-size: inherit;
  font-weight: 600;
  font-family: inherit;
  color: #475569;
  align-items: center;
}
.rule-del {
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 2.25rem;
}
.action-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.cell-link-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.25rem;
}
.cell-link-icon .action-icon {
  color: inherit;
}
.cell-link-delete {
  color: #dc2626;
  background: none;
  border: none;
  padding: 0;
  font: inherit;
  cursor: pointer;
}
.cell-link-delete:hover:not(:disabled) {
  color: #b91c1c;
  text-decoration: underline;
}
.cell-link-delete:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
.firewall-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 0.5rem;
}
.btn {
  padding: 0.45rem 0.9rem;
  border-radius: 4px;
  border: 1px solid transparent;
  cursor: pointer;
  font: inherit;
}
.btn.primary {
  background: var(--color-accent, #2563eb);
  color: #fff;
}
.btn.secondary {
  background: transparent;
  border-color: var(--color-border, #ccc);
}
.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.firewall-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
}
.firewall-modal {
  background: var(--color-surface, #fff);
  padding: 1.25rem 1.5rem;
  border-radius: 6px;
  max-width: 28rem;
  width: 90%;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
}
.firewall-modal-error .firewall-modal-title {
  color: var(--color-danger, #b00020);
}
.firewall-modal-title {
  margin: 0 0 0.5rem;
  font-size: 1.1rem;
}
.firewall-modal-body {
  margin: 0 0 1rem;
  white-space: pre-wrap;
  word-break: break-word;
}
.firewall-modal-actions {
  display: flex;
  justify-content: flex-end;
}
</style>
