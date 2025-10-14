'use client'

import type React from 'react'

interface TooltipProps {
  children: React.ReactNode
  content: string
  show: boolean
  position?: 'top' | 'bottom' | 'left' | 'right'
}

export function Tooltip({
  children,
  content,
  show,
  position = 'top',
}: TooltipProps) {
  if (!show) return <>{children}</>

  const positionClasses = {
    top: 'bottom-full left-1/2 transform -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 transform -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 transform -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 transform -translate-y-1/2 ml-2',
  }

  const arrowClasses = {
    top: 'absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900',
    bottom:
      'absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-900',
    left: 'absolute left-full top-1/2 transform -translate-y-1/2 w-0 h-0 border-t-4 border-b-4 border-l-4 border-transparent border-l-gray-900',
    right:
      'absolute right-full top-1/2 transform -translate-y-1/2 w-0 h-0 border-t-4 border-b-4 border-r-4 border-transparent border-r-gray-900',
  }

  return (
    <div className="relative group">
      {children}
      <div
        className={`absolute ${positionClasses[position]} px-3 py-2 bg-gray-900 text-white text-sm rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10`}
      >
        {content}
        <div className={arrowClasses[position]} />
      </div>
    </div>
  )
}
