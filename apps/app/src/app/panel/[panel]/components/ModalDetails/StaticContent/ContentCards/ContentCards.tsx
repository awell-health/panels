import { useMedplumStore } from '@/hooks/use-medplum-store'
import FhirExpandableCard, { type FHIRCard } from '../FhirExpandableCard'
import { useEffect, useState } from 'react'
import type {
  Composition,
  Encounter,
  Observation,
  Resource,
  Bundle,
  Appointment,
} from '@medplum/fhirtypes'
import ExpandableCard from '../ExpandableCard'
import RenderValue from '../RenderValue'
import { useAuthentication } from '../../../../../../../hooks/use-authentication'
import type { WorklistPatient, WorklistTask } from '@/lib/fhir-to-table-data'
import { useReactivePanel } from '../../../../../../../hooks/use-reactive-data-zustand'
import { useParams } from 'next/navigation'
import { getCardConfigs } from '../../../../../../../utils/static/CardConfigs'
import { RenderWithCopy } from '../RenderWithCopy'
import HighlightText from '../HighlightContent'
import { formatDateTime } from '@medplum/core'
import AppointmentsCard from './AppointmentsCard'

interface Props {
  task?: WorklistTask
  patient?: WorklistPatient
  searchQuery: string
  expanded: boolean
}

const ContentCards: React.FC<Props> = ({
  task,
  patient,
  searchQuery,
  expanded,
}) => {
  const { organizationSlug } = useAuthentication()
  const params = useParams()
  const panelId = params.panel as string
  const { panel } = useReactivePanel(panelId)

  const contentCards =
    (panel?.metadata?.cardsConfiguration as FHIRCard[]) ??
    getCardConfigs(organizationSlug ?? 'default')

  const {
    getPatientObservations,
    getPatientCompositions,
    getPatientEncounters,
    getPatientAppointments,
  } = useMedplumStore()
  const [observations, setObservations] = useState<Observation[]>([])
  const [compositions, setCompositions] = useState<Composition[]>([])
  const [encounters, setEncounters] = useState<Encounter[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [error, setError] = useState<string | null>(null)

  const fetchEncounters = async () => {
    if (!patient?.id) return
    const encounters = await getPatientEncounters(patient.id)
    setEncounters(encounters)
  }

  const fetchCompositions = async () => {
    if (!patient?.id) return
    const compositions = await getPatientCompositions(patient.id)
    setCompositions(compositions)
  }

  const fetchObservations = async () => {
    if (!patient?.id) return
    const observations = await getPatientObservations(patient.id)
    setObservations(observations)
  }

  const fetchAppointments = async () => {
    if (!patient?.id) return
    const appointments = await getPatientAppointments(patient.id)
    setAppointments(appointments)
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    fetchEncounters()
    fetchCompositions()
    fetchObservations()
    fetchAppointments()
  }, [patient?.id])

  // Create bundle with proper type safety
  const createBundle = (): Bundle => {
    const entries: { resource: Resource }[] = []

    // Add patient if it exists (use unknown cast to work around type mismatch)
    if (patient?.id) {
      entries.push({ resource: patient as unknown as Resource })
    }

    // Add task if it exists (use unknown cast to work around type mismatch)
    if (task?.id) {
      entries.push({ resource: task as unknown as Resource })
    }

    // Add individual observations if they exist
    for (const observation of observations) {
      if (observation?.resourceType === 'Observation') {
        entries.push({ resource: observation })
      }
    }

    // Add individual encounters if they exist
    for (const encounter of encounters) {
      if (encounter?.resourceType === 'Encounter') {
        entries.push({ resource: encounter })
      }
    }

    return {
      resourceType: 'Bundle' as const,
      type: 'collection' as const,
      entry: entries,
    }
  }

  const bundle = createBundle()

  if (error) {
    return (
      <div className="text-red-600 text-sm p-2 border border-red-200 rounded">
        Error loading data: {error}
      </div>
    )
  }

  return (
    <>
      {contentCards?.map((card, index) => (
        <FhirExpandableCard
          key={`${card.name}-${index}`}
          searchQuery={searchQuery}
          card={card}
          expanded={expanded}
          bundle={bundle}
        />
      ))}
      {appointments.length > 0 && (
        <AppointmentsCard appointments={appointments} expanded={expanded} />
      )}
      {compositions?.map((composition) =>
        composition.section?.map((section) => {
          if (!section.id || !section.title) return null

          return (
            <ExpandableCard
              key={`${composition.id}-${section.id}-${section.title}`}
              title={`${composition.title ?? 'Untitled'} - ${section.title}`}
              defaultExpanded={expanded}
            >
              <RenderValue
                value={section.text?.div ?? ''}
                searchQuery={searchQuery}
              />
            </ExpandableCard>
          )
        }),
      )}
    </>
  )
}

export default ContentCards
