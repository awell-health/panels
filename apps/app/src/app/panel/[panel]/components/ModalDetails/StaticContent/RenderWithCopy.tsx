import { Check, Copy } from 'lucide-react'
import { type FC, useEffect, useState } from 'react'
import { handleError } from './utils'

export const RenderWithCopy: FC<{
  children: string | React.ReactNode
  text: string | undefined
}> = ({ children, text }) => {
  const [isCopied, setIsCopied] = useState(false)

  if (!text) return children

  useEffect(() => {
    if (isCopied) {
      const timeout = setTimeout(() => {
        setIsCopied(false)
      }, 1000)
      return () => clearTimeout(timeout)
    }
  }, [isCopied])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setIsCopied(true)
    } catch (error) {
      handleError(error, 'RenderWithCopy.handleCopy')
    }
  }

  const iconBaseClasses = 'absolute -right-3.5 w-3 h-3'

  return (
    <span
      className="cursor-pointer group relative flex items-center break-words"
      onClick={handleCopy}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleCopy()
        }
      }}
    >
      {children}
      {!isCopied && (
        <Copy
          className={`${iconBaseClasses} opacity-0 group-hover:opacity-100 transition-opacity duration-100`}
        />
      )}
      {isCopied && <Check className={`${iconBaseClasses} text-green-600`} />}
    </span>
  )
}
