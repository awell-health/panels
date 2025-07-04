'use client'

import {
  type ChatMessage,
  columnAiAssistantMessageHandler,
} from '@/app/actions/ai-chat'
import AIConversationDrawer from '@/components/AIConversationDrawer'
import { useDrawer } from '@/contexts/DrawerContext'
import type { WorklistPatient, WorklistTask } from '@/hooks/use-medplum-store'
import { logger } from '@/lib/logger'
import type { Column, ColumnChangesResponse, Panel } from '@/types/panel'
import { createElement, useCallback, useEffect, useMemo } from 'react'
import { useAuthentication } from './use-authentication'

interface UseColumnCreatorProps {
  currentViewType: 'patient' | 'task'
  patients: WorklistPatient[]
  tasks: WorklistTask[]
  panel: Panel | null
  columns: Column[]
  currentViewId?: string
  onColumnChanges: (changes: ColumnChangesResponse) => void
}

export function useColumnCreator({
  currentViewType,
  patients,
  tasks,
  panel,
  columns,
  currentViewId,
  onColumnChanges,
}: UseColumnCreatorProps) {
  const { openDrawer, closeDrawer } = useDrawer()
  const { user } = useAuthentication()
  const sourceData = currentViewType === 'patient' ? patients : tasks

  // Calculate column statistics using the provided columns
  const columnStats = useMemo(() => {
    const stats = {
      totalAvailableColumns: 0,
      usedColumns: 0,
    }

    if (sourceData.length > 0) {
      // Get all possible columns from the data
      const sampleObject = sourceData[0]
      stats.totalAvailableColumns = Object.keys(sampleObject).length
    }

    // Count currently used columns for this view type
    stats.usedColumns = columns.filter((col) =>
      currentViewType === 'patient'
        ? col.tags?.includes('panels:patients')
        : col.tags?.includes('panels:tasks'),
    ).length

    return stats
  }, [sourceData, columns, currentViewType])

  const hasColumnsAvailable =
    columnStats.totalAvailableColumns > columnStats.usedColumns

  // Log column creator initialization
  useEffect(() => {
    logger.info(
      {
        currentViewType,
        hasPanel: !!panel,
        patientCount: patients.length,
        taskCount: tasks.length,
        existingColumns: {
          totalColumns: columns.length,
          usedColumns: columnStats.usedColumns,
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
    panel,
    columns.length,
    columnStats.usedColumns,
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
  }, [currentViewType, patients, tasks, panel])

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
        // at some point we will need to stop sending the actual data values
          ? patients.map(patient => ({ ...patient, tasks: patient.tasks.slice(0, 1) })).slice(0, 2)
          : tasks.slice(0, 2),
        user?.name,
        {
          currentViewId,
          currentViewType,
          panel: panel || undefined,
          columns,
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
        hasExistingColumns: columns.length > 0,
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

  return {
    onAddColumn,
    hasColumnsAvailable,
    columnStats,
  }
}
