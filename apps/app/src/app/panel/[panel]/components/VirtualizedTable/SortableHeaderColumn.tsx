'use client'

import { cn } from '@/lib/utils'
import type { Column, Sort } from '@/types/panel'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  ArrowDown,
  ArrowUp,
  Calendar,
  GripVertical,
  Hash,
  Lock,
  MoreVertical,
  Text,
  ToggleLeft,
} from 'lucide-react'
import { useRef, useState } from 'react'
import { ColumnMenu } from '../ColumnMenu'
import { useACL } from '../../../../../contexts/ACLContext'
import { useParams } from 'next/navigation'

interface SortableHeaderColumnProps {
  column: Column
  index: number
  style: React.CSSProperties
  sortConfig?: Sort | undefined
  onSort: () => void
  filterValue: string
  onFilter: (value: string) => void
  onColumnUpdate: (updates: Partial<Column>) => void
  onColumnDelete?: (columnId: string) => void
  isLocked?: boolean // Current locked state in the active context
}

export function SortableHeaderColumn({
  column,
  index,
  style,
  sortConfig,
  onSort,
  filterValue,
  onFilter,
  onColumnUpdate,
  onColumnDelete,
  isLocked = false,
}: SortableHeaderColumnProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 })
  const headerRef = useRef<HTMLDivElement>(null)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({
    id: column.id,
  })

  const { hasPermission } = useACL()
  const { view, panel } = useParams()

  const canEdit = view
    ? hasPermission('view', view as string, 'editor')
    : panel
      ? hasPermission('panel', panel as string, 'editor')
      : false

  const sortableStyle: React.CSSProperties = {
    ...style,
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 1,
  }

  // Get the appropriate icon based on column type
  const getTypeIcon = () => {
    switch (column.type) {
      case 'date':
      case 'datetime':
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
    if (!sortConfig || sortConfig.columnId !== column.id) return null
    const arrowClassName = 'h-3 w-3 mr-2 text-accent'
    return sortConfig.direction === 'asc' ? (
      <ArrowUp className={arrowClassName} />
    ) : (
      <ArrowDown className={arrowClassName} />
    )
  }

  // Toggle menu open/closed and calculate position
  const toggleMenu = (e: React.MouseEvent) => {
    e.stopPropagation()

    if (isMenuOpen) {
      setIsMenuOpen(false)
      return
    }

    if (headerRef.current) {
      const rect = headerRef.current.getBoundingClientRect()
      const menuWidth = 264
      const isLeftmostColumn = rect.left < menuWidth
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

  // Enhanced column with sample source and options
  const enhancedColumn = {
    ...column,
    source: 'Metriport',
    options:
      column.type === 'boolean'
        ? [
            { value: 'True', color: '#10B981' },
            { value: 'False', color: '#EF4444' },
          ]
        : undefined,
  }

  return (
    <div
      ref={(node) => {
        setNodeRef(node)
        if (headerRef) {
          headerRef.current = node
        }
      }}
      style={sortableStyle}
      className={cn(
        'absolute top-0 bg-white text-xs font-normal text-gray-700 p-2 select-none flex items-center',
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

      <div className="flex items-center justify-between h-full flex-1 shrink-0">
        {/* Drag handle or Lock icon */}
        <button
          type="button"
          className={cn(
            'btn btn-xs btn-ghost btn-header mr-2 ml-1 text-xs',
            column.properties?.display?.locked
              ? 'cursor-default'
              : isDragging
                ? 'cursor-grabbing bg-gray-100'
                : 'cursor-grab',
          )}
          {...(column.properties?.display?.locked || !canEdit ? {} : listeners)}
          aria-label={
            column.properties?.display?.locked
              ? "Locked columns can't be dragged"
              : 'Drag to reorder column'
          }
          title={
            column.properties?.display?.locked
              ? "Locked columns can't be dragged"
              : 'Drag to reorder column'
          }
        >
          {column.properties?.display?.locked && (
            <Lock className="h-3 w-3 text-yellow-500" />
          )}
          {canEdit && <GripVertical className="h-3 w-3 text-gray-400" />}
        </button>

        {/* Column content - clickable for sorting */}
        <button
          type="button"
          className={cn(
            'btn btn-xs btn-ghost btn-header flex-1 justify-start text-xs shrink-0',
            isDragging && 'pointer-events-none',
          )}
          onClick={isDragging || !canEdit ? undefined : onSort}
          disabled={isDragging}
          aria-label={`Sort by ${column.name}`}
        >
          {getTypeIcon()}
          <span className="truncate text-xs">{column.name}</span>
          <span className="text-xs text-gray-500">{getSortIndicator()}</span>
        </button>

        {/* Menu controls */}
        <div
          className={cn(
            'flex items-center shrink-0',
            isDragging && 'pointer-events-none',
          )}
        >
          <button
            type="button"
            className={cn(
              'btn btn-xs btn-ghost btn-header text-xs shrink-0',
              filterValue ? 'text-blue-500 bg-blue-50' : 'text-gray-500',
            )}
            onClick={isDragging || !canEdit ? undefined : toggleMenu}
            disabled={isDragging}
            aria-label="Column options and filter"
          >
            <svg
              aria-label="Column options and filter"
              xmlns="http://www.w3.org/2000/svg"
              width="9"
              height="9"
              viewBox="0 0 24 24"
              fill={filterValue ? 'currentColor' : 'none'}
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <title>Column options and filter</title>
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
            {canEdit && <MoreVertical className="h-3 w-3" />}
          </button>
        </div>
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
        sortConfig={sortConfig || null}
        filterValue={filterValue}
        onFilter={onFilter}
        onColumnUpdate={onColumnUpdate}
        onColumnDelete={onColumnDelete}
        isLocked={isLocked}
      />
    </div>
  )
}
