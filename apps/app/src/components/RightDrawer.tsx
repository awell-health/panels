'use client'

import type React from 'react'
import { useDrawer } from '@/contexts/DrawerContext'

interface RightDrawerProps {
  open: boolean
  onClose: () => void
  title?: string
  children?: React.ReactNode
}

export default function RightDrawer({
  open,
  onClose,
  title,
}: RightDrawerProps) {
  const { content } = useDrawer()

  return (
    <div
      className="bg-white shadow-[-2px_0_8px_rgba(0,0,0,0.1)] overflow-hidden"
      style={{ gridArea: 'drawer' }}
    >
      <div
        className={`
          h-full flex flex-col transition-opacity duration-300 ease-in-out
          ${open ? 'opacity-100' : 'opacity-0'}
        `}
      >
        {/* Fixed Header - Always Visible */}
        <div className="flex-shrink-0 p-4 border-b border-gray-200 flex items-center justify-between bg-white">
          <h2 className="text-xs font-normal text-gray-700">{title}</h2>
          <button
            type="button"
            className="inline-flex items-center justify-center w-8 h-8 text-xs font-normal text-gray-700 rounded-full bg-transparent hover:bg-gray-100"
            onClick={onClose}
            aria-label="Close drawer"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Content Area - Both horizontal and vertical scrolling */}
        <div className="flex-1 overflow-auto text-xs font-normal text-gray-700">
          <div className="bg-white h-full overflow-auto p-4">
            {content && <content.component {...content.props} />}
          </div>
        </div>
      </div>
    </div>
  )
}
