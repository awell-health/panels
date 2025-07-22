/**
 * Utility functions for extracting data from FHIR resources using FHIRPath-like expressions
 *
 * @example Basic usage:
 * ```typescript
 * import { extractFHIRValue, processCard } from './fhir-content-utils'
 * import { encompassCards } from './Encompass/encompassCards'
 *
 * // Extract a single value
 * const patientName = extractFHIRValue(patientResource, 'name.first().text')
 * const phoneNumber = extractFHIRValue(patientResource, "telecom.where(system='phone').value")
 *
 * // Process an entire card
 * const processedCard = processCard(encompassCards[0], patientResource, taskResource)
 * console.log(processedCard.fields) // Array of { label, key, value, rawValue }
 *
 * // Process all cards
 * const allProcessedCards = processCards(encompassCards, patientResource, taskResource)
 * ```
 */

export interface FHIRResource {
  resourceType: string
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  [key: string]: any
}

/**
 * Extracts a value from a FHIR resource using a FHIRPath-like expression
 * @param resource - The FHIR resource (Patient, Task, etc.)
 * @param fhirPath - The FHIRPath expression to evaluate
 * @returns The extracted value or null if not found
 */
export function extractFHIRValue(
  resource: FHIRResource,
  fhirPath: string,
  // biome-ignore lint/suspicious/noExplicitAny: FHIR resources can contain any type of data
): any {
  if (!resource) {
    return null
  }

  if (!fhirPath || fhirPath === 'NO_DATA') {
    return null
  }

  try {
    const result = evaluateFHIRPath(resource, fhirPath)
    return result
  } catch (error) {
    console.warn(`FHIRPath error: ${fhirPath}`, error)
    return null
  }
}

/**
 * Evaluates a FHIRPath expression against a resource
 */
// biome-ignore lint/suspicious/noExplicitAny: FHIR resources can contain any type of data
// biome-ignore lint/suspicious/noExplicitAny: FHIRPath evaluation can return any type
function evaluateFHIRPath(resource: any, path: string): any {
  // Handle simple property access
  if (!path.includes('.') && !path.includes('(') && !path.includes('[')) {
    return resource[path]
  }

  // Split the path into segments
  const segments = parseFHIRPath(path)
  let current = resource

  for (const segment of segments) {
    current = evaluateSegment(current, segment)
    if (current === null || current === undefined) {
      return null
    }
  }

  return current
}

/**
 * Parses a FHIRPath into segments, handling complex expressions
 */
function parseFHIRPath(path: string): string[] {
  const segments: string[] = []
  let current = ''
  let depth = 0
  let inQuotes = false
  let quoteChar = ''

  for (let i = 0; i < path.length; i++) {
    const char = path[i]

    if (!inQuotes && (char === '"' || char === "'")) {
      inQuotes = true
      quoteChar = char
      current += char
    } else if (inQuotes && char === quoteChar) {
      inQuotes = false
      quoteChar = ''
      current += char
    } else if (inQuotes) {
      current += char
    } else if (char === '(' || char === '[') {
      depth++
      current += char
    } else if (char === ')' || char === ']') {
      depth--
      current += char
    } else if (char === '.' && depth === 0) {
      if (current.trim()) {
        segments.push(current.trim())
        current = ''
      }
    } else {
      current += char
    }
  }

  if (current.trim()) {
    segments.push(current.trim())
  }

  return segments
}

/**
 * Evaluates a single segment of a FHIRPath
 */
