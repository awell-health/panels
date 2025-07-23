import { Check, Copy } from 'lucide-react'
import { type FC, useEffect, useState } from 'react'

export const RenderWithCopy: FC<{
  children: string | React.ReactNode
  text: string | undefined
}> = ({ children, text }) => {
  const [isCopied, setIsCopied] = useState(false)

  if (!text) return children

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    setTimeout(() => {
      setIsCopied(false)
    }, 1000)
  }, [isCopied])

  const iconBaseClasses = 'absolute -right-3.5 w-3 h-3'

  return (
    <span
      className="cursor-pointer group relative flex items-center break-words"
      onClick={() => {
        navigator.clipboard.writeText(text ?? '')
        setIsCopied(true)
      }}
      onKeyDown={() => {}}
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
