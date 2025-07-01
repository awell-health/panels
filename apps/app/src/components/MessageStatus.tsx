import { RefreshCw, Send, CheckCircle, AlertCircle, Clock } from 'lucide-react'
import type { MessageStatus as MessageStatusType } from '@/hooks/use-ai-conversation'

interface MessageStatusProps {
  status: MessageStatusType
  onRetry?: () => void
  retryCount?: number
  maxRetries?: number
  error?: string
  className?: string
}

export function MessageStatus({
  status,
  onRetry,
  retryCount = 0,
  maxRetries = 3,
  error,
  className = ''
}: MessageStatusProps) {
  const canRetry = status === 'failed' && onRetry && retryCount < maxRetries

  const getStatusConfig = () => {
    switch (status) {
      case 'pending':
        return {
          icon: Clock,
          text: 'Pending',
          color: 'text-gray-400',
          bgColor: 'bg-gray-50',
          showSpinner: false
        }
      case 'sending':
        return {
          icon: Send,
          text: 'Sending',
          color: 'text-blue-500',
          bgColor: 'bg-blue-50',
          showSpinner: true
        }
      case 'sent':
        return {
          icon: CheckCircle,
          text: 'Sent',
          color: 'text-green-500',
          bgColor: 'bg-green-50',
          showSpinner: false
        }
      case 'failed':
        return {
          icon: AlertCircle,
          text: 'Failed to send',
          color: 'text-red-500',
          bgColor: 'bg-red-50',
          showSpinner: false
        }
      case 'retrying':
        return {
          icon: RefreshCw,
          text: `Retrying (${retryCount}/${maxRetries})`,
          color: 'text-orange-500',
          bgColor: 'bg-orange-50',
          showSpinner: true
        }
      default:
        return {
          icon: Clock,
          text: 'Unknown',
          color: 'text-gray-400',
          bgColor: 'bg-gray-50',
          showSpinner: false
        }
    }
  }

  const config = getStatusConfig()
  const Icon = config.icon

  return (
    <div className={`flex items-center gap-2 text-xs ${className}`}>
      <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${config.bgColor}`}>
        {config.showSpinner ? (
          <div className={`animate-spin rounded-full h-3 w-3 border border-current border-t-transparent ${config.color}`} />
        ) : (
          <Icon className={`h-3 w-3 ${config.color}`} />
        )}
        <span className={`${config.color} font-medium`}>
          {config.text}
        </span>
      </div>

      {/* Error details tooltip/popover for failed messages */}
      {status === 'failed' && error && (
        <div className="group relative">
          <AlertCircle className="h-3 w-3 text-red-400 cursor-help" />
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
            <div className="font-medium mb-1">Error Details:</div>
            <div className="text-gray-300">{error}</div>
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
          </div>
        </div>
      )}

      {/* Retry button for failed messages */}
      {canRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1"
          aria-label="Retry sending message"
        >
          <RefreshCw className="h-3 w-3" />
          Retry
        </button>
      )}

      {/* Max retries reached indicator */}
      {status === 'failed' && retryCount >= maxRetries && (
        <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-full">
          <AlertCircle className="h-3 w-3 text-gray-500" />
          <span className="text-gray-600 font-medium">
            Max retries reached
          </span>
        </div>
      )}
    </div>
  )
}

export default MessageStatus 