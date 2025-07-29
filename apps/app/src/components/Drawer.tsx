'use client'

import type React from 'react'

interface RightDrawerProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
}

export default function Drawer({
  open,
  onClose,
  title,
  children,
}: RightDrawerProps) {
  return (
    <div className="fixed inset-y-0 right-0 z-50 w-96 bg-white shadow-xl">
      <label
        htmlFor="my-drawer-4"
        aria-label="close sidebar"
        className="fixed inset-0 bg-black bg-opacity-50"
      />
      {children}
    </div>
  )
}
