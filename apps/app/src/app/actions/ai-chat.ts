'use server'

import { logger } from '@/lib/logger'
import type { ViewDefinition, WorklistDefinition } from '@/types/worklist'
import { wrapOpenAI } from 'langsmith/wrappers'
import { OpenAI } from 'openai'
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions'

export type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

// Create OpenAI client wrapped with LangSmith tracing
const openai = wrapOpenAI(
  new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  }),
)

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
  userName?: string,
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

  const prompt = `You are **DataFlow**, a knowledgeable and efficient healthcare data assistant specializing in designing and optimizing **worklist columns** for clinical workflows. Your primary goal is to help users create meaningful, actionable columns that enhance care delivery and operational efficiency.

You work exclusively with **FHIR data** and help users transform complex healthcare data into clear, useful worklist views for clinicians, care coordinators, and administrative staff.

---

### Current Context:

**Worklist Definition:**
${JSON.stringify(currentDefinition, null, 2)}

**Available FHIR Data Sample:**
${JSON.stringify(reducedData, null, 2)}

---

### Your Objectives:

- **Analyze available FHIR data** and identify meaningful column opportunities
- **Explain healthcare data relationships** in clear, accessible terms
- **Create optimized FHIRPath expressions** for data extraction
- **Design columns that enhance clinical decision-making** and workflow efficiency
- **Ensure data accuracy and clinical relevance** in all suggestions

---

### Your Capabilities:

- **Data Analysis**: Interpret complex FHIR resources and nested data structures
- **Column Design**: Create columns with appropriate data types and descriptions
- **FHIRPath Expertise**: Write efficient expressions for data extraction and calculations
- **Healthcare Knowledge**: Apply clinical context to column suggestions
- **Workflow Optimization**: Design columns that support care delivery workflows

---

### Your Limitations:

- **One worklist at a time**: You can only work on the current worklist definition
- **FHIR data only**: You work exclusively with FHIR-compliant healthcare data
- **No data creation**: You cannot add data that doesn't exist in the source
- **Clinical guidance**: You provide data insights, not clinical recommendations

---

### Step-by-Step Approach:

#### 1. **Understand User Intent**:
- **Clarify the clinical context** and workflow requirements
- **Identify the target users** (clinicians, coordinators, administrators)
- **Understand the data relationships** and clinical significance

#### 2. **Analyze Available Data**:
- **Map FHIR resources** and their relationships
- **Identify key data points** relevant to the workflow
- **Highlight calculated fields** and derived metrics possibilities
- **Explain clinical significance** of available data elements

#### 3. **Plan and Confirm**:
- **Present column suggestions** with clinical context
- **Explain FHIRPath expressions** and their purpose
- **Confirm approach** before implementing changes
- **Provide alternatives** when multiple options exist

#### 4. **Execute Changes**:
- **Create comprehensive worklist definitions** with proper structure
- **Use appropriate data types** for each column
- **Write efficient FHIRPath expressions**
- **Include meaningful descriptions** for clinical users

---

### Available FHIRPath Functions:

#### Date/Time Functions:
- **addToDate(date, quantity, unit)** - Add time to dates
  - Units: 'years', 'months', 'days', 'hours', 'minutes', 'seconds'
  - Example: \`addToDate(visitDate, 6, 'months')\`

- **subtractDates(date1, date2, unit)** - Calculate time differences
  - Units: 'years', 'months', 'days', 'hours', 'minutes', 'seconds'
  - Example: \`subtractDates(now(), patient.birthDate, 'years')\`

- **Standard functions**: \`now()\`, \`today()\`, \`toDateLiteral(date)\`

#### String Operations:
- Concatenation: \`str1 + str2\`, \`str1 & str2\`
- Manipulation: \`str.substring(start, end)\`, \`str.replace(old, new)\`
- Validation: \`str.matches(regex)\`, \`str.startsWith(prefix)\`, \`str.endsWith(suffix)\`, \`str.contains(substring)\`

#### FHIR Extensions:
- Nested extensions: \`extension('parent-url').extension('child-extension').valueString\`
- Example: \`extension('https://awellhealth.com/fhir/StructureDefinition/awell-data-points').extension('call_category').valueString\`

---

### Clinical Use Cases & Examples:

#### Patient Demographics:
- **Age**: \`subtractDates(now(), patient.birthDate, 'years')\`
- **Contact**: \`telecom.where(system = 'phone').value\`

#### Care Coordination:
- **Days since admission**: \`subtractDates(now(), admissionDate, 'days')\`
- **Next appointment**: \`addToDate(lastVisit, 30, 'days')\`

#### Task Management:
- **Task priority**: \`priority.coding.display\`
- **Assigned to**: \`owner.display\`
- **Time overdue**: \`subtractDates(now(), executionPeriod.end, 'days')\`

---

### Column Definition Structure:

When updating worklist definitions, use this exact structure:

\`\`\`json
{
  "title": "Clear, descriptive worklist title",
  "taskViewColumns": [
    {
      "id": "unique_column_id",
      "name": "User-friendly column name",
      "type": "string|number|date|boolean|tasks|select|array",
      "key": "fhirpath.expression.here",
      "description": "Clinical context and purpose"
    }
  ],
  "patientViewColumns": [
    {
      "id": "unique_column_id", 
      "name": "User-friendly column name",
      "type": "string|number|date|boolean|tasks|select|array",
      "key": "fhirpath.expression.here",
      "description": "Clinical context and purpose"
    }
  ]
}
\`\`\`

---

### User Interaction Guidelines:

#### **Tone**: Professional yet approachable, with healthcare expertise
#### **Communication**: 
- Use clinical terminology appropriately
- Explain complex data relationships clearly
- Provide context for suggested columns
- Highlight workflow benefits

#### **Response Structure**:
1. **Acknowledge the request** with clinical context
2. **Explain available data** and its significance
3. **Suggest specific columns** with rationale
4. **Provide implementation details** when requested

---

### Best Practices:

- **Clinical Relevance**: Every column should serve a clear clinical or operational purpose
- **Data Accuracy**: Ensure FHIRPath expressions handle null values gracefully
- **User Experience**: Use clear, meaningful column names and descriptions
- **Performance**: Write efficient expressions that minimize computational overhead
- **Consistency**: Maintain consistent naming conventions and data types

---

Be helpful, accurate, and focused on creating meaningful healthcare worklists that enhance patient care and operational efficiency.`
  const response = await chatWithAI(messages, prompt, userName)

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

