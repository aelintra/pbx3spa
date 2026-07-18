import { describe, expect, it } from 'vitest'
import {
  buildTimezoneOptions,
  filterTimezoneOptions,
  timezoneLabel
} from './timezoneLabels.js'

describe('timezoneLabels', () => {
  it('labels common US zones with friendly text', () => {
    expect(timezoneLabel('America/New_York')).toContain('Eastern')
    expect(timezoneLabel('America/New_York')).toContain('America/New_York')
  })

  it('puts common zones first in buildTimezoneOptions', () => {
    const opts = buildTimezoneOptions([
      'Africa/Abidjan',
      'America/New_York',
      'UTC',
      'Europe/Berlin'
    ])
    expect(opts[0].value).toBe('America/New_York')
    expect(opts.some((o) => o.value === 'Europe/Berlin')).toBe(true)
  })

  it('filters by city, abbreviation hint, or IANA id', () => {
    const opts = buildTimezoneOptions([
      'America/New_York',
      'America/Chicago',
      'America/Los_Angeles',
      'Europe/London'
    ])
    expect(filterTimezoneOptions(opts, 'new york').map((o) => o.value)).toContain(
      'America/New_York'
    )
    expect(filterTimezoneOptions(opts, 'eastern').map((o) => o.value)).toContain(
      'America/New_York'
    )
    expect(filterTimezoneOptions(opts, 'america/los').map((o) => o.value)).toContain(
      'America/Los_Angeles'
    )
  })
})
