'use client'

import { useStytchOrganization } from '@stytch/nextjs/b2b'
import { format as formatDateFns, isValid, parseISO } from 'date-fns'
import { useCallback, useEffect, useState } from 'react'

// Predefined date-only formats
export const DATE_FORMATS = {
  US_DATE: {
    label: 'US Format (MM/DD/YYYY)',
    pattern: 'MM/dd/yyyy',
    example: '12/31/2024',
  },
  EU_DATE: {
    label: 'European Format (DD/MM/YYYY)',
    pattern: 'dd/MM/yyyy',
    example: '31/12/2024',
  },
  ISO_DATE: {
    label: 'ISO Format (YYYY-MM-DD)',
    pattern: 'yyyy-MM-dd',
    example: '2024-12-31',
  },
} as const

// Predefined date+time formats
export const DATE_TIME_FORMATS = {
  US_DATETIME: {
    label: 'US Format with Time (MM/DD/YYYY h:mm AM/PM)',
    pattern: 'MM/dd/yyyy h:mm a',
    example: '12/31/2024 2:30 PM',
  },
  EU_DATETIME: {
    label: 'European Format with Time (DD/MM/YYYY HH:mm)',
    pattern: 'dd/MM/yyyy HH:mm',
    example: '31/12/2024 14:30',
  },
  ISO_DATETIME: {
    label: 'ISO Format with Time (YYYY-MM-DD HH:mm)',
    pattern: 'yyyy-MM-dd HH:mm',
    example: '2024-12-31 14:30',
  },
} as const

export type DateFormatKey = keyof typeof DATE_FORMATS
export type DateTimeFormatKey = keyof typeof DATE_TIME_FORMATS
export type DateFormat = (typeof DATE_FORMATS)[DateFormatKey]
export type DateTimeFormat = (typeof DATE_TIME_FORMATS)[DateTimeFormatKey]

const DEFAULT_DATE_FORMAT: DateFormatKey = 'US_DATE'
const DEFAULT_DATETIME_FORMAT: DateTimeFormatKey = 'US_DATETIME'

interface UseDateTimeFormatReturn {
  // Current format configurations
  selectedDateFormat: DateFormatKey
  selectedDateTimeFormat: DateTimeFormatKey
  dateFormatConfig: DateFormat
  dateTimeFormatConfig: DateTimeFormat
  availableDateFormats: typeof DATE_FORMATS
  availableDateTimeFormats: typeof DATE_TIME_FORMATS

  // Formatter functions
  formatDateTime: (date: string | Date | null | undefined) => string
  formatDate: (date: string | Date | null | undefined) => string
  // Update functions
  updateDateFormat: (formatKey: DateFormatKey) => Promise<void>
  updateDateTimeFormat: (formatKey: DateTimeFormatKey) => Promise<void>
}

const STORAGE_KEY_DATE = 'panels-date-format'
const STORAGE_KEY_DATETIME = 'panels-datetime-format'

// Helper functions to get formats from localStorage
const getStoredDateFormat = (): DateFormatKey => {
  if (typeof window === 'undefined') return DEFAULT_DATE_FORMAT
  const stored = localStorage.getItem(STORAGE_KEY_DATE) as DateFormatKey
  return stored && DATE_FORMATS[stored] ? stored : DEFAULT_DATE_FORMAT
}

const getStoredDateTimeFormat = (): DateTimeFormatKey => {
  if (typeof window === 'undefined') return DEFAULT_DATETIME_FORMAT
  const stored = localStorage.getItem(STORAGE_KEY_DATETIME) as DateTimeFormatKey
  return stored && DATE_TIME_FORMATS[stored] ? stored : DEFAULT_DATETIME_FORMAT
}

