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

  function bindSession(sess) {
    if (sessionBound && session === sess) return
    session = sess
    sessionBound = true
    attachRemoteTracks(sess)

    sess.on('peerconnection', (data) => {
      const pc = data?.peerconnection || sess.connection
      if (pc) attachRemoteTracks(sess)
    })

    sess.on('progress', () => {
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
    })

    sess.on('ended', () => {
      stopStats()
      stamp('bye')
      setState('ended')
      session = null
      sessionBound = false
    })

    sess.on('failed', (e) => {
      stopStats()
      stamp('failed', { message: e?.cause ? String(e.cause) : 'failed' })
      setState('failed')
      session = null
      sessionBound = false
    })
  }

  function iceServers() {
    return [{ urls: 'stun:stun.l.google.com:19302' }]
  }

  function mediaOpts() {
    return {
      mediaConstraints: { audio: true, video: false },
      pcConfig: { iceServers: iceServers() },
      rtcOfferConstraints: {
        offerToReceiveAudio: true,
        offerToReceiveVideo: false
      }
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
        if (data.originator === 'remote') {
          stamp('incoming')
          setState('incoming')
        }
        bindSession(sess)
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
      session = null
      sessionBound = false
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
      ua.call(dest, mediaOpts())
    },

    answer() {
      if (!session) throw new Error('No session to answer')
      stamp('answering')
      session.answer(mediaOpts())
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
    }
  }
}

/** Default Magrathea / fleet edge WSS (editable in UI). */
export const DEFAULT_EDGE_WSS_URL = 'wss://sbc.pbx3.com:8089/ws'
