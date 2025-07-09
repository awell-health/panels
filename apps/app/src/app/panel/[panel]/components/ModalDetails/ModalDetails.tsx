import { useToastHelpers } from '@/contexts/ToastContext'
import type { WorklistPatient, WorklistTask } from '@/hooks/use-medplum-store'
import { useMedplumStore } from '@/hooks/use-medplum-store'
import { logger } from '@/lib/logger'
import { Trash2Icon, User, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import PatientDetails from './PatientDetails/PatientDetails'
import TaskDetails from './TaskDetails/TaskDetails'

interface ModalDetailsProps {
  row: WorklistPatient | WorklistTask
  onClose: () => void
}

const ModalDetails = ({ row, onClose }: ModalDetailsProps) => {
  const { patient } = row
  const patientName = patient?.name || row.name || ''
  const dateOfBirth = patient?.birthDate || row.birthDate || ''
  const modalRef = useRef<HTMLDivElement>(null)

  const [selectedTask, setSelectedTask] = useState<WorklistTask | null>(null)

  const { deletePatient } = useMedplumStore()
  const { showSuccess, showError } = useToastHelpers()

  const handleDeleteRequest = async () => {
    try {
      await deletePatient(patient?.id || row.id)
      showSuccess(
        'Patient deleted',
        'Patient and all associated tasks have been deleted.',
      )
      onClose() // Close the modal after successful deletion
    } catch (error) {
      logger.error(
        {
          operationType: 'delete-patient',
          component: 'modal-details',
          action: 'delete-patient',
        },
        'Failed to delete patient',
        error instanceof Error ? error : new Error(String(error)),
      )
      showError('Delete failed', 'Failed to delete patient. Please try again.')
    }
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target as Node)
      ) {
        onClose()
      }
    }

    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEsc)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEsc)
    }
  }, [onClose])

  return (
    <dialog className="modal modal-open">
      <div
        className="modal-box max-w-[95vw] min-h-[70vh] max-h-[80vh] p-0 flex flex-col"
        ref={modalRef}
      >
        <div className="h-12 border-b border-gray-200 bg-gray-50 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2 text-sm text-gray-700 pl-4">
            <User className="h-5 w-5" />
            {selectedTask ? (
              <button
                type="button"
                className="hover:underline text-medium text-blue-600 cursor-pointer"
                onClick={() => setSelectedTask(null)}
              >
                {patientName}
              </button>
            ) : (
              <span className="font-medium">{patientName}</span>
            )}
            {dateOfBirth && (
              <>
                <span>·</span>
                <span>DOB {dateOfBirth}</span>
              </>
            )}
            {row.resourceType === 'Patient' && (
              <button
                type="button"
                onClick={handleDeleteRequest}
                className="btn btn-outline btn-error btn-xs ml-2"
              >
                <Trash2Icon className="w-4 h-4" />
                Delete Patient & Tasks
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="h-8 w-8 p-0" type="button">
              <X className="h-6 w-6 cursor-pointer hover:text-gray-800" />
            </button>
          </div>
        </div>
        <div className="flex flex-1 overflow-hidden">
          {row.resourceType === 'Patient' && (
            <>
              {!selectedTask && (
                <PatientDetails
                  patient={row as WorklistPatient}
                  setSelectedTask={setSelectedTask}
                  onDeleteRequest={handleDeleteRequest}
                />
              )}
              {selectedTask && <TaskDetails task={selectedTask} />}
            </>
          )}
          {row.resourceType === 'Task' && (
            <TaskDetails task={row as WorklistTask} />
          )}
        </div>
      </div>
    </dialog>
  )
}

export default ModalDetails
