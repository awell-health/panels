import { useState, useEffect, useRef, useCallback } from 'react'
import { logger } from '@/lib/logger'

export type MessageStatus =
  | 'pending'
  | 'sending'
  | 'sent'
  | 'failed'
  | 'retrying'

export interface ConversationMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  status: MessageStatus
  timestamp: number
  retryCount?: number
  error?: string
}

export interface UseAIConversationOptions {
  onSendMessage: (
    conversation: Array<{ role: 'user' | 'assistant'; content: string }>,
  ) => Promise<string>
  getInitialMessage?: () => Promise<string>
  maxRetries?: number
  retryDelay?: number
}

export interface UseAIConversationReturn {
  messages: ConversationMessage[]
  isInitialLoading: boolean
  sendMessage: (message: string) => Promise<void>
  retryMessage: (messageId: string) => Promise<void>
  clearConversation: () => void
  isAnyMessageProcessing: boolean
}

const generateMessageId = () =>
  `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export function useAIConversation({
  onSendMessage,
  getInitialMessage,
  maxRetries = 3,
  retryDelay = 1000,
}: UseAIConversationOptions): UseAIConversationReturn {
  const [messages, setMessages] = useState<ConversationMessage[]>([])
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false)
  const initialMessageLoaded = useRef(false)

  // Load initial message
  useEffect(() => {
    const loadInitialMessage = async () => {
      if (initialMessageLoaded.current || !getInitialMessage) {
        setIsInitialLoading(false)
        return
      }
      initialMessageLoaded.current = true

      try {
        const initialContent = await getInitialMessage()
        const initialMessage: ConversationMessage = {
          id: generateMessageId(),
          role: 'assistant',
          content: initialContent,
          status: 'sent',
          timestamp: Date.now(),
        }

        setMessages([initialMessage])

        logger.info(
          {
            messageLength: initialContent.length,
            operationType: 'ai-conversation',
            component: 'use-ai-conversation',
            action: 'load-initial-message',
          },
          'Successfully loaded initial AI conversation message',
        )
      } catch (error) {
        logger.error(
          {
            retryAvailable: true,
            operationType: 'ai-conversation',
            component: 'use-ai-conversation',
            action: 'load-initial-message',
          },
          'Failed to load initial AI conversation message',
          error instanceof Error ? error : new Error(String(error)),
        )

        const errorMessage: ConversationMessage = {
          id: generateMessageId(),
          role: 'assistant',
          content:
            'I apologize, but I encountered an error while loading the initial message. Please try again.',
          status: 'failed',
          timestamp: Date.now(),
          error: error instanceof Error ? error.message : String(error),
        }

        setMessages([errorMessage])
      } finally {
        setIsInitialLoading(false)
      }
    }

    loadInitialMessage()
  }, [getInitialMessage])

  const sendMessageInternal = useCallback(
    async (
      messageContent: string,
      isRetry = false,
      retryMessageId?: string,
    ): Promise<void> => {
      if (!messageContent.trim()) return

      let userMessageId = retryMessageId
      let userMessage: ConversationMessage

      if (isRetry && retryMessageId) {
        // Update existing message status for retry
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === retryMessageId
              ? {
                  ...msg,
                  status: 'retrying' as MessageStatus,
                  retryCount: (msg.retryCount || 0) + 1,
                }
              : msg,
          ),
        )

        const existingMessage = messages.find(
          (msg) => msg.id === retryMessageId,
        )
        if (!existingMessage) return

        userMessage = existingMessage
      } else {
        // Create new user message
        userMessageId = generateMessageId()
        userMessage = {
          id: userMessageId,
          role: 'user',
          content: messageContent,
          status: 'sending',
          timestamp: Date.now(),
          retryCount: 0,
        }

        setMessages((prev) => [...prev, userMessage])
      }

      // Convert messages for API call (only include successfully sent messages)
      const conversationForAPI = messages
        .filter((msg) => msg.status === 'sent')
        .map((msg) => ({ role: msg.role, content: msg.content }))

      // Add current user message (for both new messages and retries, since failed messages are excluded above)
      conversationForAPI.push({ role: 'user', content: messageContent })

      logger.info(
        {
          messageLength: messageContent.length,
          conversationLength: conversationForAPI.length,
          isRetry,
          retryCount: userMessage.retryCount || 0,
          operationType: 'ai-conversation',
          component: 'use-ai-conversation',
          action: 'send-message',
        },
        `${isRetry ? 'Retrying' : 'Sending'} message to AI conversation`,
      )

      try {
        // Mark user message as sent immediately (message successfully sent to API)
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === userMessageId
              ? { ...msg, status: 'sent' as MessageStatus }
              : msg,
          ),
        )

        // Show loading indicator while waiting for response
        setIsWaitingForResponse(true)
        const botResponse = await onSendMessage(conversationForAPI)

        // Add bot response
        const assistantMessage: ConversationMessage = {
          id: generateMessageId(),
          role: 'assistant',
          content: botResponse,
          status: 'sent',
          timestamp: Date.now(),
        }

        setMessages((prev) => [...prev, assistantMessage])

        logger.info(
          {
            responseLength: botResponse.length,
            conversationLength: conversationForAPI.length + 1,
            isRetry,
            operationType: 'ai-conversation',
            component: 'use-ai-conversation',
            action: 'receive-response',
          },
          'Successfully received AI response',
        )
      } catch (error) {
        logger.error(
          {
            messageLength: messageContent.length,
            conversationLength: conversationForAPI.length,
            isRetry,
            retryCount: userMessage.retryCount || 0,
            operationType: 'ai-conversation',
            component: 'use-ai-conversation',
            action: 'send-message',
          },
          'Failed to process AI conversation message',
          error instanceof Error ? error : new Error(String(error)),
        )

        // Mark user message as failed
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === userMessageId
              ? {
                  ...msg,
                  status: 'failed' as MessageStatus,
                  error: error instanceof Error ? error.message : String(error),
                }
              : msg,
          ),
        )
      } finally {
        // Hide loading indicator when API call completes (success or failure)
        setIsWaitingForResponse(false)
      }
    },
    [messages, onSendMessage],
  )

  const sendMessage = useCallback(
    async (message: string): Promise<void> => {
      await sendMessageInternal(message, false)
    },
    [sendMessageInternal],
  )

  const retryMessage = useCallback(
    async (messageId: string): Promise<void> => {
      const message = messages.find((msg) => msg.id === messageId)
      if (!message || message.role !== 'user' || message.status !== 'failed') {
        return
      }

      const currentRetryCount = message.retryCount || 0
      if (currentRetryCount >= maxRetries) {
        logger.warn(
          {
            messageId,
            retryCount: currentRetryCount,
            maxRetries,
            operationType: 'ai-conversation',
            component: 'use-ai-conversation',
            action: 'retry-message',
          },
          'Message retry limit exceeded',
        )
        return
      }

      // Add exponential backoff delay
      if (currentRetryCount > 0) {
        const delayMs = retryDelay * 2 ** (currentRetryCount - 1)
        await delay(delayMs)
      }

      await sendMessageInternal(message.content, true, messageId)
    },
    [messages, sendMessageInternal, maxRetries, retryDelay],
  )

  const clearConversation = useCallback(() => {
    setMessages([])
    initialMessageLoaded.current = false
    setIsInitialLoading(true)
  }, [])

  const isAnyMessageProcessing =
    isWaitingForResponse ||
    messages.some(
      (msg) => msg.status === 'sending' || msg.status === 'retrying',
    )

  return {
    messages,
    isInitialLoading,
    sendMessage,
    retryMessage,
    clearConversation,
    isAnyMessageProcessing,
  }
}