/**
 * Extracts date components (year, month, day) directly from ISO date strings
 * in a timezone-agnostic way.
 *
 * **CRITICAL**: This function ONLY accepts ISO 8601 date formats:
 * - Date only: "YYYY-MM-DD" (e.g., "1990-05-15")
 * - DateTime: "YYYY-MM-DDTHH:mm:ss[.sss]Z" (e.g., "1990-05-15T00:00:00Z")
 * - DateTime with offset: "YYYY-MM-DDTHH:mm:ss[.sss]±HH:mm" (e.g., "1990-05-15T08:00:00+08:00")
 *
 * This ensures that a date like "1990-05-15" always represents May 15th, 1990,
 * regardless of the user's browser timezone or the timezone offset in the input.
 *
 * @param dateString - ISO 8601 formatted date string
 * @returns Object with year, month (1-12), day components, or null if invalid
 */
const extractDateComponents = (
  dateString: string,
): { year: number; month: number; day: number } | null => {
  // Extract YYYY-MM-DD from any ISO format string
  const match = dateString.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!match) return null

  const year = Number.parseInt(match[1], 10)
  const month = Number.parseInt(match[2], 10)
  const day = Number.parseInt(match[3], 10)

  // Basic validation
  if (
    year < 1000 ||
    year > 9999 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return null
  }

  return { year, month, day }
}

/**
 * Detects if an ISO date string contains meaningful time information.
 *
 * **CRITICAL**: This function ONLY works with ISO 8601 formatted strings.
 *
 * Considers time "meaningful" if:
 * - Time component exists and is NOT 00:00:00 (midnight)
 * - Example: "2024-12-31T14:30:00Z" → meaningful time
 * - Example: "2024-12-31T00:00:00Z" → NOT meaningful (treated as date-only)
 * - Example: "2024-12-31" → NOT meaningful (no time component)
 *
 * @param date - ISO 8601 formatted date string or Date object
 * @returns true if the date contains meaningful time information
 */
const hasTimeInfo = (date: string | Date): boolean => {
  if (typeof date === 'string') {
    // Check if string contains time indicators
    if (date.includes('T')) {
      // ISO format - check if time part exists and is not 00:00:00
      const timePart = date.split('T')[1]
      if (timePart) {
        // Remove timezone info (Z, +HH:MM, -HH:MM, +HHMM, -HHMM)
        const timeWithoutZ = timePart.replace(/Z$|[+-]\d{2}:?\d{2}$/, '')
        return timeWithoutZ !== '00:00:00' && timeWithoutZ !== '00:00'
      }
    }
    // Date-only strings like "2024-12-31" have no time info
    return false
  }

  if (date instanceof Date) {
    // For Date objects, check if time components are meaningful
    return (
      date.getHours() !== 0 ||
      date.getMinutes() !== 0 ||
      date.getSeconds() !== 0 ||
      date.getMilliseconds() !== 0
    )
  }

  return false
}

/**
 * Formats dates in a completely timezone-agnostic way by treating them as calendar dates.
 *
 * **CRITICAL**: This function ONLY accepts ISO 8601 date formats:
 * - "YYYY-MM-DD" (recommended for date-only values like birth dates)
 * - "YYYY-MM-DDTHH:mm:ss[.sss]Z" (time component ignored)
 * - "YYYY-MM-DDTHH:mm:ss[.sss]±HH:mm" (time and timezone offset ignored)
 *
 * **Use cases**: Birth dates, due dates, event dates - any value that represents
 * a calendar date rather than a specific moment in time.
 *
 * **Timezone behavior**: "1990-05-15" will ALWAYS format as May 15th, 1990,
 * regardless of user's browser timezone. This prevents the common bug where
 * birth dates shift by one day depending on timezone.
 *
 * @param date - ISO 8601 formatted date string, Date object, or null/undefined
 * @param dateFormat - Format configuration object
 * @returns Formatted date string, or original string if parsing fails
 */
