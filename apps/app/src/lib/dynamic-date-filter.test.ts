import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  parseDateFilter,
  resolveDynamicDateFilter,
  resolveDateFilter,
  getDynamicDateLabel,
  isDynamicDateFilter,
  type DynamicDateFilter,
} from './dynamic-date-filter'

// Mock the current date to ensure consistent test results
const mockDate = new Date('2024-01-15T12:00:00Z')
vi.setSystemTime(mockDate)

describe('Dynamic Date Filter', () => {
  describe('parseDateFilter', () => {
    it('should parse dynamic date filters', () => {
      expect(parseDateFilter('@today')).toEqual({
        type: 'dynamic',
        reference: 'today',
      })

      expect(parseDateFilter('@tomorrow')).toEqual({
        type: 'dynamic',
        reference: 'tomorrow',
      })

      expect(parseDateFilter('@yesterday')).toEqual({
        type: 'dynamic',
        reference: 'yesterday',
      })
    })

    it('should parse static date filters', () => {
      expect(parseDateFilter('2024-01-15#2024-01-15')).toEqual({
        type: 'static',
        value: '2024-01-15#2024-01-15',
      })
    })
  })

  describe('resolveDynamicDateFilter', () => {
    it('should resolve today filter', () => {
      const filter: DynamicDateFilter = { type: 'dynamic', reference: 'today' }
      expect(resolveDynamicDateFilter(filter)).toBe('2024-01-15#2024-01-15')
    })

    it('should resolve tomorrow filter', () => {
      const filter: DynamicDateFilter = {
        type: 'dynamic',
        reference: 'tomorrow',
      }
      expect(resolveDynamicDateFilter(filter)).toBe('2024-01-16#2024-01-16')
    })

    it('should resolve yesterday filter', () => {
      const filter: DynamicDateFilter = {
        type: 'dynamic',
        reference: 'yesterday',
      }
      expect(resolveDynamicDateFilter(filter)).toBe('2024-01-14#2024-01-14')
    })

    it('should resolve this week filter', () => {
      const filter: DynamicDateFilter = {
        type: 'dynamic',
        reference: 'this_week',
      }
      // January 15, 2024 is a Monday, so this week should be Jan 15-21
      expect(resolveDynamicDateFilter(filter)).toBe('2024-01-15#2024-01-21')
    })
  })

  describe('resolveDateFilter', () => {
    it('should resolve dynamic filters', () => {
      expect(resolveDateFilter('@today')).toBe('2024-01-15#2024-01-15')
      expect(resolveDateFilter('@tomorrow')).toBe('2024-01-16#2024-01-16')
    })

    it('should return static filters unchanged', () => {
      expect(resolveDateFilter('2024-01-15#2024-01-15')).toBe(
        '2024-01-15#2024-01-15',
      )
    })
  })

  describe('getDynamicDateLabel', () => {
    it('should return human-readable labels', () => {
      expect(getDynamicDateLabel('today')).toBe('Today')
      expect(getDynamicDateLabel('tomorrow')).toBe('Tomorrow')
      expect(getDynamicDateLabel('yesterday')).toBe('Yesterday')
      expect(getDynamicDateLabel('this_week')).toBe('This Week')
    })
  })

  describe('isDynamicDateFilter', () => {
    it('should identify dynamic filters', () => {
      expect(isDynamicDateFilter('@today')).toBe(true)
      expect(isDynamicDateFilter('@tomorrow')).toBe(true)
      expect(isDynamicDateFilter('@yesterday')).toBe(true)
    })

    it('should identify static filters', () => {
      expect(isDynamicDateFilter('2024-01-15#2024-01-15')).toBe(false)
      expect(isDynamicDateFilter('2024-01-15')).toBe(false)
      expect(isDynamicDateFilter('some text')).toBe(false)
    })
  })
})
