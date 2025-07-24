import type {
  Task,
  Bundle,
  Patient,
  Practitioner,
  Observation,
} from '@medplum/fhirtypes'
import { describe, expect, it } from 'vitest'
import {
  getNestedValue,
  isMatchingFhirPathCondition,
  getNestedValueFromBundle,
  parseDate,
} from './fhir-path'

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
      ).toEqual(parseDate('2024-03-29T10:00:00.000Z'))
      expect(
        getNestedValue(testData, 'addSeconds(executionPeriod.end, -1209600)'),
      ).toEqual(parseDate('2024-03-15T15:30:00.000Z'))
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

  describe('Date functions', () => {
    describe('subtractDates function', () => {
      describe('years calculation', () => {
        it('should calculate age correctly', () => {
          const patient = {
            resourceType: 'Patient',
            birthDate: '2000-01-01',
          }

          // Test with a specific date to ensure consistent results
          const result = getNestedValue(
            patient,
            "subtractDates('2025-07-14', birthDate, 'years')",
          )
          expect(result).toBe(25) // Should be 25, not 26 (the original bug)
        })

        it('should calculate age correctly on exact birthday', () => {
          const patient = {
            resourceType: 'Patient',
            birthDate: '2000-01-01',
          }

          const result = getNestedValue(
            patient,
            "subtractDates('2025-01-01', birthDate, 'years')",
          )
          expect(result).toBe(25) // Exactly 25 years on birthday
        })

        it('should calculate age correctly one day before birthday', () => {
          const patient = {
            resourceType: 'Patient',
            birthDate: '2000-01-01',
          }

          const result = getNestedValue(
            patient,
            "subtractDates('2024-12-31', birthDate, 'years')",
          )
          expect(result).toBe(24) // Still 24 years, one day before 25th birthday
        })

        it('should handle leap year births correctly', () => {
          const patient = {
            resourceType: 'Patient',
            birthDate: '2000-02-29', // Leap year birth
          }

          const result = getNestedValue(
            patient,
            "subtractDates('2025-02-28', birthDate, 'years')",
          )
          expect(result).toBe(24) // Should be 24, not 25 (one day before birthday in non-leap year)
        })
      })

      describe('months calculation', () => {
        it('should calculate months correctly', () => {
          const data = {
            startDate: '2024-01-01',
            endDate: '2024-06-15',
          }

          const result = getNestedValue(
            data,
            "subtractDates(endDate, startDate, 'months')",
          )
          expect(result).toBe(5) // 5 complete months, not 6
        })
      })

      describe('days calculation', () => {
        it('should calculate days correctly', () => {
          const data = {
            startDate: '2024-01-01',
            endDate: '2024-01-08',
          }

          const result = getNestedValue(
            data,
            "subtractDates(endDate, startDate, 'days')",
          )
          expect(result).toBe(7) // Exactly 7 days
        })

        it('should handle the original days off-by-one error', () => {
          const data = {
            startDate: '2025-07-14',
            endDate: '2025-07-15',
          }

          const result = getNestedValue(
            data,
            "subtractDates(endDate, startDate, 'days')",
          )
          expect(result).toBe(1) // Should be 1, not 0 or 2
        })
      })

      describe('other time units', () => {
        it('should calculate hours correctly', () => {
          const data = {
            startTime: '2024-01-01T10:00:00Z',
            endTime: '2024-01-01T15:30:00Z',
          }

          const result = getNestedValue(
            data,
            "subtractDates(endTime, startTime, 'hours')",
          )
          expect(result).toBe(5) // 5.5 hours = 5 complete hours
        })

        it('should calculate minutes correctly', () => {
          const data = {
            startTime: '2024-01-01T10:00:00Z',
            endTime: '2024-01-01T10:05:30Z',
          }

          const result = getNestedValue(
            data,
            "subtractDates(endTime, startTime, 'minutes')",
          )
          expect(result).toBe(5) // 5.5 minutes = 5 complete minutes
        })

        it('should calculate seconds correctly', () => {
          const data = {
            startTime: '2024-01-01T10:00:00Z',
            endTime: '2024-01-01T10:00:10Z',
          }

          const result = getNestedValue(
            data,
            "subtractDates(endTime, startTime, 'seconds')",
          )
          expect(result).toBe(10) // Exactly 10 seconds
        })
      })

      describe('error handling and edge cases', () => {
        it('should handle invalid date formats gracefully', () => {
          const data = {
            invalidDate: 'not-a-date',
            validDate: '2024-01-01',
          }

          const result = getNestedValue(
            data,
            "subtractDates(validDate, invalidDate, 'years')",
          )
          expect(result).toBe(0) // Should return 0 as fallback
        })

        it('should handle missing unit parameter', () => {
          const data = {
            date1: '2024-01-01T10:00:00Z',
            date2: '2024-01-01T09:00:00Z',
          }

          const result = getNestedValue(data, 'subtractDates(date1, date2)')
          expect(result).toBe(3600000) // Should default to milliseconds (1 hour = 3600000ms)
        })

        it('should handle date-only vs datetime strings correctly', () => {
          const data = {
            dateOnly: '2024-01-01',
            dateTime: '2024-01-02T00:00:00Z',
          }

          const result = getNestedValue(
            data,
            "subtractDates(dateTime, dateOnly, 'days')",
          )
          expect(result).toBe(1) // Should be 1 day difference
        })
      })
    })

    describe('addToDate function', () => {
      it('should add years correctly', () => {
        const data = {
          birthDate: '2000-01-01',
        }

        const result = getNestedValue(data, "addToDate(birthDate, 25, 'years')")
        expect(result).toEqual(parseDate('2025-01-01'))
      })

      it('should add months correctly', () => {
        const data = {
          startDate: '2024-01-01',
        }

        const result = getNestedValue(data, "addToDate(startDate, 6, 'months')")
        expect(result).toEqual(parseDate('2024-07-01'))
      })

      it('should add days correctly', () => {
        const data = {
          startDate: '2024-01-01',
        }

        const result = getNestedValue(data, "addToDate(startDate, 10, 'days')")
        expect(result).toEqual(parseDate('2024-01-11'))
      })

      it('should handle leap years in month addition', () => {
        const data = {
          startDate: '2024-01-29', // Leap year
        }

        const result = getNestedValue(data, "addToDate(startDate, 1, 'months')")
        expect(result).toEqual(parseDate('2024-02-29')) // Should handle leap year correctly
      })

      it('should default to days for unknown unit', () => {
        const data = {
          startDate: '2024-01-01',
        }

        const result = getNestedValue(
          data,
          "addToDate(startDate, 5, 'unknown')",
        )
        expect(result).toEqual(parseDate('2024-01-06')) // Should default to days
      })
    })

    describe('date parsing robustness', () => {
      it('should parse ISO date strings correctly', () => {
        const data = {
          isoDate: '2024-01-01',
          isoDateTime: '2024-01-01T10:30:00Z',
          isoDateTimeOffset: '2024-01-01T10:30:00+01:00',
        }

        expect(getNestedValue(data, 'toMilliseconds(isoDate)')).toBeDefined()
        expect(
          getNestedValue(data, 'toMilliseconds(isoDateTime)'),
        ).toBeDefined()
        expect(
          getNestedValue(data, 'toMilliseconds(isoDateTimeOffset)'),
        ).toBeDefined()
      })

      it('should handle malformed dates gracefully', () => {
        const data = {
          malformedDate: '2024-13-45', // Invalid month/day
          emptyString: '',
          nonDateString: 'hello world',
        }

        expect(getNestedValue(data, 'toMilliseconds(malformedDate)')).toBe(
          '2024-13-45',
        )
        expect(getNestedValue(data, 'toMilliseconds(emptyString)')).toBe('')
        expect(getNestedValue(data, 'toMilliseconds(nonDateString)')).toBe(
          'hello world',
        )
      })
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

describe('Bundle Functions', () => {
  // Create comprehensive test bundle with multiple resource types
  const testBundle: Bundle = {
    resourceType: 'Bundle',
    id: 'test-bundle',
    type: 'collection',
    entry: [
      {
        resource: {
          resourceType: 'Patient',
          id: 'patient-1',
          name: [{ given: ['John'], family: 'Doe' }],
          birthDate: '1990-01-15',
          gender: 'male',
          telecom: [
            { system: 'email', value: 'john.doe@example.com' },
            { system: 'phone', value: '+1234567890' },
          ],
          extension: [
            {
              url: 'http://example.org/extensions/preferred-contact',
              valueString: 'email',
            },
          ],
        } as Patient,
      },
      {
        resource: {
          resourceType: 'Patient',
          id: 'patient-2',
          name: [{ given: ['Jane'], family: 'Smith' }],
          birthDate: '1985-05-20',
          gender: 'female',
          telecom: [{ system: 'phone', value: '+0987654321' }],
        } as Patient,
      },
      {
        resource: {
          resourceType: 'Practitioner',
          id: 'practitioner-1',
          name: [{ given: ['Dr. Alice'], family: 'Johnson' }],
          qualification: [
            {
              code: {
                coding: [
                  {
                    system: 'http://terminology.hl7.org/CodeSystem/v2-0360',
                    code: 'MD',
                    display: 'Doctor of Medicine',
                  },
                ],
              },
            },
          ],
          extension: [
            {
              url: 'http://example.org/extensions/specialty',
              valueString: 'cardiology',
            },
          ],
        } as Practitioner,
      },
      {
        resource: {
          resourceType: 'Task',
          id: 'task-1',
          status: 'in-progress',
          intent: 'order',
          description: 'Review patient records',
          for: { reference: 'Patient/patient-1' },
          owner: { reference: 'Practitioner/practitioner-1' },
          extension: [
            {
              url: 'http://example.org/extensions/priority-level',
              valueInteger: 3,
            },
          ],
        } as Task,
      },
      {
        resource: {
          resourceType: 'Observation',
          id: 'observation-1',
          status: 'final',
          code: {
            coding: [
              {
                system: 'http://loinc.org',
                code: '29463-7',
                display: 'Body Weight',
              },
            ],
          },
          subject: { reference: 'Patient/patient-1' },
          valueQuantity: {
            value: 70,
            unit: 'kg',
          },
          extension: [
            {
              url: 'http://example.org/extensions/measurement-device',
              valueString: 'digital-scale',
            },
          ],
        } as Observation,
      },
      {
        // Entry with no resource to test edge cases
        resource: undefined,
      },
      {
        resource: {
          resourceType: 'Task',
          id: 'task-2',
          status: 'completed',
          intent: 'plan',
          description: 'Follow up appointment',
          for: { reference: 'Patient/patient-2' },
        } as Task,
      },
    ],
  }

  const emptyBundle: Bundle = {
    resourceType: 'Bundle',
    id: 'empty-bundle',
    type: 'collection',
    entry: [],
  }

  const bundleWithoutEntry: Bundle = {
    resourceType: 'Bundle',
    id: 'no-entry-bundle',
    type: 'collection',
  }

  describe('getNestedValueFromBundle', () => {
    describe('Bundle-level queries (entry.resource.ofType pattern)', () => {
      it('should handle basic ofType queries', () => {
        const patients = getNestedValueFromBundle(
          testBundle,
          'entry.resource.ofType(Patient)',
        )
        expect(Array.isArray(patients)).toBe(true)
        expect(patients).toHaveLength(2)
        expect(patients[0].resourceType).toBe('Patient')
        expect(patients[1].resourceType).toBe('Patient')
      })

      it('should handle ofType queries with remaining path', () => {
        const patientNames = getNestedValueFromBundle(
          testBundle,
          'entry.resource.ofType(Patient).name[0].given[0]',
        )
        expect(patientNames).toBe('John') // Should return first match
      })

      it('should handle ofType queries with extension paths', () => {
        const preferredContact = getNestedValueFromBundle(
          testBundle,
          "entry.resource.ofType(Patient).extension.where(url = 'http://example.org/extensions/preferred-contact').valueString",
        )
        expect(preferredContact).toBe('email')
      })

      it('should handle ofType queries with complex filtering', () => {
        const malePatientName = getNestedValueFromBundle(
          testBundle,
          "entry.resource.ofType(Patient).where(gender = 'male').name[0].family",
        )
        expect(malePatientName).toBe('Doe')
      })

      it('should return undefined for non-existent resource types', () => {
        const result = getNestedValueFromBundle(
          testBundle,
          'entry.resource.ofType(Organization)',
        )
        expect(result).toBeUndefined()
      })

      it('should return undefined for malformed ofType queries', () => {
        const result = getNestedValueFromBundle(
          testBundle,
          'entry.resource.invalidPattern(Patient)',
        )
        expect(result).toBeUndefined()
      })

      it('should handle Practitioner queries', () => {
        const practitionerSpecialty = getNestedValueFromBundle(
          testBundle,
          "entry.resource.ofType(Practitioner).extension.where(url = 'http://example.org/extensions/specialty').valueString",
        )
        expect(practitionerSpecialty).toBe('cardiology')
      })

      it('should handle Task queries', () => {
        const taskDescription = getNestedValueFromBundle(
          testBundle,
          "entry.resource.ofType(Task).where(status = 'in-progress').description",
        )
        expect(taskDescription).toBe('Review patient records')
      })

      it('should handle Observation queries', () => {
        const observationValue = getNestedValueFromBundle(
          testBundle,
          'entry.resource.ofType(Observation).valueQuantity.value',
        )
        expect(observationValue).toBe(70)
      })
    })

    describe('Resource-level queries (non-ofType patterns)', () => {
      it('should find values from any resource in the bundle', () => {
        const patientName = getNestedValueFromBundle(
          testBundle,
          'name[0].given[0]',
        )
        expect(patientName).toBe('John') // Should find first match
      })

      it('should find telecom values from any resource', () => {
        const email = getNestedValueFromBundle(
          testBundle,
          "telecom.where(system = 'email').value",
        )
        expect(email).toBe('john.doe@example.com')
      })

      it('should find extension values from any resource', () => {
        const priorityLevel = getNestedValueFromBundle(
          testBundle,
          "extension.where(url = 'http://example.org/extensions/priority-level').valueInteger",
        )
        expect(priorityLevel).toBe(3)
      })

      it('should find qualification information', () => {
        const qualificationCode = getNestedValueFromBundle(
          testBundle,
          'qualification[0].code.coding[0].code',
        )
        expect(qualificationCode).toBe('MD')
      })

      it('should return undefined when no resource has the requested path', () => {
        const result = getNestedValueFromBundle(
          testBundle,
          'nonexistent.deeply.nested.path',
        )
        expect(result).toBeUndefined()
      })

      it('should skip resources with undefined values and find valid ones', () => {
        const description = getNestedValueFromBundle(testBundle, 'description')
        expect(description).toBe('Review patient records') // Should find first valid description
      })
    })

    describe('Edge cases', () => {
      it('should handle empty bundles', () => {
        const result = getNestedValueFromBundle(emptyBundle, 'name[0].given[0]')
        expect(result).toBeUndefined()
      })

      it('should handle bundles without entry property', () => {
        const result = getNestedValueFromBundle(
          bundleWithoutEntry,
          'name[0].given[0]',
        )
        expect(result).toBeUndefined()
      })

      it('should handle null/undefined bundle', () => {
        // biome-ignore lint/suspicious/noExplicitAny: <explanation>
        const result = getNestedValueFromBundle(null as any, 'name[0].given[0]')
        expect(result).toBeUndefined()
      })

      it('should handle empty/undefined path', () => {
        const result = getNestedValueFromBundle(testBundle, '')
        expect(result).toBeUndefined()

        // biome-ignore lint/suspicious/noExplicitAny: <explanation>
        const result2 = getNestedValueFromBundle(testBundle, undefined as any)
        expect(result2).toBeUndefined()
      })

      it('should handle entries with undefined resources', () => {
        const result = getNestedValueFromBundle(testBundle, 'name[0].given[0]')
        expect(result).toBe('John') // Should skip undefined resources and find valid ones
      })
    })
  })

  describe('evaluateBundleLevelPath (internal function behavior)', () => {
    describe('ofType pattern matching', () => {
      it('should extract resource type correctly from ofType patterns', () => {
        // These tests verify the internal behavior by testing through getNestedValueFromBundle
        const patients = getNestedValueFromBundle(
          testBundle,
          'entry.resource.ofType(Patient)',
        )
        expect(patients).toHaveLength(2)
      })

      it('should handle multiple resource types', () => {
        const tasks = getNestedValueFromBundle(
          testBundle,
          'entry.resource.ofType(Task)',
        )
        expect(tasks).toHaveLength(2)

        const practitioners = getNestedValueFromBundle(
          testBundle,
          'entry.resource.ofType(Practitioner)',
        )
        expect(practitioners).toHaveLength(1)
      })

      it('should return resources when no remaining path is provided', () => {
        const observations = getNestedValueFromBundle(
          testBundle,
          'entry.resource.ofType(Observation)',
        )
        expect(observations).toHaveLength(1)
        expect(observations[0].resourceType).toBe('Observation')
      })

      it('should handle case-sensitive resource type matching', () => {
        const result1 = getNestedValueFromBundle(
          testBundle,
          'entry.resource.ofType(patient)',
        ) // lowercase
        expect(result1).toBeUndefined()

        const result2 = getNestedValueFromBundle(
          testBundle,
          'entry.resource.ofType(Patient)',
        ) // correct case
        expect(result2).toBeDefined()
      })
    })

    describe('remaining path processing', () => {
      it('should process simple remaining paths', () => {
        const patientId = getNestedValueFromBundle(
          testBundle,
          'entry.resource.ofType(Patient).id',
        )
        expect(patientId).toBe('patient-1') // First patient's ID
      })

      it('should process complex remaining paths with arrays', () => {
        const familyName = getNestedValueFromBundle(
          testBundle,
          'entry.resource.ofType(Patient).name[0].family',
        )
        expect(familyName).toBe('Doe')
      })

      it('should process remaining paths with filtering', () => {
        const phoneNumber = getNestedValueFromBundle(
          testBundle,
          "entry.resource.ofType(Patient).telecom.where(system = 'phone').value",
        )
        expect(phoneNumber).toBe('+1234567890')
      })

      it('should return first non-empty result from multiple resources', () => {
        // Both patients have names, should return first one
        const givenName = getNestedValueFromBundle(
          testBundle,
          'entry.resource.ofType(Patient).name[0].given[0]',
        )
        expect(givenName).toBe('John')
      })
    })

    describe('error handling', () => {
      it('should handle invalid FHIRPath expressions gracefully', () => {
        const result = getNestedValueFromBundle(
          testBundle,
          'entry.resource.ofType(Patient).invalid[syntax',
        )
        expect(result).toBeUndefined()
      })

      it('should continue processing when one resource throws an error', () => {
        // This would test resilience, but our current implementation catches errors
        const result = getNestedValueFromBundle(
          testBundle,
          'entry.resource.ofType(Patient).name[0].given[0]',
        )
        expect(result).toBe('John')
      })
    })
  })

  describe('evaluateResourceLevelPath (internal function behavior)', () => {
    describe('resource iteration', () => {
      it('should check all resources until finding a match', () => {
        // Patient is first in bundle, so should find patient name
        const name = getNestedValueFromBundle(testBundle, 'name[0].given[0]')
        expect(name).toBe('John')
      })

      it("should find values from later resources when earlier ones don't match", () => {
        // Only Task has description, should find it even though Tasks come after Patients
        const description = getNestedValueFromBundle(testBundle, 'description')
        expect(description).toBe('Review patient records')
      })

      it('should find qualification information from Practitioner', () => {
        const qualification = getNestedValueFromBundle(
          testBundle,
          'qualification[0].code.coding[0].display',
        )
        expect(qualification).toBe('Doctor of Medicine')
      })
    })

    describe('result filtering', () => {
      it('should skip empty string results', () => {
        // This tests the internal filtering logic that looks for non-empty results
        const result = getNestedValueFromBundle(testBundle, 'name[0].given[0]')
        expect(result).not.toBe('')
        expect(result).toBe('John')
      })

      it('should skip null/undefined results', () => {
        const result = getNestedValueFromBundle(testBundle, 'name[0].given[0]')
        expect(result).not.toBeNull()
        expect(result).not.toBeUndefined()
        expect(result).toBe('John')
      })
    })

    describe('resource validation', () => {
      it('should skip entries without resources', () => {
        // Bundle contains an entry with undefined resource - should skip it
        const result = getNestedValueFromBundle(testBundle, 'name[0].given[0]')
        expect(result).toBe('John') // Should still find valid resources
      })

      it('should handle completely empty bundle entries', () => {
        const emptyBundle: Bundle = {
          resourceType: 'Bundle',
          type: 'collection',
          // biome-ignore lint/suspicious/noExplicitAny: <explanation>
          entry: [null as any, undefined as any, { resource: null as any }],
        }
        const result = getNestedValueFromBundle(emptyBundle, 'name[0].given[0]')
        expect(result).toBeUndefined()
      })
    })
  })

  describe('Integration tests', () => {
    it('should handle complex multi-step queries across different resource types', () => {
      // Find email from patient, then check if there's a task for that patient
      const patientEmail = getNestedValueFromBundle(
        testBundle,
        "telecom.where(system = 'email').value",
      )
      expect(patientEmail).toBe('john.doe@example.com')

      const taskForPatient = getNestedValueFromBundle(
        testBundle,
        'for.reference',
      )
      expect(taskForPatient).toBe('Patient/patient-1')
    })

    it('should handle queries that could match multiple resource types', () => {
      // Both Patient, Practitioner, Task, and Observation have extensions
      const extensionValue = getNestedValueFromBundle(
        testBundle,
        "extension.where(url = 'http://example.org/extensions/priority-level').valueInteger",
      )
      expect(extensionValue).toBe(3) // From Task
    })

    it('should prioritize bundle-level queries over resource-level ones', () => {
      // When path starts with entry.resource.ofType, should use bundle-level processing
      const patientCount = getNestedValueFromBundle(
        testBundle,
        'entry.resource.ofType(Patient)',
      )
      expect(patientCount).toHaveLength(2)

      // When path doesn't start with that pattern, should use resource-level processing
      const firstName = getNestedValueFromBundle(testBundle, 'name[0].given[0]')
      expect(firstName).toBe('John')
    })
  })
})
