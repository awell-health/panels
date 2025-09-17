import { useToastHelpers } from '@/contexts/ToastContext'
import { logger } from '@/lib/logger'
import { Trash2Icon, User, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import PatientDetails from './PatientDetails/PatientDetails'
import TaskDetails from './TaskDetails/TaskDetails'
import { useAuthentication } from '@/hooks/use-authentication'
import { useMedplumStore } from '@/hooks/use-medplum-store'
import { useDateTimeFormat } from '@/hooks/use-date-time-format'
import type { Resource } from '@medplum/fhirtypes'
import { Dialog } from '../../../../../components/ui/dialog'
import { getNestedValueFromBundle } from '../../../../../lib/fhir-path'
import { useReactivePanel } from '../../../../../hooks/use-reactive-data'
import { getCardConfigs } from '../../../../../utils/static/CardConfigs'
import type { FHIRCard } from './StaticContent/FhirExpandableCard'
import { useParams, useRouter } from 'next/navigation'

interface Props {
  patientId?: string
  taskId?: string
  pathname: string
  onClose: () => void
}

const ModalDetails = ({ patientId, taskId, pathname, onClose }: Props) => {
  const { patients, tasks, deletePatient } = useMedplumStore()
  const { isAdmin } = useAuthentication()
  const { showSuccess, showError } = useToastHelpers()
  const { formatDate } = useDateTimeFormat()
  const modalRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const { organizationSlug } = useAuthentication()
  const params = useParams()
  const panelId = params.panel as string
  const { panel } = useReactivePanel(panelId)

  const task = taskId ? tasks.find((t) => t.id === taskId) : null
  const patient = patients.find((p) => {
    if (patientId) {
      return p.id === patientId
    }

    if (taskId && task) {
      return p.id === task.patientId
    }

    return false
  })

  const contentCards =
    (panel?.metadata?.cardsConfiguration as FHIRCard[]) ??
    getCardConfigs(organizationSlug ?? 'default')

  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (patient) {
      setIsLoading(false)
    }
  }, [patient])

  const handleDeleteRequest = async () => {
    if (!patient) return

    try {
      await deletePatient(patient.id)
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
  const patientName = patient?.name || ''
  const dateOfBirth = patient?.birthDate || ''
  const gender = patient?.gender || ''

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
          resource: patient as unknown as Resource,
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
      <div
        className="h-12 border-b border-gray-200 bg-gray-50 flex items-center justify-between flex-shrink-0 text-xs"
        data-patient-id={patient?.id}
        data-task-id={task?.id}
      >
        <div className="flex items-center gap-2 text-gray-700 pl-4">
          <User className="h-5 w-5" />
          {isLoading ? (
            <span className="font-medium text-gray-500">
              Loading patient...
            </span>
          ) : !patient ? (
            <span className="font-medium text-red-600">
              Error loading patient
            </span>
          ) : task ? (
            <button
              type="button"
              className="btn btn-sm btn-link text-blue-600 hover:underline px-1"
              onClick={() =>
                router.push(`${pathname}?patientId=${patient?.id}`)
              }
            >
              {patientName}
            </button>
          ) : (
            <span className="font-medium">{patientName}</span>
          )}
          {patient && (
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
              {patient && !task && isAdmin && (
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
        ) : !patient ? (
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
        ) : task ? (
          <TaskDetails task={task} />
        ) : (
          <PatientDetails
            patient={patient}
            setSelectedTask={(item) => {
              router.push(`${pathname}?taskId=${item?.id}`)
            }}
          />
        )}
      </div>
    </Dialog>
  )
}

export default ModalDetails