export const formatDate = (
  date: string | Date | null | undefined,
  dateFormat: DateFormat = DATE_FORMATS.US_DATE,
): string => {
  if (!date) return ''

  try {
    if (typeof date === 'string') {
      // Extract date components directly from ISO string (timezone-agnostic)
      const components = extractDateComponents(date)
      if (components) {
        // Create Date object using local constructor (represents the calendar date)
        // Month is 0-indexed in Date constructor
        const calendarDate = new Date(
          components.year,
          components.month - 1,
          components.day,
        )
        if (isValid(calendarDate)) {
          return formatDateFns(calendarDate, dateFormat.pattern)
        }
      }

      // Fallback for non-ISO strings
      const parsed = parseISO(date)
      if (isValid(parsed)) {
        return formatDateFns(parsed, dateFormat.pattern)
      }

      return String(date)
    }

    if (date instanceof Date) {
      if (isValid(date)) {
        return formatDateFns(date, dateFormat.pattern)
      }
      return String(date)
    }

    return String(date)
  } catch (error) {
    console.error('Error formatting date:', error)
    return String(date)
  }
}

/**
 * Formats dates with automatic detection of meaningful time information.
 *
 * **CRITICAL**: This function ONLY accepts ISO 8601 date formats:
 * - "YYYY-MM-DD" → formatted as date-only
 * - "YYYY-MM-DDTHH:mm:ss[.sss]Z" → formatted as date+time if time ≠ 00:00:00
 * - "YYYY-MM-DDTHH:mm:ss[.sss]±HH:mm" → formatted as date+time if time ≠ 00:00:00
 *
 * **Time detection logic**:
 * - "2024-12-31T14:30:00Z" → "12/31/2024 2:30 PM" (meaningful time)
 * - "2024-12-31T00:00:00Z" → "12/31/2024" (midnight = date-only)
 * - "2024-12-31" → "12/31/2024" (no time component = date-only)
 *
 * **Use cases**: Created timestamps, modified timestamps, appointment times -
 * any value that might be either a date or a specific moment in time.
 *
 * @param date - ISO 8601 formatted date string, Date object, or null/undefined
 * @param dateFormat - Date format configuration object
 * @param dateTimeFormat - DateTime format configuration object
 * @returns Formatted date or datetime string, or original string if parsing fails
 */
export const formatDateTime = (
  date: string | Date | null | undefined,
  dateFormat: DateFormat = DATE_FORMATS.US_DATE,
  dateTimeFormat: DateTimeFormat = DATE_TIME_FORMATS.US_DATETIME,
): string => {
  if (!date) return ''

  try {
    // Check if this has meaningful time information
    const hasMeaningfulTime = hasTimeInfo(date)

    if (hasMeaningfulTime) {
      // Has meaningful time - format as datetime (accepts timezone conversion)
      if (typeof date === 'string') {
        const parsedDate = parseISO(date)
        if (isValid(parsedDate)) {
          return formatDateFns(parsedDate, dateTimeFormat.pattern)
        }
      } else if (date instanceof Date) {
        if (isValid(date)) {
          return formatDateFns(date, dateTimeFormat.pattern)
        }
      }
    } else {
      // No meaningful time - format as date-only (timezone-agnostic)
      return formatDate(date, dateFormat)
    }

    return String(date)
  } catch (error) {
    console.error('Error formatting date/time:', error)
    return String(date)
  }
}

