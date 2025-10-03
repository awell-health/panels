/**
 * Dynamic Date Filter Utilities
 *
 * This module provides utilities for handling dynamic date filters that automatically
 * update based on the current date. This allows "Today" filters to always show
 * the current day's data without manual updates.
 */

export type DynamicDateReference =
  | 'today'
  | 'tomorrow'
  | 'yesterday'
  | 'this_week'
  | 'last_week'
  | 'this_month'
  | 'last_month'

export interface DynamicDateFilter {
  type: 'dynamic'
  reference: DynamicDateReference
  offset?: number // Optional offset in days
}

export interface StaticDateFilter {
  type: 'static'
  value: string // YYYY-MM-DD#YYYY-MM-DD format
}

export type DateFilter = DynamicDateFilter | StaticDateFilter

/**
 * Parses a filter value to determine if it's a dynamic date reference
 */
export function parseDateFilter(filterValue: string): DateFilter {
  // Check if it's a dynamic date reference
  if (filterValue.startsWith('@')) {
    const reference = filterValue.substring(1) as DynamicDateReference
    return {
      type: 'dynamic',
      reference,
    }
  }

  // Default to static filter
  return {
    type: 'static',
    value: filterValue,
  }
}

/**
 * Resolves a dynamic date filter to a static date range
 */
export function resolveDynamicDateFilter(filter: DynamicDateFilter): string {
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]

  switch (filter.reference) {
    case 'today':
      return `${todayStr}#${todayStr}`

    case 'tomorrow': {
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)
      const tomorrowStr = tomorrow.toISOString().split('T')[0]
      return `${tomorrowStr}#${tomorrowStr}`
    }

    case 'yesterday': {
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = yesterday.toISOString().split('T')[0]
      return `${yesterdayStr}#${yesterdayStr}`
    }

    case 'this_week': {
      const startOfWeek = new Date(today)
      const dayOfWeek = startOfWeek.getDay()
      const diff =
        startOfWeek.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1) // Monday
      startOfWeek.setDate(diff)

      const endOfWeek = new Date(startOfWeek)
      endOfWeek.setDate(endOfWeek.getDate() + 6) // Sunday

      return `${startOfWeek.toISOString().split('T')[0]}#${endOfWeek.toISOString().split('T')[0]}`
    }

    case 'last_week': {
      const startOfLastWeek = new Date(today)
      const dayOfWeek = startOfLastWeek.getDay()
      const diff =
        startOfLastWeek.getDate() - dayOfWeek - 6 + (dayOfWeek === 0 ? -6 : 1) // Monday of last week
      startOfLastWeek.setDate(diff)

      const endOfLastWeek = new Date(startOfLastWeek)
      endOfLastWeek.setDate(endOfLastWeek.getDate() + 6) // Sunday of last week

      return `${startOfLastWeek.toISOString().split('T')[0]}#${endOfLastWeek.toISOString().split('T')[0]}`
    }

    case 'this_month': {
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)

      return `${startOfMonth.toISOString().split('T')[0]}#${endOfMonth.toISOString().split('T')[0]}`
    }

    case 'last_month': {
      const startOfLastMonth = new Date(
        today.getFullYear(),
        today.getMonth() - 1,
        1,
      )
      const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0)

      return `${startOfLastMonth.toISOString().split('T')[0]}#${endOfLastMonth.toISOString().split('T')[0]}`
    }

    default:
      // Fallback to today
      return `${todayStr}#${todayStr}`
  }
}

/**
 * Resolves any date filter (dynamic or static) to a static date range
 */
export function resolveDateFilter(filterValue: string): string {
  const filter = parseDateFilter(filterValue)

  if (filter.type === 'dynamic') {
    return resolveDynamicDateFilter(filter)
  }

  return filter.value
}

/**
 * Gets a human-readable label for a dynamic date filter
 */
export function getDynamicDateLabel(reference: DynamicDateReference): string {
  switch (reference) {
    case 'today':
      return 'Today'
    case 'tomorrow':
      return 'Tomorrow'
    case 'yesterday':
      return 'Yesterday'
    case 'this_week':
      return 'This Week'
    case 'last_week':
      return 'Last Week'
    case 'this_month':
      return 'This Month'
    case 'last_month':
      return 'Last Month'
    default:
      return 'Dynamic Date'
  }
}

/**
 * Checks if a filter value represents a dynamic date filter
 */
export function isDynamicDateFilter(filterValue: string): boolean {
  return filterValue.startsWith('@')
}
