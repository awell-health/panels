"use client"

import { useStytchOrganization } from '@stytch/nextjs/b2b'
import { format as formatDateFns, isValid, parseISO } from 'date-fns'
import { useCallback, useEffect, useState } from 'react'

// Predefined date/time formats with labels
export const DATE_TIME_FORMATS = {
  'US_FULL': {
    label: 'US Format with Time (MM/DD/YYYY HH:mm AM/PM)',
    pattern: 'MM/dd/yyyy h:mm a',
    example: '12/31/2024 2:30 PM'
  },
  'US_DATE_ONLY': {
    label: 'US Date Only (MM/DD/YYYY)',
    pattern: 'MM/dd/yyyy',
    example: '12/31/2024'
  },
  'EU_FULL': {
    label: 'European Format with Time (DD/MM/YYYY HH:mm)',
    pattern: 'dd/MM/yyyy HH:mm',
    example: '31/12/2024 14:30'
  },
  'EU_DATE_ONLY': {
    label: 'European Date Only (DD/MM/YYYY)',
    pattern: 'dd/MM/yyyy',
    example: '31/12/2024'
  },
  'ISO_FULL': {
    label: 'ISO Format with Time (YYYY-MM-DD HH:mm)',
    pattern: 'yyyy-MM-dd HH:mm',
    example: '2024-12-31 14:30'
  },
  'ISO_DATE_ONLY': {
    label: 'ISO Date Only (YYYY-MM-DD)',
    pattern: 'yyyy-MM-dd',
    example: '2024-12-31'
  }
} as const

export type DateTimeFormatKey = keyof typeof DATE_TIME_FORMATS
export type DateTimeFormat = typeof DATE_TIME_FORMATS[DateTimeFormatKey]

const DEFAULT_FORMAT: DateTimeFormatKey = 'US_FULL'

interface UseDateTimeFormatReturn {
  // Current format configuration
  selectedFormat: DateTimeFormatKey
  formatConfig: DateTimeFormat
  availableFormats: typeof DATE_TIME_FORMATS

  // Formatter function
  formatDateTime: (date: string | Date | null | undefined) => string

  // Update function
  updateFormat: (formatKey: DateTimeFormatKey) => Promise<void>
}

const STORAGE_KEY = 'panels-date-time-format'

// Helper function to get format from localStorage
const getStoredFormat = (): DateTimeFormatKey => {
  if (typeof window === 'undefined') return DEFAULT_FORMAT
  const stored = localStorage.getItem(STORAGE_KEY) as DateTimeFormatKey
  return stored && DATE_TIME_FORMATS[stored] ? stored : DEFAULT_FORMAT
}

export function useDateTimeFormat(): UseDateTimeFormatReturn {
  const [selectedFormat, setSelectedFormat] = useState<DateTimeFormatKey>(getStoredFormat)

  const { organization } = useStytchOrganization()

  // Load saved format from organization metadata or localStorage
  useEffect(() => {
    let savedFormat: DateTimeFormatKey | null = null

    // First try to load from organization trusted metadata
    if (organization?.trusted_metadata?.panels) {
      savedFormat = (organization.trusted_metadata.panels as any)?.dateTimeFormat as DateTimeFormatKey
    }

    // Apply the saved format if valid
    if (savedFormat && DATE_TIME_FORMATS[savedFormat]) {
      setSelectedFormat(savedFormat)
    }
  }, [organization])

  // Listen for localStorage changes to sync across hook instances
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        const newFormat = e.newValue as DateTimeFormatKey
        if (DATE_TIME_FORMATS[newFormat]) {
          setSelectedFormat(newFormat)
        }
      }
    }

    // Also listen for custom event for same-tab updates
    const handleCustomStorageChange = (e: CustomEvent) => {
      if (e.detail.key === STORAGE_KEY) {
        const newFormat = e.detail.value as DateTimeFormatKey
        if (DATE_TIME_FORMATS[newFormat]) {
          setSelectedFormat(newFormat)
        }
      }
    }

    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('localStorageChange', handleCustomStorageChange as EventListener)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('localStorageChange', handleCustomStorageChange as EventListener)
    }
  }, [])

  // Format date/time using the selected format
  const formatDateTime = useCallback((date: string | Date | null | undefined): string => {
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

      const formatConfig = DATE_TIME_FORMATS[selectedFormat]
      return formatDateFns(dateObj, formatConfig.pattern)
    } catch (error) {
      console.error('Error formatting date:', error)
      return String(date)
    }
  }, [selectedFormat])

  const updateFormat = useCallback(async (formatKey: DateTimeFormatKey) => {
    try {
      localStorage.setItem(STORAGE_KEY, formatKey)
      setSelectedFormat(formatKey)

      // Dispatch custom event for same-tab synchronization
      window.dispatchEvent(new CustomEvent('localStorageChange', {
        detail: { key: STORAGE_KEY, value: formatKey }
      }))

      console.log(`Date/time format updated to: ${DATE_TIME_FORMATS[formatKey].label}`)
    } catch (error) {
      console.error('Failed to update date/time format:', error)
    }
  }, [])

  return {
    selectedFormat,
    formatConfig: DATE_TIME_FORMATS[selectedFormat],
    availableFormats: DATE_TIME_FORMATS,
    formatDateTime,
    updateFormat,
  }
} 