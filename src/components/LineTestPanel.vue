<script setup>
/**
 * Extension line test — dead-simple dialler + post-call quality report (JsSIP).
 * WebRTC extensions only; WSS host ≠ SIP domain (Magrathea path).
 */
import { ref, computed, watch, onBeforeUnmount, nextTick } from 'vue'
import FormField from '@/components/forms/FormField.vue'
import FormReadonly from '@/components/forms/FormReadonly.vue'
import { createLineTestUa, DEFAULT_EDGE_WSS_URL } from '@/utils/lineTestUa.js'
import {
  buildVerdict,
  formatTimelineDeltas,
  summarizeSamples
} from '@/utils/webrtcLineStats.js'

const props = defineProps({
  show: { type: Boolean, default: false },
  sipUser: { type: String, default: '' },
  sipDomain: { type: String, default: '' },
  /** Dialable label for UI only */
  dialableLabel: { type: String, default: '' },
  /** Plain SIP password when known (create/regen); session only */
  initialPassword: { type: String, default: '' }
})

const emit = defineEmits(['close'])

const wssUrl = ref(DEFAULT_EDGE_WSS_URL)
const password = ref('')
const dialTarget = ref('')
const logLines = ref([])
const uaState = ref('idle')
const timeline = ref([])
const samples = ref([])
const phase = ref('setup') // setup | active | report
const busy = ref(false)
const errorMsg = ref('')
const remoteAudioEl = ref(null)
/** Reactive flag — underlying UA instance is non-reactive. */
const uaRunning = ref(false)

/** @type {ReturnType<typeof createLineTestUa> | null} */
let ua = null

const isRegistered = computed(() =>
  [
    'registered',
    'calling',
    'ringing',
    'confirmed',
    'incoming',
    'answering',
    'ended',
    'failed'
  ].includes(uaState.value)
)
/** Inbound keep Answer enabled through auto-180 progress (state may say ringing_local log). */
const canAnswer = computed(
  () =>
    uaRunning.value &&
    (uaState.value === 'incoming' ||
      uaState.value === 'answering' ||
      Boolean(ua?.isIncomingRinging?.()))
)
// Disable Answer once confirmed/ended so we don't double-answer
const canAnswerActive = computed(
  () =>
    canAnswer.value &&
    !['confirmed', 'ended', 'failed', 'registered', 'calling', 'ringing', 'answering'].includes(
      uaState.value
    )
)
const canHangup = computed(
  () =>
    uaRunning.value &&
    (Boolean(ua?.hasSession()) ||
      ['calling', 'ringing', 'confirmed', 'incoming', 'answering'].includes(uaState.value))
)
const canDial = computed(
  () =>
    uaRunning.value &&
    isRegistered.value &&
    !['calling', 'ringing', 'confirmed', 'incoming', 'answering'].includes(uaState.value)
)

const mediaSummary = computed(() => summarizeSamples(samples.value))
const verdict = computed(() => buildVerdict(timeline.value))
const timelineRows = computed(() => formatTimelineDeltas(timeline.value))

const pathCopy = computed(() => ({
  wss: wssUrl.value.trim(),
  domain: props.sipDomain,
  user: props.sipUser,
  target: dialTarget.value.trim() || '—',
  localIce: mediaSummary.value.localCandidateType || '—',
  remoteIce: mediaSummary.value.remoteCandidateType || '—'
}))

function appendLog(msg) {
  const ts = new Date().toLocaleTimeString()
  logLines.value = [...logLines.value.slice(-80), `${ts}  ${msg}`]
}

function stopUa() {
  if (ua) {
    try {
      ua.stop()
    } catch {
      /* ignore */
    }
    ua = null
  }
  uaRunning.value = false
  uaState.value = 'idle'
  busy.value = false
}

function resetSessionData() {
  timeline.value = []
  samples.value = []
  logLines.value = []
  errorMsg.value = ''
  phase.value = 'setup'
}

function onClose() {
  stopUa()
  emit('close')
}

function openReport() {
  phase.value = 'report'
  stopUa()
}

watch(
  () => props.show,
  (open) => {
    if (open) {
      password.value = props.initialPassword ? String(props.initialPassword) : password.value
      if (!wssUrl.value) wssUrl.value = DEFAULT_EDGE_WSS_URL
      errorMsg.value = ''
      if (phase.value !== 'report') {
        if (!uaRunning.value) phase.value = 'setup'
      }
    } else {
      stopUa()
    }
  }
)

watch(
  () => props.initialPassword,
  (v) => {
    if (v && props.show) password.value = String(v)
  }
)

