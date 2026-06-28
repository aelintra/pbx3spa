<script setup>
import { ref, computed, onMounted } from 'vue'
import { getApiClient } from '@/api/client'
import FormField from '@/components/forms/FormField.vue'
import FormSelect from '@/components/forms/FormSelect.vue'
import ConfirmModal from '@/components/ConfirmModal.vue'

const ipv4Rules = ref('')
const ipv6Rules = ref('')
const loading = ref(true)
const error = ref('')
const saving = ref(false)
const saving6 = ref(false)
const restarting = ref(false)
const restarting6 = ref(false)
const viewMode = ref('table') // 'table' | 'raw'
const viewMode6 = ref('table') // 'table' | 'raw'

const modalShow = ref(false)
const modalTitle = ref('')
const modalBody = ref('')
const modalIsError = ref(false)

const restartConfirmShow = ref(false)
const restartConfirmKind = ref(null) // 'ipv4' | 'ipv6'

const restartConfirmBody = computed(() => {
  if (restartConfirmKind.value === 'ipv6') {
    return 'Restart the IPv6 firewall now? Shorewall6 will validate the rules and apply them, or report errors.'
  }
  return 'Restart the IPv4 firewall now? Shorewall will validate the rules and apply them, or report errors.'
})

const PROTO_OPTIONS = ['tcp', 'udp', 'icmp', 'all']

