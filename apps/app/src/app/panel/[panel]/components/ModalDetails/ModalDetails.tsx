import { useToastHelpers } from '@/contexts/ToastContext'
import type { WorklistPatient, WorklistTask } from '@/lib/fhir-to-table-data'
import { logger } from '@/lib/logger'
import { Trash2Icon, User, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import PatientDetails from './PatientDetails/PatientDetails'
import TaskDetails from './TaskDetails/TaskDetails'
import { useAuthentication } from '@/hooks/use-authentication'
import { useMedplumStore } from '@/hooks/use-medplum-store'
import { useDateTimeFormat } from '@/hooks/use-date-time-format'
import type { Identifier } from '@medplum/fhirtypes'

interface ModalDetailsProps {
  patient?: WorklistPatient
  task?: WorklistTask
  onClose: () => void
}

const ModalDetails = ({ patient, task, onClose }: ModalDetailsProps) => {
  const { patients, tasks, deletePatient } = useMedplumStore()
  const { isAdmin } = useAuthentication()
  const { showSuccess, showError } = useToastHelpers()
  const { formatDate } = useDateTimeFormat()
  const modalRef = useRef<HTMLDivElement>(null)

  // Internal state management
  const [currentPatient, setCurrentPatient] = useState<WorklistPatient | null>(
    null,
  )
  const [selectedTask, setSelectedTask] = useState<WorklistTask | null>(null)

  useEffect(() => {
    if (patient) {
      setCurrentPatient(patient)
    }
  }, [patient])

  useEffect(() => {
    if (task) {
      setSelectedTask(task)
      const resolvedPatient = patients.find((p) => p.id === task.patientId)
      if (resolvedPatient) {
        setCurrentPatient(resolvedPatient)
        setSelectedTask(task)
      } else {
        setCurrentPatient(null)
        logger.error(
          {
            operationType: 'resolve-patient',
            component: 'modal-details',
            action: 'initialize-state',
          },
          'Failed to resolve patient for task',
          new Error(`Patient with ID ${task.patientId} not found in store`),
        )
      }
    }
  }, [task, patients])

  // biome-ignore lint/correctness/useExhaustiveDependencies: This hook needs to refresh the selected task when it's been updated in medplum
  useEffect(() => {
    if (selectedTask) {
      const updatedTask = tasks.find((t) => t.id === selectedTask.id)
      if (updatedTask) {
        setSelectedTask(updatedTask)
      }
    }
  }, [tasks])

  const handleDeleteRequest = async () => {
    if (!currentPatient) return

    try {
      await deletePatient(currentPatient.id)
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

  // Get patient name and DOB for header
  const patientName = currentPatient?.name || ''
  const dateOfBirth = currentPatient?.birthDate || ''
  const mrn = currentPatient?.identifier?.find(
    (identifier: Identifier) =>
      identifier.system === 'https://www.encompasshealth.com',
  )?.value
  const gender = currentPatient?.gender || ''

  return (
    <dialog className="modal modal-open text-xs">
      <div
        className="modal-box max-w-[95vw] min-h-[70vh] max-h-[80vh] p-0 flex flex-col"
        ref={modalRef}
      >
        <div className="h-12 border-b border-gray-200 bg-gray-50 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2 text-gray-700 pl-4">
            <User className="h-5 w-5" />
            {!currentPatient ? (
              <span className="font-medium text-red-600">
                Error loading patient
              </span>
            ) : selectedTask ? (
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
            {currentPatient && (
              <>
                {dateOfBirth && (
                  <>
                    <span>·</span>
                    <span>DOB {formatDate(dateOfBirth)}</span>
                  </>
                )}
                {mrn && (
                  <>
                    <span>·</span>
                    <span>MRN {mrn}</span>
                  </>
                )}
                {gender && (
                  <>
                    <span>·</span>
                    <span>Gender {gender}</span>
                  </>
                )}
                {currentPatient && !selectedTask && isAdmin && (
                  <button
                    type="button"
                    onClick={handleDeleteRequest}
                    className="btn btn-outline btn-error btn-xs ml-2"
                  >
                    <Trash2Icon className="w-4 h-4" />
                    Delete Patient & Tasks
                  </button>
                )}
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="h-8 w-8 p-0" type="button">
              <X className="h-6 w-6 cursor-pointer hover:text-gray-800" />
            </button>
          </div>
        </div>
        <div className="flex flex-1 overflow-hidden">
          {!currentPatient ? (
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="text-center">
                <div className="text-red-500 text-lg font-medium mb-2">
                  Unable to Load Patient
                </div>
                <div className="text-gray-600 text-sm max-w-md">
                  Patient data could not be loaded. Please try again later.
                </div>
              </div>
            </div>
          ) : selectedTask ? (
            <TaskDetails task={selectedTask} />
          ) : (
            <PatientDetails
              patient={currentPatient}
              setSelectedTask={setSelectedTask}
            />
          )}
        </div>
      </div>
    </dialog>
  )
}

export default ModalDetails
