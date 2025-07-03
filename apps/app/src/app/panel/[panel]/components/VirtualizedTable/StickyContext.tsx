'use client'

import type React from 'react'
import { createContext, useContext } from 'react'
import type { Column, Filter } from '@/types/panel'

interface StickyGridContextValue {
  stickyIndices: number[]
  columns: Column[]
  getColumnWidth: (index: number) => number
  onSort?: (columnKey: string) => void
  sortConfig?: { key: string; direction: 'asc' | 'desc' } | null
  onFilter?: (columnKey: string, value: string) => void
  filters?: Filter[]
  onColumnUpdate?: (updates: Partial<Column>) => void
}

const StickyGridContext = createContext<StickyGridContextValue | null>(null)
StickyGridContext.displayName = 'StickyGridContext'

export function useStickyGridContext() {
  const context = useContext(StickyGridContext)
  if (!context) {
    throw new Error(
      'useStickyGridContext must be used within a StickyGridProvider',
    )
  }
  return context
}

export function StickyGridProvider({
  children,
  value,
}: {
  children: React.ReactNode
  value: StickyGridContextValue
}) {
  return (
    <StickyGridContext.Provider value={value}>
      {children}
    </StickyGridContext.Provider>
  )
}
