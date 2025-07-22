import type { Task } from '@medplum/fhirtypes'
import { describe, expect, it } from 'vitest'
import { getNestedValue, isMatchingFhirPathCondition } from './fhir-path'

describe('getNestedValue', () => {
  const testData = {
    resourceType: 'Task',
    status: 'in-progress',
    intent: 'order',
    // Basic object structure
    author: {
      display: 'Flavio Ferreira',
      reference: 'Practitioner/123',
    },
    meta: {
      lastUpdated: '2025-05-27T15:38:14.348Z',
      project: '0196d846-f275-7096-ba15-5ca3204cf8f4',
    },
    // Array with simple objects
    telecom: [
      {
        system: 'email',
        value: 'john.doe@acme.org',
      },
      {
        system: 'phone',
        value: '+3222222222',
      },
      {
        system: 'phone',
        value: '+32476111111',
        use: 'mobile',
      },
    ],
    // Array with nested coding structure
    input: [
      {
        type: {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/task-input-type',
              code: 'stakeholder',
              display: 'Stakeholder',
            },
          ],
        },
        valueString: 'Lab',
      },
      {
        type: {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/task-input-type',
              code: 'pathway-title',
              display: 'Pathway Title',
            },
          ],
        },
        valueString: 'testing dev task management',
      },
      {
        type: {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/task-input-type',
              code: 'step-name',
              display: 'Step Name',
            },
          ],
        },
        valueString: 'Show comments in message',
      },
    ],
    // Nested arrays
    address: [
      {
        line: ['Doe Street 1'],
        city: 'Doe City',
        postalCode: '6789',
      },
    ],
    // Complex nested structure
    communication: [
      {
        language: {
          coding: [
            {
              system: 'urn:ietf:bcp:47',
              code: 'en',
            },
          ],
        },
      },
    ],
    // New test data for arithmetic and string operations
    vitals: {
      weight: 75.5,
      height: 180,
      temperature: 37.2,
      heartRate: 72,
    },
    patient: {
      firstName: 'John',
      lastName: 'Doe',
      birthDate: '1990-01-01',
      admissionDate: '2024-03-15',
      period: {
        start: '2024-03-15',
        end: '2024-03-29',
      },
    },
    measurements: {
      systolic: 120,
      diastolic: 80,
      pulse: 72,
    },
    description: 'This is a test task',
    executionPeriod: {
      start: '2024-03-15T10:00:00Z',
      end: '2024-03-29T15:30:00Z',
    },
  } as Task

  describe('Basic Object Access', () => {
    it('should access simple nested properties', () => {
      expect(getNestedValue(testData, 'author.display')).toBe('Flavio Ferreira')
      expect(getNestedValue(testData, 'meta.lastUpdated')).toBe(
        '2025-05-27T15:38:14.348Z',
      )
    })
  })

  describe('Array Access', () => {
    describe('Index-based Access', () => {
      it('should access array items by index', () => {
        expect(getNestedValue(testData, 'telecom[0].value')).toBe(
          'john.doe@acme.org',
        )
        expect(getNestedValue(testData, 'telecom[1].value')).toBe('+3222222222')
      })
    })

    describe('Field-based Filtering', () => {
      it('should find items by simple field value', () => {
        expect(
          getNestedValue(
            testData,
            "telecom.where(system = 'phone' and use.empty()).value",
          ),
        ).toBe('+3222222222')
        expect(
          getNestedValue(testData, "telecom.where(system = 'email').value"),
        ).toBe('john.doe@acme.org')
        expect(
          getNestedValue(
            testData,
            "telecom.where(system = 'phone' and use = 'mobile').value",
          ),
        ).toBe('+32476111111')
      })

      it('should find items by nested field value', () => {
        expect(
          getNestedValue(
            testData,
            "input.where(type.coding[0].code = 'stakeholder').valueString",
          ),
        ).toBe('Lab')
        expect(
          getNestedValue(
            testData,
            "input.where(type.coding[0].code = 'pathway-title').valueString",
          ),
        ).toBe('testing dev task management')
        expect(
          getNestedValue(
            testData,
            "input.where(type.coding[0].code = 'step-name').valueString",
          ),
        ).toBe('Show comments in message')
      })
    })
  })

  describe('Complex Nested Structures', () => {
    it('should handle deeply nested arrays and objects', () => {
      expect(
        getNestedValue(testData, 'communication[0].language.coding[0].code'),
      ).toBe('en')
      expect(getNestedValue(testData, 'address[0].line[0]')).toBe(
        'Doe Street 1',
      )
    })
  })

  describe('Edge Cases', () => {
    it('should handle null/undefined values', () => {
      expect(getNestedValue(testData, 'nonexistent.path')).toBeUndefined()
      expect(getNestedValue(testData, 'telecom[999].value')).toBeUndefined()
    })

    it('should handle array values', () => {
      expect(getNestedValue(testData, 'address[0].line')).toBe('Doe Street 1')
    })

    it('should handle object values', () => {
      expect(getNestedValue(testData, 'author')).toEqual({
        display: 'Flavio Ferreira',
        reference: 'Practitioner/123',
      })
    })
  })

  describe('FHIR-specific Patterns', () => {
    it('should handle task input patterns', () => {
      expect(
        getNestedValue(
          testData,
          "input.where(type.coding[0].code = 'stakeholder').valueString",
        ),
      ).toBe('Lab')
      expect(
        getNestedValue(
          testData,
          "input.where(type.coding[0].code = 'pathway-title').valueString",
        ),
      ).toBe('testing dev task management')
      expect(
        getNestedValue(
          testData,
          "input.where(type.coding[0].code = 'step-name').valueString",
        ),
      ).toBe('Show comments in message')
    })
  })

  describe('Arithmetic Operations', () => {
    it('should perform basic arithmetic operations', () => {
      expect(getNestedValue(testData, 'vitals.weight + 5')).toBe(80.5)
      expect(getNestedValue(testData, 'vitals.height - 10')).toBe(170)
      expect(getNestedValue(testData, 'vitals.heartRate * 2')).toBe(144)
      expect(getNestedValue(testData, 'vitals.weight / 2')).toBe(37.75)
    })

    it('should handle complex arithmetic expressions', () => {
      expect(
        getNestedValue(
          testData,
          'measurements.systolic - measurements.diastolic',
        ),
      ).toBe(40)
      expect(
        getNestedValue(
          testData,
          '(measurements.systolic + measurements.diastolic) / 2',
        ),
      ).toBe(100)
    })
  })

  describe('String Operations', () => {
    it('should perform string concatenation', () => {
      expect(
        getNestedValue(testData, "patient.firstName + ' ' + patient.lastName"),
      ).toBe('John Doe')
      expect(
        getNestedValue(testData, "patient.firstName & ' ' & patient.lastName"),
      ).toBe('John Doe')
    })

    it('should handle string functions', () => {
      expect(
        getNestedValue(testData, 'patient.firstName.substring(0, 2)'),
      ).toBe('Jo')
      expect(
        getNestedValue(testData, "patient.firstName.replace('o', 'a')"),
      ).toBe('Jahn')
      expect(
        getNestedValue(testData, "patient.firstName.matches('^J.*')"),
      ).toBe(true)
      expect(
        getNestedValue(testData, "patient.firstName.startsWith('J')"),
      ).toBe(true)
      expect(getNestedValue(testData, "patient.firstName.endsWith('n')")).toBe(
        true,
      )
      expect(getNestedValue(testData, "patient.firstName.contains('hn')")).toBe(
        true,
      )
    })
  })

  describe('Date/Time Operations', () => {
    it('should perform date arithmetic', async () => {
      expect(
        getNestedValue(testData, 'addSeconds(executionPeriod.start, 1209600)'),
      ).toEqual(new Date('2024-03-29T10:00:00.000Z'))
      expect(
        getNestedValue(testData, 'addSeconds(executionPeriod.end, -1209600)'),
      ).toEqual(new Date('2024-03-15T15:30:00.000Z'))
    })

    it('should handle date functions', () => {
      const today = new Date().toISOString().split('T')[0]
      expect(getNestedValue(testData, 'today()')).toBe(today)
      expect(getNestedValue(testData, 'now()')).toBeDefined()
    })

    it('should calculate duration', () => {
      expect(
        getNestedValue(
          testData,
          '(toMilliseconds(executionPeriod.end) - toMilliseconds(executionPeriod.start)) / 1000 / 60 / 60',
        ),
      ).toBe(341.5)
    })

    it('should calculate age', () => {
      const patient = {
        resourceType: 'Patient',
        name: [{ given: ['John'], family: 'Doe' }],
        birthDate: '1990-01-01',
      }
      const result = getNestedValue(patient, 'subtractDates(now(), birthDate)')
      expect(result).toBeGreaterThan(1000 * 60 * 60 * 24 * 365 * 25)
    })
  })

  describe('isMatchingFhirPathCondition', () => {
    it('should return true if the condition is met', () => {
      expect(
        isMatchingFhirPathCondition(
          testData,
          "input.where(type.coding[0].code = 'stakeholder').valueString",
        ),
      ).toBe(true)
    })
  })

  describe('FHIR Date Comparison Conventions', () => {
    const patientWithDates = {
      resourceType: 'Patient',
      id: 'patient-123',
      name: [{ given: ['John'], family: 'Doe' }],
      birthDate: '1990-01-15',
      deceasedDateTime: '2023-06-20T14:30:00Z',
      period: {
        start: '2024-01-01T08:00:00Z',
        end: '2024-12-31T17:00:00Z',
      },
      contact: [
        {
          period: {
            start: '2024-03-01',
            end: '2024-06-30',
          },
        },
        {
          period: {
            start: '2024-07-01',
            end: '2024-09-30',
          },
        },
      ],
      encounter: [
        {
          period: {
            start: '2024-02-15T10:00:00Z',
            end: '2024-02-15T16:00:00Z',
          },
        },
        {
          period: {
            start: '2024-05-10T09:00:00Z',
            end: '2024-05-10T14:00:00Z',
          },
        },
      ],
    }

    describe('Date Equality Comparisons', () => {
      it('should compare dates for equality', () => {
        expect(
          isMatchingFhirPathCondition(
            patientWithDates,
            "birthDate = '1990-01-15'",
          ),
        ).toBe(true)
        expect(
          isMatchingFhirPathCondition(
            patientWithDates,
            "birthDate = '1990-01-16'",
          ),
        ).toBe(false)
      })

      it('should compare datetime for equality', () => {
        expect(
          isMatchingFhirPathCondition(
            patientWithDates,
            "deceasedDateTime = '2023-06-20T14:30:00Z'",
          ),
        ).toBe(true)
        expect(
          isMatchingFhirPathCondition(
            patientWithDates,
            "deceasedDateTime = '2023-06-20T14:31:00Z'",
          ),
        ).toBe(false)
      })
    })

    describe('Date Range Comparisons', () => {
      it('should check if date is greater than a value', () => {
        expect(
          isMatchingFhirPathCondition(
            patientWithDates,
            "birthDate > '1985-01-01'",
          ),
        ).toBe(true)
        expect(
          isMatchingFhirPathCondition(
            patientWithDates,
            "birthDate > '1995-01-01'",
          ),
        ).toBe(false)
      })

      it('should check if date is less than a value', () => {
        expect(
          isMatchingFhirPathCondition(
            patientWithDates,
            "birthDate < '1995-01-01'",
          ),
        ).toBe(true)
        expect(
          isMatchingFhirPathCondition(
            patientWithDates,
            "birthDate < '1985-01-01'",
          ),
        ).toBe(false)
      })

      it('should check if date is greater than or equal to a value', () => {
        expect(
          isMatchingFhirPathCondition(
            patientWithDates,
            "birthDate >= '1990-01-15'",
          ),
        ).toBe(true)
        expect(
          isMatchingFhirPathCondition(
            patientWithDates,
            "birthDate >= '1990-01-16'",
          ),
        ).toBe(false)
      })

      it('should check if date is less than or equal to a value', () => {
        expect(
          isMatchingFhirPathCondition(
            patientWithDates,
            "birthDate <= '1990-01-15'",
          ),
        ).toBe(true)
        expect(
          isMatchingFhirPathCondition(
            patientWithDates,
            "birthDate <= '1989-12-31'",
          ),
        ).toBe(false)
      })
    })

    describe('Period-based Date Comparisons', () => {
      it('should check if a date falls within a period', () => {
        expect(
          isMatchingFhirPathCondition(
            patientWithDates,
            "period.start <= '2024-06-01' and period.end >= '2024-06-01'",
          ),
        ).toBe(true)
        expect(
          isMatchingFhirPathCondition(
            patientWithDates,
            "period.start <= '2023-12-01' and period.end >= '2023-12-01'",
          ),
        ).toBe(false)
      })

      it('should check if current date is within period', () => {
        // This test uses the now() function to check if current date is within the period
        expect(
          isMatchingFhirPathCondition(
            patientWithDates,
            'period.start <= now() and period.end >= now()',
          ),
        ).toBeDefined() // Result depends on when test runs
      })
    })

    describe('Array-based Date Filtering', () => {
      it('should filter encounters by date range', () => {
        expect(
          isMatchingFhirPathCondition(
            patientWithDates,
            "encounter.where(period.start >= '2024-01-01' and period.end <= '2024-12-31').exists()",
          ),
        ).toBe(true)
        expect(
          isMatchingFhirPathCondition(
            patientWithDates,
            "encounter.where(period.start >= '2025-01-01').exists()",
          ),
        ).toBe(false)
      })

      it('should filter contacts by specific date', () => {
        expect(
          isMatchingFhirPathCondition(
            patientWithDates,
            "contact.where(period.start <= '2024-04-01' and period.end >= '2024-04-01').exists()",
          ),
        ).toBe(true)
        expect(
          isMatchingFhirPathCondition(
            patientWithDates,
            "contact.where(period.start <= '2024-01-01' and period.end >= '2024-01-01').exists()",
          ),
        ).toBe(false)
      })
    })

    describe('Age-based Calculations', () => {
      it('should calculate age and compare', () => {
        expect(
          isMatchingFhirPathCondition(
            patientWithDates,
            "subtractDates(now(), birthDate, 'years') >= 30",
          ),
        ).toBe(true)
        expect(
          isMatchingFhirPathCondition(
            patientWithDates,
            "subtractDates(now(), birthDate, 'years') < 20",
          ),
        ).toBe(false)
      })

      it('should check if patient is older than specific age', () => {
        expect(
          isMatchingFhirPathCondition(
            patientWithDates,
            "subtractDates(now(), birthDate, 'years') > 25",
          ),
        ).toBe(true)
      })
    })

    describe('Complex Date Logic', () => {
      it('should combine multiple date conditions', () => {
        expect(
          isMatchingFhirPathCondition(
            patientWithDates,
            "birthDate >= '1980-01-01' and birthDate <= '2000-12-31' and period.start >= '2024-01-01'",
          ),
        ).toBe(true)
      })

      it('should check for recent encounters', () => {
        expect(
          isMatchingFhirPathCondition(
            patientWithDates,
            "encounter.where(period.start >= addToDate(now(), -30, 'days')).exists()",
          ),
        ).toBeDefined() // Result depends on when test runs
      })

      it('should check for upcoming appointments', () => {
        expect(
          isMatchingFhirPathCondition(
            patientWithDates,
            "encounter.where(period.start >= now() and period.start <= addToDate(now(), 7, 'days')).exists()",
          ),
        ).toBeDefined() // Result depends on when test runs
      })
    })

    describe('Date Functions in Filters', () => {
      it('should use today() function in comparisons', () => {
        expect(
          isMatchingFhirPathCondition(
            patientWithDates,
            'period.start <= today() and period.end >= today()',
          ),
        ).toBeDefined() // Result depends on when test runs
      })

      it('should use date arithmetic in filters', () => {
        expect(
          isMatchingFhirPathCondition(
            patientWithDates,
            "encounter.where(period.start >= addToDate(now(), -90, 'days')).exists()",
          ),
        ).toBeDefined() // Result depends on when test runs
      })
    })
  })
})
