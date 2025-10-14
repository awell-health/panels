// Type definitions for fhirpath
import type { Bundle } from '@medplum/fhirtypes'
import {
  addSeconds as addSecondsDateFns,
  addMinutes,
  addHours,
  addDays,
  addMonths,
  addYears,
  differenceInSeconds,
  differenceInMinutes,
  differenceInHours,
  differenceInDays,
  differenceInMonths,
  differenceInYears,
  parseISO,
  isValid,
  format,
} from 'date-fns'
import fhirpath from 'fhirpath'

const env = {
  today: new Date().toISOString().split('T')[0],
}

/**
 * Gets a nested value from a FHIR resource using a FHIRPath expression.
 * Supports array access with indices and field-based filtering.
 *
 * @param obj - The FHIR resource to get the value from
 * @param path - The FHIRPath expression (e.g., 'author.display', 'telecom.where(system = "phone").value')
 * @returns The value at the specified path, or an empty string if not found
 */

/**
 * Safely parse a date string to a Date object using date-fns
 * Ensures date-only strings are treated as UTC to match FHIR conventions
 */
export const parseDate = (dateStr: string): Date | null => {
  if (typeof dateStr !== 'string') return null

  try {
    // For datetime strings, parse as-is
    if (/^\d{4}-\d{2}-\d{2}T/.test(dateStr)) {
      const parsed = parseISO(dateStr)
      return isValid(parsed) ? parsed : null
    }

    // Fallback: try parseISO for any other ISO-like format
    const parsed = parseISO(dateStr)
    return isValid(parsed) ? parsed : null
  } catch {
    return null
  }
}

const addSeconds = {
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  fn: (_: any[], input: any, seconds: number) => {
    const dateStr = String(input)
    const date = parseDate(dateStr)

    if (date && typeof seconds === 'number') {
      return [addSecondsDateFns(date, seconds)]
    }
    return [input] // fallback
  },
  arity: {
    2: ['String' as const, 'Number' as const],
  },
}

const toMilliseconds = {
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  fn: (_: any[], input: any) => {
    const dateStr = String(input)
    const date = parseDate(dateStr)

    if (date) {
      return [date.getTime()]
    }
    return [input] // fallback
  },
  arity: {
    1: ['String' as const],
  },
}

const toDateFormat = {
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  fn: (_: any[], input: any) => {
    const dateStr = String(input)
    const date = parseDate(dateStr)

    if (date) {
      return [format(date, 'yyyy-MM-dd')]
    }
    return [input] // fallback
  },
  arity: {
    1: ['String' as const],
  },
}

const subtractDates = {
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  fn: (_: any[], date1: any, date2: any, unit?: string) => {
    const strDate1 = String(date1)
    const strDate2 = String(date2)

    const d1 = parseDate(strDate1)
    const d2 = parseDate(strDate2)

    if (d1 && d2) {
      // Convert to the requested unit and return as integer
      switch (unit?.toLowerCase()) {
        case 'years':
          // Use floor for age calculations - you haven't completed the next year until your birthday
          return [differenceInYears(d1, d2)]
        case 'months':
          // Use floor for month calculations - you haven't completed the next month until the same date
          return [differenceInMonths(d1, d2)]
        case 'days':
          return [differenceInDays(d1, d2)]
        case 'hours':
          return [differenceInHours(d1, d2)]
        case 'minutes':
          return [differenceInMinutes(d1, d2)]
        case 'seconds':
          return [differenceInSeconds(d1, d2)]
        default:
          // Default to milliseconds for backward compatibility
          return [d1.getTime() - d2.getTime()]
      }
    }
    return [0] // fallback
  },
  arity: {
    2: ['Any' as const, 'Any' as const],
    3: ['Any' as const, 'Any' as const, 'String' as const],
  },
}

