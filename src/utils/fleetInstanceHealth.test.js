import { describe, expect, it } from 'vitest'
import {
  ageMsFromIso,
  formatProbeRtt,
  instanceHealthBadge,
  instanceEgressBadge,
  probeRttLabel,
  HEALTHY_MAX_MS,
  WARNING_MAX_MS
} from './fleetInstanceHealth.js'

describe('fleetInstanceHealth', () => {
  const now = Date.parse('2026-07-18T12:00:00.000Z')

  it('parses age from ISO', () => {
    expect(ageMsFromIso('2026-07-18T11:59:00.000Z', now)).toBe(60_000)
    expect(ageMsFromIso(null, now)).toBeNull()
  })

  it('maintenance / decommissioned → Probe paused', () => {
    expect(instanceHealthBadge({ status: 'maintenance' }, now)).toEqual({
      kind: 'paused',
      label: 'Probe paused'
    })
    expect(instanceHealthBadge({ status: 'decommissioned' }, now)).toEqual({
      kind: 'paused',
      label: 'Probe paused'
    })
  })

  it('unreachable → Down (overrides age)', () => {
    expect(
      instanceHealthBadge(
        {
          status: 'active',
          last_seen_at: '2026-07-18T11:59:50.000Z',
          health: { reachable: false, last_rtt_ms: 12 }
        },
        now
      )
    ).toEqual({ kind: 'down', label: 'Down' })
  })

  it('thresholds: healthy / warning / degraded', () => {
    expect(
      instanceHealthBadge(
        { status: 'active', last_seen_at: new Date(now - HEALTHY_MAX_MS).toISOString() },
        now
      )
    ).toEqual({ kind: 'healthy', label: 'Healthy' })
    expect(
      instanceHealthBadge(
        { status: 'active', last_seen_at: new Date(now - HEALTHY_MAX_MS - 1).toISOString() },
        now
      )
    ).toEqual({ kind: 'warning', label: 'Warning' })
    expect(
      instanceHealthBadge(
        { status: 'active', last_seen_at: new Date(now - WARNING_MAX_MS - 1).toISOString() },
        now
      )
    ).toEqual({ kind: 'degraded', label: 'Degraded' })
  })

  it('falls back to health.last_ok_at', () => {
    expect(
      instanceHealthBadge(
        {
          status: 'active',
          health: { reachable: true, last_ok_at: new Date(now - 30_000).toISOString() }
        },
        now
      )
    ).toEqual({ kind: 'healthy', label: 'Healthy' })
  })

  it('formats RTT; hides for paused/down', () => {
    expect(formatProbeRtt(42)).toBe('42 ms')
    expect(formatProbeRtt(null)).toBeNull()
    expect(
      probeRttLabel({
        status: 'active',
        health: { reachable: true, last_rtt_ms: 18 }
      })
    ).toBe('18 ms')
    expect(probeRttLabel({ status: 'maintenance', health: { last_rtt_ms: 18 } })).toBeNull()
    expect(
      probeRttLabel({ status: 'active', health: { reachable: false, last_rtt_ms: 18 } })
    ).toBeNull()
  })

  it('egress badge: Avail / Unavail / hide when down', () => {
    expect(
      instanceEgressBadge({
        status: 'active',
        health: { reachable: true, egress_state: 'Avail', egress_rtt_ms: 9 }
      })
    ).toEqual({ kind: 'avail', label: 'Egress Avail · 9 ms' })
    expect(
      instanceEgressBadge({
        status: 'active',
        health: { reachable: true, egress_state: 'Unavail' }
      })
    ).toEqual({ kind: 'unavail', label: 'Egress Unavail' })
    expect(
      instanceEgressBadge({
        status: 'active',
        health: { reachable: false, egress_state: 'Avail', egress_rtt_ms: 9 }
      })
    ).toBeNull()
    expect(instanceEgressBadge({ status: 'maintenance' })).toBeNull()
  })
})
