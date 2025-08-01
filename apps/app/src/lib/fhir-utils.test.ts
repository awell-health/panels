import { describe, expect, it } from 'vitest'
import {
  getFirstCodingDisplay,
  getFirstCodingCode,
  getFirstCodingSystem,
  getFirstCoding,
  safeArrayFirst,
} from './fhir-utils'
import type { CodeableConcept, Coding } from '@medplum/fhirtypes'

describe('fhir-utils', () => {
  describe('getFirstCodingDisplay', () => {
    it('should return display from first coding', () => {
      const codeableConcept: CodeableConcept = {
        coding: [
          { display: 'First Display', code: 'first' },
          { display: 'Second Display', code: 'second' },
        ],
      }

      expect(getFirstCodingDisplay(codeableConcept)).toBe('First Display')
    })

    it('should return fallback when no coding', () => {
      const codeableConcept: CodeableConcept = {}

      expect(getFirstCodingDisplay(codeableConcept, 'Custom Fallback')).toBe(
        'Custom Fallback',
      )
    })

    it('should return fallback when coding array is empty', () => {
      const codeableConcept: CodeableConcept = { coding: [] }

      expect(getFirstCodingDisplay(codeableConcept)).toBe('Unknown')
    })

    it('should return fallback when display is undefined', () => {
      const codeableConcept: CodeableConcept = {
        coding: [{ code: 'test' }],
      }

      expect(getFirstCodingDisplay(codeableConcept)).toBe('Unknown')
    })

    it('should handle undefined input', () => {
      expect(getFirstCodingDisplay(undefined)).toBe('Unknown')
    })
  })

  describe('getFirstCodingCode', () => {
    it('should return code from first coding', () => {
      const codeableConcept: CodeableConcept = {
        coding: [
          { code: 'FIRST', display: 'First' },
          { code: 'SECOND', display: 'Second' },
        ],
      }

      expect(getFirstCodingCode(codeableConcept)).toBe('FIRST')
    })

    it('should return empty string fallback by default', () => {
      const codeableConcept: CodeableConcept = {}

      expect(getFirstCodingCode(codeableConcept)).toBe('')
    })

    it('should return custom fallback', () => {
      const codeableConcept: CodeableConcept = { coding: [] }

      expect(getFirstCodingCode(codeableConcept, 'NO_CODE')).toBe('NO_CODE')
    })
  })

  describe('getFirstCodingSystem', () => {
    it('should return system from first coding', () => {
      const codeableConcept: CodeableConcept = {
        coding: [
          { system: 'http://example.com/first', code: 'test' },
          { system: 'http://example.com/second', code: 'test2' },
        ],
      }

      expect(getFirstCodingSystem(codeableConcept)).toBe(
        'http://example.com/first',
      )
    })

    it('should handle undefined gracefully', () => {
      expect(getFirstCodingSystem(undefined)).toBe('')
    })
  })

  describe('getFirstCoding', () => {
    it('should return entire first coding object', () => {
      const firstCoding: Coding = {
        system: 'http://example.com',
        code: 'TEST',
        display: 'Test Display',
      }

      const codeableConcept: CodeableConcept = {
        coding: [firstCoding, { code: 'other' }],
      }

      expect(getFirstCoding(codeableConcept)).toEqual(firstCoding)
    })

    it('should return undefined when no coding available', () => {
      expect(getFirstCoding(undefined)).toBeUndefined()
      expect(getFirstCoding({})).toBeUndefined()
      expect(getFirstCoding({ coding: [] })).toBeUndefined()
    })
  })

  describe('safeArrayFirst', () => {
    it('should return first element of array', () => {
      expect(safeArrayFirst(['a', 'b', 'c'])).toBe('a')
      expect(safeArrayFirst([1, 2, 3])).toBe(1)
    })

    it('should return undefined for empty array', () => {
      expect(safeArrayFirst([])).toBeUndefined()
    })

    it('should return undefined for undefined array', () => {
      expect(safeArrayFirst(undefined)).toBeUndefined()
    })

    it('should handle single element array', () => {
      expect(safeArrayFirst(['only'])).toBe('only')
    })
  })

  describe('edge cases', () => {
    it('should handle malformed coding arrays', () => {
      const malformedConcept: CodeableConcept = {
        // @ts-ignore - testing malformed data
        coding: [null, undefined, { display: 'Valid' }],
      }

      // Should still work because of optional chaining
      expect(getFirstCodingDisplay(malformedConcept)).toBe('Unknown')
    })

    it('should handle deeply nested undefined values', () => {
      const concept: CodeableConcept = {
        coding: [{}], // Empty coding object
      }

      expect(getFirstCodingDisplay(concept)).toBe('Unknown')
      expect(getFirstCodingCode(concept)).toBe('')
      expect(getFirstCodingSystem(concept)).toBe('')
    })
  })
})
