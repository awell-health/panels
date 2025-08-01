'use client'

import { useState, useEffect, useRef } from 'react'
import { Send } from 'lucide-react'
import type { ChatMessage } from '@/app/actions/ai-chat'
import ReactMarkdown from 'react-markdown'
import { logger } from '@/lib/logger'
import { useAIConversation } from '@/hooks/use-ai-conversation'
import MessageStatus from '@/components/MessageStatus'
import {
  getConversationErrorMessage,
  mapErrorToUserFriendly,
} from '@/lib/error-messages'

interface AIConversationDrawerProps {
  onClose: () => void
  onSendMessage: (
    conversation: Array<ChatMessage>,
  ) => Promise<{ response: string; hasColumnChanges?: boolean }>
  getInitialMessage: () => Promise<string>
}

export default function AIConversationDrawer({
  onClose,
  onSendMessage,
  getInitialMessage = () =>
    Promise.resolve("Hi, I'm your Assistant. How can I help you?"),
}: AIConversationDrawerProps) {
  const [inputMessage, setInputMessage] = useState('')
  const [hasColumnChanges, setHasColumnChanges] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const {
    messages,
    isInitialLoading,
    sendMessage,
    retryMessage,
    isAnyMessageProcessing,
  } = useAIConversation({
    onSendMessage: async (conversation) => {
      const result = await onSendMessage(conversation)

      // Track if column changes occurred
      if (result.hasColumnChanges) {
        setHasColumnChanges(true)
      }

      return result.response
    },
    getInitialMessage,
    maxRetries: 3,
    retryDelay: 1000,
  })

  // Auto-scroll to bottom when messages change or processing state changes
  useEffect(() => {
    const scrollToBottom = () => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'end',
        })
      }
    }

    // Only scroll if there are messages or if processing is happening
    if (messages.length > 0 || isAnyMessageProcessing || isInitialLoading) {
      // Use a small delay to ensure DOM has been updated
      const timeoutId = setTimeout(scrollToBottom, 100)
      return () => clearTimeout(timeoutId)
    }
  }, [messages.length, isAnyMessageProcessing, isInitialLoading])

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isAnyMessageProcessing || hasColumnChanges)
      return

    const messageToSend = inputMessage
    setInputMessage('')

    logger.info(
      {
        messageLength: messageToSend.length,
        conversationLength: messages.length,
        operationType: 'ai-conversation',
        component: 'AIConversationDrawer',
        action: 'send-message',
      },
      'User sending message to AI conversation',
    )

    await sendMessage(messageToSend)
  }

  const handleRetryMessage = async (messageId: string) => {
    logger.info(
      {
        messageId,
        conversationLength: messages.length,
        operationType: 'ai-conversation',
        component: 'AIConversationDrawer',
        action: 'retry-message',
      },
      'User retrying failed message',
    )

    await retryMessage(messageId)
  }

  const getProcessingIndicator = () => {
    if (!isAnyMessageProcessing) return null

    return (
      <div className="flex justify-start">
        <div className="bg-gray-100 text-gray-900 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-400 border-t-transparent" />
            <span className="text-sm text-gray-500">
              Agent is analyzing your request...
            </span>
          </div>
        </div>
      </div>
    )
  }

  const getColumnChangesNotice = () => {
    if (!hasColumnChanges) return null

    return (
      <div className="flex justify-start">
        <div className="bg-blue-50 border border-blue-200 text-blue-900 rounded-lg p-4 max-w-[80%]">
          <div className="flex items-start space-x-2">
            <div className="text-blue-600 font-medium">
              🎉 Column changes applied!
            </div>
          </div>
          <div className="text-blue-700 mt-2">
            The columns have been updated successfully. Please start a new
            conversation to get the updated list of columns and continue working
            with the latest data.
          </div>
        </div>
      </div>
    )
  }

  const renderMessage = (message: (typeof messages)[0], index: number) => {
    const isUser = message.role === 'user'
    const showStatus = isUser && (message.status !== 'sent' || message.error)

    return (
      <div key={message.id} className="space-y-2">
        <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
          <div
            className={`max-w-[80%] rounded-lg p-4 ${
              isUser ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-900'
            }`}
          >
            {message.role === 'assistant' ? (
              <div className="prose prose-sm max-w-none">
                <ReactMarkdown>{message.content}</ReactMarkdown>
              </div>
            ) : (
              message.content
            )}
          </div>
        </div>

        {/* Message Status for User Messages */}
        {showStatus && (
          <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
            <MessageStatus
              status={message.status}
              onRetry={() => handleRetryMessage(message.id)}
              retryCount={message.retryCount}
              maxRetries={3}
              error={
                message.error
                  ? getConversationErrorMessage(message.error, {
                      retryCount: message.retryCount,
                      messageContent: message.content,
                      isOnline: navigator?.onLine,
                    })
                  : undefined
              }
              className="mt-1 mr-4"
            />
          </div>
        )}

        {/* Enhanced Error Message for Failed Messages */}
        {isUser && message.status === 'failed' && message.error && (
          <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
            <div className="max-w-[80%] mr-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm">
                <div className="flex items-start space-x-2">
                  <div className="text-red-600 font-medium">
                    {mapErrorToUserFriendly(message.error).title}
                  </div>
                </div>
                <div className="text-red-700 mt-1">
                  {
                    mapErrorToUserFriendly(message.error, {
                      retryCount: message.retryCount,
                      isOnline: navigator?.onLine,
                    }).actionable
                  }
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div
        className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4"
        ref={scrollContainerRef}
      >
        {isInitialLoading ? (
          <div className="flex justify-start">
            <div className="bg-gray-100 text-gray-900 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-400 border-t-transparent" />
                <span className="text-sm text-gray-500">
                  Agent is loading...
                </span>
              </div>
            </div>
          </div>
        ) : (
          <>
            {messages.map(renderMessage)}
            {getProcessingIndicator()}
            {getColumnChangesNotice()}
            {/* Invisible element to scroll to */}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Section */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex space-x-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={(e) =>
              e.key === 'Enter' && !e.shiftKey && handleSendMessage()
            }
            placeholder={
              hasColumnChanges
                ? 'Please start a new conversation to continue with updated columns...'
                : isAnyMessageProcessing
                  ? 'Please wait for the current message to complete...'
                  : 'Type your message...'
            }
            disabled={
              isInitialLoading || isAnyMessageProcessing || hasColumnChanges
            }
            className="flex-1 px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          />
          <button
            type="button"
            onClick={handleSendMessage}
            disabled={
              isInitialLoading ||
              isAnyMessageProcessing ||
              !inputMessage.trim() ||
              hasColumnChanges
            }
            className="btn btn-primary"
            aria-label="Send message"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>

        {/* Connection Status */}
        {typeof navigator !== 'undefined' && !navigator.onLine && (
          <div className="mt-2 flex items-center space-x-2 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
            <div className="h-2 w-2 bg-amber-500 rounded-full" />
            <span>
              You're currently offline. Messages will be sent when your
              connection is restored.
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
