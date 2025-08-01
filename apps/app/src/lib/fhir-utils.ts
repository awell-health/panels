import type { CodeableConcept, Coding } from '@medplum/fhirtypes'

/**
 * Safely extracts the first coding's display value from a CodeableConcept
 * @param codeableConcept - The CodeableConcept to extract from
 * @param fallback - Fallback value if no display is found
 * @returns The display value or fallback
 */
export function getFirstCodingDisplay(
  codeableConcept: CodeableConcept | undefined,
  fallback = 'Unknown',
): string {
  return codeableConcept?.coding?.[0]?.display || fallback
}

/**
 * Safely extracts the first coding's code value from a CodeableConcept
 * @param codeableConcept - The CodeableConcept to extract from
 * @param fallback - Fallback value if no code is found
 * @returns The code value or fallback
 */
export function getFirstCodingCode(
  codeableConcept: CodeableConcept | undefined,
  fallback = '',
): string {
  return codeableConcept?.coding?.[0]?.code || fallback
}

/**
 * Safely extracts the first coding's system value from a CodeableConcept
 * @param codeableConcept - The CodeableConcept to extract from
 * @param fallback - Fallback value if no system is found
 * @returns The system value or fallback
 */
export function getFirstCodingSystem(
  codeableConcept: CodeableConcept | undefined,
  fallback = '',
): string {
  return codeableConcept?.coding?.[0]?.system || fallback
}

/**
 * Safely extracts the first coding object from a CodeableConcept
 * @param codeableConcept - The CodeableConcept to extract from
 * @returns The first coding object or undefined
 */
export function getFirstCoding(
  codeableConcept: CodeableConcept | undefined,
): Coding | undefined {
  return codeableConcept?.coding?.[0]
}

/**
 * Safely gets the first element of an array with proper null checking
 * @param array - Array to access
 * @returns First element or undefined
 */
export function safeArrayFirst<T>(array: T[] | undefined): T | undefined {
  return array?.[0]
}
