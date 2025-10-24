import type { Bundle, BundleEntry } from '@medplum/fhirtypes'
import { resolveDateFilter } from './dynamic-date-filter'
import {
  getNestedValueFromBundle,
  isMatchingFhirPathCondition,
} from './fhir-path'
import type { Filter } from '@/types/panel'
import type { Sort } from '@/types/panel'
import type { Column } from '@/types/panel'

function parseDateRange(filterValue: string) {
  const resolved = resolveDateFilter(filterValue)
  if (!resolved.includes('#')) return null

  const [from, to] = resolved.split('#').map((s) => (s ? new Date(s) : null))
  if (from && to && from.getTime() === to.getTime()) {
    to.setHours(23, 59, 59, 999)
  }
  return { from, to }
}

export const filteredAndSortedData = (
  tableData: BundleEntry[],
  filters: Filter[],
  sortConfig: Sort,
  allColumns: Column[],
  crossColumnSearchTerm?: string,
): BundleEntry[] => {
  if (!filters?.length && !sortConfig && !crossColumnSearchTerm)
    return tableData

  const valueCache = new Map<BundleEntry, Record<string, string>>()
  for (const row of tableData) {
    const values: Record<string, string> = {}
    for (const col of allColumns) {
      values[col.id] = getNestedValueFromBundle(
        row.resource as Bundle,
        col.sourceField ?? '',
      )
    }
    valueCache.set(row, values)
  }

  const activeFilters = filters
    .filter((f) => f.value?.trim() && f.columnId !== '__cross_column_search__')
    .map((f) => ({
      ...f,
      valueLower: f.value.toLowerCase(),
      parsedRange: f.columnId && f.value ? parseDateRange(f.value) : null,
    }))

  let processedData = tableData

  // Apply regular column filters
  if (activeFilters.length > 0) {
    processedData = processedData.filter((row) =>
      activeFilters.every((filter) => {
        const column = allColumns.find((c) => c.id === filter.columnId)
        if (!column) return true
        const cellValue = valueCache.get(row)?.[column.id]
        if (cellValue == null) return false

        if (column.type === 'date' || column.type === 'datetime') {
          const { from, to } = filter.parsedRange ?? {}
          const cellDate = new Date(cellValue)
          return (!from || cellDate >= from) && (!to || cellDate <= to)
        }

        return String(cellValue).toLowerCase().includes(filter.valueLower)
      }),
    )
  }

  // Apply cross-column search
  if (crossColumnSearchTerm?.trim()) {
    const searchTerm = crossColumnSearchTerm.toLowerCase()
    processedData = processedData.filter((row) => {
      const values = valueCache.get(row)
      if (!values) return false

      return Object.values(values).some((value) =>
        String(value).toLowerCase().includes(searchTerm),
      )
    })
  }

  if (sortConfig) {
    const column = allColumns.find((c) => c.id === sortConfig.columnId)
    if (column) {
      processedData.sort((a, b) => {
        const aValue = valueCache.get(a)?.[column.id]
        const bValue = valueCache.get(b)?.[column.id]
        if (aValue == null) return 1
        if (bValue == null) return -1
        let cmp = 0
        if (column.type === 'number') cmp = Number(aValue) - Number(bValue)
        else if (column.type === 'date' || column.type === 'datetime')
          cmp = new Date(aValue).getTime() - new Date(bValue).getTime()
        else cmp = String(aValue).localeCompare(String(bValue))
        return sortConfig.direction === 'desc' ? -cmp : cmp
      })
    }
  }

  return processedData
}
