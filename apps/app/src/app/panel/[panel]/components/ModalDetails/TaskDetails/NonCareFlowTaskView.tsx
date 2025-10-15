'use client'

import { useState } from 'react'
import { CheckCircle } from 'lucide-react'
import { useMedplumStore } from '@/hooks/use-medplum-store'
import { useToastHelpers } from '@/contexts/ToastContext'
import type { WorklistTask } from '@/lib/fhir-to-table-data'

interface NonCareFlowTaskViewProps {
  task: WorklistTask
}

const NonCareFlowTaskView = ({ task }: NonCareFlowTaskViewProps) => {
  const [isCompleting, setIsCompleting] = useState(false)
  const { updateTask } = useMedplumStore()
  const { showSuccess, showError } = useToastHelpers()

  const handleComplete = async () => {
    setIsCompleting(true)
    try {
      await updateTask(task.id, {
        status: 'completed',
      })

      showSuccess('Task completed', 'Task has been marked as completed')
    } catch (error) {
      console.error('Failed to complete task:', error)
      showError(
        'Failed to complete task',
        'Please try again or contact support if the issue persists',
      )
    } finally {
      setIsCompleting(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 space-y-4">
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            Task details
          </h3>
          <div className="text-sm text-gray-900 whitespace-pre-wrap">
            {task.description || 'No details provided'}
          </div>
        </div>

        {task.status === 'requested' && (
          <button
            type="button"
            onClick={handleComplete}
            disabled={isCompleting}
            className="btn btn-sm btn-success"
          >
            {isCompleting ? (
              <span className="loading loading-spinner loading-xs" />
            ) : (
              <CheckCircle className="h-4 w-4" />
            )}
            Complete Task
          </button>
        )}
      </div>
    </div>
  )
}

export default NonCareFlowTaskView
