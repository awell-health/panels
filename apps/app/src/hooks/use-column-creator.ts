'use client'

import {
  type ChatMessage,
  columnAiAssistantMessageHandler,
} from '@/app/actions/ai-chat'
import AIConversationDrawer from '@/components/AIConversationDrawer'
import { useDrawer } from '@/contexts/DrawerContext'
import type { WorklistPatient, WorklistTask } from '@/hooks/use-medplum-store'
import type { ViewDefinition, WorklistDefinition } from '@/types/worklist'
import { createElement, useCallback, useEffect } from 'react'
import { logger } from '@/lib/logger'
import { useAuthentication } from './use-authentication'

interface UseColumnCreatorProps {
  currentView: 'patient' | 'task'
  patients: WorklistPatient[]
  tasks: WorklistTask[]
  worklistDefinition: WorklistDefinition | ViewDefinition | undefined
  onDefinitionChange: (definition: WorklistDefinition | ViewDefinition) => void
}

export const useColumnCreator = ({
  currentView,
  patients,
  tasks,
  worklistDefinition,
  onDefinitionChange,
}: UseColumnCreatorProps) => {
  const { openDrawer, closeDrawer } = useDrawer()
  const { user } = useAuthentication()

  // Log column creator initialization
  useEffect(() => {
    logger.info(
      {
        currentView,
        hasWorklistDefinition: !!worklistDefinition,
        patientCount: patients.length,
        taskCount: tasks.length,
        existingColumns: {
          taskViewColumns: worklistDefinition?.taskViewColumns?.length || 0,
          patientViewColumns:
            worklistDefinition?.patientViewColumns?.length || 0,
        },
        operationType: 'column-creator',
        component: 'useColumnCreator',
        action: 'session-init',
        userName: user?.name,
      },
      'Column creator session initialized',
    )
  }, [
    currentView,
    patients.length,
    tasks.length,
    worklistDefinition,
    user?.name,
  ])

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  const getInitialMessage = useCallback(async () => {
    logger.debug(
      {
        currentView,
        dataAvailable:
          currentView === 'patient' ? patients.length > 0 : tasks.length > 0,
        operationType: 'column-creator',
        component: 'useColumnCreator',
        action: 'initial-message',
      },
      'Generating initial AI message for column creator',
    )

    return `How can I assist you? I can list the existing columns and explain their meanings, help you add new columns to the view, and assist with filtering or enriching columns. The current view is: ${currentView}.`
  }, [currentView, patients, tasks, worklistDefinition])

  const handleSendMessage = async (conversation: ChatMessage[]) => {
    const messageCount = conversation.length

    logger.info(
      {
        messageCount,
        currentView,
        lastMessageLength:
          conversation[conversation.length - 1]?.content?.length || 0,
        operationType: 'column-creator',
        component: 'useColumnCreator',
        action: 'process-message',
        userName: user?.name,
      },
      'Processing AI message for column creation',
    )

    try {
      const result = await columnAiAssistantMessageHandler(
        conversation,
        currentView === 'patient' ? patients.slice(0, 2) : tasks.slice(0, 2),
        worklistDefinition ? { ...worklistDefinition, views: [] } : undefined,
        user?.name,
      )

      if (result.needsDefinitionUpdate && result.definition) {
        logger.info(
          {
            messageCount,
            definitionType: result.definition.title ? 'worklist' : 'view',
            newColumnCount: {
              taskViewColumns: result.definition.taskViewColumns?.length || 0,
              patientViewColumns:
                result.definition.patientViewColumns?.length || 0,
            },
            previousColumnCount: {
              taskViewColumns: worklistDefinition?.taskViewColumns?.length || 0,
              patientViewColumns:
                worklistDefinition?.patientViewColumns?.length || 0,
            },
            operationType: 'column-creator',
            component: 'useColumnCreator',
            action: 'definition-update',
            userName: user?.name,
          },
          'Column definition updated by AI assistant',
        )

        onDefinitionChange(result.definition)
      } else {
        logger.debug(
          {
            messageCount,
            responseLength: result.response.length,
            operationType: 'column-creator',
            component: 'useColumnCreator',
            action: 'response-only',
            userName: user?.name,
          },
          'AI response generated without definition update',
        )
      }

      return result.response
    } catch (error) {
      logger.error(
        {
          messageCount,
          currentView,
          operationType: 'column-creator',
          component: 'useColumnCreator',
          action: 'process-message',
          userName: user?.name,
        },
        'Failed to process AI message for column creation',
        error instanceof Error ? error : new Error(String(error)),
      )

      throw error
    }
  }

  const onAddColumn = () => {
    logger.info(
      {
        currentView,
        trigger: 'user-action',
        hasExistingColumns:
          (worklistDefinition?.taskViewColumns?.length || 0) +
            (worklistDefinition?.patientViewColumns?.length || 0) >
          0,
        operationType: 'column-creator',
        component: 'useColumnCreator',
        action: 'open-assistant',
        userName: user?.name,
      },
      'Opening column creator assistant',
    )

    const handleClose = () => {
      logger.info(
        {
          trigger: 'user-close',
          operationType: 'column-creator',
          component: 'useColumnCreator',
          action: 'close-assistant',
          userName: user?.name,
        },
        'Closing column creator assistant',
      )

      closeDrawer()
    }

    const drawerContent = createElement(AIConversationDrawer, {
      getInitialMessage,
      onClose: handleClose,
      onSendMessage: handleSendMessage,
    })
    openDrawer(drawerContent, 'Column Creator Assistant')
  }

  return { onAddColumn }
}