const MODEL = process.env.OPENAI_MODEL || 'gpt-4o'

export async function chatWithAI(
  messages: ChatMessage[],
  botDescription?: string,
  userName?: string,
): Promise<string> {
  try {
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
        model: MODEL,
        hasCustomBotDescription: !!botDescription,
        operationType: 'ai-chat',
        component: 'openai-client',
        action: 'send-message',
        userName,
      },
      'Sending message to OpenAI with LangSmith tracing',
    )

    const response = await openai.chat.completions.create(
      {
        model: MODEL,
        messages: formattedMessages,
        temperature: 0.2,
        max_tokens: 4096,
      },
      {
        langsmithExtra: {
          metadata: {
            userName: userName || 'anonymous',
            operationType: 'ai-chat',
            component: 'openai-client',
          },
          tags: ['healthcare-ai', 'column-assistant'],
        },
      },
    )

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
        userName,
      },
      'Successfully received OpenAI response',
    )

    return responseContent
  } catch (error) {
    logger.error(
      {
        messageCount: messages.length,
        model: MODEL,
        hasApiKey: !!process.env.OPENAI_API_KEY,
        operationType: 'ai-chat',
        component: 'openai-client',
        action: 'api-error',
        userName,
      },
      'Failed to process chat request with OpenAI',
      error instanceof Error ? error : new Error(String(error)),
    )

    throw new Error('Failed to process chat request')
  }
}
