'use client'

import type { Column, Sort } from '@/types/panel'
import { ConfirmDeleteModal } from '@/components/ConfirmDeleteModal'
import { ArrowUpDown, Calendar, Hash, Text, ToggleLeft, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { format } from 'date-fns'

type ColumnMenuProps = {
  column: Column
  isOpen: boolean
  onClose: () => void
  position: { top: number; left: number }
  onSort: () => void
  sortConfig: Sort | null
  filterValue: string
  onFilter: (value: string) => void
  onColumnUpdate?: (updates: Partial<Column>) => void
  onColumnDelete?: (columnId: string) => void
}

export function ColumnMenu({
  column,
  isOpen,
  onClose,
  position,
  onSort,
  sortConfig,
  filterValue,
  onFilter,
  onColumnUpdate,
  onColumnDelete,
}: ColumnMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const [localFilterValue, setLocalFilterValue] = useState(filterValue)
  const [localDateFilterValue, setLocalDateFilterValue] = useState(() => {
    // Handle both '#' and ' - ' delimiters for backward compatibility
    const delimiter = filterValue.includes('#') ? '#' : ' - '
    const parts = filterValue.split(delimiter)
    return {
      from: parts[0] || '',
      to: parts[1] || '',
    }
  })

  const [localColumnKey, setLocalColumnKey] = useState(column.sourceField)
  const [localColumnName, setLocalColumnName] = useState(column.name)
  const [localColumnDescription, setLocalColumnDescription] = useState(
    column.metadata?.description,
  )
  const [localColumnType, setLocalColumnType] = useState(column.type)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Update local values when props change
  useEffect(() => {
    setLocalFilterValue(filterValue)
    setLocalColumnKey(column.sourceField)
    setLocalColumnName(column.name)
    setLocalColumnDescription(column.metadata?.description)
    setLocalColumnType(column.type)
  }, [filterValue, column])

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement
      // Don't close if clicking on any input element or if modal is open
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        showDeleteConfirm
      ) {
        return
      }
      if (menuRef.current && !menuRef.current.contains(target)) {
        event.stopPropagation()
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose, showDeleteConfirm])

  // Get sort label based on column type and current sort state
  const getSortLabel = () => {
    const isSorted = sortConfig?.columnId === column.id
    const isAscending = sortConfig?.direction === 'asc'

    switch (column.type) {
      case 'number':
        return isSorted
          ? isAscending
            ? 'Sort large → small'
            : 'Sort small → large'
          : 'Sort small → large'
      case 'date':
        return isSorted
          ? isAscending
            ? 'Sort new → old'
            : 'Sort old → new'
          : 'Sort old → new'
      case 'boolean':
        return isSorted
          ? isAscending
            ? 'Sort true → false'
            : 'Sort false → true'
          : 'Sort false → true'
      default:
        return isSorted
          ? isAscending
            ? 'Sort Z → A'
            : 'Sort A → Z'
          : 'Sort A → Z'
    }
  }

  // Get type icon based on column type
  const getTypeIcon = () => {
    switch (column.type) {
      case 'date':
        return <Calendar className="h-3.5 w-3.5 mr-2 text-gray-500" />
      case 'number':
        return <Hash className="h-3.5 w-3.5 mr-2 text-gray-500" />
      case 'boolean':
        return <ToggleLeft className="h-3.5 w-3.5 mr-2 text-gray-500" />
      default:
        return <Text className="h-3.5 w-3.5 mr-2 text-gray-500" />
    }
  }

  // Handle filter input changes
  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalFilterValue(e.target.value)
  }

  // Apply filter and close menu
  const handleFilterApply = () => {
    if (column.type === 'date') {
      const from = localDateFilterValue.from || ''
      const to = localDateFilterValue.to || ''
      // Only apply filter if at least one date is provided
      if (from || to) {
        onFilter(`${from}#${to}`)
      }
    } else {
      onFilter(localFilterValue)
    }
    onClose()
  }

  // Clear filter
  const handleFilterClear = () => {
    onFilter('')
    onClose()
  }

  const handleDeleteColumnConfirm = () => {
    onColumnDelete?.(column.id)
    setShowDeleteConfirm(false)
    onClose()
  }

  // Don't unmount the component if the delete confirmation modal is open
  if (!isOpen && !showDeleteConfirm) return null

  const renderFilterInput = () => {
    let input = (
      <input
        type="text"
        value={localFilterValue}
        onChange={handleFilterChange}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            handleFilterApply()
          }
        }}
        onClick={(e) => e.stopPropagation()}
        className="flex-1 px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
        placeholder="Filter..."
      />
    )

    if (column.type === 'date') {
      input = (
        <div className="flex flex-col gap-2 w-full">
          <div className="flex gap-2 items-center">
            <label htmlFor="from" className="text-xs text-gray-500 w-10">
              From
            </label>
            <input
              type="date"
              name="from"
              className="flex-1 px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              value={localDateFilterValue?.from}
              onChange={(e) =>
                setLocalDateFilterValue({
                  ...localDateFilterValue,
                  from: e.target.value,
                })
              }
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleFilterApply()
                }
              }}
            />
          </div>
          <div className="flex gap-2 items-center">
            <label htmlFor="to" className="text-xs text-gray-500 w-10">
              To
            </label>
            <input
              type="date"
              name="to"
              className="flex-1 px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              value={localDateFilterValue?.to}
              onChange={(e) =>
                setLocalDateFilterValue({
                  ...localDateFilterValue,
                  to: e.target.value,
                })
              }
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleFilterApply()
                }
              }}
            />
          </div>
        </div>
      )
    }

    return (
      <div className="flex gap-2 items-end">
        {input}
        <button
          type="button"
          className="btn btn-xs btn-primary"
          onClick={handleFilterApply}
        >
          Apply
        </button>
      </div>
    )
  }

  const menuContent = (
    <div
      ref={menuRef}
      className="fixed z-50 bg-white border border-gray-200 rounded-md shadow-md w-64"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
    >
      {/* Header with close button */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
        <div className="flex items-center">
          {getTypeIcon()}
          <span className="text-xs font-medium text-gray-700">
            {column.name}
          </span>
        </div>
        <button
          type="button"
          className="btn btn-xs btn-ghost btn-circle"
          onClick={onClose}
          aria-label="Close menu"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
      <div className="py-1">
        {/* Sort option */}
        {/* biome-ignore lint/a11y/useButtonType: <explanation> */}
        <button
          className="btn btn-xs btn-ghost w-full justify-start border-b border-gray-100 rounded-none"
          onClick={() => {
            onSort()
            onClose()
          }}
        >
          <ArrowUpDown className="h-3.5 w-3.5 mr-2 text-gray-500" />
          {getSortLabel()}
        </button>

        {/* Filter section */}
        <div className="px-3 py-2 border-b border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <label htmlFor="filter-input" className="text-xs text-gray-500">
              Filter:
            </label>
            {filterValue && (
              <button
                type="button"
                className="btn btn-xs btn-ghost text-blue-500 hover:text-blue-600"
                onClick={handleFilterClear}
              >
                Clear
              </button>
            )}
          </div>
          {renderFilterInput()}
        </div>

        {/* Hide Column Option */}
        <div className="px-3 py-2 border-b border-gray-100">
          <button
            type="button"
            className="btn btn-xs btn-ghost w-full justify-start"
            onClick={() => {
              onColumnUpdate?.({
                id: column.id,
                properties: {
                  display: { visible: false },
                },
              })
              onClose()
            }}
          >
            <svg
              className="h-3.5 w-3.5 mr-2 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-label="Hide Column"
            >
              <title>Hide Column</title>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L8.464 8.464M14.12 14.12l1.415 1.415M14.12 14.12L9.878 9.878m4.242 4.242L8.464 15.536"
              />
            </svg>
            Hide Column
          </button>
        </div>

        {/* Column Properties */}
        <div className="px-3 py-2 border-b border-gray-100">
          <div className="space-y-2">
            <div>
              <label
                htmlFor="column-name"
                className="block text-xs text-gray-500 mb-1"
              >
                Column Name:
              </label>
              <input
                id="column-name"
                type="text"
                value={localColumnName}
                onChange={(e) => setLocalColumnName(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  if (e.key === ' ') {
                    e.stopPropagation()
                  }
                }}
                className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label
                htmlFor="column-description"
                className="block text-xs text-gray-500 mb-1"
              >
                Column Description:
              </label>
              <textarea
                id="column-description"
                value={localColumnDescription}
                onChange={(e) => setLocalColumnDescription(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  if (e.key === ' ') {
                    e.stopPropagation()
                  }
                }}
                className="textarea min-h-[60px] text-xs resize-y w-full p-2 border border-gray-200 rounded"
                placeholder="Enter a description or prompt for this column..."
              />
            </div>
            <div>
              <label
                htmlFor="column-type"
                className="block text-xs text-gray-500 mb-1"
              >
                Column Type:
              </label>
              <select
                id="column-type"
                value={localColumnType}
                onChange={(e) =>
                  setLocalColumnType(e.target.value as Column['type'])
                }
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  if (e.key === ' ') {
                    e.stopPropagation()
                  }
                }}
                className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="text">String</option>
                <option value="number">Number</option>
                <option value="boolean">Boolean</option>
                <option value="date">Date</option>
                <option value="datetime">Datetime</option>
                <option value="select">Select</option>
                <option value="multi_select">Array</option>
                <option value="user">Assignee</option>
              </select>
            </div>
            <div>
              <label
                htmlFor="column-key"
                className="block text-xs text-gray-500 mb-1"
              >
                Column Key:
              </label>
              <input
                id="column-key"
                type="text"
                value={localColumnKey}
                onChange={(e) => setLocalColumnKey(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  if (e.key === ' ') {
                    e.stopPropagation()
                  }
                }}
                className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <button
              type="button"
              className="btn btn-xs btn-primary w-full"
              onClick={() => {
                onColumnUpdate?.({
                  id: column.id,
                  sourceField: localColumnKey,
                  name: localColumnName,
                  type: localColumnType,
                  metadata: {
                    description: localColumnDescription,
                  },
                })
                onClose()
              }}
            >
              Save Changes
            </button>
            {onColumnDelete && (
              <button
                type="button"
                className="btn btn-xs btn-error w-full"
                onClick={() => {
                  setShowDeleteConfirm(true)
                }}
              >
                Delete Column
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )

  // Use portal to render the menu at the document body level
  return createPortal(
    <>
      {menuContent}
      <ConfirmDeleteModal
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false)
        }}
        onConfirm={handleDeleteColumnConfirm}
        title="Delete Column"
        message={`Are you sure you want to delete the column "${column.name}"?`}
      />
    </>,
    document.body,
  )
}
