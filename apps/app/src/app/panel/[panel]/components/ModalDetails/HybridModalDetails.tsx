import { useToastHelpers } from '@/contexts/ToastContext'
import { logger } from '@/lib/logger'
import { Trash2Icon, User, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { AppointmentDetails } from './AppointmentDetails'
import { useAuthentication } from '@/hooks/use-authentication'
import { useMedplumStore } from '@/hooks/use-medplum-store'
import { useDateTimeFormat } from '@/hooks/use-date-time-format'
import type {
  Patient,
  Resource,
  ResourceType,
  Bundle,
  BundleEntry,
  Appointment,
  Location,
} from '@medplum/fhirtypes'
import { Dialog } from '../../../../../components/ui/dialog'
import { getNestedValueFromBundle } from '../../../../../lib/fhir-path'
import { useReactivePanel } from '../../../../../hooks/use-reactive-data-zustand'
import { getCardConfigs } from '../../../../../utils/static/CardConfigs'
import type { FHIRCard } from './StaticContent/FhirExpandableCard'
import type { Panel } from '@/types/panel'
import { useParams, useRouter } from 'next/navigation'
import type { WorklistPatient } from '@/lib/fhir-to-table-data'
import { getPatientName } from '@/lib/patient-utils'
import {
  useBundleByResourceId,
  useFHIRStore,
} from '../../../../../lib/fhir-store'

interface Props {
  resourceType: ResourceType
  resourceId: string
  pathname: string
  onClose: () => void
}

const HybridModalDetails = ({
  resourceType,
  resourceId,
  pathname,
  onClose,
}: Props) => {
  const { getBundleByResourceId } = useFHIRStore()
  const { deletePatient } = useMedplumStore()
  const { isAdmin } = useAuthentication()
  const { showSuccess, showError } = useToastHelpers()
  const { formatDate } = useDateTimeFormat()
  const modalRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const { organizationSlug } = useAuthentication()
  const params = useParams()
  const panelId = params.panel as string
  const { panel } = useReactivePanel(panelId)

  const [data, setData] = useState<{
    appointment?: Appointment
    patient?: Patient
    location?: Location
  }>({})

  const contentCards =
    (panel?.metadata?.cardsConfiguration as FHIRCard[]) ??
    getCardConfigs(organizationSlug ?? 'default')

  const [isLoading, setIsLoading] = useState(true)

  // Subscribe to the specific bundle so modal re-renders on store updates
  const subscribedBundle = useBundleByResourceId(resourceType, resourceId)

  useEffect(() => {
    const mapData = async () => {
      const bundle =
        subscribedBundle ?? getBundleByResourceId(resourceType, resourceId)
      const entries: BundleEntry[] =
        bundle?.resource?.resourceType === 'Bundle'
          ? ((bundle.resource as Bundle).entry ?? [])
          : []
      const resources = entries
        .map((e) => e.resource)
        .filter(Boolean) as Resource[]

      const resourcesData: Record<string, Resource> = {}
      for (const resource of resources) {
        resourcesData[resource.resourceType.toLowerCase()] = resource
      }
      setData(resourcesData)
      setIsLoading(false)
    }

    mapData()
  }, [resourceId, resourceType, getBundleByResourceId, subscribedBundle])

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

  const { patient, appointment, location } = data

  if (!patient) {
    return null
  }

  // Get patient name and DOB for header
  const patientName = getPatientName(patient as unknown as WorklistPatient)
  const dateOfBirth: string = patient?.birthDate ?? ''
  const gender: string = patient?.gender ?? ''

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

  const handleDeleteRequest = async () => {
    if (!patient || !patient.id) return

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

  return (
    <Dialog
      open={true}
      onOpenChange={onClose}
      className="max-w-[90vw] max-h-[90vh] h-full"
    >
      <div
        className="h-12 border-b border-gray-200 bg-gray-50 flex items-center justify-between flex-shrink-0 text-xs"
        data-patient-id={patient?.id}
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
          ) : appointment ? (
            <span className="font-medium">{patientName}</span>
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
              {patient && !appointment && isAdmin && (
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
            aria-label="Close modal"
          >
            <X className="h-6 w-6 cursor-pointer hover:text-gray-800" />
          </button>
        </div>
      </div>
      <div className="flex h-[calc(100%-48px)]">
        {isLoading && (
          <div className="flex-1 flex items-center justify-center gap-2">
            <div className="loading loading-spinner loading-lg text-primary" />
            <div className="text-gray-600 text-sm">
              Loading patient details...
            </div>
          </div>
        )}
        {appointment && (
          <AppointmentDetails
            location={location}
            appointment={appointment}
            patient={patient}
          />
        )}
      </div>
    </Dialog>
  )
}

export default HybridModalDetails
