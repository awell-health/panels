'use client'

import { Filter, SortAsc, ChevronDown, X } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { Filter as FilterType, Sort, Column } from '@/types/panel'
import { cn } from '@/lib/utils'

interface FilterSortIndicatorsProps {
  filters: FilterType[]
  sort: Sort | null | undefined
  columns: Column[]
  allColumns: Column[]
  onFiltersChange: (filters: FilterType[]) => void
  onSortUpdate: (sort: Sort | undefined) => void
  className?: string
  canEdit: boolean
}

export function FilterSortIndicators({
  filters,
  sort,
  columns,
  allColumns,
  onFiltersChange,
  onSortUpdate,
  className,
  canEdit,
}: FilterSortIndicatorsProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 })

  const hasActiveFiltersOrSort = filters.length > 0 || sort

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  if (!hasActiveFiltersOrSort) {
    return null
  }

  const getColumnName = (columnId: string): string => {
    const column = allColumns.find((col) => col.id === columnId)
    return column?.name || `Unknown Column (${columnId})`
  }

  const formatFilterValue = (filter: FilterType): string => {
    if (filter.value.includes('#') || filter.value.includes(' - ')) {
      const delimiter = filter.value.includes('#') ? '#' : ' - '
      const [from, to] = filter.value.split(delimiter)
      if (from && to) {
        return `${from.trim()} to ${to.trim()}`
      }
    }

    if (filter.value.length > 20) {
      return `${filter.value.substring(0, 17)}...`
    }

    return filter.value
  }

  const buildButtonText = (): string => {
    const parts: string[] = []

    if (filters.length > 0) {
      parts.push(`${filters.length} filter${filters.length > 1 ? 's' : ''}`)
    }

    if (sort) {
      const columnName = getColumnName(sort.columnId)
      const direction = sort.direction === 'asc' ? '↑' : '↓'
      parts.push(`${columnName} ${direction}`)
    }

    return parts.join(', ')
  }

  const removeFilter = (filterToRemove: FilterType) => {
    const newFilters = filters.filter(
      (filter) =>
        filter.columnId !== filterToRemove.columnId ||
        filter.value !== filterToRemove.value,
    )
    onFiltersChange(newFilters)
  }

  const toggleSortDirection = () => {
    if (!sort) return

    const newDirection = sort.direction === 'asc' ? 'desc' : 'asc'
    onSortUpdate({
      ...sort,
      direction: newDirection,
    })
  }

  const toggleDropdown = () => {
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
      })
    }
    setIsOpen(!isOpen)
  }

  const dropdownContent =
    isOpen && mounted ? (
      <div
        ref={dropdownRef}
        className="fixed z-50 bg-white border border-gray-200 rounded-md shadow-lg min-w-80 max-w-96"
        style={{
          top: `${dropdownPosition.top}px`,
          left: `${dropdownPosition.left}px`,
        }}
      >
        <div className="p-2">
          {/* Filters */}
          {filters.length > 0 && (
            <div className="mb-3">
              <div className="text-xs text-gray-500 mb-2">Filters:</div>
              <div className="space-y-2 text-xs">
                {filters.map((filter, index) => {
                  const columnName = getColumnName(filter.columnId)
                  const displayValue = formatFilterValue(filter)

                  return (
                    <div
                      key={`${filter.columnId}-${filter.value}-${index}`}
                      className="flex items-center justify-between p-1 bg-gray-50 rounded border border-gray-200"
                    >
                      <div className="flex items-center gap-2 text-xs">
                        <Filter className="h-3 w-3" />
                        <span className="font-medium">{columnName}</span>
                        <span className="text-gray-500">=</span>
                        <span>{displayValue}</span>
                      </div>
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => removeFilter(filter)}
                          className="p-1 hover:bg-gray-200 rounded text-gray-600 hover:text-gray-800"
                          aria-label={`Remove filter: ${columnName} = ${displayValue}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Sort */}
          {sort && (
            <div>
              <div className="text-xs text-gray-500 mb-2">Sorting:</div>
              <div className="flex items-center justify-between p-1 bg-gray-50 rounded border border-gray-200">
                <div className="flex items-center gap-2 text-xs">
                  <SortAsc className="h-3 w-3" />
                  <span className="font-medium">
                    {getColumnName(sort.columnId)}
                  </span>
                  <button
                    type="button"
                    onClick={toggleSortDirection}
                    className="text-gray-600 hover:text-gray-800 px-1 py-0.5 rounded hover:bg-gray-100"
                  >
                    ({sort.direction === 'asc' ? 'ascending' : 'descending'})
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    ) : null

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggleDropdown}
        className={cn('btn btn-sm btn-accent min-w-32', className)}
      >
        {filters.length > 0 && <Filter className="h-3 w-3" />}
        {sort && <SortAsc className="h-3 w-3" />}
        <span>{buildButtonText()}</span>
        <ChevronDown
          className={cn('h-3 w-3 transition-transform', isOpen && 'rotate-180')}
        />
      </button>
      {dropdownContent && createPortal(dropdownContent, document.body)}
    </>
  )
}
