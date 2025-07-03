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

  // Formatter function
  formatDateTime: (date: string | Date | null | undefined) => string
  formatDateIgnoringTimeZone: (date: string | Date | null | undefined) => string
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

// Helper function to detect if a date has time information
const hasTimeInfo = (date: string | Date): boolean => {
  if (typeof date === 'string') {
    // Check if string contains time indicators
    if (date.includes('T')) {
      // ISO format - check if time part exists and is not 00:00:00
      const timePart = date.split('T')[1]
      if (timePart) {
        const timeWithoutZ = timePart.replace(/[Z+\-]\d{2}:?\d{2}$/, '') // Remove timezone
        return timeWithoutZ !== '00:00:00' && timeWithoutZ !== '00:00'
      }
    }

    // Check for other time patterns (space-separated time)
    const timePatterns = [
      /\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AP]M)?$/i, // HH:mm or HH:mm:ss with optional AM/PM
      /\s\d{1,2}:\d{2}/, // Space followed by time
    ]

    return timePatterns.some((pattern) => pattern.test(date))
    // biome-ignore lint/style/noUselessElse: better safe than sorry
  } else if (date instanceof Date) {
    // For Date objects, check if time components are meaningful
    // If all time components are 0, likely a date-only value
    return (
      date.getHours() !== 0 ||
      date.getMinutes() !== 0 ||
      date.getSeconds() !== 0 ||
      date.getMilliseconds() !== 0
    )
  }

  return false
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

  // Format date/time using the appropriate format based on whether time info is present
  const formatDateTime = useCallback(
    (date: string | Date | null | undefined): string => {
      if (!date) return ''

      try {
        let dateObj: Date

        if (typeof date === 'string') {
          dateObj = date.includes('T') ? parseISO(date) : new Date(date)
        } else {
          dateObj = date
        }

        if (!isValid(dateObj)) {
          return String(date)
        }

        // Determine if this date has time information
        const hasTime = hasTimeInfo(date)

        // Use appropriate format based on time presence
        const formatConfig = hasTime
          ? DATE_TIME_FORMATS[selectedDateTimeFormat]
          : DATE_FORMATS[selectedDateFormat]

        return formatDateFns(dateObj, formatConfig.pattern)
      } catch (error) {
        console.error('Error formatting date:', error)
        return String(date)
      }
    },
    [selectedDateFormat, selectedDateTimeFormat],
  )

  const formatDateIgnoringTimeZone = useCallback(
    (date: string | Date | null | undefined): string => {
      if (!date) return ''
      try {
        let dateObj: Date

        if (typeof date === 'string') {
          // For ISO strings, parse without timezone conversion
          if (date.includes('T')) {
            // Remove timezone info and parse as local time
            const dateWithoutTz = date.replace(/[Z+\-]\d{2}:?\d{2}$/, '')
            dateObj = parseISO(dateWithoutTz)
          } else {
            dateObj = parseISO(`${date}T00:00:00`)
          }
        } else {
          dateObj = date
        }

        if (!isValid(dateObj)) {
          return String(date)
        }

        // Determine if this date has time information
        const hasTime = hasTimeInfo(date)

        // Use appropriate format based on time presence
        const formatConfig = hasTime
          ? DATE_TIME_FORMATS[selectedDateTimeFormat]
          : DATE_FORMATS[selectedDateFormat]

        return formatDateFns(dateObj, formatConfig.pattern)
      } catch (error) {
        console.error('Error formatting date:', error)
        return String(date)
      }
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
    formatDateTime,
    formatDateIgnoringTimeZone,
    updateDateFormat,
    updateDateTimeFormat,
  }
}
