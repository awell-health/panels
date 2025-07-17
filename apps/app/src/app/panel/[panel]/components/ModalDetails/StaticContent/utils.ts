import { take } from 'lodash'
import { useEffect, useState } from 'react'
import { isValid, parseISO } from 'date-fns'
import type {
  WorklistPatient,
  WorklistTask,
} from '../../../../../../hooks/use-medplum-store'

export function calculateAge(dateString: string): number {
  const birthDate = new Date(dateString)
  const today = new Date()

  return today.getFullYear() - birthDate.getFullYear()
}

export const isISODate = (dateString: string): boolean => {
  if (typeof dateString !== 'string') return false

  try {
    const parsedDate = parseISO(dateString)
    return isValid(parsedDate)
  } catch {
    return false
  }
}

export const isJSON = (str: string): boolean => {
  if (typeof str !== 'string') return false
  try {
    JSON.parse(str)
    return true
  } catch {
    return false
  }
}

// More comprehensive isObject function
// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export const isObject = (value: any): boolean => {
  // Check if value is null (typeof null === 'object' in JavaScript)
  if (value === null) return false

  // Check if it's an object type
  if (typeof value !== 'object') return false

  // Check if it's not an array
  if (Array.isArray(value)) return false

  // Check if it's not a Date, RegExp, or other built-in objects if you want to exclude them
  // if (value instanceof Date) return false;
  // if (value instanceof RegExp) return false;

  return true
}

export const hasSearchQuery = (value: string, searchQuery: string): boolean => {
  return value.toLowerCase().includes(searchQuery.toLowerCase())
}

// Custom debounce hook
export const useDebounce = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(timer)
    }
  }, [value, delay])

  return debouncedValue
}

export const getExtensionValue = (
  source: WorklistPatient | WorklistTask | undefined,
  url: string,
) => {
  if (!source) return ''

  return source?.extension?.[0]?.extension?.find(
    (extension: { url: string }) => extension.url === url,
  )?.valueString
}

export const getCardSummary = (
  source: WorklistPatient | WorklistTask,
  card: {
    fields: { label: string; key: string }[]
  },
): string => {
  const summary = take(card.fields, 3)
    .map((field) => {
      const value = getExtensionValue(source, field.key)

      if (isJSON(value)) {
        return `${field.label}: ${JSON.parse(value).length} items`
      }

      if (value) {
        return `${field.label}: ${value}`
      }

      return null
    })
    .filter(Boolean)
    .slice(0, 2)
    .join(', ')

  return summary
}
