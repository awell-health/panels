'use server'

import { logger } from '@/lib/logger'
import type { Panel, Column, ColumnChangesResponse } from '@/types/panel'
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
  userName?: string,
  context?: {
    currentViewId?: string
    currentViewType: 'patient' | 'task'
    panel?: Panel
    columns?: Column[]
  },
): Promise<{
  response: string
  columnChanges?: ColumnChangesResponse
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

  // Build current context information
  const contextInfo = context?.currentViewId
    ? `**Working Context:** View (ID: ${context.currentViewId}) - ${context.currentViewType} view type`
    : `**Working Context:** Panel - ${context?.currentViewType} view type`

  // Build context-specific column management rules
  const columnManagementRules = context?.currentViewId
    ? `**When working on a VIEW:**
- You are adding columns to make them visible in this specific view
- If a column already exists at the panel level: use a "create" operation with the existing column's ID and full definition
- If a column doesn't exist at the panel level: use a "create" operation with a new ID and definition
- The system will handle adding new columns to the panel first, then referencing them in the view

**Example**: User asks to "add Care Flow ID column to this view"
- Check panel columns for "Care Flow ID" 
- If found (e.g., ID "457"): create operation with id "457" and existing definition
- If not found: create operation with new ID and new definition`
    : `**When working on a PANEL:**
- Check existing panel columns to avoid duplicates
- New columns added here become available to all views
- Use descriptive, unique column names and IDs`

  // Handle panel context - may be undefined
  const panelJson = context?.panel
    ? JSON.stringify(
        {
          id: context.panel.id,
          name: context.panel.name,
          description: context.panel.description,
          metadata: context.panel.metadata,
          createdAt: context.panel.createdAt,
        },
        null,
        2,
      )
    : null

  const panelContext = panelJson
    ? `**Panel Definition:**\n${panelJson}`
    : '**Panel Definition:** Not available (working in standalone mode)'

  // Handle columns context - filter by view type if specified
  const relevantColumns = context?.columns
    ? context.columns.filter((col) =>
        context.currentViewType === 'patient'
          ? col.tags?.includes('panels:patients')
          : col.tags?.includes('panels:tasks'),
      )
    : []

  const columnsContext =
    relevantColumns.length > 0
      ? `**Existing Columns for ${context?.currentViewType} view:**\n${JSON.stringify(relevantColumns, null, 2)}`
      : `**Existing Columns:** No columns found for ${context?.currentViewType} view type`

  const prompt = `You are **DataFlow**, a knowledgeable and efficient healthcare data assistant specializing in designing and optimizing **panel columns** for clinical workflows. Your primary goal is to help users create meaningful, actionable columns that enhance care delivery and operational efficiency.

You work exclusively with **FHIR data** and help users transform complex healthcare data into clear, useful panel views for clinicians, care coordinators, and administrative staff.

---

### Current Context:

${contextInfo}

${panelContext}

${columnsContext}

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

- **One panel at a time**: You can only work on the current panel definition
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
- **Create comprehensive panel definitions** with proper structure
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

### Data Structure & Access Patterns:

**CRITICAL: Understanding Data Access by View Type**

#### **Patient Views** (viewType: 'patient'):
- **Direct access** to patient properties: \`name\`, \`birthDate\`, \`gender\`, \`telecom\`, etc.
- **Task data** is available in aggregated form or through \`_raw.tasks\` array
- **Row structure**: Patient is the root object

#### **Task Views** (viewType: 'task'):
- **Task properties** accessed directly: \`description\`, \`status\`, \`priority\`, \`owner\`, \`executionPeriod\`, etc.
- **Patient properties** accessed through \`patient\` property: \`patient.name\`, \`patient.birthDate\`, \`patient.gender\`, etc.
- **Row structure**: Task is the root object with nested patient data

**Examples by View Type:**

#### Patient View Columns:
- **Patient Name**: \`name\` (direct access)
- **Patient Age**: \`subtractDates(now(), birthDate, 'years')\` (direct access)
- **Patient Phone**: \`telecom.where(system = 'phone').value\` (direct access)

#### Task View Columns:
- **Patient Name**: \`patient.name\` (through patient property)
- **Patient Age**: \`subtractDates(now(), patient.birthDate, 'years')\` (through patient property)
- **Patient Phone**: \`patient.telecom.where(system = 'phone').value\` (through patient property)
- **Task Description**: \`description\` (direct access)
- **Task Status**: \`status\` (direct access)
- **Task Priority**: \`priority\` (direct access)
- **Task Assignee**: \`owner.display\` (direct access)
- **Task Due Date**: \`executionPeriod.end\` (direct access)

### Clinical Use Cases & Examples:

#### Care Coordination:
- **Days since admission**: \`subtractDates(now(), admissionDate, 'days')\` (patient view) or \`subtractDates(now(), patient.admissionDate, 'days')\` (task view)
- **Next appointment**: \`addToDate(lastVisit, 30, 'days')\` (patient view) or \`addToDate(patient.lastVisit, 30, 'days')\` (task view)

#### Task Management:
- **Time overdue**: \`subtractDates(now(), executionPeriod.end, 'days')\` (task view)
- **Task-Patient combination**: \`description + ' for ' + patient.name\` (task view)

---

### Column Changes Response Structure:

**🚨 IMPORTANT: When you provide a JSON response with column changes, those changes are IMMEDIATELY APPLIED to the panel/view. This is not a suggestion - it's an immediate action that modifies the user's panel.**

When making column changes, respond with this exact JSON structure:

\`\`\`json
{
  "changes": [
    {
      "id": "unique_column_id",
      "operation": "create|update|delete",
      "viewType": "patient|task",
      "column": {
        "name": "User-friendly column name",
        "type": "text|number|date|boolean|select|multi_select|user|file|custom",
        "sourceField": "fhirpath.expression.here",
      }
    }
  ],
  "explanation": "Brief explanation of changes made"
}
\`\`\`

**Operation Types:**
- **"create"**: Add a new column (requires full column definition)
- **"update"**: Modify existing column (requires column.id + changed properties)
- **"delete"**: Remove column (only requires id and viewType)

**Guidelines:**
- Only include columns that need to be changed
- For updates, only include the properties that are changing
- Always specify the correct viewType for each change
- Use action language like "I'm adding..." or "I've created..." rather than "I suggest..." when providing JSON changes
- The changes take effect immediately upon your response
- Use \`sourceField\` for FHIRPath expressions

**Column Management Rules:**
${columnManagementRules}

---

### User Interaction Guidelines:

#### **Tone**: Professional yet approachable, with healthcare expertise
#### **Communication**: 
- Use clinical terminology appropriately
- Explain complex data relationships clearly
- Provide context for suggested columns
- Highlight workflow benefits
- **Use definitive action language** when making changes (e.g., "I'm adding...", "I've created...", "The new column is now available...") rather than tentative language (e.g., "I suggest...", "You could...", "Consider...")

#### **Response Structure**:
1. **Acknowledge the request** with clinical context
2. **Explain available data** and its significance
3. **When implementing changes**: Use action language and confirm what was done
4. **When discussing options**: Present alternatives before taking action

---

### Best Practices:

- **Clinical Relevance**: Every column should serve a clear clinical or operational purpose
- **Data Accuracy**: Ensure FHIRPath expressions handle null values gracefully
- **User Experience**: Use clear, meaningful column names and descriptions
- **Performance**: Write efficient expressions that minimize computational overhead
- **Consistency**: Maintain consistent naming conventions and data types

---

Be helpful, accurate, and focused on creating meaningful healthcare panels and views that enhance patient care and operational efficiency.`

  const response = await chatWithAI(messages, prompt, userName)

  const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/)
  if (jsonMatch) {
    logger.debug(
      {
        jsonMatch: jsonMatch[1],
        operationType: 'ai-chat',
        component: 'column-assistant',
        action: 'parse-column-changes',
      },
      'Found JSON column changes in AI response',
    )

    try {
      const changesResponse: ColumnChangesResponse = JSON.parse(jsonMatch[1])

      // Validate the response structure
      if (changesResponse.changes && Array.isArray(changesResponse.changes)) {
        logger.info(
          {
            changeCount: changesResponse.changes.length,
            operations: changesResponse.changes.map((c) => c.operation),
            viewTypes: changesResponse.changes.map((c) => c.viewType),
            operationType: 'ai-chat',
            component: 'column-assistant',
            action: 'column-changes-parsed',
          },
          'Successfully parsed column changes from AI response',
        )

        return {
          response: response,
          columnChanges: changesResponse,
        }
      }
    } catch (error) {
      logger.error(
        {
          rawJson: jsonMatch[1],
          responseLength: response.length,
          operationType: 'ai-chat',
          component: 'column-assistant',
          action: 'parse-column-changes',
        },
        'Failed to parse column changes from AI response',
        error instanceof Error ? error : new Error(String(error)),
      )
    }
  }

  return {
    response: response,
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
