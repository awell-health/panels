'use client'

import { BaseCell } from './BaseCell'
import type { InteractiveCellProps } from './types'

export function AssigneeCell(props: InteractiveCellProps) {
  const { value, onAssigneeClick, currentUserName } = props

  return (
    <BaseCell {...props}>
      <div className="flex items-center">
        {value ? (
          (() => {
            const isCurrentUser =
              String(value).toLowerCase().trim() ===
              currentUserName?.toLowerCase().trim()

            return (
              <button
                type="button"
                className={`group flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors cursor-pointer ${
                  isCurrentUser
                    ? 'text-gray-700 hover:text-red-600 hover:bg-red-50'
                    : 'text-gray-700 hover:text-blue-600 hover:bg-blue-50'
                }`}
                onClick={(e) => {
                  e.stopPropagation()
                  onAssigneeClick?.()
                }}
                title={isCurrentUser ? 'Unassign' : 'Reassign to me'}
              >
                <span>{String(value)}</span>
                {isCurrentUser ? (
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500">
                    ×
                  </span>
                ) : (
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity text-blue-500">
                    →
                  </span>
                )}
              </button>
            )
          })()
        ) : (
          <button
            type="button"
            className="btn btn-outline btn-sm text-xs h-6 px-2 text-blue-500 hover:text-blue-600 border-blue-200"
            onClick={(e) => {
              e.stopPropagation()
              onAssigneeClick?.()
            }}
          >
            Assign to me
          </button>
        )}
      </div>
    </BaseCell>
  )
}