onBeforeUnmount(() => {
  stopUa()
})

async function register() {
  errorMsg.value = ''
  const domain = String(props.sipDomain || '').trim()
  const user = String(props.sipUser || '').trim()
  const pass = String(password.value || '').trim()
  const wss = String(wssUrl.value || '').trim()
  if (!domain || domain === '—') {
    errorMsg.value = 'SIP domain is missing (tenant FQDN).'
    return
  }
  if (!user) {
    errorMsg.value = 'SIP user (shortuid) is missing.'
    return
  }
  if (!pass) {
    errorMsg.value = 'Enter SIP password for this session (create/regen shows it once).'
    return
  }
  if (!wss.startsWith('wss://') && !wss.startsWith('ws://')) {
    errorMsg.value = 'WSS URL must start with wss:// (or ws:// for lab).'
    return
  }

  stopUa()
  resetSessionData()
  phase.value = 'active'
  busy.value = true

  ua = createLineTestUa({
    wssUrl: wss,
    sipUser: user,
    sipDomain: domain,
    password: pass,
    onLog: appendLog,
    onState: (s) => {
      uaState.value = s
      if (s === 'registered') busy.value = false
      if (s === 'register_failed' || s === 'disconnected') busy.value = false
      if (s === 'ended' || s === 'failed') {
        // auto-open report after media session finishes
        nextTick(() => {
          if (timeline.value.some((e) => e.event === 'invite' || e.event === 'incoming')) {
            openReport()
          }
        })
      }
    },
    onTimeline: (_e, all) => {
      timeline.value = all
    },
    onSamples: (all) => {
      samples.value = all
    },
    getRemoteAudioEl: () => remoteAudioEl.value
  })

  try {
    ua.start()
    uaRunning.value = true
  } catch (err) {
    errorMsg.value = err?.message || 'Failed to start line test UA'
    stopUa()
    phase.value = 'setup'
  }
}

function dial() {
  errorMsg.value = ''
  try {
    ua?.dial(dialTarget.value)
  } catch (err) {
    errorMsg.value = err?.message || 'Dial failed'
  }
}

function answer() {
  errorMsg.value = ''
  try {
    ua?.answer()
  } catch (err) {
    errorMsg.value = err?.message || 'Answer failed'
  }
}

function hangup() {
  errorMsg.value = ''
  try {
    ua?.hangup()
  } catch (err) {
    errorMsg.value = err?.message || 'Hangup failed'
  }
  // if no session, still allow report from register-only
  if (ua && !ua.hasSession()) {
    openReport()
  }
}

function finishWithoutCall() {
  openReport()
}

function newTest() {
  stopUa()
  resetSessionData()
  phase.value = 'setup'
}

function copyReport() {
  const m = mediaSummary.value
  const v = verdict.value
  const lines = [
    `Line test report — ${v.label}`,
    `WSS: ${pathCopy.value.wss}`,
    `SIP domain: ${pathCopy.value.domain}`,
    `SIP user: ${pathCopy.value.user}`,
    `Dial target: ${pathCopy.value.target}`,
    `ICE local/remote: ${pathCopy.value.localIce} / ${pathCopy.value.remoteIce}`,
    `Loss in: ${fmt(m.finalLossPctIn, '%')}  Jitter avg: ${fmt(m.avgJitterMsIn, ' ms')}  RTT avg: ${fmt(m.avgRttMs, ' ms')}`,
    `Bitrate in/out: ${fmt(m.avgBitrateInKbps, ' kbps')} / ${fmt(m.avgBitrateOutKbps, ' kbps')}`,
    `Codec: ${m.codec || '—'}  Samples: ${m.sampleCount}`,
    'Timeline:',
    ...timelineRows.value.map((r) => `  +${r.msFromStart}ms  ${r.event}${r.message ? ' ' + r.message : ''}${r.target ? ' ' + r.target : ''}`)
  ]
  const text = lines.join('\n')
  navigator.clipboard?.writeText(text).catch(() => {})
}

function fmt(v, suffix = '') {
  if (v == null || Number.isNaN(v)) return '—'
  return `${v}${suffix}`
}