export function useDateTimeFormat(): UseDateTimeFormatReturn {
  const [selectedDateFormat, setSelectedDateFormat] =
    useState<DateFormatKey>(getStoredDateFormat)
  const [selectedDateTimeFormat, setSelectedDateTimeFormat] =
    useState<DateTimeFormatKey>(getStoredDateTimeFormat)

  const { organization } = useStytchOrganization()

  // Load saved formats from organization metadata or localStorage
  useEffect(() => {
    let savedDateFormat: DateFormatKey | null = null
    let savedDateTimeFormat: DateTimeFormatKey | null = null

    // First try to load from organization trusted metadata
    if (organization?.trusted_metadata?.panels) {
      // biome-ignore lint/suspicious/noExplicitAny: figure out how to type metadata
      const panelsData = organization.trusted_metadata.panels as any
      savedDateFormat = panelsData?.dateFormat as DateFormatKey
      savedDateTimeFormat = panelsData?.dateTimeFormat as DateTimeFormatKey
    }

    // Apply the saved formats if valid
    if (savedDateFormat && DATE_FORMATS[savedDateFormat]) {
      setSelectedDateFormat(savedDateFormat)
    }
    if (savedDateTimeFormat && DATE_TIME_FORMATS[savedDateTimeFormat]) {
      setSelectedDateTimeFormat(savedDateTimeFormat)
    }
  }, [organization])

  // Listen for localStorage changes to sync across hook instances
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY_DATE && e.newValue) {
        const newFormat = e.newValue as DateFormatKey
        if (DATE_FORMATS[newFormat]) {
          setSelectedDateFormat(newFormat)
        }
      }
      if (e.key === STORAGE_KEY_DATETIME && e.newValue) {
        const newFormat = e.newValue as DateTimeFormatKey
        if (DATE_TIME_FORMATS[newFormat]) {
          setSelectedDateTimeFormat(newFormat)
        }
      }
    }

    // Also listen for custom event for same-tab updates
    const handleCustomStorageChange = (e: CustomEvent) => {
      if (e.detail.key === STORAGE_KEY_DATE) {
        const newFormat = e.detail.value as DateFormatKey
        if (DATE_FORMATS[newFormat]) {
          setSelectedDateFormat(newFormat)
        }
      }
      if (e.detail.key === STORAGE_KEY_DATETIME) {
        const newFormat = e.detail.value as DateTimeFormatKey
        if (DATE_TIME_FORMATS[newFormat]) {
          setSelectedDateTimeFormat(newFormat)
        }
      }
    }

    window.addEventListener('storage', handleStorageChange)
    window.addEventListener(
      'localStorageChange',
      handleCustomStorageChange as EventListener,
    )

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener(
        'localStorageChange',
        handleCustomStorageChange as EventListener,
      )
    }
  }, [])

  // Hook-wrapped formatters that use current format settings
  const formatDateHook = useCallback(
    (date: string | Date | null | undefined): string => {
      return formatDate(date, DATE_FORMATS[selectedDateFormat])
    },
    [selectedDateFormat],
  )

  const formatDateTimeHook = useCallback(
    (date: string | Date | null | undefined): string => {
      return formatDateTime(
        date,
        DATE_FORMATS[selectedDateFormat],
        DATE_TIME_FORMATS[selectedDateTimeFormat],
      )
    },
    [selectedDateFormat, selectedDateTimeFormat],
  )

  const updateDateFormat = useCallback(async (formatKey: DateFormatKey) => {
    try {
      localStorage.setItem(STORAGE_KEY_DATE, formatKey)
      setSelectedDateFormat(formatKey)

      // Dispatch custom event for same-tab synchronization
      window.dispatchEvent(
        new CustomEvent('localStorageChange', {
          detail: { key: STORAGE_KEY_DATE, value: formatKey },
        }),
      )

      console.log(`Date format updated to: ${DATE_FORMATS[formatKey].label}`)
    } catch (error) {
      console.error('Failed to update date format:', error)
    }
  }, [])

  const updateDateTimeFormat = useCallback(
    async (formatKey: DateTimeFormatKey) => {
      try {
        localStorage.setItem(STORAGE_KEY_DATETIME, formatKey)
        setSelectedDateTimeFormat(formatKey)

        // Dispatch custom event for same-tab synchronization
        window.dispatchEvent(
          new CustomEvent('localStorageChange', {
            detail: { key: STORAGE_KEY_DATETIME, value: formatKey },
          }),
        )

        console.log(
          `Date/time format updated to: ${DATE_TIME_FORMATS[formatKey].label}`,
        )
      } catch (error) {
        console.error('Failed to update date/time format:', error)
      }
    },
    [],
  )

  return {
    selectedDateFormat,
    selectedDateTimeFormat,
    dateFormatConfig: DATE_FORMATS[selectedDateFormat],
    dateTimeFormatConfig: DATE_TIME_FORMATS[selectedDateTimeFormat],
    availableDateFormats: DATE_FORMATS,
    availableDateTimeFormats: DATE_TIME_FORMATS,
    formatDateTime: formatDateTimeHook,
    formatDate: formatDateHook,
    updateDateFormat,
    updateDateTimeFormat,
  }
}
