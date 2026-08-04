import { describe, expect, it } from 'vitest'
import {
  buildVerdict,
  formatTimelineDeltas,
  summarizeSamples
} from './webrtcLineStats.js'

describe('summarizeSamples', () => {
  it('returns empty summary for no samples', () => {
    const s = summarizeSamples([])
    expect(s.sampleCount).toBe(0)
    expect(s.avgRttMs).toBeNull()
    expect(s.series.rttMs).toEqual([])
  })

  it('averages RTT/jitter and computes bitrates', () => {
    const s = summarizeSamples([
      {
        t: 1000,
        rttMs: 20,
        jitterMsIn: 2,
        lossPctIn: 0,
        bytesReceived: 1000,
        bytesSent: 2000,
        codec: 'opus',
        localCandidateType: 'srflx',
        remoteCandidateType: 'host',
        packetsLostIn: 0,
        packetsReceived: 10,
        packetsSent: 10
      },
      {
        t: 3000,
        rttMs: 40,
        jitterMsIn: 4,
        lossPctIn: 1.5,
        bytesReceived: 1000 + 25000,
        bytesSent: 2000 + 50000,
        codec: 'opus',
        localCandidateType: 'srflx',
        remoteCandidateType: 'host',
        packetsLostIn: 1,
        packetsReceived: 100,
        packetsSent: 100
      }
    ])
    expect(s.sampleCount).toBe(2)
    expect(s.durationMs).toBe(2000)
    expect(s.avgRttMs).toBe(30)
    expect(s.maxRttMs).toBe(40)
    expect(s.avgJitterMsIn).toBe(3)
    expect(s.finalLossPctIn).toBe(1.5)
    expect(s.avgBitrateInKbps).toBe(100)
    expect(s.avgBitrateOutKbps).toBe(200)
    expect(s.codec).toBe('opus')
    expect(s.localCandidateType).toBe('srflx')
  })
})

describe('buildVerdict', () => {
  it('marks clean path after register + answer + bye', () => {
    const v = buildVerdict([
      { event: 'registered' },
      { event: 'invite' },
      { event: 'answered' },
      { event: 'bye' }
    ])
    expect(v.ok).toBe(true)
    expect(v.label).toMatch(/Clean BYE/i)
  })

  it('flags register failure', () => {
    const v = buildVerdict([{ event: 'ws_connected' }, { event: 'register_failed' }])
    expect(v.ok).toBe(false)
    expect(v.label).toMatch(/Register failed/i)
  })
})

describe('formatTimelineDeltas', () => {
  it('computes ms from origin', () => {
    const rows = formatTimelineDeltas(
      [
        { t: 1000, event: 'a' },
        { t: 1250, event: 'b' }
      ],
      1000
    )
    expect(rows[0].msFromStart).toBe(0)
    expect(rows[1].msFromStart).toBe(250)
  })
})
