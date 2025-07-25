'use client'

import { useEffect, useRef, useState } from 'react'
import { Send, MessageSquare, RotateCcw } from 'lucide-react'
import Markdown from 'react-markdown'
import { useAIConversation } from '@/hooks/use-ai-conversation'
import { chatWithAI } from '../app/actions/ai-chat'

interface AIAssistantChatProps {
  currentJson: string
  className?: string
  onSendMessage: (
    conversation: Array<{ role: 'user' | 'assistant'; content: string }>,
  ) => Promise<string>
}

function ChatInput({
  onSendMessage,
  disabled,
}: {
  onSendMessage: (message: string) => void
  disabled: boolean
}) {
  const [inputValue, setInputValue] = useState('')

  const handleSubmit = () => {
    if (!inputValue.trim() || disabled) return
    onSendMessage(inputValue)
    setInputValue('')
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="p-4 border-t border-gray-200 bg-white">
      <div className="flex space-x-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Ask about JSON structure..."
          className="flex-1 px-3 py-2 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          disabled={disabled}
        />
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!inputValue.trim() || disabled}
          className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

export function AIAssistantChat({
  currentJson,
  className = '',
}: AIAssistantChatProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const onSendMessage = async (
    conversation: Array<{ role: 'user' | 'assistant'; content: string }>,
  ) => {
    const systemPrompt = `You are **FHIRPath Assistant**, a specialized AI assistant for helping users create and configure FHIR card structures in JSON format. Your expertise focuses on:

### Your Core Capabilities:
- **FHIR Card Structure**: Help users understand and create proper FHIR card configurations
- **JSON Validation**: Assist with JSON syntax and structure validation  
- **FHIRPath Expressions**: Provide guidance on writing effective FHIRPath expressions
- **Data Mapping**: Help map healthcare data to appropriate card fields
- **Best Practices**: Share healthcare data visualization best practices

### Current Context:
The user is working with a JSON configuration for FHIR cards. Here's the current JSON they're editing:

\`\`\`json
${currentJson}
\`\`\`

### FHIR Card Structure:
Each card should follow this structure:
\`\`\`json
{
  "name": "Card Display Name",
  "fields": [
    {
      "label": "Field Display Label",
      "key": "unique_field_key",
      "fhirPath": "fhir.path.expression"
    }
  ]
}
\`\`\`

### FHIRPath Examples:
- **Basic Properties**: \`name\`, \`birthDate\`, \`gender\`
- **Telecom Data**: \`telecom.where(system='email').value\`, \`telecom.where(system='phone').value\`
- **Extensions**: \`extension.where(url='custom-url').valueString\`
- **Complex Paths**: \`entry.resource.ofType(Observation).where(code.coding.code='12345').valueQuantity.value\`

### Your Response Style:
- Be helpful and technically accurate
- Provide specific examples relevant to their current JSON
- Explain FHIR concepts in accessible terms
- Offer concrete suggestions for improvements
- Use markdown formatting for code examples

### When providing JSON examples, always use proper formatting and explain the purpose of each field.`

    try {
      const response = await chatWithAI(conversation, systemPrompt)
      return response
    } catch (error) {
      console.error('Failed to get AI response:', error)
      throw new Error(
        'Sorry, I encountered an error while processing your request. Please try again.',
      )
    }
  }

  const {
    messages,
    isInitialLoading,
    sendMessage,
    retryMessage,
    isAnyMessageProcessing,
  } = useAIConversation({
    onSendMessage,
    getInitialMessage: async () => {
      return `I can help you with:
- FHIR card structure and examples
- JSON formatting and validation
- Field configuration (label, key, fhirPath)
- Common FHIR path expressions
- Troubleshooting JSON errors

What specific question do you have about your FHIR card configuration?`
    },
    maxRetries: 3,
    retryDelay: 1000,
  })

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSendMessage = async (inputValue: string) => {
    if (!inputValue.trim() || isAnyMessageProcessing) return
    await sendMessage(inputValue.trim())
  }

  const handleRetryMessage = async (messageId: string) => {
    await retryMessage(messageId)
  }

  return (
    <div className={`flex flex-col bg-gray-50 text-xs ${className}`}>
      <div className="p-3 border-b border-gray-200 bg-white">
        <div className="flex items-center">
          <MessageSquare className="h-4 w-4 mr-2 text-blue-600" />
          <h3 className="font-medium text-gray-900">AI Assistant</h3>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Ask for help with your JSON configuration
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isInitialLoading && (
          <div className="text-center text-gray-500 py-8">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 text-gray-400 animate-pulse" />
            <p>Loading AI Assistant...</p>
          </div>
        )}

        {!isInitialLoading && messages.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <p>Start a conversation</p>
            <p className="text-xs mt-1">
              Ask questions about FHIR card structure or JSON formatting
            </p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-[90%] rounded-lg p-2 break-words ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-900'
              } ${
                message.status === 'failed' ? 'border-red-300 bg-red-50' : ''
              } ${
                message.status === 'sending' || message.status === 'retrying'
                  ? 'opacity-70'
                  : ''
              }`}
            >
              <div className="overflow-hidden">
                {message.role === 'user' ? (
                  <p className="whitespace-pre-wrap break-words">
                    {message.content}
                  </p>
                ) : (
                  <Markdown>{message.content}</Markdown>
                )}
              </div>

              <div className="flex items-center justify-between mt-2">
                <p
                  className={`text-xs ${
                    message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                  }`}
                >
                  {new Date(message.timestamp).toLocaleTimeString()}
                  {message.status === 'sending' && ' • Sending...'}
                  {message.status === 'retrying' && ' • Retrying...'}
                  {message.status === 'failed' && ' • Failed'}
                </p>

                {message.status === 'failed' && message.role === 'user' && (
                  <button
                    type="button"
                    onClick={() => handleRetryMessage(message.id)}
                    className="ml-2 p-1 text-red-600 hover:text-red-800 focus:outline-none"
                    title="Retry message"
                  >
                    <RotateCcw className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {isAnyMessageProcessing && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm">
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <div
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: '0.1s' }}
                />
                <div
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: '0.2s' }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Invisible element to scroll to */}
        <div ref={messagesEndRef} />
      </div>

      <ChatInput
        onSendMessage={handleSendMessage}
        disabled={isAnyMessageProcessing}
      />
    </div>
  )
}
