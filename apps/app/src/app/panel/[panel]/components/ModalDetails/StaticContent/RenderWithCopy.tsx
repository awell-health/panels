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

  const iconBaseClasses =
    'w-2.5 h-2.5 absolute inline-block -right-3 bottom-0.5'

  return (
    <span
      className="cursor-pointer group relative"
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