// biome-ignore lint/suspicious/noExplicitAny: Current value can be any FHIR data type
// biome-ignore lint/suspicious/noExplicitAny: Segment evaluation can return any type
function evaluateSegment(current: any, segment: string): any {
  if (!current) return null

  // Handle array access like [0] or [*]
  if (segment.match(/^\[\d+\]$/)) {
    const index = Number.parseInt(segment.slice(1, -1))
    return Array.isArray(current) ? current[index] : null
  }

  if (segment === '[*]') {
    return Array.isArray(current) ? current : [current]
  }

  // Handle where() conditions
  if (segment.includes('.where(')) {
    const match = segment.match(/^(.+?)\.where\((.+?)\)(.*)$/)
    if (match) {
      const [, property, condition, remainder] = match
      let items = current[property]

      if (!Array.isArray(items)) {
        items = items ? [items] : []
      }

      if (items.length === 0) {
        return null
      }

      // biome-ignore lint/suspicious/noExplicitAny: FHIR array items can be any type
      const filtered = items.filter((item: any) =>
        evaluateCondition(item, condition),
      )

      if (filtered.length === 0) {
        return null
      }

      if (remainder) {
        return (
          filtered
            // biome-ignore lint/suspicious/noExplicitAny: FHIR array items can be any type
            .map((item: any) => evaluateSegment(item, remainder.slice(1)))
            // biome-ignore lint/suspicious/noExplicitAny: Filter values can be any type
            .filter((val: any) => val !== null && val !== undefined)
        )
      }

      return filtered.length === 1 ? filtered[0] : filtered
    }
  }

  // Handle function calls like first(), last()
  if (segment.includes('first()')) {
    const property = segment.replace('.first()', '')
    const value = property ? current[property] : current
    return Array.isArray(value) ? value[0] : value
  }

  if (segment.includes('last()')) {
    const property = segment.replace('.last()', '')
    const value = property ? current[property] : current
    return Array.isArray(value) ? value[value.length - 1] : value
  }

  // Handle extension access
  if (segment.startsWith('extension.where(')) {
    return handleExtensionQuery(current, segment)
  }

  // Handle array property access with additional operations
  if (segment.includes('[') && segment.includes(']')) {
    const match = segment.match(/^([^[]+)\[([^\]]*)\](.*)$/)
    if (match) {
      const [, property, selector, remainder] = match
      const items = current[property]

      if (!Array.isArray(items)) {
        return null
      }

      if (selector === '*') {
        return remainder
          ? items
              // biome-ignore lint/suspicious/noExplicitAny: FHIR array items can be any type
              .map((item: any) => evaluateSegment(item, remainder.slice(1)))
              // biome-ignore lint/suspicious/noExplicitAny: Filter values can be any type
              .filter((val: any) => val !== null && val !== undefined)
          : items
      }

      if (selector.includes('?')) {
        // JSONPath-style filter
        // biome-ignore lint/suspicious/noExplicitAny: FHIR array items can be any type
        const filtered = items.filter((item: any) => {
          // Simple evaluation for common patterns
          return evaluateJSONPathCondition(item, selector)
        })
        return remainder
          ? // biome-ignore lint/suspicious/noExplicitAny: FHIR array items can be any type
            filtered.map((item: any) =>
              evaluateSegment(item, remainder.slice(1)),
            )
          : filtered
      }

      const index = Number.parseInt(selector)
      const item = !Number.isNaN(index) ? items[index] : null
      return remainder ? evaluateSegment(item, remainder.slice(1)) : item
    }
  }

  // Simple property access
  return current[segment]
}

/**
 * Evaluates a where() condition
 */
