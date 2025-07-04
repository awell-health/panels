import { Check, Copy } from 'lucide-react'
import { type FC, useEffect, useState } from 'react'

export const RenderWithCopy: FC<{
  children: string | React.ReactNode
  text: string | undefined
}> = ({ children, text }) => {
  const [isCopied, setIsCopied] = useState(false)

  if (!children) return null

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    setTimeout(() => {
      setIsCopied(false)
    }, 1000)
  }, [isCopied])

  return (
    <div
      className="flex items-center cursor-pointer group"
      onClick={() => {
        navigator.clipboard.writeText(text ?? '')
        setIsCopied(true)
      }}
      onKeyDown={() => {}}
    >
      {children}
      {!isCopied && (
        <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity duration-100 ml-1" />
      )}
      {isCopied && <Check className="w-3 h-3 text-green-600 ml-1" />}
    </div>
  )
}
