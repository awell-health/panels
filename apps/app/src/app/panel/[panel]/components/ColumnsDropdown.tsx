'use client'

import type { ColumnVisibilityContext } from '@/types/panel'
import { Settings } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

type ColumnsDropdownProps = {
  context: ColumnVisibilityContext
}

export function ColumnsDropdown({ context }: ColumnsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 })
  const dropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // Get columns and visibility from context
  const columns = context.getAllColumns()
  const visibleColumns = context.getVisibleColumns()
  const visibleCount = visibleColumns.length
  const totalCount = columns.length

  useEffect(() => {
    setMounted(true)
  }, [])

  // Update dropdown position when button position changes (due to column visibility changes)
  const updateDropdownPosition = useCallback(() => {
    if (buttonRef.current && isOpen) {
      const rect = buttonRef.current.getBoundingClientRect()
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
      })
    }
  }, [isOpen])

  // Update position when columns change (which affects layout)
  useEffect(() => {
    if (isOpen) {
      updateDropdownPosition()
    }
  }, [isOpen, updateDropdownPosition])

  // Update position on window resize/scroll
  useEffect(() => {
    if (isOpen) {
      const handleResize = () => updateDropdownPosition()
      const handleScroll = () => updateDropdownPosition()

      window.addEventListener('resize', handleResize)
      window.addEventListener('scroll', handleScroll)

      return () => {
        window.removeEventListener('resize', handleResize)
        window.removeEventListener('scroll', handleScroll)
      }
    }
  }, [isOpen, updateDropdownPosition])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
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
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const toggleDropdown = () => {
    if (!isOpen && buttonRef.current) {
      // Set initial position when opening
      const rect = buttonRef.current.getBoundingClientRect()
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
      })
    }
    setIsOpen(!isOpen)
  }

  const handleVisibilityChange = async (columnId: string, visible: boolean) => {
    await context.setVisibility(columnId, visible)
    // Small delay to allow layout to settle before repositioning
    setTimeout(() => {
      updateDropdownPosition()
    }, 10)
  }

  if (!mounted) return null

  const dropdownContent = isOpen ? (
    <div
      ref={dropdownRef}
      className="fixed z-50 bg-white border border-gray-200 rounded-md shadow-lg w-64 max-h-80 overflow-y-auto"
      style={{
        top: `${dropdownPosition.top}px`,
        left: `${dropdownPosition.left}px`,
      }}
    >
      <div className="p-3">
        <div className="text-xs font-medium text-gray-700 mb-3">
          Column Visibility
        </div>
        <div className="space-y-2">
          {columns.map((column) => {
            const isVisible = context.getVisibility(column.id)
            return (
              <label
                key={column.id}
                className="flex items-center cursor-pointer hover:bg-gray-50 p-1 rounded"
              >
                <input
                  type="checkbox"
                  checked={isVisible}
                  onChange={(e) =>
                    handleVisibilityChange(column.id, e.target.checked)
                  }
                  className="h-3 w-3 rounded border-gray-300 mr-3"
                />
                <span
                  className={`text-xs ${isVisible ? 'text-gray-900' : 'text-gray-500'}`}
                >
                  {column.name}
                </span>
              </label>
            )
          })}
        </div>
      </div>
    </div>
  ) : null

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className="btn btn-sm"
        onClick={toggleDropdown}
      >
        <Settings className="mr-1 h-3 w-3" />
        Columns ({visibleCount}/{totalCount})
      </button>
      {dropdownContent && createPortal(dropdownContent, document.body)}
    </>
  )
}
