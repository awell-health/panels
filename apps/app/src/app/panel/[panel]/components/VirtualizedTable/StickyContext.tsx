'use client'

import type React from 'react'
import { createContext, useContext } from 'react'
import type { Column, Filter, Sort } from '@/types/panel'

interface StickyGridContextValue {
  stickyIndices: number[]
  columns: Column[]
  getColumnWidth: (index: number) => number
  getStickyColumnStyles: (
    columnIndex: number,
    isHeader?: boolean,
  ) => React.CSSProperties
  onSort?: (columnId: string) => void
  onFilter?: (columnKey: string, value: string) => void
  onColumnUpdate?: (updates: Partial<Column>) => void
  onColumnDelete?: (columnId: string) => void
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
