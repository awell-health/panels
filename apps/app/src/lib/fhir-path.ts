// Type definitions for fhirpath
import type { Bundle } from '@medplum/fhirtypes'
import fhirpath from 'fhirpath'

/**
 * Gets a nested value from a FHIR resource using a FHIRPath expression.
 * Supports array access with indices and field-based filtering.
 *
 * @param obj - The FHIR resource to get the value from
 * @param path - The FHIRPath expression (e.g., 'author.display', 'telecom.where(system = "phone").value')
 * @returns The value at the specified path, or an empty string if not found
 */

const addSeconds = {
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  fn: (_: any[], input: any, seconds: number) => {
    if (typeof input === 'string' && /^\d{4}-\d{2}-\d{2}(T.*)?$/.test(input)) {
      const date = new Date(input)
      date.setSeconds(date.getSeconds() + seconds)
      return [date]
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
    if (typeof input === 'string' && /^\d{4}-\d{2}-\d{2}(T.*)?$/.test(input)) {
      const date = new Date(input)
      return [date.getTime()]
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

    if (
      /^\d{4}-\d{2}-\d{2}(T.*)?$/.test(strDate1) &&
      /^\d{4}-\d{2}-\d{2}(T.*)?$/.test(strDate2)
    ) {
      const d1 = new Date(strDate1)
      const d2 = new Date(strDate2)
      const diffInMs = d1.getTime() - d2.getTime()

      // Convert to the requested unit and return as integer
      switch (unit?.toLowerCase()) {
        case 'years':
          // Use 365.25 days per year to account for leap years
          return [Math.round(diffInMs / (1000 * 60 * 60 * 24 * 365.25))]
        case 'months':
          // Use 30.44 days per month (365.25/12) as average month length
          return [Math.round(diffInMs / (1000 * 60 * 60 * 24 * 30.44))]
        case 'days':
          return [Math.round(diffInMs / (1000 * 60 * 60 * 24))]
        case 'hours':
          return [Math.round(diffInMs / (1000 * 60 * 60))]
        case 'minutes':
          return [Math.round(diffInMs / (1000 * 60))]
        case 'seconds':
          return [Math.round(diffInMs / 1000)]
        default:
          // Default to milliseconds for backward compatibility
          return [Math.round(diffInMs)]
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

    if (
      typeof quantity === 'number' &&
      /^\d{4}-\d{2}-\d{2}(T.*)?$/.test(strDate)
    ) {
      const d = new Date(strDate)
      const currentTime = d.getTime()

      // Convert quantity to milliseconds based on the unit
      let millisecondsToAdd = 0
      switch (unit?.toLowerCase()) {
        case 'years':
          // Use 365.25 days per year to account for leap years
          millisecondsToAdd = quantity * 365.25 * 24 * 60 * 60 * 1000
          break
        case 'months':
          // Use 30.44 days per month (365.25/12) as average month length
          millisecondsToAdd = quantity * 30.44 * 24 * 60 * 60 * 1000
          break
        case 'days':
          millisecondsToAdd = quantity * 24 * 60 * 60 * 1000
          break
        case 'hours':
          millisecondsToAdd = quantity * 60 * 60 * 1000
          break
        case 'minutes':
          millisecondsToAdd = quantity * 60 * 1000
          break
        case 'seconds':
          millisecondsToAdd = quantity * 1000
          break
        default:
          // Default to days if unit is not recognized
          millisecondsToAdd = quantity * 24 * 60 * 60 * 1000
          break
      }

      // Add milliseconds using setTime for predictable behavior
      d.setTime(currentTime + millisecondsToAdd)

      return [d]
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
    const result = fhirpath.evaluate(obj, path, undefined, undefined, {
      userInvocationTable,
    })
    if (result?.length === 1) {
      return result[0]
    }
    return result.length === 0 ? undefined : result
  } catch (error) {
    console.info('Error evaluating FHIRPath:', error)
    console.info('Path:', path)
    console.info('Object:', obj)
    console.log('--------------------------------')
    return ''
  }
}

export const isMatchingFhirPathCondition = (
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  obj: Record<string, any>,
  path: string,
): boolean => {
  try {
    const result = fhirpath.evaluate(obj, path, undefined, undefined, {
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
