/**
 * Thin JsSIP UA for SPA WSS line test — one call at a time, browser-only.
 * Not a softphone shell: register / dial / answer / hangup + stats sampling.
 */
import JsSIP from 'jssip'
import { samplePeerConnection } from '@/utils/webrtcLineStats.js'

/**
 * @typedef {object} LineTestUaOptions
 * @property {string} wssUrl
 * @property {string} sipUser
 * @property {string} sipDomain
 * @property {string} password
 * @property {(msg: string) => void} [onLog]
 * @property {(state: string) => void} [onState]
 * @property {(entry: object, timeline: object[]) => void} [onTimeline]
 * @property {(samples: object[]) => void} [onSamples]
 * @property {() => HTMLAudioElement|null|undefined} [getRemoteAudioEl]
 */

/**
 * @param {LineTestUaOptions} options
 */
export function createLineTestUa(options) {
  const {
    wssUrl,
    sipUser,
    sipDomain,
    password,
    onLog,
    onState,
    onTimeline,
    onSamples,
    getRemoteAudioEl
  } = options

  /** @type {import('jssip').UA | null} */
  let ua = null
  /** @type {import('jssip').RTCSession | null} */
  let session = null
  /** @type {ReturnType<typeof setInterval> | null} */
  let statsTimer = null
  /** @type {object[]} */
  const samples = []
  /** @type {object[]} */
  const timeline = []
  let sessionBound = false
  /** @type {'incoming'|'outgoing'|null} */
  let sessionDirection = null

  function log(msg) {
    onLog?.(msg)
  }

  function stamp(event, detail = {}) {
    const entry = { t: Date.now(), event, ...detail }
    timeline.push(entry)
    onTimeline?.(entry, [...timeline])
    const extra = detail.message || detail.target || ''
    log(extra ? `${event}: ${extra}` : event)
  }

  function setState(state) {
    onState?.(state)
  }

  function attachRemoteTracks(sess) {
    const pc = sess.connection
    if (!pc) return
    const wireStream = (stream) => {
      const el = getRemoteAudioEl?.()
      if (!el || !stream) return
      el.srcObject = stream
      el.play().catch(() => {
        /* autoplay may need user gesture; dial/answer clicks count */
      })
    }
    pc.getReceivers?.().forEach((r) => {
      if (r.track) {
        wireStream(new MediaStream([r.track]))
      }
    })
    pc.addEventListener('track', (ev) => {
      if (ev.streams?.[0]) wireStream(ev.streams[0])
      else if (ev.track) wireStream(new MediaStream([ev.track]))
    })
  }

  function stopStats() {
    if (statsTimer != null) {
      clearInterval(statsTimer)
      statsTimer = null
    }
  }

  function startStats(pc) {
    stopStats()
    if (!pc) return
    const tick = async () => {
      try {
        const s = await samplePeerConnection(pc)
        if (s) {
          samples.push(s)
          onSamples?.([...samples])
        }
      } catch {
        /* ignore transient getStats errors */
      }
    }
    tick()
    statsTimer = setInterval(tick, 1000)
  }

  function clearSession() {
    session = null
    sessionBound = false
    sessionDirection = null
  }

  function bindSession(sess, direction) {
    if (sessionBound && session === sess) return
    session = sess
    sessionBound = true
    sessionDirection = direction || sess.direction || null
    attachRemoteTracks(sess)

    sess.on('peerconnection', (data) => {
      const pc = data?.peerconnection || sess.connection
      if (pc) attachRemoteTracks(sess)
    })

    sess.on('getusermediafailed', (error) => {
      stamp('getusermediafailed', {
        message: error?.message ? String(error.message) : 'mic/camera denied'
      })
      setState('failed')
    })

    sess.on('progress', () => {
      // JsSIP auto-sends 180 on *incoming* and emits progress — keep Answerable.
      if (sessionDirection === 'incoming') {
        stamp('ringing_local')
        setState('incoming')
        return
      }
      stamp('ringing')
      setState('ringing')
    })

    sess.on('accepted', () => {
      stamp('accepted')
    })

    sess.on('confirmed', () => {
      stamp('answered')
      setState('confirmed')
      startStats(sess.connection)
      attachRemoteTracks(sess)
    })

    sess.on('ended', () => {
      stopStats()
      stamp('bye')
      setState('ended')
      clearSession()
    })

    sess.on('failed', (e) => {
      stopStats()
      stamp('failed', { message: e?.cause ? String(e.cause) : 'failed' })
      setState('failed')
      clearSession()
    })
  }

  function iceServers() {
    return [{ urls: 'stun:stun.l.google.com:19302' }]
  }

  /** Outbound INVITE options. */
  function callMediaOpts() {
    return {
      mediaConstraints: { audio: true, video: false },
      pcConfig: { iceServers: iceServers() },
      rtcOfferConstraints: {
        offerToReceiveAudio: true,
        offerToReceiveVideo: false
      }
    }
  }

  /**
   * Inbound answer — do not pass rtcOfferConstraints (answer path uses
   * rtcAnswerConstraints; offer constraints confuse media selection).
   */
  function answerMediaOpts() {
    return {
      mediaConstraints: { audio: true, video: false },
      pcConfig: { iceServers: iceServers() }
    }
  }

  return {
    start() {
      if (ua) return
      samples.length = 0
      timeline.length = 0
      sessionBound = false

      const socket = new JsSIP.WebSocketInterface(wssUrl)
      ua = new JsSIP.UA({
        sockets: [socket],
        uri: `sip:${sipUser}@${sipDomain}`,
        password,
        display_name: sipUser,
        register: true,
        session_timers: false,
        user_agent: 'pbx3spa-line-test/1'
      })

      ua.on('connecting', () => {
        stamp('ws_connecting')
        setState('connecting')
      })
      ua.on('connected', () => {
        stamp('ws_connected')
        setState('ws_connected')
      })
      ua.on('disconnected', (e) => {
        stamp('ws_disconnected', {
          message: e?.error ? String(e.error) : e?.cause ? String(e.cause) : ''
        })
        setState('disconnected')
      })
      ua.on('registered', () => {
        stamp('registered')
        setState('registered')
      })
      ua.on('unregistered', () => {
        stamp('unregistered')
      })
      ua.on('registrationFailed', (e) => {
        stamp('register_failed', { message: e?.cause ? String(e.cause) : 'registration failed' })
        setState('register_failed')
      })
      ua.on('newRTCSession', (data) => {
        const sess = data.session
        const direction = data.originator === 'remote' ? 'incoming' : 'outgoing'
        if (direction === 'incoming') {
          stamp('incoming')
          setState('incoming')
        }
        bindSession(sess, direction)
      })

      ua.start()
      log(`UA start → ${wssUrl} as ${sipUser}@${sipDomain}`)
    },

    stop() {
      stopStats()
      try {
        if (session) session.terminate()
      } catch {
        /* ignore */
      }
      try {
        if (ua) ua.stop()
      } catch {
        /* ignore */
      }
      clearSession()
      ua = null
      setState('idle')
    },

    /**
     * @param {string} target dialable or SIP URI
     */
    dial(target) {
      if (!ua) throw new Error('Line test UA not started')
      const raw = String(target || '').trim()
      if (!raw) throw new Error('Dial target required')
      const dest = raw.startsWith('sip:')
        ? raw
        : raw.includes('@')
          ? `sip:${raw}`
          : `sip:${raw}@${sipDomain}`
      stamp('invite', { target: dest })
      setState('calling')
      sessionDirection = 'outgoing'
      ua.call(dest, callMediaOpts())
    },

    answer() {
      if (!session) throw new Error('No session to answer')
      if (sessionDirection && sessionDirection !== 'incoming') {
        throw new Error('No incoming session to answer')
      }
      const status = session.status
      // JsSIP STATUS_WAITING_FOR_ANSWER === 4
      if (typeof status === 'number' && status !== 4) {
        throw new Error(`Session not waiting for answer (status ${status})`)
      }
      stamp('answering')
      setState('answering')
      try {
        session.answer(answerMediaOpts())
      } catch (err) {
        stamp('answer_error', { message: err?.message ? String(err.message) : 'answer failed' })
        setState('incoming')
        throw err
      }
    },

    hangup() {
      if (session) {
        try {
          session.terminate()
        } catch {
          /* ignore */
        }
        return
      }
      // no media session — unregister / stop is operator action via stop()
    },

    getTimeline() {
      return [...timeline]
    },

    getSamples() {
      return [...samples]
    },

    isRunning() {
      return Boolean(ua)
    },

    hasSession() {
      return Boolean(session)
    },

    /** True while an inbound INVITE is waiting for operator Answer. */
    canAnswer() {
      return Boolean(session && sessionDirection === 'incoming' && session.status === 4)
    },

    isIncomingRinging() {
      return Boolean(session && sessionDirection === 'incoming')
    }
  }
}

/** Default Magrathea / fleet edge WSS (editable in UI). */
export const DEFAULT_EDGE_WSS_URL = 'wss://sbc.pbx3.com:8089/ws'
