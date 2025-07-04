import { describe, it, expect } from 'vitest'
import { deduplicateDataPoints } from './enrich-with-awell-datapoints.js'

// Define the DataPoint interface for testing
interface DataPoint {
  serialized_value: string
  data_point_definition_id: string
  valueType: string
  date: string
}

describe('deduplicateDataPoints', () => {
  it('should return empty array for empty input', () => {
    const result = deduplicateDataPoints([])
    expect(result).toEqual([])
  })

  it('should keep the latest data point when same definition ID has different dates', () => {
    const olderDataPoint: DataPoint = {
      serialized_value: 'old-value',
      data_point_definition_id: 'def-1',
      valueType: 'string',
      date: '2023-01-01T10:00:00Z',
    }

    const newerDataPoint: DataPoint = {
      serialized_value: 'new-value',
      data_point_definition_id: 'def-1',
      valueType: 'string',
      date: '2023-01-02T10:00:00Z',
    }

    const result = deduplicateDataPoints([olderDataPoint, newerDataPoint])
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual(newerDataPoint)
  })

  it('should keep data points with different definition IDs', () => {
    const dataPoint1: DataPoint = {
      serialized_value: 'value1',
      data_point_definition_id: 'def-1',
      valueType: 'string',
      date: '2023-01-01T10:00:00Z',
    }

    const dataPoint2: DataPoint = {
      serialized_value: 'value2',
      data_point_definition_id: 'def-2',
      valueType: 'string',
      date: '2023-01-01T10:00:00Z',
    }

    const result = deduplicateDataPoints([dataPoint1, dataPoint2])
    expect(result).toHaveLength(2)
    expect(result).toContainEqual(dataPoint1)
    expect(result).toContainEqual(dataPoint2)
  })

  it('should handle complex scenario with multiple definition IDs and duplicates', () => {
    const dataPoints: DataPoint[] = [
      // def-1: older
      {
        serialized_value: 'old-value-1',
        data_point_definition_id: 'def-1',
        valueType: 'string',
        date: '2023-01-01T10:00:00Z',
      },
      // def-1: newer
      {
        serialized_value: 'new-value-1',
        data_point_definition_id: 'def-1',
        valueType: 'string',
        date: '2023-01-03T10:00:00Z',
      },
      // def-2: older
      {
        serialized_value: 'old-value-2',
        data_point_definition_id: 'def-2',
        valueType: 'string',
        date: '2023-01-01T10:00:00Z',
      },
      // def-2: newer
      {
        serialized_value: 'new-value-2',
        data_point_definition_id: 'def-2',
        valueType: 'string',
        date: '2023-01-02T10:00:00Z',
      },
      // def-3: single entry
      {
        serialized_value: 'value-3',
        data_point_definition_id: 'def-3',
        valueType: 'string',
        date: '2023-01-01T10:00:00Z',
      },
    ]

    const result = deduplicateDataPoints(dataPoints)
    expect(result).toHaveLength(3)

    // Should contain the latest data point for def-1
    expect(result).toContainEqual(dataPoints[1])
    // Should contain the latest data point for def-2
    expect(result).toContainEqual(dataPoints[3])
    // Should contain the single data point for def-3
    expect(result).toContainEqual(dataPoints[4])
  })

  it('should handle data points with same date but different values', () => {
    const dataPoints: DataPoint[] = [
      {
        serialized_value: 'value1',
        data_point_definition_id: 'def-1',
        valueType: 'string',
        date: '2023-01-01T10:00:00Z',
      },
      {
        serialized_value: 'value2',
        data_point_definition_id: 'def-1',
        valueType: 'string',
        date: '2023-01-01T10:00:00Z',
      },
    ]

    const result = deduplicateDataPoints(dataPoints)
    expect(result).toHaveLength(1)
    // Should keep the first one when dates are identical
    expect(result[0]).toEqual(dataPoints[0])
  })
})
