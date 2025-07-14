import { describe, expect, it } from 'vitest'
import {
  formatDateIgnoringTimeZone,
  DATE_FORMATS,
} from './use-date-time-format'

describe('formatDateIgnoringTimeZone', () => {
  it('should format ISO date strings without timezone conversion', () => {
    const isoDateWithTz = '2024-12-31T14:30:00Z'
    const formatted = formatDateIgnoringTimeZone(
      isoDateWithTz,
      DATE_FORMATS.US_DATE,
    )

    // Should format as date only (US format by default)
    expect(formatted).toBe('12/31/2024')
  })

  it('should handle date-only strings', () => {
    const dateOnly = '2024-12-31'
    const formatted = formatDateIgnoringTimeZone(dateOnly)

    // Should format as date only
    expect(formatted).toBe('12/31/2024')
  })

  it('should handle null and invalid values', () => {
    expect(formatDateIgnoringTimeZone(null)).toBe('')
    expect(formatDateIgnoringTimeZone(undefined)).toBe('')
    expect(formatDateIgnoringTimeZone('not-a-date')).toBe('not-a-date')
  })
})