// Shorewall rule: ACTION SOURCE DEST [PROTO ...] [ # comment or #comment]. Inline: prefer \s+# (space before #); else if 9+ tokens and 9th is '#', use rest as description.
function parseRuleLine(line, pendingCommentLine = null) {
  let rulePart = line.trim()
  let description = ''

  const commentMatch = line.match(/\s+#\s*(.*)$/)
  if (commentMatch) {
    rulePart = line.slice(0, commentMatch.index).trim()
    description = commentMatch[1].trim()
  } else {
    const tokens = rulePart.split(/\s+/).filter(Boolean)
    if (tokens.length >= 9 && tokens[8] === '#') {
      rulePart = tokens.slice(0, 8).join(' ')
      description = tokens.slice(9).join(' ').trim()
    }
  }
  if (description === '' && pendingCommentLine) {
    description = pendingCommentLine.replace(/^#\s*/, '').trim()
  }

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
  const base = [
    r.action,
    r.source,
    r.dest,
    r.proto,
    r.destports,
    r.sport,
    r.origdest,
    r.connrate
  ].join(' ')
  return r.description ? `${base} # ${r.description}` : base
}

const parsedRules = ref([])
const preambleLines = ref([])
const postambleLines = ref([])
const parsedRules6 = ref([])
const preambleLines6 = ref([])
const postambleLines6 = ref([])

function parseLines(lines, targetRules, targetPreamble, targetPostamble) {
  const rules = []
  let preamble = []
  let postamble = []
  let seenRule = false
  let pendingCommentLine = null
  for (const line of lines) {
    const trimmed = line.trimEnd()
    if (trimmed === '') {
      if (pendingCommentLine) {
        if (seenRule) postamble.push(pendingCommentLine)
        else preamble.push(pendingCommentLine)
        pendingCommentLine = null
      }
      if (seenRule) postamble.push(trimmed)
      else preamble.push(trimmed)
      continue
    }
    if (trimmed.startsWith('#')) {
      if (seenRule) {
        postamble.push(trimmed)
      } else {
        pendingCommentLine = trimmed
      }
      continue
    }
    const rule = parseRuleLine(trimmed, pendingCommentLine)
    if (rule) {
      seenRule = true
      pendingCommentLine = null
      rules.push(rule)
    } else {
      if (pendingCommentLine) {
        preamble.push(pendingCommentLine)
        pendingCommentLine = null
      }
      if (seenRule) postamble.push(trimmed)
      else preamble.push(trimmed)
    }
  }
  if (pendingCommentLine) {
    if (seenRule) postamble.push(pendingCommentLine)
    else preamble.push(pendingCommentLine)
  }
  targetRules.value = rules
  targetPreamble.value = preamble
  targetPostamble.value = postamble
}

function serializeToLines(rules, preamble, postamble) {
  const out = [...preamble.value]
  for (const r of rules.value) {
    out.push(ruleToLine(r))
  }
  out.push(...postamble.value)
  return out
}

async function fetchIpv4() {
  try {
    const data = await getApiClient().get('firewalls/ipv4')
    const rules = data?.rules ?? []
    const raw = Array.isArray(rules) ? rules.join('\n') : String(rules)
    ipv4Rules.value = raw
    parseLines(
      raw.split(/\r?\n/).map((l) => l.trimEnd()),
      parsedRules,
      preambleLines,
      postambleLines
    )
  } catch (err) {
    ipv4Rules.value = ''
    error.value = err?.data?.message || err?.message || 'Failed to load IPv4 firewall rules'
  }
}

async function fetchIpv6() {
  try {
    const data = await getApiClient().get('firewalls/ipv6')
    const rules = data?.rules ?? []
    const raw = Array.isArray(rules) ? rules.join('\n') : String(rules)
    ipv6Rules.value = raw
    parseLines(
      raw.split(/\r?\n/).map((l) => l.trimEnd()),
      parsedRules6,
      preambleLines6,
      postambleLines6
    )
  } catch {
    ipv6Rules.value = ''
    // Don't overwrite IPv4 error; IPv6 failure is non-fatal
  }
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    await Promise.all([fetchIpv4(), fetchIpv6()])
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

function addRule6() {
  parsedRules6.value.push({
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

function removeRule6(index) {
  parsedRules6.value.splice(index, 1)
}

function syncRawFromTable() {
  ipv4Rules.value = serializeToLines(parsedRules, preambleLines, postambleLines).join('\n')
}

function syncTableFromRaw() {
  parseLines(rulesToArray(ipv4Rules.value), parsedRules, preambleLines, postambleLines)
}

function syncRawFromTable6() {
  ipv6Rules.value = serializeToLines(parsedRules6, preambleLines6, postambleLines6).join('\n')
}

function syncTableFromRaw6() {
  parseLines(rulesToArray(ipv6Rules.value), parsedRules6, preambleLines6, postambleLines6)
}

function setIpv4ViewTable() {
  viewMode.value = 'table'
  syncTableFromRaw()
}

function setIpv4ViewRaw() {
  viewMode.value = 'raw'
  syncRawFromTable()
}

function setIpv6ViewTable() {
  viewMode6.value = 'table'
  syncTableFromRaw6()
}

function setIpv6ViewRaw() {
  viewMode6.value = 'raw'
  syncRawFromTable6()
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
      viewMode.value === 'table'
        ? serializeToLines(parsedRules, preambleLines, postambleLines)
        : rulesToArray(ipv4Rules.value)
    await getApiClient().post('firewalls/ipv4', { rules })
    showResultModal(
      'IPv4 rules saved',
      'Firewall rules have been written to the server. Click Restart firewall to apply them.',
      false
    )
  } catch (err) {
    const detail = err?.data?.detail
    const msg = detail
      ? `${err?.data?.message || err?.message}: ${detail}`
      : err?.data?.message || err?.message || 'Save failed'
    showResultModal('IPv4 save failed', msg, true)
  } finally {
    saving.value = false
  }
}

async function save6() {
  saving6.value = true
  try {
    const rules =
      viewMode6.value === 'table'
        ? serializeToLines(parsedRules6, preambleLines6, postambleLines6)
        : rulesToArray(ipv6Rules.value)
    await getApiClient().post('firewalls/ipv6', { rules })
    showResultModal(
      'IPv6 rules saved',
      'Firewall rules have been written to the server. Click Restart firewall to apply them.',
      false
    )
  } catch (err) {
    const detail = err?.data?.detail
    const msg = detail
      ? `${err?.data?.message || err?.message}: ${detail}`
      : err?.data?.message || err?.message || 'Save failed'
    showResultModal('IPv6 save failed', msg, true)
  } finally {
    saving6.value = false
  }
}

function restart() {
  restartConfirmKind.value = 'ipv4'
  restartConfirmShow.value = true
}

function restart6() {
  restartConfirmKind.value = 'ipv6'
  restartConfirmShow.value = true
}

function cancelRestartConfirm() {
  restartConfirmShow.value = false
  restartConfirmKind.value = null
}

async function onRestartConfirmed() {
  const kind = restartConfirmKind.value
  restartConfirmShow.value = false
  restartConfirmKind.value = null
  if (kind === 'ipv4') await doRestartIpv4()
  else if (kind === 'ipv6') await doRestartIpv6()
}

async function doRestartIpv4() {
  restarting.value = true
  try {
    await getApiClient().put('firewalls/ipv4')
    showResultModal(
      'IPv4 firewall restarted',
      'Shorewall has been restarted. The new rules are now in effect.',
      false
    )
  } catch (err) {
    const body = err?.data
    const msg = Array.isArray(body)
      ? body.join('\n')
      : body?.detail
        ? `${body?.message || err?.message}: ${body.detail}`
        : body?.message || err?.message || 'Restart failed'
    showResultModal('IPv4 restart failed', msg, true)
  } finally {
    restarting.value = false
  }
}

async function doRestartIpv6() {
  restarting6.value = true
  try {
    await getApiClient().put('firewalls/ipv6')
    showResultModal(
      'IPv6 firewall restarted',
      'Shorewall6 has been restarted. The new rules are now in effect.',
      false
    )
  } catch (err) {
    const body = err?.data
    const msg = Array.isArray(body)
      ? body.join('\n')
      : body?.detail
        ? `${body?.message || err?.message}: ${body.detail}`
        : body?.message || err?.message || 'Restart failed'
    showResultModal('IPv6 restart failed', msg, true)
  } finally {
    restarting6.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="firewall-view">
    <h1>Firewall</h1>
    <p class="firewall-intro">
      Edit Shorewall rules (IPv4 and IPv6). Save writes the file; Restart runs
      <code>shorewall check</code> (or <code>shorewall6 check</code> for IPv6) then applies if
      valid. Shorewall will accept or reject the config on restart.
    </p>

    <p v-if="loading" class="loading">Loading rules…</p>
    <p v-else-if="error" class="error">{{ error }}</p>

    <template v-else>
      <section class="firewall-section">
        <div class="firewall-section-head">
          <h2 class="detail-heading">IPv4</h2>
          <div class="view-toggle">
            <button
              type="button"
              class="toggle-btn"
              :class="{ active: viewMode === 'table' }"
              @click="setIpv4ViewTable"
            >
              Table
            </button>
            <button
              type="button"
              class="toggle-btn"
              :class="{ active: viewMode === 'raw' }"
              @click="setIpv4ViewRaw"
            >
              Raw
            </button>
          </div>
        </div>

        <template v-if="viewMode === 'table'">
          <div class="rules-table-wrap">
            <div class="rules-table">
              <div class="rules-row rules-header">
                <span class="rule-cell rule-source">Source</span>
                <span class="rule-cell rule-proto">Proto</span>
                <span class="rule-cell rule-destports">Dest ports</span>
                <span class="rule-cell rule-connrate">Conn rate</span>
                <span class="rule-cell rule-desc">Description</span>
                <span class="rule-cell rule-del" title="Delete"
                  ><span class="action-icon" aria-hidden="true"
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
                      <line x1="14" x2="14" y1="11" y2="17" /></svg></span
                ></span>
              </div>
              <div v-for="(r, idx) in parsedRules" :key="idx" class="rules-row rule-row-fields">
                <div class="rule-cell rule-source">
                  <FormField
                    :id="'fw-source-' + idx"
                    v-model="r.source"
                    label="Source"
                    help-pkey="fwsource"
                    type="text"
                    hide-label
                    placeholder="e.g. net"
                    aria-label="Source"
                  />
                </div>
                <div class="rule-cell rule-proto">
                  <FormSelect
                    :id="'fw-proto-' + idx"
                    v-model="r.proto"
                    label="Proto"
                    help-pkey="fwproto"
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
                    help-pkey="fwdestports"
                    type="text"
                    hide-label
                    placeholder="e.g. 5060"
                    aria-label="Dest ports"
                  />
                </div>
                <div class="rule-cell rule-connrate">
                  <FormField
                    :id="'fw-connrate-' + idx"
                    v-model="r.connrate"
                    label="Conn rate"
                    help-pkey="connrate"
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
                    help-pkey="fwdesc"
                    type="text"
                    hide-label
                    placeholder="Comment"
                    aria-label="Description"
                  />
                </div>
                <div class="rule-cell rule-del">
                  <button
                    type="button"
                    class="cell-link cell-link-delete cell-link-icon"
                    title="Delete rule"
                    :aria-label="'Delete rule ' + (idx + 1)"
                    @click="removeRule(idx)"
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
                </div>
              </div>
            </div>
          </div>
          <div class="rules-table-actions">
            <button type="button" class="btn-add-rule" @click="addRule">Add rule</button>
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
            {{ saving ? 'Saving…' : 'Save IPv4 rules' }}
          </button>
          <button type="button" class="btn-restart" :disabled="restarting" @click="restart">
            {{ restarting ? 'Restarting…' : 'Restart IPv4 firewall' }}
          </button>
        </div>
      </section>

      <section class="firewall-section">
        <div class="firewall-section-head">
          <h2 class="detail-heading">IPv6</h2>
          <div class="view-toggle">
            <button
              type="button"
              class="toggle-btn"
              :class="{ active: viewMode6 === 'table' }"
              @click="setIpv6ViewTable"
            >
              Table
            </button>
            <button
              type="button"
              class="toggle-btn"
              :class="{ active: viewMode6 === 'raw' }"
              @click="setIpv6ViewRaw"
            >
              Raw
            </button>
          </div>
        </div>

        <template v-if="viewMode6 === 'table'">
          <div class="rules-table-wrap">
            <div class="rules-table">
              <div class="rules-row rules-header">
                <span class="rule-cell rule-source">Source</span>
                <span class="rule-cell rule-proto">Proto</span>
                <span class="rule-cell rule-destports">Dest ports</span>
                <span class="rule-cell rule-connrate">Conn rate</span>
                <span class="rule-cell rule-desc">Description</span>
                <span class="rule-cell rule-del" title="Delete"
                  ><span class="action-icon" aria-hidden="true"
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
                      <line x1="14" x2="14" y1="11" y2="17" /></svg></span
                ></span>
              </div>
              <div v-for="(r, idx) in parsedRules6" :key="idx" class="rules-row rule-row-fields">
                <div class="rule-cell rule-source">
                  <FormField
                    :id="'fw6-source-' + idx"
                    v-model="r.source"
                    label="Source"
                    help-pkey="fwsource6"
                    type="text"
                    hide-label
                    placeholder="e.g. net"
                    aria-label="Source"
                  />
                </div>
                <div class="rule-cell rule-proto">
                  <FormSelect
                    :id="'fw6-proto-' + idx"
                    v-model="r.proto"
                    label="Proto"
                    help-pkey="fwproto"
                    hide-label
                    :options="PROTO_OPTIONS"
                    aria-label="Proto"
                  />
                </div>
                <div class="rule-cell rule-destports">
                  <FormField
                    :id="'fw6-destports-' + idx"
                    v-model="r.destports"
                    label="Dest ports"
                    help-pkey="fwdestports"
                    type="text"
                    hide-label
                    placeholder="e.g. 5060"
                    aria-label="Dest ports"
                  />
                </div>
                <div class="rule-cell rule-connrate">
                  <FormField
                    :id="'fw6-connrate-' + idx"
                    v-model="r.connrate"
                    label="Conn rate"
                    help-pkey="connrate"
                    type="text"
                    hide-label
                    placeholder="-"
                    aria-label="Conn rate"
                  />
                </div>
                <div class="rule-cell rule-desc">
                  <FormField
                    :id="'fw6-desc-' + idx"
                    v-model="r.description"
                    label="Description"
                    help-pkey="fwdesc"
                    type="text"
                    hide-label
                    placeholder="Comment"
                    aria-label="Description"
                  />
                </div>
                <div class="rule-cell rule-del">
                  <button
                    type="button"
                    class="cell-link cell-link-delete cell-link-icon"
                    title="Delete rule"
                    :aria-label="'Delete rule ' + (idx + 1)"
                    @click="removeRule6(idx)"
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
                </div>
              </div>
            </div>
          </div>
          <div class="rules-table-actions">
            <button type="button" class="btn-add-rule" @click="addRule6">Add rule</button>
          </div>
        </template>

        <template v-else>
          <textarea
            v-model="ipv6Rules"
            class="firewall-textarea"
            rows="18"
            placeholder="One rule per line…"
            spellcheck="false"
          />
        </template>

        <div class="firewall-actions">
          <button type="button" class="btn-save" :disabled="saving6" @click="save6">
            {{ saving6 ? 'Saving…' : 'Save IPv6 rules' }}
          </button>
          <button type="button" class="btn-restart" :disabled="restarting6" @click="restart6">
            {{ restarting6 ? 'Restarting…' : 'Restart IPv6 firewall' }}
          </button>
        </div>
      </section>
    </template>

    <ConfirmModal
      :show="restartConfirmShow"
      title="Restart firewall?"
      :body-text="restartConfirmBody"
      confirm-label="Restart"
      variant="primary"
      :loading="restarting || restarting6"
      loading-label="Restarting…"
      @confirm="onRestartConfirmed"
      @cancel="cancelRestartConfirm"
    />

    <Teleport to="body">
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
            <button type="button" class="firewall-modal-btn" @click="closeModal">OK</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.firewall-view {
  /* No max-width: fill content area like ExtensionsListView (list panels don't cap width) */
}
.firewall-view h1 {
  margin: 0 0 1rem 0;
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
  width: 100%;
  box-sizing: border-box;
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
  font-size: 1.5rem;
  font-weight: 700;
  color: #0f172a;
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
  width: 100%;
}
.rules-table {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  width: 100%;
  min-width: 0;
}
.rules-row {
  display: grid;
  /* Source fits net:192.168.112.244/32; Proto, Dest ports, Conn rate, Description, Delete */
  grid-template-columns:
    minmax(15rem, 2fr) 5rem minmax(9rem, 2fr) minmax(5rem, 1fr) minmax(10rem, 3fr)
    4rem;
  gap: 0.5rem 1rem;
  align-items: center;
  min-width: 0;
  width: 100%;
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
.rule-cell :deep(.form-input),
.rule-cell :deep(.form-select) {
  min-width: 0;
  max-width: 100%;
}
.rule-row-fields .rule-cell :deep(.form-field) {
  margin-bottom: 0;
}
.rule-row-fields .rule-cell :deep(.form-select) {
  margin-bottom: 0;
}
.cell-link-icon {
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