// biome-ignore lint/suspicious/noExplicitAny: FHIR items can be any type
function evaluateCondition(item: any, condition: string): boolean {
  // Handle system='value' conditions
  const systemMatch = condition.match(/system\s*=\s*['"](.*?)['"]/)
  if (systemMatch) {
    return item.system === systemMatch[1]
  }

  // Handle url='value' conditions
  const urlMatch = condition.match(/url\s*=\s*['"](.*?)['"]/)
  if (urlMatch) {
    return item.url === urlMatch[1]
  }

  // Handle code='value' conditions
  const codeMatch = condition.match(/code\s*=\s*['"](.*?)['"]/)
  if (codeMatch) {
    return (
      item.code === codeMatch[1] ||
      // biome-ignore lint/suspicious/noExplicitAny: Coding items can be any type
      item.coding?.some((c: any) => c.code === codeMatch[1])
    )
  }

  return false
}

/**
 * Handles extension queries specifically
 */
// biome-ignore lint/suspicious/noExplicitAny: Current value can be any FHIR data type
// biome-ignore lint/suspicious/noExplicitAny: Extension queries can return any type
function handleExtensionQuery(current: any, segment: string): any {
  if (!current.extension) {
    return null
  }

  const match = segment.match(
    /extension\.where\(url\s*=\s*['"](.*?)['"]\)(.*)$/,
  )
  if (!match) {
    return null
  }

  const [, url, remainder] = match
  // biome-ignore lint/suspicious/noExplicitAny: Extension objects can be any type
  const extension = current.extension.find((ext: any) => ext.url === url)

  if (!extension) {
    return null
  }

  if (remainder) {
    return evaluateSegment(extension, remainder.slice(1))
  }

  return extension
}

/**
 * Evaluates JSONPath-style conditions (simplified)
 */
// biome-ignore lint/suspicious/noExplicitAny: JSONPath items can be any type
function evaluateJSONPathCondition(item: any, condition: string): boolean {
  // Handle ?(@.type.coding[0].code='value') patterns
  const match = condition.match(/\?\(@\.(.+?)\s*=\s*['"](.*?)['"]\)/)
  if (match) {
    const [, path, value] = match
    const actualValue = evaluateFHIRPath(item, path)
    return actualValue === value
  }

  return false
}

/**
 * Utility function to safely parse JSON strings in FHIRPath results
 */
// biome-ignore lint/suspicious/noExplicitAny: JSON values can be any type
// biome-ignore lint/suspicious/noExplicitAny: JSON parsing can return any type
export function parseJSONValue(value: any, jsonPath?: string): any {
  if (typeof value !== 'string') return value

  try {
    const parsed = JSON.parse(value)
    if (jsonPath && parsed) {
      return evaluateJSONPath(parsed, jsonPath)
    }
    return parsed
  } catch {
    return value
  }
}

/**
 * Simple JSON path evaluation for parsed objects
 */
// biome-ignore lint/suspicious/noExplicitAny: JSON objects can be any type
// biome-ignore lint/suspicious/noExplicitAny: JSON path evaluation can return any type
function evaluateJSONPath(obj: any, path: string): any {
  const segments = path.split('.')
  let current = obj

  for (const segment of segments) {
    if (segment.includes('[') && segment.includes(']')) {
      const match = segment.match(/^([^[]+)\[(\d+)\]$/)
      if (match) {
        const [, property, index] = match
        current = current[property]?.[Number.parseInt(index)]
      } else {
        current = current[segment.replace(/\[.*\]/, '')]
      }
    } else {
      current = current?.[segment]
    }

    if (current === undefined || current === null) {
      return null
    }
  }

  return current
}

/**
 * Card field definition interface
 */
export interface FHIRCardField {
  label: string
  key: string
  resourceType: 'Patient' | 'Task'
  fhirPath: string
}

/**
 * Card definition interface
 */
export interface FHIRCard {
  name: string
  fields: FHIRCardField[]
}

/**
 * Processed field value interface
 */
export interface ProcessedFieldValue {
  label: string
  key: string
  // biome-ignore lint/suspicious/noExplicitAny: FHIR field values can be any type
  value: any
  // biome-ignore lint/suspicious/noExplicitAny: Raw FHIR values can be any type
  rawValue: any
}

/**
 * Processed card interface
 */
export interface ProcessedCard {
  name: string
  fields: ProcessedFieldValue[]
}

/**
 * Processes a card and extracts all field values from the appropriate FHIR resources
 * @param card - The card definition
 * @param patientResource - The Patient FHIR resource
 * @param taskResource - The Task FHIR resource (optional)
 * @returns Processed card with extracted values
 */
export function processCard(
  card: FHIRCard,
  patientResource: FHIRResource,
  taskResource?: FHIRResource,
): ProcessedCard {
  const processedFields: ProcessedFieldValue[] = []

  for (const field of card.fields) {
    const resource =
      field.resourceType === 'Patient' ? patientResource : taskResource

    if (!resource) {
      // console.log(
      //   `No data: ${field.resourceType} missing for "${field.fhirPath}"`,
      // )

      processedFields.push({
        label: field.label,
        key: field.key,
        value: null,
        rawValue: null,
      })
      continue
    }

    const rawValue = extractFHIRValue(resource, field.fhirPath)
    let processedValue = rawValue

    // Handle special cases for JSON parsing (like Wellpath cards)
    if (
      typeof rawValue === 'string' &&
      field.fhirPath.includes('valueString.')
    ) {
      const jsonPath = field.fhirPath.split('valueString.')[1]
      processedValue = parseJSONValue(rawValue, jsonPath)
    }

    // Log missing data in a concise way
    if (processedValue === null || processedValue === undefined) {
      // console.log(`No data: "${field.fhirPath}" in ${field.resourceType}`)
    }

    processedFields.push({
      label: field.label,
      key: field.key,
      value: processedValue,
      rawValue,
    })
  }

  return {
    name: card.name,
    fields: processedFields,
  }
}

/**
 * Processes multiple cards at once
 * @param cards - Array of card definitions
 * @param patientResource - The Patient FHIR resource
 * @param taskResource - The Task FHIR resource (optional)
 * @returns Array of processed cards
 */
export function processCards(
  cards: FHIRCard[],
  patientResource: FHIRResource,
  taskResource?: FHIRResource,
): ProcessedCard[] {
  return cards.map((card) => processCard(card, patientResource, taskResource))
}
