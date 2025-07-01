'use server'

import type { ViewDefinition, WorklistDefinition } from '@/types/worklist'
import { OpenAI } from 'openai'
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions'
import { logger } from '@/lib/logger'

export type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

// TODO: Move this to the backend service
/**
 * TODO start using proper FHIR to extract the data structure
 * https://awellhealth.slack.com/archives/C06JLPNJZMG/p1748532575499539?thread_ts=1748525675.878809&cid=C06JLPNJZMG
 */
export const columnAiAssistantMessageHandler = async (
  messages: ChatMessage[],
  // biome-ignore lint/suspicious/noExplicitAny: Not sure if we have a better type
  data: any[],
  currentDefinition?: WorklistDefinition | ViewDefinition,
): Promise<{
  response: string
  needsDefinitionUpdate: boolean
  definition?: WorklistDefinition | ViewDefinition
}> => {
  const reducedData = data.slice(0, 2).map((item) => {
    // biome-ignore lint/suspicious/noExplicitAny: Not sure if we have a better type
    const reduceValue = (value: any): any => {
      if (typeof value === 'string') {
        return value.substring(0, 75)
      }
      if (Array.isArray(value)) {
        return value.map(reduceValue)
      }
      if (value && typeof value === 'object') {
        const reducedObj = { ...value }
        for (const key of Object.keys(reducedObj)) {
          reducedObj[key] = reduceValue(reducedObj[key])
        }
        return reducedObj
      }
      return value
    }

    return reduceValue(item)
  })

  const prompt = `You are a helpful assistant that helps users add columns to their view.
            
            Current worklist definition:
            ${JSON.stringify(currentDefinition, null, 2)}
            
            All the data is FHIR data.Available data: 
            ${JSON.stringify(reducedData, null, 2)}
            
            Your task is to:
            1. Explain what columns are possible to add based on the available data, please provide field based arrays and fields inside arrays as well. For tasks insure you provide all inputs. Do not provide the fhirpath syntax at this stage.
            2. Help users understand what each field represents
            3. Tell them that they can ask for whatever column they want and you will do it. Never suggest an json unless the user asks for a change to the worklist definition.
            4. When suggesting changes, include a complete updated worklist definition in JSON with the following structure:
            {
            "title": "A clear title for this worklist",
            "taskViewColumns": [
                    {
                        "id": "column_id", // a unique identifier for the column
                        "name": "column_name", // the name of the column
                        "type": "data_type", // Must be one of: "string" | "number" | "date" | "boolean" | "tasks" | "select" | "array"
                        "key": "field_name", // Must exist in the data structure and must use the fhirpath syntax to access the data
                        "description": "Brief description of what this column represents"
                    }
                ],
                "patientViewColumns": [
                    {
                        "id": "column_id", // a unique identifier for the column
                        "name": "column_name", // the name of the column
                        "type": "data_type", // Must be one of: "string" | "number" | "date" | "boolean" | "tasks" | "select" | "array"
                        "key": "field_name", // Must exist in the data structure and must use the fhirpath syntax to access the data
                        "description": "Brief description of what this column represents"
                    }
                ]
            }
                
            For date manipulation, you can use only the following functions as none of the others are supported:
            - addSeconds(date, seconds) // if you need to add days, use seconds = days * 24 * 60 * 60, same applies for any other unit of time
            - subtractDates(date1, date2)
            - toDateLiteral(date)
            - now()
            - today()

            Arithmetic operations are supported for numbers.
            String operations are supported for strings, here is the full list:
            - str1 + str2
            - str1 & str2
            - str.substring(start, end)
            - str.replace(old, new)
            - str.matches(regex)
            - str.startsWith(prefix)
            - str.endsWith(suffix)
            - str.contains(substring)

            When looking into extensions be aware that some extensions are inside other extensions. For that case you need to do:
            extension('https://awellhealth.com/fhir/StructureDefinition/awell-data-points').extension('call_category').valueString


            Be concise and clear in your explanations.
            When suggesting changes, always include the complete updated worklist definition in a JSON code block. Never add comments to the worklist JSON definition.
`
  const response = await chatWithAI(messages, prompt)

  const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/)
  if (jsonMatch) {
    logger.debug(
      {
        jsonMatch: jsonMatch[1],
        operationType: 'ai-chat',
        component: 'column-assistant',
        action: 'parse-definition',
      },
      'Found JSON definition in AI response',
    )

    try {
      const updatedDefinition = JSON.parse(jsonMatch[1])
      logger.info(
        {
          definitionType: updatedDefinition.title ? 'worklist' : 'view',
          columnCount:
            (updatedDefinition.taskViewColumns?.length || 0) +
            (updatedDefinition.patientViewColumns?.length || 0),
          operationType: 'ai-chat',
          component: 'column-assistant',
          action: 'definition-update',
        },
        'Successfully parsed worklist definition from AI response',
      )

      return {
        response: response,
        needsDefinitionUpdate: true,
        definition: updatedDefinition,
      }
    } catch (error) {
      logger.error(
        {
          rawJson: jsonMatch[1],
          responseLength: response.length,
          operationType: 'ai-chat',
          component: 'column-assistant',
          action: 'parse-definition',
        },
        'Failed to parse JSON definition from AI response',
        error instanceof Error ? error : new Error(String(error)),
      )

      return {
        response: response,
        needsDefinitionUpdate: false,
      }
    }
  }
  return {
    response: response,
    needsDefinitionUpdate: false,
  }
}

export async function chatWithAI(
  messages: ChatMessage[],
  botDescription?: string,
): Promise<string> {
  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })

    const systemMessage: ChatCompletionMessageParam = {
      role: 'system',
      content:
        botDescription ||
        'You are a helpful assistant that helps users set up healthcare ingestion integrations.',
    }

    const formattedMessages: ChatCompletionMessageParam[] = [
      systemMessage,
      ...messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
    ]

    logger.info(
      {
        messageCount: messages.length,
        lastMessageLength: messages[messages.length - 1]?.content.length || 0,
        model: 'gpt-4-turbo-preview',
        hasCustomBotDescription: !!botDescription,
        operationType: 'ai-chat',
        component: 'openai-client',
        action: 'send-message',
      },
      'Sending message to OpenAI',
    )

    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: formattedMessages,
      temperature: 0.2,
      max_tokens: 4096,
    })

    const responseContent =
      response.choices[0].message.content ||
      'I apologize, but I could not generate a response.'

    logger.info(
      {
        responseLength: responseContent.length,
        tokensUsed: response.usage?.total_tokens,
        promptTokens: response.usage?.prompt_tokens,
        completionTokens: response.usage?.completion_tokens,
        finishReason: response.choices[0].finish_reason,
        operationType: 'ai-chat',
        component: 'openai-client',
        action: 'receive-response',
      },
      'Successfully received OpenAI response',
    )

    return responseContent
  } catch (error) {
    logger.error(
      {
        messageCount: messages.length,
        model: 'gpt-4-turbo-preview',
        hasApiKey: !!process.env.OPENAI_API_KEY,
        operationType: 'ai-chat',
        component: 'openai-client',
        action: 'api-error',
      },
      'Failed to process chat request with OpenAI',
      error instanceof Error ? error : new Error(String(error)),
    )

    throw new Error('Failed to process chat request')
  }
}
