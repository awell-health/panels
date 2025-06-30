// Type definitions for fhirpath
import fhirpath from 'fhirpath'

/**
 * Gets a nested value from a FHIR resource using a FHIRPath expression.
 * Supports array access with indices and field-based filtering.
 *
 * @param obj - The FHIR resource to get the value from
 * @param path - The FHIRPath expression (e.g., 'author.display', 'telecom.where(system = "phone").value')
 * @returns The value at the specified path, or an empty string if not found
 */

export const getNestedValue = (
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  obj: Record<string, any>,
  path: string,
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
): any | any[] => {
  const addSeconds = {
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    fn: (_: any[], input: any, seconds: number) => {
      if (
        typeof input === 'string' &&
        /^\d{4}-\d{2}-\d{2}(T.*)?$/.test(input)
      ) {
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
      if (
        typeof input === 'string' &&
        /^\d{4}-\d{2}-\d{2}(T.*)?$/.test(input)
      ) {
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
    fn: (_: any[], date1: any, date2: any) => {
      const strDate1 = String(date1)
      const strDate2 = String(date2)

      if (
        /^\d{4}-\d{2}-\d{2}(T.*)?$/.test(strDate1) &&
        /^\d{4}-\d{2}-\d{2}(T.*)?$/.test(strDate2)
      ) {
        const d1 = new Date(strDate1)
        const d2 = new Date(strDate2)
        return [d1.getTime() - d2.getTime()]
      }
      return [0] // fallback
    },
    arity: {
      2: ['Any' as const, 'Any' as const],
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
    toDateLiteral,
  }

  try {
    const result = fhirpath.evaluate(obj, path, undefined, undefined, {
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
    const result = fhirpath.evaluate(obj, path, undefined, undefined, {})
    if (result.length === 0) return false
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    return !result.every((value: any) => value === false)
  } catch (error) {
    console.error('Error evaluating FHIRPath:', error)
    return true
  }
}
