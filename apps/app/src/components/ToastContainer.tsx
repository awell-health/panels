'use client'

import { createPortal } from 'react-dom'
import { useEffect, useState } from 'react'
import { useToast } from '@/contexts/ToastContext'
import { Toast } from '@/components/Toast'

export type ToastPosition =
  | 'top-right'
  | 'top-left'
  | 'top-center'
  | 'bottom-right'
  | 'bottom-left'
  | 'bottom-center'

interface ToastContainerProps {
  position?: ToastPosition
  className?: string
  maxToasts?: number
}

export function ToastContainer({
  position = 'top-right',
  className = '',
  maxToasts = 5,
}: ToastContainerProps) {
  const { toasts, removeToast, updateToast } = useToast()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  // Limit the number of toasts displayed
  const visibleToasts = toasts.slice(-maxToasts)

  const getPositionStyles = (position: ToastPosition) => {
    const baseStyles =
      'fixed z-[9999] flex flex-col gap-2 p-4 pointer-events-none'

    switch (position) {
      case 'top-right':
        return `${baseStyles} top-0 right-0`
      case 'top-left':
        return `${baseStyles} top-0 left-0`
      case 'top-center':
        return `${baseStyles} top-0 left-1/2 transform -translate-x-1/2`
      case 'bottom-right':
        return `${baseStyles} bottom-0 right-0`
      case 'bottom-left':
        return `${baseStyles} bottom-0 left-0`
      case 'bottom-center':
        return `${baseStyles} bottom-0 left-1/2 transform -translate-x-1/2`
      default:
        return `${baseStyles} top-0 right-0`
    }
  }

  const handleRetry = async (toastId: string) => {
    const toast = toasts.find((t) => t.id === toastId)
    if (toast?.onRetry) {
      // Update toast to show retrying state
      updateToast(toastId, { isRetrying: true })

      try {
        await toast.onRetry()
        // Remove the toast after successful retry
        removeToast(toastId)
      } catch (error) {
        // Reset retrying state on error
        updateToast(toastId, { isRetrying: false })
      }
    }
  }

  // Reverse the order for bottom positions so newest toasts appear at the bottom
  const orderedToasts = position.includes('bottom')
    ? [...visibleToasts].reverse()
    : visibleToasts

  const containerContent = (
    <div className={`${getPositionStyles(position)} ${className}`}>
      {orderedToasts.map((toast) => (
        <Toast
          key={toast.id}
          id={toast.id}
          type={toast.type}
          title={toast.title}
          message={toast.message}
          duration={toast.duration}
          dismissible={toast.dismissible}
          onDismiss={() => removeToast(toast.id)}
          onRetry={() => handleRetry(toast.id)}
          isRetrying={toast.isRetrying}
        />
      ))}
    </div>
  )

  return createPortal(containerContent, document.body)
}

// Convenience component for different positions
export function TopRightToastContainer(
  props: Omit<ToastContainerProps, 'position'>,
) {
  return <ToastContainer position="top-right" {...props} />
}

export function TopLeftToastContainer(
  props: Omit<ToastContainerProps, 'position'>,
) {
  return <ToastContainer position="top-left" {...props} />
}

export function BottomRightToastContainer(
  props: Omit<ToastContainerProps, 'position'>,
) {
  return <ToastContainer position="bottom-right" {...props} />
}

export function BottomLeftToastContainer(
  props: Omit<ToastContainerProps, 'position'>,
) {
  return <ToastContainer position="bottom-left" {...props} />
}