function sparkPoints(series) {
  const nums = (series || []).filter((v) => typeof v === 'number')
  if (nums.length < 2) return ''
  const min = Math.min(...nums)
  const max = Math.max(...nums)
  const span = max - min || 1
  const w = 120
  const h = 28
  return nums
    .map((v, i) => {
      const x = (i / (nums.length - 1)) * w
      const y = h - ((v - min) / span) * (h - 2) - 1
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
}

function metricTone(kind, value) {
  if (value == null) return 'metric--muted'
  if (kind === 'loss') {
    if (value <= 1) return 'metric--ok'
    if (value <= 5) return 'metric--warn'
    return 'metric--bad'
  }
  if (kind === 'jitter') {
    if (value <= 30) return 'metric--ok'
    if (value <= 80) return 'metric--warn'
    return 'metric--bad'
  }
  if (kind === 'rtt') {
    if (value <= 100) return 'metric--ok'
    if (value <= 250) return 'metric--warn'
    return 'metric--bad'
  }
  return 'metric--muted'
}
</script>

<template>
  <Teleport to="body">
    <div v-if="show" class="line-test-backdrop" @click.self="onClose">
      <aside
        class="line-test-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="line-test-title"
      >
        <header class="line-test-header">
          <div>
            <h2 id="line-test-title" class="line-test-title">Line test</h2>
            <p class="line-test-sub">
              Diagnostic dialler — real WebRTC path, post-call quality report. Not a softphone.
            </p>
          </div>
          <button type="button" class="line-test-close" aria-label="Close line test" @click="onClose">
            ×
          </button>
        </header>

        <audio ref="remoteAudioEl" autoplay playsinline class="line-test-audio" />

        <!-- Setup / active dialler -->
        <div v-if="phase !== 'report'" class="line-test-body">
          <div class="line-test-fields">
            <FormField
              id="line-test-wss"
              v-model="wssUrl"
              label="WSS URL"
              type="text"
              placeholder="wss://sbc.pbx3.com:8089/ws"
              hint="Edge WSS (default Magrathea). Editable for singleton lab wss://instance:8089/ws."
              :disabled="uaRunning"
            />
            <FormReadonly
              id="line-test-domain"
              label="SIP domain"
              :value="sipDomain || '—'"
              hide-help
            />
            <FormReadonly
              id="line-test-user"
              label="SIP user"
              :value="sipUser || '—'"
              hide-help
            />
            <p v-if="dialableLabel" class="line-test-dialable">
              Dialable: <strong>{{ dialableLabel }}</strong>
            </p>
            <FormField
              id="line-test-pass"
              v-model="password"
              label="SIP password"
              type="password"
              autocomplete="off"
              hint="Session only — paste known secret, or Regen on the extension then open line test."
              :disabled="uaRunning"
            />
            <FormField
              id="line-test-target"
              v-model="dialTarget"
              label="Dial target"
              type="text"
              placeholder="desk shortuid or dialable"
              hint="Free text; same-tenant peer for path prove."
            />
          </div>

          <p v-if="errorMsg" class="line-test-error" role="alert">{{ errorMsg }}</p>

          <div class="line-test-actions">
            <button
              type="button"
              class="lt-btn lt-btn-primary"
              :disabled="busy && !isRegistered"
              @click="register"
            >
              {{ busy && !isRegistered ? 'Registering…' : uaRunning ? 'Re-register' : 'Register' }}
            </button>
            <button type="button" class="lt-btn" :disabled="!canDial" @click="dial">Dial</button>
            <button type="button" class="lt-btn" :disabled="!canAnswerActive" @click="answer">
              Answer
            </button>
            <button type="button" class="lt-btn" :disabled="!canHangup" @click="hangup">
              Hangup
            </button>
            <button
              v-if="uaRunning"
              type="button"
              class="lt-btn lt-btn-quiet"
              @click="finishWithoutCall"
            >
              End &amp; report
            </button>
          </div>

          <p class="line-test-state">
            State: <strong>{{ uaState }}</strong>
            <span v-if="samples.length" class="line-test-sampling"> · sampling media…</span>
          </p>

          <div class="line-test-log" aria-live="polite">
            <div v-for="(line, i) in logLines" :key="i" class="line-test-log-line">{{ line }}</div>
            <div v-if="!logLines.length" class="line-test-log-empty">Status log…</div>
          </div>
        </div>

        <!-- Post-call report -->
        <div v-else class="line-test-body line-test-report">
          <div class="verdict" :class="verdict.ok ? 'verdict--ok' : 'verdict--bad'">
            {{ verdict.label }}
          </div>

          <section class="report-section">
            <h3 class="report-h">Path</h3>
            <dl class="report-dl">
              <div><dt>WSS</dt><dd>{{ pathCopy.wss }}</dd></div>
              <div><dt>SIP domain</dt><dd>{{ pathCopy.domain }}</dd></div>
              <div><dt>SIP user</dt><dd>{{ pathCopy.user }}</dd></div>
              <div><dt>Dial target</dt><dd>{{ pathCopy.target }}</dd></div>
              <div>
                <dt>ICE</dt>
                <dd>{{ pathCopy.localIce }} → {{ pathCopy.remoteIce }}</dd>
              </div>
            </dl>
          </section>

          <section class="report-section">
            <h3 class="report-h">Media quality</h3>
            <div class="metrics">
              <div class="metric" :class="metricTone('loss', mediaSummary.finalLossPctIn)">
                <span class="metric-label">Packet loss</span>
                <span class="metric-value">{{ fmt(mediaSummary.finalLossPctIn, '%') }}</span>
                <svg
                  v-if="sparkPoints(mediaSummary.series.lossPctIn)"
                  class="spark"
                  viewBox="0 0 120 28"
                  aria-hidden="true"
                >
                  <polyline
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.5"
                    :points="sparkPoints(mediaSummary.series.lossPctIn)"
                  />
                </svg>
              </div>
              <div class="metric" :class="metricTone('jitter', mediaSummary.avgJitterMsIn)">
                <span class="metric-label">Jitter (avg)</span>
                <span class="metric-value">{{ fmt(mediaSummary.avgJitterMsIn, ' ms') }}</span>
                <svg
                  v-if="sparkPoints(mediaSummary.series.jitterMsIn)"
                  class="spark"
                  viewBox="0 0 120 28"
                  aria-hidden="true"
                >
                  <polyline
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.5"
                    :points="sparkPoints(mediaSummary.series.jitterMsIn)"
                  />
                </svg>
              </div>
              <div class="metric" :class="metricTone('rtt', mediaSummary.avgRttMs)">
                <span class="metric-label">RTT (avg)</span>
                <span class="metric-value">{{ fmt(mediaSummary.avgRttMs, ' ms') }}</span>
                <svg
                  v-if="sparkPoints(mediaSummary.series.rttMs)"
                  class="spark"
                  viewBox="0 0 120 28"
                  aria-hidden="true"
                >
                  <polyline
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.5"
                    :points="sparkPoints(mediaSummary.series.rttMs)"
                  />
                </svg>
              </div>
              <div class="metric metric--muted">
                <span class="metric-label">Bitrate in / out</span>
                <span class="metric-value metric-value--sm">
                  {{ fmt(mediaSummary.avgBitrateInKbps, '') }} /
                  {{ fmt(mediaSummary.avgBitrateOutKbps, ' kbps') }}
                </span>
              </div>
              <div class="metric metric--muted">
                <span class="metric-label">Codec · samples</span>
                <span class="metric-value metric-value--sm">
                  {{ mediaSummary.codec || '—' }} · {{ mediaSummary.sampleCount }}
                </span>
              </div>
            </div>
            <p v-if="!mediaSummary.sampleCount" class="report-hint">
              No media samples (register-only or call ended before RTP). Timeline still useful.
            </p>
          </section>

          <section class="report-section">
            <h3 class="report-h">Timeline</h3>
            <ol class="timeline">
              <li v-for="(row, i) in timelineRows" :key="i">
                <span class="tl-ms">+{{ row.msFromStart }}ms</span>
                <span class="tl-ev">{{ row.event }}</span>
                <span v-if="row.message || row.target" class="tl-detail">
                  {{ row.message || row.target }}
                </span>
              </li>
              <li v-if="!timelineRows.length" class="tl-empty">No events recorded.</li>
            </ol>
          </section>

          <div class="line-test-actions">
            <button type="button" class="lt-btn lt-btn-primary" @click="copyReport">
              Copy summary
            </button>
            <button type="button" class="lt-btn" @click="newTest">New test</button>
            <button type="button" class="lt-btn lt-btn-quiet" @click="onClose">Close</button>
          </div>
        </div>
      </aside>
    </div>
  </Teleport>
</template>

<style scoped>
.line-test-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1100;
  background: rgba(15, 23, 42, 0.45);
  display: flex;
  justify-content: flex-end;
}
.line-test-panel {
  width: min(28rem, 100%);
  height: 100%;
  background: #f8fafc;
  border-left: 1px solid #cbd5e1;
  box-shadow: -8px 0 24px rgba(15, 23, 42, 0.12);
  display: flex;
  flex-direction: column;
  overflow: auto;
  color: #0f172a;
}
.line-test-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 1rem 1.1rem 0.75rem;
  border-bottom: 1px solid #e2e8f0;
  background: #fff;
  position: sticky;
  top: 0;
  z-index: 1;
}
.line-test-title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 650;
  letter-spacing: -0.01em;
}
.line-test-sub {
  margin: 0.25rem 0 0;
  font-size: 0.8rem;
  color: #64748b;
  line-height: 1.35;
  max-width: 22rem;
}
.line-test-close {
  border: none;
  background: transparent;
  font-size: 1.5rem;
  line-height: 1;
  color: #64748b;
  cursor: pointer;
  padding: 0.15rem 0.35rem;
}
.line-test-close:hover {
  color: #0f172a;
}
.line-test-body {
  padding: 0.9rem 1.1rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.line-test-fields {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}
.line-test-dialable {
  margin: -0.15rem 0 0.25rem;
  font-size: 0.8rem;
  color: #475569;
}
.line-test-error {
  margin: 0;
  color: #b91c1c;
  font-size: 0.875rem;
}
.line-test-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}
.lt-btn {
  border: 1px solid #94a3b8;
  background: #fff;
  color: #0f172a;
  border-radius: 0.35rem;
  padding: 0.4rem 0.7rem;
  font-size: 0.875rem;
  cursor: pointer;
}
.lt-btn:hover:not(:disabled) {
  background: #f1f5f9;
}
.lt-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.lt-btn-primary {
  background: #0f172a;
  border-color: #0f172a;
  color: #fff;
}
.lt-btn-primary:hover:not(:disabled) {
  background: #1e293b;
}
.lt-btn-quiet {
  border-color: transparent;
  background: transparent;
  color: #475569;
}
.line-test-state {
  margin: 0;
  font-size: 0.8rem;
  color: #475569;
}
.line-test-sampling {
  color: #0f766e;
}
.line-test-log {
  margin-top: 0.25rem;
  min-height: 8rem;
  max-height: 14rem;
  overflow: auto;
  background: #0f172a;
  color: #e2e8f0;
  border-radius: 0.35rem;
  padding: 0.55rem 0.65rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.72rem;
  line-height: 1.4;
}
.line-test-log-empty {
  color: #64748b;
}
.line-test-audio {
  display: none;
}

