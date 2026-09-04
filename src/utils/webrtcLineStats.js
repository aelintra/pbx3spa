/**
 * Sample WebRTC RTCPeerConnection.getStats() for SPA line-test post-call report.
 * Browser-edge only — not AMI/Homer.
 */

/**
 * @typedef {object} LineTestStatSample
 * @property {number} t
 * @property {number|null} rttMs
 * @property {number|null} jitterMsIn
 * @property {number|null} packetsLostIn
 * @property {number|null} packetsReceived
 * @property {number|null} packetsSent
 * @property {number|null} bytesReceived
 * @property {number|null} bytesSent
 * @property {number|null} lossPctIn  cumulative inbound loss % at sample time
 * @property {string|null} codec
 * @property {string|null} localCandidateType
 * @property {string|null} remoteCandidateType
 */

/**
 * @param {RTCPeerConnection|null|undefined} pc
 * @returns {Promise<LineTestStatSample|null>}
 */
export async function samplePeerConnection(pc) {
  if (!pc || typeof pc.getStats !== 'function') return null
  const report = await pc.getStats()
  /** @type {LineTestStatSample} */
  const sample = {
    t: Date.now(),
    rttMs: null,
    jitterMsIn: null,
    packetsLostIn: null,
    packetsReceived: null,
    packetsSent: null,
    bytesReceived: null,
    bytesSent: null,
    lossPctIn: null,
    codec: null,
    localCandidateType: null,
    remoteCandidateType: null
  }

  /** @type {Map<string, RTCStats>} */
  const byId = new Map()
  report.forEach((s) => {
    byId.set(s.id, s)
  })

  let selectedPairId = null
  report.forEach((s) => {
    if (s.type === 'transport' && s.selectedCandidatePairId) {
      selectedPairId = s.selectedCandidatePairId
    }
  })

  report.forEach((s) => {
    if (s.type === 'candidate-pair') {
      const selected =
        s.selected === true ||
        s.nominated === true ||
        (selectedPairId && s.id === selectedPairId) ||
        s.state === 'succeeded'
      if (selected && typeof s.currentRoundTripTime === 'number') {
        sample.rttMs = Math.round(s.currentRoundTripTime * 1000)
      }
      if (selected) {
        const local = s.localCandidateId ? byId.get(s.localCandidateId) : null
        const remote = s.remoteCandidateId ? byId.get(s.remoteCandidateId) : null
        if (local && local.candidateType) sample.localCandidateType = String(local.candidateType)
        if (remote && remote.candidateType) sample.remoteCandidateType = String(remote.candidateType)
      }
    }

    if (s.type === 'inbound-rtp' && !s.isRemote && (s.kind === 'audio' || s.mediaType === 'audio')) {
      if (typeof s.jitter === 'number') sample.jitterMsIn = Math.round(s.jitter * 1000)
      if (typeof s.packetsLost === 'number') sample.packetsLostIn = s.packetsLost
      if (typeof s.packetsReceived === 'number') sample.packetsReceived = s.packetsReceived
      if (typeof s.bytesReceived === 'number') sample.bytesReceived = s.bytesReceived
      const lost = sample.packetsLostIn ?? 0
      const recv = sample.packetsReceived ?? 0
      const denom = lost + recv
      if (denom > 0) sample.lossPctIn = Math.round((lost / denom) * 1000) / 10
    }

    if (s.type === 'outbound-rtp' && !s.isRemote && (s.kind === 'audio' || s.mediaType === 'audio')) {
      if (typeof s.packetsSent === 'number') sample.packetsSent = s.packetsSent
      if (typeof s.bytesSent === 'number') sample.bytesSent = s.bytesSent
    }

    if (s.type === 'remote-inbound-rtp' && (s.kind === 'audio' || s.mediaType === 'audio')) {
      if (typeof s.roundTripTime === 'number' && sample.rttMs == null) {
        sample.rttMs = Math.round(s.roundTripTime * 1000)
      }
      if (typeof s.jitter === 'number' && sample.jitterMsIn == null) {
        sample.jitterMsIn = Math.round(s.jitter * 1000)
      }
    }

    if (s.type === 'codec' && (s.mimeType || s.clockRate)) {
      const mime = s.mimeType ? String(s.mimeType).replace(/^audio\//i, '') : ''
      if (mime && !sample.codec) sample.codec = mime
    }
  })

  return sample
}

/**
 * @param {LineTestStatSample[]} samples
 */
export function summarizeSamples(samples) {
  const list = Array.isArray(samples) ? samples.filter(Boolean) : []
  if (!list.length) {
    return {
      sampleCount: 0,
      durationMs: 0,
      avgRttMs: null,
      maxRttMs: null,
      avgJitterMsIn: null,
      maxJitterMsIn: null,
      finalLossPctIn: null,
      avgBitrateInKbps: null,
      avgBitrateOutKbps: null,
      finalBytesReceived: null,
      finalBytesSent: null,
      codec: null,
      localCandidateType: null,
      remoteCandidateType: null,
      series: {
        rttMs: [],
        jitterMsIn: [],
        lossPctIn: []
      }
    }
  }

  const rtts = list.map((s) => s.rttMs).filter((v) => typeof v === 'number')
  const jitters = list.map((s) => s.jitterMsIn).filter((v) => typeof v === 'number')
  const losses = list.map((s) => s.lossPctIn).filter((v) => typeof v === 'number')

  const first = list[0]
  const last = list[list.length - 1]
  const durationMs = Math.max(0, last.t - first.t)

  let avgBitrateInKbps = null
  let avgBitrateOutKbps = null
  if (durationMs > 250 && last.bytesReceived != null && first.bytesReceived != null) {
    const bits = (last.bytesReceived - first.bytesReceived) * 8
    avgBitrateInKbps = Math.round((bits / (durationMs / 1000) / 1000) * 10) / 10
  }
  if (durationMs > 250 && last.bytesSent != null && first.bytesSent != null) {
    const bits = (last.bytesSent - first.bytesSent) * 8
    avgBitrateOutKbps = Math.round((bits / (durationMs / 1000) / 1000) * 10) / 10
  }

  const pickLast = (key) => {
    for (let i = list.length - 1; i >= 0; i--) {
      const v = list[i][key]
      if (v != null && v !== '') return v
    }
    return null
  }

  return {
    sampleCount: list.length,
    durationMs,
    avgRttMs: rtts.length ? Math.round(rtts.reduce((a, b) => a + b, 0) / rtts.length) : null,
    maxRttMs: rtts.length ? Math.max(...rtts) : null,
    avgJitterMsIn: jitters.length
      ? Math.round(jitters.reduce((a, b) => a + b, 0) / jitters.length)
      : null,
    maxJitterMsIn: jitters.length ? Math.max(...jitters) : null,
    finalLossPctIn: losses.length ? losses[losses.length - 1] : null,
    avgBitrateInKbps,
    avgBitrateOutKbps,
    finalBytesReceived: typeof last.bytesReceived === 'number' ? last.bytesReceived : null,
    finalBytesSent: typeof last.bytesSent === 'number' ? last.bytesSent : null,
    codec: pickLast('codec'),
    localCandidateType: pickLast('localCandidateType'),
    remoteCandidateType: pickLast('remoteCandidateType'),
    series: {
      rttMs: list.map((s) => s.rttMs),
      jitterMsIn: list.map((s) => s.jitterMsIn),
      lossPctIn: list.map((s) => s.lossPctIn)
    }
  }
}

/**
 * Build operator-facing verdict from timeline event names.
 * @param {{ event: string }[]} timeline
 */
export function buildVerdict(timeline) {
  const events = (Array.isArray(timeline) ? timeline : []).map((e) => e.event)
  const has = (name) => events.includes(name)
  const registered = has('registered')
  const answered = has('answered') || has('confirmed')
  const bye = has('bye')
  const failed = has('register_failed') || has('failed') || has('ws_disconnected')

  let label = 'Incomplete'
  let ok = false
  if (failed && !answered) {
    label = has('register_failed') ? 'Register failed' : 'Call failed'
    ok = false
  } else if (registered && answered && bye && !has('failed')) {
    label = 'Clean BYE — path OK'
    ok = true
  } else if (registered && answered) {
    label = 'Connected (no clean BYE yet)'
    ok = true
  } else if (registered) {
    label = 'Registered only'
    ok = true
  } else if (has('ws_connected')) {
    label = 'WSS up, not registered'
    ok = false
  }

  return {
    ok,
    label,
    registered,
    answered,
    bye,
    failed
  }
}

/**
 * @param {{ t: number, event: string, message?: string, target?: string }[]} timeline
 * @param {number} [origin]
 */
export function formatTimelineDeltas(timeline, origin) {
  const list = Array.isArray(timeline) ? timeline : []
  if (!list.length) return []
  const t0 = origin ?? list[0].t
  return list.map((e) => ({
    ...e,
    msFromStart: Math.max(0, e.t - t0)
  }))
}
