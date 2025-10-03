'use client'

import {
  isDynamicDateFilter,
  type DynamicDateReference,
} from '@/lib/dynamic-date-filter'

interface DynamicDateFiltersProps {
  currentFilterValue?: string
  onFilterSelect: (filterValue: string) => void
}

export function DynamicDateFilters({
  currentFilterValue,
  onFilterSelect,
}: DynamicDateFiltersProps) {
  const dynamicFilters: Array<{
    value: string
    label: string
    reference: DynamicDateReference
    title: string
  }> = [
    {
      value: '@yesterday',
      label: 'Yesterday',
      reference: 'yesterday',
      title: 'Set filter to yesterday (updates daily)',
    },
    {
      value: '@today',
      label: 'Today',
      reference: 'today',
      title: 'Set filter to today (updates daily)',
    },
    {
      value: '@tomorrow',
      label: 'Tomorrow',
      reference: 'tomorrow',
      title: 'Set filter to tomorrow (updates daily)',
    },
    {
      value: '@this_week',
      label: 'This Week',
      reference: 'this_week',
      title: 'Set filter to this week (updates weekly)',
    },
  ]

  const isFilterSelected = (filterValue: string): boolean => {
    if (!currentFilterValue) return false

    // Check if current filter is a dynamic filter and matches this one
    if (isDynamicDateFilter(currentFilterValue)) {
      return currentFilterValue === filterValue
    }

    return false
  }

  const getButtonClassName = (filterValue: string): string => {
    const baseClass = 'btn btn-xs'
    const isSelected = isFilterSelected(filterValue)

    if (isSelected) {
      return `${baseClass} btn-primary`
    }

    return `${baseClass}`
  }

  return (
    <div className="space-y-1 mt-2">
      <div className="text-xs text-gray-500 font-medium">Dynamic Dates</div>
      <div className="grid grid-cols-2 gap-1">
        {dynamicFilters.map((filter) => (
          <button
            key={filter.value}
            type="button"
            className={getButtonClassName(filter.value)}
            onClick={() => onFilterSelect(filter.value)}
            title={filter.title}
          >
            {filter.label}
          </button>
        ))}
      </div>
    </div>
  )
}
