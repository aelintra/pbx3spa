<script setup>
import { ref, onMounted } from 'vue'
import { getApiClient } from '@/api/client'
import FormField from '@/components/forms/FormField.vue'
import FormSelect from '@/components/forms/FormSelect.vue'

const ipv4Rules = ref('')
const loading = ref(true)
const error = ref('')
const saving = ref(false)
const restarting = ref(false)
const viewMode = ref('table') // 'table' | 'raw'

const modalShow = ref(false)
const modalTitle = ref('')
const modalBody = ref('')
const modalIsError = ref(false)

const PROTO_OPTIONS = ['tcp', 'udp', 'icmp', 'all']

// Shorewall rule: ACTION SOURCE DEST [PROTO ...] [ # comment]. Only treat # as comment when preceded by whitespace (so tokens like zone names aren't split).
function parseRuleLine(line) {
  const commentMatch = line.match(/\s+#\s*(.*)$/)
  const rulePart = commentMatch ? line.slice(0, commentMatch.index).trim() : line.trim()
  const description = commentMatch ? commentMatch[1].trim() : ''
  const tokens = rulePart.split(/\s+/).filter(Boolean)
  if (tokens.length < 3) return null
  const pad = (i) => tokens[i] ?? '-'
  return {
    action: pad(0),
    source: pad(1),
    dest: pad(2),
    proto: pad(3),
    destports: pad(4),
    sport: pad(5),
    origdest: pad(6),
    connrate: pad(7),
    description
  }
}

function ruleToLine(r) {
  const base = [r.action, r.source, r.dest, r.proto, r.destports, r.sport, r.origdest, r.connrate].join(' ')
  return r.description ? `${base} # ${r.description}` : base
}

const parsedRules = ref([])
const preambleLines = ref([])
const postambleLines = ref([])

function parseLines(lines) {
  const rules = []
  let preamble = []
  let postamble = []
  let seenRule = false
  for (const line of lines) {
    const trimmed = line.trimEnd()
    if (trimmed === '' || trimmed.startsWith('#')) {
      if (seenRule) postamble.push(trimmed)
      else preamble.push(trimmed)
      continue
    }
    const rule = parseRuleLine(trimmed)
    if (rule) {
      seenRule = true
      rules.push(rule)
    } else {
      if (seenRule) postamble.push(trimmed)
      else preamble.push(trimmed)
    }
  }
  parsedRules.value = rules
  preambleLines.value = preamble
  postambleLines.value = postamble
}

function serializeToLines() {
  const out = [...preambleLines.value]
  for (const r of parsedRules.value) {
    out.push(ruleToLine(r))
  }
  out.push(...postambleLines.value)
  return out
}

async function fetchIpv4() {
  try {
    const data = await getApiClient().get('firewalls/ipv4')
    const rules = data?.rules ?? []
    const raw = Array.isArray(rules) ? rules.join('\n') : String(rules)
    ipv4Rules.value = raw
    parseLines(raw.split(/\r?\n/).map((l) => l.trimEnd()))
  } catch (err) {
    ipv4Rules.value = ''
    error.value = err?.data?.message || err?.message || 'Failed to load firewall rules'
  }
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    await fetchIpv4()
  } finally {
    loading.value = false
  }
}

function rulesToArray(text) {
  return text.split(/\r?\n/).map((line) => line.trimEnd())
}

function addRule() {
  parsedRules.value.push({
    action: 'ACCEPT',
    source: 'net',
    dest: '$FW',
    proto: 'tcp',
    destports: '5060',
    sport: '-',
    origdest: '-',
    connrate: '-',
    description: ''
  })
}

function removeRule(index) {
  parsedRules.value.splice(index, 1)
}

function syncRawFromTable() {
  ipv4Rules.value = serializeToLines().join('\n')
}

