'use client'

import { useOptimistic, useTransition } from 'react'
import { cn } from '@/lib/utils'
import { BaseCell } from './BaseCell'
import type { InteractiveCellProps } from './types'

type AssigneeState = {
  value: unknown
  isPending: boolean
}

export function AssigneeCell(props: InteractiveCellProps) {
  const { value, onAssigneeClick, currentUserName, columnWidth } = props
  const [isPending, startTransition] = useTransition()

  const [optimisticState, addOptimistic] = useOptimistic<
    AssigneeState,
    'assign' | 'unassign'
  >({ value, isPending: false }, (state, action) => {
    switch (action) {
      case 'assign':
        return { value: currentUserName, isPending: true }
      case 'unassign':
        return { value: null, isPending: true }
      default:
        return state
    }
  })

  const handleClick = async () => {
    const isCurrentUser =
      String(optimisticState.value || '')
        .toLowerCase()
        .trim() === currentUserName?.toLowerCase().trim()

    // Perform the actual action wrapped in transition
    startTransition(async () => {
      // Update optimistic state inside the transition
      if (optimisticState.value && isCurrentUser) {
        addOptimistic('unassign')
      } else {
        addOptimistic('assign')
      }

      // Call the actual API and await it
      await onAssigneeClick?.()
    })
  }

  const currentValue = optimisticState.value
  const isCurrentUser =
    String(currentValue || '')
      .toLowerCase()
      .trim() === currentUserName?.toLowerCase().trim()

  return (
    <BaseCell {...props} columnWidth={columnWidth}>
      <div className="flex items-center">
        {currentValue ? (
          <button
            type="button"
            className={cn('btn btn-xs btn-ghost group', {
              'hover:btn-error hover:btn-soft': isCurrentUser,
              'hover:btn-primary hover:btn-soft': !isCurrentUser,
            })}
            onClick={(e) => {
              e.stopPropagation()
              handleClick()
            }}
            title={isCurrentUser ? 'Unassign' : 'Reassign to me'}
            disabled={isPending}
          >
            <span>{String(currentValue)}</span>
            {isPending ? (
              <div className="h-3 w-3 animate-spin rounded-full border border-gray-300 border-t-gray-600" />
            ) : isCurrentUser ? (
              <span className="opacity-0 group-hover:opacity-100 transition-opacity text-white-500">
                ×
              </span>
            ) : (
              <span className="opacity-0 group-hover:opacity-100 transition-opacity text-white-500">
                →
              </span>
            )}
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-xs btn-primary btn-outline"
            onClick={(e) => {
              e.stopPropagation()
              handleClick()
            }}
            disabled={isPending}
          >
            {isPending ? (
              <div className="h-3 w-3 animate-spin rounded-full border border-blue-300 border-t-blue-600" />
            ) : null}
            Assign to me
          </button>
        )}
      </div>
    </BaseCell>
  )
}
