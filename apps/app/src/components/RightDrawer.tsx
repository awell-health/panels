"use client";

import type React from 'react';

interface RightDrawerProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
}

export default function RightDrawer({
  open,
  onClose,
  title,
  children,
}: RightDrawerProps) {
  return (

    <>
      {/* Drawer */}
      <div
        className={`h-[calc(100%-40px)] ${open ? 'w-1/3' : 'w-0'} bg-white shadow-lg transition-all duration-300 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ willChange: 'transform' }}
      >
        <div className="flex flex-col h-full">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-xs font-normal text-gray-700">{title}</h2>
            {/* biome-ignore lint/a11y/useButtonType: <explanation> */}
            <button
              className="btn btn-ghost btn-sm btn-circle text-xs font-normal text-gray-700"
              onClick={onClose}
            >
              ✕
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 text-xs font-normal text-gray-700">{children}</div>
        </div>
      </div>
    </>
  )
}
