'use client'

import { cn } from '@/lib/utils'
import { AlertTriangle, CheckSquare, Loader2 } from 'lucide-react'

// Status configuration for different task states
const STATUS_CONFIG = {
  completed: {
    bgColor: 'bg-green-100',
    textColor: 'text-green-700',
    icon: <CheckSquare className="h-3 w-3 mr-1" />,
  },
  'in-progress': {
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-700',
    icon: <Loader2 className="h-3 w-3 mr-1" />,
  },
  ready: {
    bgColor: 'bg-yellow-100',
    textColor: 'text-yellow-700',
    icon: <AlertTriangle className="h-3 w-3 mr-1" />,
  },
  default: {
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-700',
    icon: <CheckSquare className="h-3 w-3 mr-1" />,
  },
}

// Helper function to format tasks for Patient View
export const formatTasksForPatientView = (
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  tasks: any[],
  patientName: string,
  handleTaskClick: (
    description: string,
    status: string,
    patientName: string,
  ) => void,
) => {
  if (!tasks || !Array.isArray(tasks)) return ''

  // Filter out completed tasks
  const openTasks = tasks.filter((task) => task.status !== 'completed')

  if (openTasks.length === 0) return 'No open tasks'

  if (openTasks.length === 1) {
    return (
      // biome-ignore lint/a11y/useButtonType: <explanation>
      <button
        className="text-xs h-6 px-2 text-blue-500 hover:bg-blue-50 w-full text-left"
        onClick={() =>
          handleTaskClick(
            openTasks[0].description,
            openTasks[0].status,
            patientName,
          )
        }
      >
        <CheckSquare className="h-3 w-3 mr-1 shrink-0" />
        <span className="truncate">{openTasks[0].description}</span>
      </button>
    )
  }

  return (
    <div className="flex items-center">
      {/* biome-ignore lint/a11y/useButtonType: <explanation> */}
      <button
        className="text-xs h-6 px-2 text-blue-500 hover:bg-blue-50 text-left"
        onClick={() =>
          handleTaskClick(
            openTasks[0].description,
            openTasks[0].status,
            patientName,
          )
        }
      >
        <CheckSquare className="h-3 w-3 mr-1 shrink-0" />
        <span className="truncate">{openTasks[0].description}</span>
      </button>
      <span className="ml-2 px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">
        +{openTasks.length - 1}
      </span>
    </div>
  )
}

// Helper function to render task status with appropriate styling
export const renderTaskStatus = (
  status: string,
  description: string,
  patientName: string,
  handleTaskClick: (
    description: string,
    status: string,
    patientName: string,
  ) => void,
) => {
  const config =
    STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.default

  return (
    // biome-ignore lint/a11y/useButtonType: <explanation>
    <button
      className={cn(
        'inline-flex items-center px-1.5 py-0.5 rounded text-xs',
        config.bgColor,
        config.textColor,
        'hover:opacity-80',
      )}
      onClick={() => handleTaskClick(description, status, patientName)}
    >
      {config.icon}
      {status.charAt(0).toUpperCase() + status.slice(1).replace(/-/g, ' ')}
    </button>
  )
}
