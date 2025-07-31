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
import type { Identifier, Resource } from '@medplum/fhirtypes'
import { Dialog, DialogContent } from '../../../../../components/ui/dialog'
import { getNestedProperty } from '@medplum/core'
import {
  getNestedValue,
  getNestedValueFromBundle,
} from '../../../../../lib/fhir-path'
import { useReactivePanel } from '../../../../../hooks/use-reactive-data'
import { getCardConfigs } from '../../../../../utils/static/CardConfigs'
import type { FHIRCard } from './StaticContent/FhirExpandableCard'
import { useParams } from 'next/navigation'

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

  const { organizationSlug } = useAuthentication()
  const params = useParams()
  const panelId = params.panel as string
  const { panel } = useReactivePanel(panelId)

  const contentCards =
    (panel?.metadata?.cardsConfiguration as FHIRCard[]) ??
    getCardConfigs(organizationSlug ?? 'default')

  // Internal state management
  const [currentPatient, setCurrentPatient] = useState<WorklistPatient | null>(
    null,
  )
  const [selectedTask, setSelectedTask] = useState<WorklistTask | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (patient) {
      setCurrentPatient(patient)
      setIsLoading(false)
    }
  }, [patient])

  useEffect(() => {
    if (task) {
      setSelectedTask(task)
      const resolvedPatient = patients.find((p) => p.id === task.patientId)
      if (resolvedPatient) {
        setCurrentPatient(resolvedPatient)
        setSelectedTask(task)
        setIsLoading(false)
      } else {
        setCurrentPatient(null)
        setIsLoading(false)
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
  const gender = currentPatient?.gender || ''

  const fhirPathForMrn = contentCards
    .find((card) => {
      return card.fields.find((field) => field.key === 'mrn')?.fhirPath
    })
    ?.fields.find((field) => field.key === 'mrn')?.fhirPath

  const mrn = getNestedValueFromBundle(
    {
      resourceType: 'Bundle',
      type: 'searchset',
      entry: [
        {
          resource: currentPatient as unknown as Resource,
        },
      ],
    },
    fhirPathForMrn ?? '',
  )

  return (
    <Dialog
      open={true}
      onOpenChange={onClose}
      className="max-w-[90vw] max-h-[90vh] h-full"
    >
      <div className="h-12 border-b border-gray-200 bg-gray-50 flex items-center justify-between flex-shrink-0 text-xs">
        <div className="flex items-center gap-2 text-gray-700 pl-4">
          <User className="h-5 w-5" />
          {isLoading ? (
            <span className="font-medium text-gray-500">
              Loading patient...
            </span>
          ) : !currentPatient ? (
            <span className="font-medium text-red-600">
              Error loading patient
            </span>
          ) : selectedTask ? (
            <button
              type="button"
              className="btn btn-sm btn-link text-blue-600 hover:underline px-1"
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
                  className="btn btn-xs btn-error btn-outline ml-2"
                >
                  <Trash2Icon className="w-4 h-4" />
                  Delete Patient & Tasks
                </button>
              )}
            </>
          )}
        </div>
        <div className="flex items-center gap-2 mx-1">
          <button
            onClick={onClose}
            className="btn btn-square btn-ghost btn-sm"
            type="button"
          >
            <X className="h-6 w-6 cursor-pointer hover:text-gray-800" />
          </button>
        </div>
      </div>
      <div className="flex h-[calc(100%-48px)]">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center gap-2">
            <div className="loading loading-spinner loading-lg text-primary" />
            <div className="text-gray-600 text-sm">
              Loading patient details...
            </div>
          </div>
        ) : !currentPatient ? (
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
    </Dialog>
  )
}

export default ModalDetails
