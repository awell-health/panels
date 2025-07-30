import { useMedplumStore } from '@/hooks/use-medplum-store'
import FhirExpandableCard, { type FHIRCard } from '../FhirExpandableCard'
import { useEffect, useState } from 'react'
import type {
  Composition,
  Encounter,
  Observation,
  Resource,
  Bundle,
} from '@medplum/fhirtypes'
import ExpandableCard from '../ExpandableCard'
import RenderValue from '../RenderValue'
import { useAuthentication } from '../../../../../../../hooks/use-authentication'
import type { WorklistPatient, WorklistTask } from '@/lib/fhir-to-table-data'
import { useReactivePanel } from '../../../../../../../hooks/use-reactive-data'
import { useParams } from 'next/navigation'
import { getCardConfigs } from '../../../../../../../utils/static/CardConfigs'
import { handleError } from '../utils'

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
  } = useMedplumStore()
  const [observations, setObservations] = useState<Observation[]>([])
  const [compositions, setCompositions] = useState<Composition[]>([])
  const [encounters, setEncounters] = useState<Encounter[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      if (!patient?.id) return

      setIsLoading(true)
      setError(null)

      try {
        const [observationsData, encountersData, compositionsData] =
          await Promise.allSettled([
            getPatientObservations(patient.id),
            getPatientEncounters(patient.id),
            getPatientCompositions(patient.id),
          ])

        if (observationsData.status === 'fulfilled') {
          setObservations(observationsData.value || [])
        } else {
          handleError(observationsData.reason, 'ContentCards.fetchObservations')
        }

        if (encountersData.status === 'fulfilled') {
          setEncounters(encountersData.value || [])
        } else {
          handleError(encountersData.reason, 'ContentCards.fetchEncounters')
        }

        if (compositionsData.status === 'fulfilled') {
          setCompositions(compositionsData.value || [])
        } else {
          handleError(compositionsData.reason, 'ContentCards.fetchCompositions')
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Unknown error occurred'
        handleError(err, 'ContentCards.fetchData')
        setError(errorMessage)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [
    patient?.id,
    getPatientCompositions,
    getPatientObservations,
    getPatientEncounters,
  ])

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