/* Report */
.verdict {
  padding: 0.65rem 0.75rem;
  border-radius: 0.35rem;
  font-weight: 650;
  font-size: 0.95rem;
}
.verdict--ok {
  background: #ecfdf5;
  color: #065f46;
  border: 1px solid #a7f3d0;
}
.verdict--bad {
  background: #fef2f2;
  color: #991b1b;
  border: 1px solid #fecaca;
}
.report-section {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 0.4rem;
  padding: 0.65rem 0.75rem;
}
.report-h {
  margin: 0 0 0.5rem;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #64748b;
  font-weight: 600;
}
.report-dl {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.8rem;
}
.report-dl div {
  display: grid;
  grid-template-columns: 6.5rem 1fr;
  gap: 0.35rem;
}
.report-dl dt {
  margin: 0;
  color: #64748b;
}
.report-dl dd {
  margin: 0;
  word-break: break-all;
  color: #0f172a;
}
.metrics {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.45rem;
}
.metric {
  border: 1px solid #e2e8f0;
  border-radius: 0.35rem;
  padding: 0.45rem 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-height: 3.5rem;
}
.metric-label {
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: #64748b;
}
.metric-value {
  font-size: 1.15rem;
  font-weight: 650;
  font-variant-numeric: tabular-nums;
}
.metric-value--sm {
  font-size: 0.9rem;
}
.metric--ok {
  background: #f0fdf4;
  border-color: #bbf7d0;
  color: #14532d;
}
.metric--warn {
  background: #fffbeb;
  border-color: #fde68a;
  color: #92400e;
}
.metric--bad {
  background: #fef2f2;
  border-color: #fecaca;
  color: #991b1b;
}
.metric--muted {
  background: #f8fafc;
  color: #0f172a;
}
.spark {
  width: 100%;
  height: 1.6rem;
  margin-top: 0.15rem;
  opacity: 0.85;
}
.report-hint {
  margin: 0.5rem 0 0;
  font-size: 0.78rem;
  color: #64748b;
}
.timeline {
  list-style: none;
  margin: 0;
  padding: 0;
  font-size: 0.78rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  max-height: 12rem;
  overflow: auto;
}
.timeline li {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  padding: 0.2rem 0;
  border-bottom: 1px solid #f1f5f9;
}
.tl-ms {
  color: #64748b;
  min-width: 4.5rem;
}
.tl-ev {
  font-weight: 600;
  color: #0f172a;
}
.tl-detail {
  color: #475569;
  word-break: break-all;
}
.tl-empty {
  color: #94a3b8;
}
</style>