function syncTableFromRaw() {
  parseLines(rulesToArray(ipv4Rules.value))
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

async function save() {
  saving.value = true
  try {
    const rules =
      viewMode.value === 'table' ? serializeToLines() : rulesToArray(ipv4Rules.value)
    await getApiClient().post('firewalls/ipv4', { rules })
    showResultModal(
      'Rules saved',
      'Firewall rules have been written to the server. Click Restart firewall to apply them.',
      false
    )
  } catch (err) {
    const detail = err?.data?.detail
    const msg = detail ? `${err?.data?.message || err?.message}: ${detail}` : (err?.data?.message || err?.message || 'Save failed')
    showResultModal('Save failed', msg, true)
  } finally {
    saving.value = false
  }
}

async function restart() {
  if (!confirm('Restart the firewall now? Shorewall will validate the rules and apply them, or report errors.')) {
    return
  }
  restarting.value = true
  try {
    await getApiClient().put('firewalls/ipv4')
    showResultModal(
      'Firewall restarted',
      'Shorewall has been restarted. The new rules are now in effect.',
      false
    )
  } catch (err) {
    const body = err?.data
    const msg = Array.isArray(body) ? body.join('\n') : (body?.detail ? `${body?.message || err?.message}: ${body.detail}` : (body?.message || err?.message || 'Restart failed'))
    showResultModal('Restart failed', msg, true)
  } finally {
    restarting.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="firewall-view">
    <h1>Firewall</h1>
    <p class="firewall-intro">Edit raw Shorewall rules (IPv4). Save writes the file; Restart runs <code>shorewall check</code> then applies if valid. Shorewall will accept or reject the config on restart.</p>

    <p v-if="loading" class="loading">Loading rules…</p>
    <p v-else-if="error" class="error">{{ error }}</p>

    <template v-else>
      <section class="firewall-section">
        <div class="firewall-section-head">
          <h2 class="detail-heading">IPv4 (pbx3_rules)</h2>
          <div class="view-toggle">
            <button
              type="button"
              class="toggle-btn"
              :class="{ active: viewMode === 'table' }"
              @click="viewMode = 'table'; syncTableFromRaw()"
            >
              Table
            </button>
            <button
              type="button"
              class="toggle-btn"
              :class="{ active: viewMode === 'raw' }"
              @click="viewMode = 'raw'; syncRawFromTable()"
            >
              Raw
            </button>
          </div>
        </div>

        <template v-if="viewMode === 'table'">
          <div class="rules-table-wrap">
          <div class="rules-table">
            <div class="rules-row rules-header">
              <span class="rule-cell rule-action">Action</span>
              <span class="rule-cell rule-source">Source</span>
              <span class="rule-cell rule-dest">Dest</span>
              <span class="rule-cell rule-proto">Proto</span>
              <span class="rule-cell rule-destports">Dest ports</span>
              <span class="rule-cell rule-sport">Sport</span>
              <span class="rule-cell rule-origdest">Orig dest</span>
              <span class="rule-cell rule-connrate">Conn rate</span>
              <span class="rule-cell rule-desc">Description</span>
              <span class="rule-cell rule-del"></span>
            </div>
            <div
              v-for="(r, idx) in parsedRules"
              :key="idx"
              class="rules-row rule-row-fields"
            >
              <div class="rule-cell rule-action">
                <FormField
                  :id="'fw-action-' + idx"
                  v-model="r.action"
                  label="Action"
                  type="text"
                  hide-label
                  placeholder="ACCEPT"
                  aria-label="Action"
                />
              </div>
              <div class="rule-cell rule-source">
                <FormField
                  :id="'fw-source-' + idx"
                  v-model="r.source"
                  label="Source"
                  type="text"
                  hide-label
                  placeholder="e.g. net"
                  aria-label="Source"
                />
              </div>
              <div class="rule-cell rule-dest">
                <FormField
                  :id="'fw-dest-' + idx"
                  v-model="r.dest"
                  label="Dest"
                  type="text"
                  hide-label
                  placeholder="e.g. $FW"
                  aria-label="Dest"
                />
              </div>
              <div class="rule-cell rule-proto">
                <FormSelect
                  :id="'fw-proto-' + idx"
                  v-model="r.proto"
                  label="Proto"
                  hide-label
                  :options="PROTO_OPTIONS"
                  aria-label="Proto"
                />
              </div>
              <div class="rule-cell rule-destports">
                <FormField
                  :id="'fw-destports-' + idx"
                  v-model="r.destports"
                  label="Dest ports"
                  type="text"
                  hide-label
                  placeholder="e.g. 5060"
                  aria-label="Dest ports"
                />
              </div>
              <div class="rule-cell rule-sport">
                <FormField
                  :id="'fw-sport-' + idx"
                  v-model="r.sport"
                  label="Sport"
                  type="text"
                  hide-label
                  placeholder="-"
                  aria-label="Sport"
                />
              </div>
              <div class="rule-cell rule-origdest">
                <FormField
                  :id="'fw-origdest-' + idx"
                  v-model="r.origdest"
                  label="Orig dest"
                  type="text"
                  hide-label
                  placeholder="-"
                  aria-label="Orig dest"
                />
              </div>
              <div class="rule-cell rule-connrate">
                <FormField
                  :id="'fw-connrate-' + idx"
                  v-model="r.connrate"
                  label="Conn rate"
                  type="text"
                  hide-label
                  placeholder="-"
                  aria-label="Conn rate"
                />
              </div>
              <div class="rule-cell rule-desc">
                <FormField
                  :id="'fw-desc-' + idx"
                  v-model="r.description"
                  label="Description"
                  type="text"
                  hide-label
                  placeholder="Comment"
                  aria-label="Description"
                />
              </div>
              <div class="rule-cell rule-del">
                <button
                  type="button"
                  class="btn-delete-row"
                  :aria-label="'Delete rule ' + (idx + 1)"
                  @click="removeRule(idx)"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
          </div>
          <div class="rules-table-actions">
            <button type="button" class="btn-add-rule" @click="addRule">
              Add rule
            </button>
          </div>
        </template>

        <template v-else>
          <textarea
            v-model="ipv4Rules"
            class="firewall-textarea"
            rows="18"
            placeholder="One rule per line…"
            spellcheck="false"
          />
        </template>

        <div class="firewall-actions">
          <button type="button" class="btn-save" :disabled="saving" @click="save">
            {{ saving ? 'Saving…' : 'Save rules' }}
          </button>
          <button type="button" class="btn-restart" :disabled="restarting" @click="restart">
            {{ restarting ? 'Restarting…' : 'Restart firewall' }}
          </button>
        </div>
      </section>
    </template>

    <Teleport to="body">
      <div v-if="modalShow" class="firewall-modal-overlay" @click.self="closeModal">
        <div class="firewall-modal" :class="{ 'firewall-modal-error': modalIsError }" role="dialog" aria-modal="true" aria-labelledby="firewall-modal-title">
          <h2 id="firewall-modal-title" class="firewall-modal-title">{{ modalTitle }}</h2>
          <p class="firewall-modal-body">{{ modalBody }}</p>
          <div class="firewall-modal-actions">
            <button type="button" class="firewall-modal-btn" @click="closeModal">OK</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.firewall-view {
  max-width: 56rem;
}
.firewall-view h1 {
  margin: 0 0 1rem 0;
  font-size: 1.5rem;
  font-weight: 600;
}
.firewall-intro {
  margin: 0 0 1.5rem 0;
  font-size: 0.875rem;
  color: #64748b;
}
.firewall-intro code {
  font-size: 0.8125rem;
  padding: 0.125rem 0.375rem;
  background: #f1f5f9;
  border-radius: 0.25rem;
}
.detail-heading {
  font-size: 1rem;
  font-weight: 600;
  color: #334155;
  margin: 0 0 0.5rem 0;
  border-bottom: 1px solid #e2e8f0;
  padding-bottom: 0.5rem;
}
.firewall-section {
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: #f8fafc;
  border-radius: 0.5rem;
  border: 1px solid #e2e8f0;
}
.firewall-section-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}
.firewall-section-head .detail-heading {
  margin-bottom: 0;
  border-bottom: none;
  padding-bottom: 0;
}
.view-toggle {
  display: flex;
  gap: 0;
  border: 1px solid #e2e8f0;
  border-radius: 0.375rem;
  overflow: hidden;
}
.toggle-btn {
  padding: 0.375rem 0.75rem;
  font-size: 0.875rem;
  background: #fff;
  border: none;
  border-right: 1px solid #e2e8f0;
  color: #64748b;
  cursor: pointer;
}
.toggle-btn:last-child {
  border-right: none;
}
.toggle-btn.active {
  background: #0f172a;
  color: #fff;
  font-weight: 500;
}
.toggle-btn:hover:not(.active) {
  background: #f1f5f9;
}
.rules-table-wrap {
  overflow-x: auto;
  margin-bottom: 0.75rem;
}
.rules-table {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: min-content;
}
.rules-row {
  display: grid;
  grid-template-columns: 8rem minmax(8rem, 1.5fr) minmax(4rem, 1fr) 5rem 6rem 4.5rem 5.5rem 5rem minmax(10rem, 2fr) 5rem;
  gap: 0.5rem 1rem;
  align-items: center;
}
.rules-header {
  font-size: 0.75rem;
  font-weight: 600;
  color: #475569;
  padding-bottom: 0.25rem;
}
.rules-header .rule-cell {
  min-height: 1.5rem;
}
.rule-cell {
  min-width: 0;
}
.rule-row-fields .rule-cell :deep(.form-field) {
  margin-bottom: 0;
}
.rule-row-fields .rule-cell :deep(.form-select) {
  margin-bottom: 0;
}
.btn-delete-row {
  padding: 0.25rem 0.5rem;
  font-size: 0.8125rem;
  color: #64748b;
  background: transparent;
  border: 1px solid #e2e8f0;
  border-radius: 0.25rem;
  cursor: pointer;
}
.btn-delete-row:hover {
  color: #dc2626;
  border-color: #fecaca;
  background: #fef2f2;
}
.rules-table-actions {
  margin-bottom: 0.5rem;
}
.btn-add-rule {
  padding: 0.375rem 0.75rem;
  font-size: 0.875rem;
  color: #1d4ed8;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 0.375rem;
  cursor: pointer;
}
.btn-add-rule:hover {
  background: #dbeafe;
}
.firewall-textarea {
  width: 100%;
  box-sizing: border-box;
  font-family: ui-monospace, monospace;
  font-size: 0.8125rem;
  line-height: 1.4;
  padding: 0.5rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.375rem;
  resize: vertical;
}
.firewall-actions {
  display: flex;
  gap: 0.75rem;
  margin-top: 0.75rem;
}
.btn-save,
.btn-restart {
  padding: 0.5rem 1rem;
  font-size: 0.9375rem;
  font-weight: 500;
  border: none;
  border-radius: 0.375rem;
  cursor: pointer;
}
.btn-save {
  color: #fff;
  background: #0f172a;
}
.btn-save:hover:not(:disabled) {
  background: #334155;
}
.btn-restart {
  color: #fff;
  background: #1d4ed8;
}
.btn-restart:hover:not(:disabled) {
  background: #2563eb;
}
.btn-save:disabled,
.btn-restart:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
.loading,
.error {
  margin: 0.5rem 0 0 0;
}
.error {
  color: #dc2626;
}

/* Modal - global so no scoped for overlay positioning */
.firewall-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 1rem;
}
.firewall-modal {
  background: #fff;
  border-radius: 0.5rem;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  max-width: 28rem;
  width: 100%;
  padding: 1.5rem;
  border: 2px solid #15803d;
}
.firewall-modal-error {
  border-color: #dc2626;
}
.firewall-modal-title {
  margin: 0 0 0.75rem 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: #0f172a;
}
.firewall-modal-error .firewall-modal-title {
  color: #dc2626;
}
.firewall-modal-body {
  margin: 0 0 1.25rem 0;
  font-size: 1rem;
  line-height: 1.5;
  color: #334155;
  white-space: pre-wrap;
}
.firewall-modal-actions {
  display: flex;
  justify-content: flex-end;
}
.firewall-modal-btn {
  padding: 0.5rem 1.25rem;
  font-size: 1rem;
  font-weight: 600;
  color: #fff;
  background: #0f172a;
  border: none;
  border-radius: 0.375rem;
  cursor: pointer;
}
.firewall-modal-btn:hover {
  background: #334155;
}
</style>
