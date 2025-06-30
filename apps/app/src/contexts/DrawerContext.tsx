'use client'
import React, {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from 'react'

interface DrawerContextType {
  isOpen: boolean
  content: ReactNode | null
  title: string
  openDrawer: (content: ReactNode, title: string) => void
  closeDrawer: () => void
}

const DrawerContext = createContext<DrawerContextType | undefined>(undefined)

export function DrawerProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [content, setContent] = useState<ReactNode | null>(null)
  const [title, setTitle] = useState('')

  const openDrawer = (content: ReactNode, title: string) => {
    setContent(content)
    setTitle(title)
    setIsOpen(true)
  }

  const closeDrawer = () => {
    setIsOpen(false)
    // Clear content after animation
    setTimeout(() => setContent(null), 300)
  }

  return (
    <DrawerContext.Provider
      value={{ isOpen, content, title, openDrawer, closeDrawer }}
    >
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
