'use client'
import React, {
  createContext,
  useContext,
  useState,
  useMemo,
  useCallback,
  type ReactNode,
  type ComponentType,
} from 'react'

interface DrawerContent<
  T extends Record<string, unknown> = Record<string, unknown>,
> {
  component: ComponentType<T>
  props: T
}

interface DrawerContextType {
  isOpen: boolean
  content: DrawerContent | null
  title: string
  openDrawer: <T extends Record<string, unknown>>(
    component: ComponentType<T>,
    props: T,
    title: string,
  ) => void
  closeDrawer: () => void
}

const DrawerContext = createContext<DrawerContextType | undefined>(undefined)

export function DrawerProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [content, setContent] = useState<DrawerContent | null>(null)
  const [title, setTitle] = useState('')

  const openDrawer = useCallback(
    <T extends Record<string, unknown>>(
      component: ComponentType<T>,
      props: T,
      title: string,
    ) => {
      setContent({
        component: component as ComponentType<Record<string, unknown>>,
        props: props as Record<string, unknown>,
      })
      setTitle(title)
      setIsOpen(true)
    },
    [],
  )

  const closeDrawer = useCallback(() => {
    setIsOpen(false)
    // Clear content after animation
    setTimeout(() => {
      setContent(null)
    }, 300)
  }, [])

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(
    () => ({
      isOpen,
      content,
      title,
      openDrawer,
      closeDrawer,
    }),
    [isOpen, content, title, openDrawer, closeDrawer],
  )

  return (
    <DrawerContext.Provider value={contextValue}>
      {children}
    </DrawerContext.Provider>
  )
}

export function useDrawer() {
  const context = useContext(DrawerContext)
  if (context === undefined) {
    throw new Error('useDrawer must be used within a DrawerProvider')
  }
  return context
}
