'use client'

import {
  createContext,
  useContext,
  useCallback,
  useState,
  type ReactNode,
} from 'react'
import type { ToastType } from '@/components/Toast'

export interface ToastData {
  id: string
  type: ToastType
  title: string
  message?: string
  duration?: number
  dismissible?: boolean
  onRetry?: () => void
  isRetrying?: boolean
}

interface ToastContextType {
  toasts: ToastData[]
  addToast: (toast: Omit<ToastData, 'id'>) => string
  removeToast: (id: string) => void
  updateToast: (id: string, updates: Partial<ToastData>) => void
  clearAllToasts: () => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

interface ToastProviderProps {
  children: ReactNode
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastData[]>([])

  const addToast = useCallback((toast: Omit<ToastData, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const newToast: ToastData = {
      id,
      duration: 5000,
      dismissible: true,
      ...toast,
    }
    setToasts((prev) => [...prev, newToast])
    return id
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  const updateToast = useCallback((id: string, updates: Partial<ToastData>) => {
    setToasts((prev) =>
      prev.map((toast) => (toast.id === id ? { ...toast, ...updates } : toast)),
    )
  }, [])

  const clearAllToasts = useCallback(() => {
    setToasts([])
  }, [])

  const value = {
    toasts,
    addToast,
    removeToast,
    updateToast,
    clearAllToasts,
  }

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>
}

// Convenience functions for different toast types
export function useToastHelpers() {
  const { addToast, updateToast } = useToast()

  const showSuccess = useCallback(
    (title: string, message?: string, options?: Partial<ToastData>) => {
      return addToast({
        type: 'success',
        title,
        message,
        ...options,
      })
    },
    [addToast],
  )

  const showError = useCallback(
    (title: string, message?: string, options?: Partial<ToastData>) => {
      return addToast({
        type: 'error',
        title,
        message,
        duration: 0, // Don't auto-dismiss error toasts
        ...options,
      })
    },
    [addToast],
  )

  const showInfo = useCallback(
    (title: string, message?: string, options?: Partial<ToastData>) => {
      return addToast({
        type: 'info',
        title,
        message,
        ...options,
      })
    },
    [addToast],
  )

  const showWarning = useCallback(
    (title: string, message?: string, options?: Partial<ToastData>) => {
      return addToast({
        type: 'warning',
        title,
        message,
        ...options,
      })
    },
    [addToast],
  )

  const showProgress = useCallback(
    (title: string, message?: string) => {
      return addToast({
        type: 'info',
        title,
        message,
        duration: 0, // Don't auto-dismiss progress toasts
        dismissible: false,
      })
    },
    [addToast],
  )

  const showRetryableError = useCallback(
    (
      title: string,
      message?: string,
      onRetry?: () => void,
      options?: Partial<ToastData>,
    ) => {
      return addToast({
        type: 'error',
        title,
        message,
        duration: 0,
        onRetry,
        ...options,
      })
    },
    [addToast],
  )

  return {
    showSuccess,
    showError,
    showInfo,
    showWarning,
    showProgress,
    showRetryableError,
    updateToast,
  }
}
