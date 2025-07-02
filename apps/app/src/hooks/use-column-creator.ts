'use client'

import {
  type ChatMessage,
  columnAiAssistantMessageHandler,
} from '@/app/actions/ai-chat'
import AIConversationDrawer from '@/components/AIConversationDrawer'
import { useDrawer } from '@/contexts/DrawerContext'
import type { WorklistPatient, WorklistTask } from '@/hooks/use-medplum-store'
import type {
  ViewDefinition,
  WorklistDefinition,
  ColumnChangesResponse,
} from '@/types/worklist'
import { createElement, useCallback, useEffect } from 'react'
import { logger } from '@/lib/logger'
import { useAuthentication } from './use-authentication'

interface UseColumnCreatorProps {
  patients: WorklistPatient[]
  tasks: WorklistTask[]
  panelDefinition: WorklistDefinition | undefined
  currentViewType: 'patient' | 'task'
  currentViewId?: string // If defined, we're working on a specific view
  onColumnChanges: (changes: ColumnChangesResponse) => void
}

export const useColumnCreator = ({
  currentViewType,
  patients,
  tasks,
  panelDefinition,
  currentViewId,
  onColumnChanges,
}: UseColumnCreatorProps) => {
  const { openDrawer, closeDrawer } = useDrawer()
  const { user } = useAuthentication()

  // Log column creator initialization
  useEffect(() => {
    logger.info(
      {
        currentViewType,
        hasPanelDefinition: !!panelDefinition,
        patientCount: patients.length,
        taskCount: tasks.length,
        existingColumns: {
          taskViewColumns: panelDefinition?.taskViewColumns?.length || 0,
          patientViewColumns: panelDefinition?.patientViewColumns?.length || 0,
        },
        operationType: 'column-creator',
        component: 'useColumnCreator',
        action: 'session-init',
        userName: user?.name,
      },
      'Column creator session initialized',
    )
  }, [
    currentViewType,
    patients.length,
    tasks.length,
    panelDefinition,
    user?.name,
  ])

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  const getInitialMessage = useCallback(async () => {
    logger.debug(
      {
        currentViewType,
        dataAvailable:
          currentViewType === 'patient'
            ? patients.length > 0
            : tasks.length > 0,
        operationType: 'column-creator',
        component: 'useColumnCreator',
        action: 'initial-message',
      },
      'Generating initial AI message for column creator',
    )

    return `How can I assist you? I can list the existing columns and explain their meanings, help you add new columns to the panel or view, and assist with filtering or enriching columns. The current view type is: ${currentViewType}.`
  }, [currentViewType, patients, tasks, panelDefinition])

  const handleSendMessage = async (conversation: ChatMessage[]) => {
    const messageCount = conversation.length

    logger.info(
      {
        messageCount,
        currentViewType,
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
        currentViewType === 'patient'
          ? patients.slice(0, 2)
          : tasks.slice(0, 2),
        user?.name,
        {
          currentViewId,
          currentViewType,
          panelDefinition: panelDefinition
            ? { ...panelDefinition, views: [] }
            : undefined,
        },
      )

      if (result.columnChanges) {
        logger.info(
          {
            messageCount,
            changeCount: result.columnChanges.changes.length,
            operations: result.columnChanges.changes.map((c) => c.operation),
            viewTypes: result.columnChanges.changes.map((c) => c.viewType),
            operationType: 'column-creator',
            component: 'useColumnCreator',
            action: 'notify-column-changes',
            userName: user?.name,
          },
          'Notifying parent of column changes from AI assistant',
        )

        onColumnChanges(result.columnChanges)
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
          'AI response generated without column changes',
        )
      }

      return result.response
    } catch (error) {
      logger.error(
        {
          messageCount,
          currentViewType,
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
        currentViewType,
        trigger: 'user-action',
        hasExistingColumns:
          (panelDefinition?.taskViewColumns?.length || 0) +
            (panelDefinition?.patientViewColumns?.length || 0) >
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
