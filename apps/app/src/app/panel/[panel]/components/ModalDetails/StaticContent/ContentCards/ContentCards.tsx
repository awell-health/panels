import { useMedplumStore } from '@/hooks/use-medplum-store'
import FhirExpandableCard, { type FHIRCard } from '../FhirExpandableCard'
import { useEffect, useState } from 'react'
import type {
  Composition,
  Encounter,
  Observation,
  Resource,
} from '@medplum/fhirtypes'
import ExpandableCard from '../ExpandableCard'
import RenderValue from '../RenderValue'
import { useAuthentication } from '../../../../../../../hooks/use-authentication'
import type { WorklistPatient, WorklistTask } from '@/lib/fhir-to-table-data'
import { useReactivePanel } from '../../../../../../../hooks/use-reactive-data'
import { useParams } from 'next/navigation'
import { getCardConfigs } from '../../../../../../../utils/static/CardConfigs'

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
  useEffect(() => {
    const fetchObservations = async () => {
      const observations = await getPatientObservations(patient?.id ?? '')
      setObservations(observations)
    }

    const fetchEncounters = async () => {
      const encounters = await getPatientEncounters(patient?.id ?? '')
      setEncounters(encounters)
    }

    const fetchCompositions = async () => {
      const compositions = await getPatientCompositions(patient?.id ?? '')
      setCompositions(compositions)
    }

    if (patient?.id) {
      fetchObservations()
    }

    fetchCompositions()
    fetchEncounters()
  }, [
    patient,
    getPatientCompositions,
    getPatientObservations,
    getPatientEncounters,
  ])

  const bundle = {
    resourceType: 'Bundle' as const,
    type: 'collection' as const,
    entry: [
      {
        resource: patient as unknown as Resource,
      },
      {
        resource: task as unknown as Resource,
      },
      {
        resource: observations as unknown as Resource,
      },
      {
        resource: encounters as unknown as Resource,
      },
    ],
  }

  return (
    <>
      {contentCards.map((card, index) => (
        <FhirExpandableCard
          key={`${card.name}-${index}`}
          searchQuery={searchQuery}
          card={card}
          expanded={expanded}
          bundle={bundle}
        />
      ))}
      {compositions.map((composition) =>
        composition.section?.map((section) => (
          <ExpandableCard
            key={`${composition.id}-${section.id}-${section.title}`}
            title={`${composition.title} - ${section.title}`}
            defaultExpanded={expanded}
          >
            <RenderValue
              value={section.text?.div ?? ''}
              searchQuery={searchQuery}
            />
          </ExpandableCard>
        )),
      )}
    </>
  )
}

export default ContentCards
