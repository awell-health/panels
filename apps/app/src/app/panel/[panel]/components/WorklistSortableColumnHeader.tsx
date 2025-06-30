'use client'

import type React from 'react'

import { TableHead } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import type { ColumnDefinition } from '@/types/worklist'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Calendar,
  GripVertical,
  Hash,
  MoreVertical,
  Text,
  ToggleLeft,
} from 'lucide-react'
import { useRef, useState, useCallback } from 'react'
import { ColumnMenu } from './WorklistColumnMenu'

type SortableColumnHeaderProps = {
  column: ColumnDefinition
  index: number
  sortConfig: { key: string; direction: 'asc' | 'desc' } | null
  onSort: () => void
  filterValue: string
  onFilter: (value: string) => void
  onColumnUpdate: (updates: Partial<ColumnDefinition>) => void
}

export function SortableColumnHeader({
  column,
  index,
  sortConfig,
  onSort,
  filterValue,
  onFilter,
  onColumnUpdate,
}: SortableColumnHeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 })
  const [isFilterVisible, setIsFilterVisible] = useState(false)
  const headerRef = useRef<HTMLTableCellElement>(null)
  const filterInputRef = useRef<HTMLInputElement>(null)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({
    id: column.id || `column-${index}`,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    width: column.name === 'Patient Name' ? '140px' : 'auto',
  }

  // Get the appropriate icon based on column type
  const getTypeIcon = () => {
    switch (column.type) {
      case 'date':
        return <Calendar className="h-3.5 w-3.5 mr-1.5 text-gray-500" />
      case 'number':
        return <Hash className="h-3.5 w-3.5 mr-1.5 text-gray-500" />
      case 'boolean':
        return <ToggleLeft className="h-3.5 w-3.5 mr-1.5 text-gray-500" />
      default:
        return <Text className="h-3.5 w-3.5 mr-1.5 text-gray-500" />
    }
  }

  // Get sort indicator
  const getSortIndicator = () => {
    if (!sortConfig || sortConfig.key !== column.key) return null
    return sortConfig.direction === 'asc' ? '↑' : '↓'
  }

  // Toggle menu open/closed and calculate position
  const toggleMenu = (e: React.MouseEvent) => {
    e.stopPropagation()

    // If menu is open, close it
    if (isMenuOpen) {
      setIsMenuOpen(false)
      return
    }

    // If menu is closed, open it and calculate position
    if (headerRef.current) {
      const rect = headerRef.current.getBoundingClientRect()
      const menuWidth = 264 // Menu width (260px) + some margin

      // Check if this is a leftmost column (close to the left edge of the screen)
      const isLeftmostColumn = rect.left < menuWidth

      // For leftmost columns, align menu with left edge of column
      // For other columns, align with right edge but ensure it stays on screen
      const left = isLeftmostColumn
        ? rect.left + window.scrollX
        : Math.max(0, rect.right - menuWidth + window.scrollX)

      setMenuPosition({
        top: rect.bottom + window.scrollY,
        left: left,
      })
      setIsMenuOpen(true)
    }
  }

  // Sample options for demonstration
  const sampleOptions =
    column.type === 'boolean'
      ? [
          { value: 'True', color: '#10B981' }, // green-500
          { value: 'False', color: '#EF4444' }, // red-500
        ]
      : undefined

  // Enhanced column with sample source and options
  const enhancedColumn = {
    ...column,
    source: 'Metriport',
    options: sampleOptions,
  }

  return (
    <TableHead
      ref={(node) => {
        setNodeRef(node)
        if (headerRef) {
          headerRef.current = node
        }
      }}
      style={style}
      className={cn(
        'text-xs font-normal text-gray-700 p-2 border-r border-gray-200 select-none bg-white sticky top-0 shadow-sm',
        isDragging && 'bg-blue-50 border-blue-200 shadow-lg',
        isOver && !isDragging && 'bg-blue-25 border-blue-100',
        'transition-colors duration-150',
      )}
      {...attributes}
    >
      {/* Drop indicator line */}
      {isOver && !isDragging && (
        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-blue-500 z-50" />
      )}

      <div className="flex flex-col">
        <div className="flex items-center justify-between whitespace-nowrap">
          {/* Drag handle - only this area can be used to drag */}
          <button
            type="button"
            className={cn(
              'flex items-center cursor-grab hover:bg-gray-100 rounded px-1 -ml-1 mr-1 border-0 bg-transparent',
              isDragging && 'cursor-grabbing bg-gray-100',
            )}
            {...listeners}
            aria-label="Drag to reorder column"
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                // Keyboard users can use tab to navigate and arrow keys for reordering
              }
            }}
          >
            <GripVertical className="h-3 w-3 text-gray-400" />
          </button>

          {/* Column content - clickable for sorting */}
          <button
            type="button"
            className={cn(
              'flex items-center cursor-pointer hover:text-gray-900 flex-1 border-0 bg-transparent text-left',
              isDragging && 'pointer-events-none',
            )}
            onClick={isDragging ? undefined : onSort}
            disabled={isDragging}
            aria-label={`Sort by ${column.name}`}
          >
            {getTypeIcon()}
            <div className="flex flex-col">
              <span>{column.name}</span>
            </div>
            <span className="ml-1 text-gray-500">{getSortIndicator()}</span>
          </button>

          {/* Menu controls - separate from drag handle */}
          <div
            className={cn(
              'flex items-center',
              isDragging && 'pointer-events-none',
            )}
          >
            {/* Combined filter and menu button */}
            <button
              type="button"
              className={cn(
                'h-5 w-10 px-1 hover:bg-gray-100 rounded-full flex items-center justify-center gap-1',
                filterValue ? 'text-blue-500 bg-blue-20' : 'text-gray-500',
              )}
              onClick={isDragging ? undefined : toggleMenu}
              disabled={isDragging}
              aria-label="Column options and filter"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="9"
                height="9"
                viewBox="0 0 24 24"
                fill={filterValue ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-label="Filter"
              >
                <title>Filter</title>
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
              </svg>
              <MoreVertical className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Filter input */}
      </div>

      {/* Drag handle indicator */}
      {isDragging && (
        <div className="absolute inset-0 bg-gradient-to-r from-blue-100 to-blue-50 opacity-75 pointer-events-none" />
      )}

      {/* Column menu */}
      <ColumnMenu
        column={enhancedColumn}
        isOpen={isMenuOpen && !isDragging}
        onClose={() => setIsMenuOpen(false)}
        position={menuPosition}
        onSort={onSort}
        sortConfig={sortConfig}
        filterValue={filterValue}
        onFilter={onFilter}
        onColumnUpdate={onColumnUpdate}
      />
    </TableHead>
  )
}
