'use client'

import { useState, useEffect, useRef } from 'react'
import { Send } from 'lucide-react'
import type { ChatMessage } from '@/app/actions/ai-chat'
import ReactMarkdown from 'react-markdown'

interface AIConversationDrawerProps {
  onClose: () => void
  onSendMessage: (conversation: Array<ChatMessage>) => Promise<string>
  getInitialMessage: () => Promise<string>
}

export default function AIConversationDrawer({
  onClose,
  onSendMessage,
  getInitialMessage = () =>
    Promise.resolve("Hi, I'm the your Assistant. How can I help you?"),
}: AIConversationDrawerProps) {
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [conversation, setConversation] = useState<ChatMessage[]>([])
  const initialMessageLoaded = useRef(false)

  // Load initial message
  useEffect(() => {
    const loadInitialMessage = async () => {
      if (initialMessageLoaded.current) return
      initialMessageLoaded.current = true

      try {
        const initialMessage = await getInitialMessage()
        setConversation([{ role: 'assistant', content: initialMessage }])
      } catch (error) {
        console.error('Error loading initial message:', error)
        setConversation([
          {
            role: 'assistant',
            content:
              'I apologize, but I encountered an error while loading the initial message. Please try again.',
          },
        ])
      } finally {
        setIsInitialLoading(false)
      }
    }

    loadInitialMessage()
  }, [getInitialMessage])

  const handleSendMessage = async () => {
    if (!message.trim()) return

    // Add user message to conversation
    const updatedConversation: ChatMessage[] = [
      ...conversation,
      { role: 'user', content: message },
    ]
    setConversation(updatedConversation)
    setMessage('')
    setIsLoading(true)

    try {
      const botResponse = await onSendMessage(updatedConversation)
      // Add bot response to conversation
      setConversation((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: botResponse,
        },
      ])
    } catch (error) {
      console.error('Error sending message:', error)
      setConversation((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            'I apologize, but I encountered an error while processing your message. Please try again.',
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isInitialLoading ? (
          <div className="flex justify-start">
            <div className="bg-gray-100 text-gray-900 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-400 border-t-transparent" />
                <span className="text-sm text-gray-500">Thinking...</span>
              </div>
            </div>
          </div>
        ) : (
          <>
            {conversation.map((msg, index) => (
              <div
                // biome-ignore lint/suspicious/noArrayIndexKey: message don't have an id
                key={index}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-4 ${
                    msg.role === 'user'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  {msg.role === 'assistant' ? (
                    <div className="prose prose-sm max-w-none">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    msg.content
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 text-gray-900 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-400 border-t-transparent" />
                    <span className="text-sm text-gray-500">Thinking...</span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      <div className="border-t border-gray-200 p-4">
        <div className="flex space-x-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Type your message..."
            disabled={isInitialLoading}
            className="flex-1 px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            type="button"
            onClick={handleSendMessage}
            disabled={isLoading || isInitialLoading}
            className={`px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-500 ${isLoading || isInitialLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
