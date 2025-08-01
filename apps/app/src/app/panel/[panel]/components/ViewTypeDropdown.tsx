'use client'
import { cn } from '@/lib/utils'
import { CheckSquare, ChevronDown, Users } from 'lucide-react'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { ViewType } from '@/types/panel'

interface ViewTypeDropdownProps {
  currentView: ViewType
  onViewChange: (view: ViewType) => void
}

export default function ViewTypeDropdown({
  currentView,
  onViewChange,
}: ViewTypeDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 })
  const dropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  const getViewContent = (view: ViewType) => {
    return view === 'patient' ? (
      <>
        <Users className="h-3.5 w-3.5 mr-2 text-gray-500" /> Patient View{' '}
      </>
    ) : (
      <>
        <CheckSquare className="h-3.5 w-3.5 mr-2 text-gray-500" /> Task View
      </>
    )
  }

  const updateDropdownPosition = useCallback(() => {
    if (buttonRef.current && isOpen) {
      const rect = buttonRef.current.getBoundingClientRect()
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
      })
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen) {
      updateDropdownPosition()
    }
  }, [isOpen, updateDropdownPosition])

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
      const rect = buttonRef.current.getBoundingClientRect()
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
      })
    }
    setIsOpen(!isOpen)
  }

  const onViewTypeSelected = (view: 'task' | 'patient') => {
    onViewChange(view)
    setIsOpen(false)
  }

  if (!mounted) return null

  const dropdownContent = isOpen ? (
    <div
      ref={dropdownRef}
      className="fixed z-50 bg-white border border-gray-200 rounded-md shadow-lg w-52"
      style={{
        top: `${dropdownPosition.top}px`,
        left: `${dropdownPosition.left}px`,
      }}
    >
      <div className="p-2">
        <div
          className={cn(
            'flex items-center w-full px-3 py-2 text-xs font-normal text-left hover:bg-gray-50 cursor-pointer rounded',
            currentView === 'patient'
              ? 'bg-gray-50 text-blue-500'
              : 'text-gray-700',
          )}
          onClick={() => onViewTypeSelected('patient')}
          onKeyDown={(e) => {
            if (e.key === ' ') {
              e.stopPropagation()
              onViewTypeSelected('patient')
            }
          }}
        >
          {getViewContent('patient')}
        </div>
        <div
          className={cn(
            'flex items-center w-full px-3 py-2 text-xs font-normal text-left hover:bg-gray-50 cursor-pointer rounded',
            currentView === 'task'
              ? 'bg-gray-50 text-blue-500'
              : 'text-gray-700',
          )}
          onClick={() => onViewTypeSelected('task')}
          onKeyDown={(e) => {
            if (e.key === ' ') {
              e.stopPropagation()
              onViewTypeSelected('task')
            }
          }}
        >
          {getViewContent('task')}
        </div>
      </div>
    </div>
  ) : null

  return (
    <>
      <button
        type="button"
        ref={buttonRef}
        onClick={toggleDropdown}
        className="btn btn-sm"
      >
        {getViewContent(currentView)}
        <ChevronDown className="h-3.5 w-3.5 ml-2 text-gray-400" />
      </button>
      {dropdownContent && createPortal(dropdownContent, document.body)}
    </>
  )
}
