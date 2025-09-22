import { isString, take } from 'lodash'
import { isValid, parseISO } from 'date-fns'
import type { WorklistPatient, WorklistTask } from '@/lib/fhir-to-table-data'

// Centralized error handling
export const handleError = (error: unknown, context: string): void => {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error'
  console.warn(`[${context}] ${errorMessage}`, error)
}

// Centralized search utilities
export const createSearchFilter = (searchQuery: string) => {
  const normalizedQuery = searchQuery.toLowerCase().trim()

  return {
    matchesText: (text: string | undefined | null): boolean => {
      if (!text || !normalizedQuery) return false
      return text.toLowerCase().includes(normalizedQuery)
    },

    matchesAnyText: (...texts: (string | undefined | null)[]): boolean => {
      return texts.some((text) => {
        if (!text || !normalizedQuery || !isString(text)) return false
        return text.toLowerCase().includes(normalizedQuery)
      })
    },
  }
}

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
export const isObject = (value: unknown): boolean => {
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

export const getExtensionValue = (
  source: WorklistPatient | WorklistTask | undefined,
  url: string,
): string => {
  if (!source || !url) return ''

  try {
    return (
      source?.extension?.[0]?.extension?.find(
        (extension: { url: string }) => extension.url === url,
      )?.valueString ?? ''
    )
  } catch (error) {
    handleError(error, 'getExtensionValue')
    return ''
  }
}

export const getCardSummary = (
  source: WorklistPatient | WorklistTask | undefined,
  card:
    | {
        fields: { label: string; key: string }[]
      }
    | undefined,
): string => {
  if (!source || !card?.fields) return ''

  try {
    const summary = take(card.fields, 3)
      .map((field) => {
        const value = getExtensionValue(source, field.key)

        if (isJSON(value)) {
          try {
            const parsed = JSON.parse(value)
            return `${field.label}: ${Array.isArray(parsed) ? parsed.length : 'object'} items`
          } catch {
            return `${field.label}: ${value}`
          }
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
  } catch (error) {
    handleError(error, 'getCardSummary')
    return ''
  }
}
