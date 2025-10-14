'use client'

import { useState } from 'react'
import { Save, AlertCircle } from 'lucide-react'
import TaskStatusBadge from './TaskStatusBadge'
import type { WorklistTask } from '@/lib/fhir-to-table-data'
import { useMedplumStore } from '@/hooks/use-medplum-store'
import { useToastHelpers } from '@/contexts/ToastContext'

interface DraftTaskEditorProps {
  task: WorklistTask
}

const DraftTaskEditor = ({ task }: DraftTaskEditorProps) => {
  const [title, setTitle] = useState(task.code?.text || '')
  const [description, setDescription] = useState(task.description || '')
  const [isSaving, setIsSaving] = useState(false)
  const [hasAttemptedSave, setHasAttemptedSave] = useState(false)
  const [errors, setErrors] = useState<{
    title?: string
    description?: string
  }>({})

  const { updateTask } = useMedplumStore()
  const { showSuccess, showError } = useToastHelpers()

  const validateFields = () => {
    const newErrors: { title?: string; description?: string } = {}

    if (!title.trim()) {
      newErrors.title = 'Task title is required'
    }

    if (!description.trim()) {
      newErrors.description = 'Task description is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleFieldChange = (field: 'title' | 'description', value: string) => {
    if (field === 'title') {
      setTitle(value)
    } else {
      setDescription(value)
    }

    if (hasAttemptedSave) {
      const newErrors = { ...errors }
      if (value.trim()) {
        delete newErrors[field]
      } else {
        newErrors[field] = `Task ${field} is required`
      }
      setErrors(newErrors)
    }
  }

  const handleSave = async () => {
    setHasAttemptedSave(true)

    if (!validateFields()) {
      return
    }

    setIsSaving(true)
    try {
      await updateTask(task.id, {
        code: {
          text: title.trim(),
        },
        description: description.trim(),
        status: 'requested',
      })

      showSuccess(
        'Task created',
        'Task has been created and is now ready for assignment',
      )
    } catch (error) {
      console.error('Failed to save task:', error)
      showError(
        'Failed to save task',
        'Please try again or contact support if the issue persists',
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      <div className="flex justify-between items-center px-4 py-2 -mx-2 border-b border-gray-200 sticky top-0 bg-white h-[45px]">
        <div className="font-medium text-gray-900">New Task</div>
        <div className="flex items-center gap-2">
          <TaskStatusBadge status={task.status} />
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="btn btn-xs btn-success"
          >
            {isSaving ? (
              <span className="loading loading-spinner loading-xs" />
            ) : (
              <Save className="h-3 w-3" />
            )}
            Save
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4 h-[calc(100%-45px)] overflow-auto">
        <div>
          <label htmlFor="task-title" className="label">
            <span className="label-text font-medium">Task Title</span>
            {errors.title && (
              <span className="label-text-alt text-error flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.title}
              </span>
            )}
          </label>
          <input
            id="task-title"
            type="text"
            value={title}
            onChange={(e) => handleFieldChange('title', e.target.value)}
            placeholder="Enter task title"
            className={`input input-sm w-full ${errors.title ? 'input-error' : ''}`}
          />
        </div>

        <div>
          <label htmlFor="task-description" className="label">
            <span className="label-text font-medium">Task Description</span>
            {errors.description && (
              <span className="label-text-alt text-error flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.description}
              </span>
            )}
          </label>
          <textarea
            id="task-description"
            value={description}
            onChange={(e) => handleFieldChange('description', e.target.value)}
            placeholder="Enter detailed task description"
            rows={8}
            className={`textarea textarea-sm w-full ${errors.description ? 'textarea-error' : ''}`}
          />
        </div>
      </div>
    </>
  )
}

export default DraftTaskEditor