const addToDate = {
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  fn: (_: any[], date: any, quantity: number, unit: string) => {
    const strDate = String(date)
    const d = parseDate(strDate)

    if (d && typeof quantity === 'number') {
      // Use date-fns functions for precise date arithmetic
      // All operations are done on UTC dates and return UTC dates
      let result: Date
      switch (unit?.toLowerCase()) {
        case 'years':
          result = addYears(d, quantity)
          break
        case 'months':
          result = addMonths(d, quantity)
          break
        case 'days':
          result = addDays(d, quantity)
          break
        case 'hours':
          result = addHours(d, quantity)
          break
        case 'minutes':
          result = addMinutes(d, quantity)
          break
        case 'seconds':
          result = addSecondsDateFns(d, quantity)
          break
        default:
          // Default to days if unit is not recognized
          result = addDays(d, quantity)
          break
      }

      // Ensure result is a proper UTC date by creating a new Date with UTC components
      const utcResult = new Date(
        Date.UTC(
          result.getUTCFullYear(),
          result.getUTCMonth(),
          result.getUTCDate(),
          result.getUTCHours(),
          result.getUTCMinutes(),
          result.getUTCSeconds(),
          result.getUTCMilliseconds(),
        ),
      )

      return [utcResult]
    }
    return [date] // fallback
  },
  arity: {
    3: ['Any' as const, 'Number' as const, 'String' as const],
  },
}

const toDateLiteral = {
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  fn: (_: any[], input: any) => {
    return `@${input}`
  },
  arity: {
    1: ['Any' as const],
  },
}

const userInvocationTable = {
  addSeconds,
  toMilliseconds,
  toDateFormat,
  subtractDates,
  addToDate,
  toDateLiteral,
}

export const getNestedValue = (
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  obj: Record<string, any>,
  path: string | undefined,
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
): any | any[] => {
  if (!path) return undefined

  try {
    const result = fhirpath.evaluate(obj, path, env, undefined, {
      userInvocationTable,
    })
    if (result?.length === 1) {
      return result[0]
    }
    return result.length === 0 ? undefined : result
  } catch (error) {
    console.error('Error evaluating FHIRPath:', error)
    return ''
  }
}

export const isMatchingFhirPathCondition = (
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  obj: Record<string, any>,
  path: string,
): boolean => {
  try {
    const result = fhirpath.evaluate(obj, path, env, undefined, {
      userInvocationTable,
    })
    if (result.length === 0) return false
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    return !result.every((value: any) => value === false)
  } catch (error) {
    console.error('Error evaluating FHIRPath:', error)
    return true
  }
}

export const getNestedValueFromBundle = (
  bundle: Bundle,
  path: string,
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
): any | any[] => {
  if (!path || !bundle?.entry) return undefined

  // Handle bundle-level queries (e.g., entry.resource.ofType(Task).extension...)
  if (path.startsWith('entry.resource.ofType(')) {
    return evaluateBundleLevelPath(bundle, path)
  }

  // Handle resource-level queries - try on every resource
  return evaluateResourceLevelPath(bundle, path)
}

/**
 * Handle bundle-level fhirPath queries like entry.resource.ofType(Task).extension.where(...)
 */
// biome-ignore lint/suspicious/noExplicitAny: <explanation>
function evaluateBundleLevelPath(bundle: Bundle, fhirPath: string): any {
  // Extract the resource type from ofType(ResourceType)
  const ofTypeMatch = fhirPath.match(/entry\.resource\.ofType\((\w+)\)(.*)/)
  if (!ofTypeMatch) {
    return undefined
  }

  const [, resourceType, remainingPath] = ofTypeMatch

  // Get all resources of the specified type from the bundle
  const resources =
    bundle.entry
      ?.map((entry) => entry.resource)
      .filter((resource) => resource?.resourceType === resourceType) || []

  if (resources.length === 0) {
    return undefined
  }

  // If no remaining path, return the resources
  if (!remainingPath) {
    return resources
  }

  // Try the remaining path on each matching resource using getNestedValue
  for (const resource of resources) {
    try {
      const result = getNestedValue(
        // biome-ignore lint/suspicious/noExplicitAny: <explanation>
        resource as Record<string, any>,
        remainingPath.substring(1),
      )

      // Return first non-null/non-undefined result
      if (result !== null && result !== undefined && result !== '') {
        return result
      }
    } catch (error) {
      // continue
    }
  }

  return undefined
}

/**
 * Handle resource-level fhirPath queries by trying every entry in bundle
 */
// biome-ignore lint/suspicious/noExplicitAny: <explanation>
function evaluateResourceLevelPath(bundle: Bundle, fhirPath: string): any {
  // Try the path on every resource in the bundle using getNestedValue
  for (const entry of bundle.entry || []) {
    if (!entry?.resource) continue

    try {
      const result = getNestedValue(
        // biome-ignore lint/suspicious/noExplicitAny: <explanation>
        entry.resource as Record<string, any>,
        fhirPath,
      )

      // Return first non-null/non-undefined result
      if (result !== null && result !== undefined && result !== '') {
        return result
      }
    } catch (error) {
      // continue
    }
  }

  return undefined
}
