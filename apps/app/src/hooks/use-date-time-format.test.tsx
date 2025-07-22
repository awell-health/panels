import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import {
  formatDate,
  formatDateTime,
  DATE_FORMATS,
  DATE_TIME_FORMATS,
} from './use-date-time-format'

describe('formatDate', () => {
  it('should format dates in a timezone-agnostic way (date-only)', () => {
    const isoDateWithTz = '2024-12-31T14:30:00Z'
    const formatted = formatDate(isoDateWithTz, DATE_FORMATS.US_DATE)

    // Should always format as date-only regardless of time info
    expect(formatted).toBe('12/31/2024')
  })

  it('should handle date-only strings', () => {
    const dateOnly = '2024-12-31'
    const formatted = formatDate(dateOnly)

    expect(formatted).toBe('12/31/2024')
  })

  it('should handle null and invalid values', () => {
    expect(formatDate(null)).toBe('')
    expect(formatDate(undefined)).toBe('')
    expect(formatDate('invalid-date')).toBe('invalid-date')
  })

  it('should respect different date formats', () => {
    const date = '2024-12-31'

    expect(formatDate(date, DATE_FORMATS.US_DATE)).toBe('12/31/2024')
    expect(formatDate(date, DATE_FORMATS.EU_DATE)).toBe('31/12/2024')
    expect(formatDate(date, DATE_FORMATS.ISO_DATE)).toBe('2024-12-31')
  })

  describe('browser timezone independence', () => {
    const originalTZ = process.env.TZ

    afterEach(() => {
      // Restore original timezone
      if (originalTZ) {
        process.env.TZ = originalTZ
      } else {
        process.env.TZ = undefined
      }
    })

    it('should format UTC dates consistently regardless of system timezone', () => {
      // Test the same UTC date/datetime in different "browser" timezones
      const utcBirthDate = '1990-05-15T00:00:00Z'

      // Simulate different browser timezones
      const timezones = [
        'America/New_York', // UTC-5/-4
        'Europe/London', // UTC+0/+1
        'Asia/Tokyo', // UTC+9
        'Australia/Sydney', // UTC+10/+11
        'America/Los_Angeles', // UTC-8/-7
        'UTC', // UTC baseline
      ]

      const results: Record<string, { formattedDate: string }> = {}

      for (const tz of timezones) {
        // Mock the timezone (this affects Date object behavior)
        process.env.TZ = tz

        results[tz] = {
          formattedDate: formatDate(utcBirthDate, DATE_FORMATS.US_DATE),
        }
      }

      // All formatted date results should be identical regardless of timezone
      const expectedBirthDate = '05/15/1990'

      for (const tz of timezones) {
        expect(
          results[tz].formattedDate,
          `Formatted date should be consistent in ${tz}`,
        ).toBe(expectedBirthDate)
      }
    })

    it('should handle date boundaries consistently across timezones', () => {
      // Test dates that could be problematic near timezone boundaries
      const testCases = [
        '2024-01-01T00:00:00Z', // New Year midnight UTC
        '2024-12-31T23:59:59Z', // New Year's Eve end UTC
        '2024-02-29T12:00:00Z', // Leap year date
        '2024-06-21T12:00:00Z', // Summer solstice
        '2024-12-21T12:00:00Z', // Winter solstice
      ]

      const timezones = ['America/New_York', 'Asia/Tokyo', 'UTC']

      for (const testDate of testCases) {
        const results: string[] = []

        for (const tz of timezones) {
          process.env.TZ = tz
          results.push(formatDate(testDate, DATE_FORMATS.US_DATE))
        }

        // All timezones should produce the same result for the same UTC date
        const firstResult = results[0]
        for (let index = 0; index < results.length; index++) {
          const result = results[index]
          expect(
            result,
            `${testDate} should format consistently in ${timezones[index]}`,
          ).toBe(firstResult)
        }
      }
    })
  })
})

describe('formatDateTime', () => {
  it('should format dates with time as datetime', () => {
    const isoDateWithTz = '2024-12-31T14:30:00Z'
    const formatted = formatDateTime(
      isoDateWithTz,
      DATE_FORMATS.US_DATE,
      DATE_TIME_FORMATS.US_DATETIME,
    )

    // Should format as datetime since it has time info
    expect(formatted).toMatch(/12\/31\/2024.*2:30/)
  })

  it('should format date-only values as dates', () => {
    const dateOnly = '2024-12-31'
    const formatted = formatDateTime(
      dateOnly,
      DATE_FORMATS.US_DATE,
      DATE_TIME_FORMATS.US_DATETIME,
    )

    // Should format as date-only since no time info
    expect(formatted).toBe('12/31/2024')
  })

  it('should handle midnight as date-only', () => {
    const midnightDate = '2024-12-31T00:00:00Z'
    const formatted = formatDateTime(
      midnightDate,
      DATE_FORMATS.US_DATE,
      DATE_TIME_FORMATS.US_DATETIME,
    )

    // Should format as date-only since midnight is not meaningful time
    expect(formatted).toBe('12/31/2024')
  })

  it('should handle null and invalid values', () => {
    expect(formatDateTime(null)).toBe('')
    expect(formatDateTime(undefined)).toBe('')
    expect(formatDateTime('invalid-date')).toBe('invalid-date')
  })
})
