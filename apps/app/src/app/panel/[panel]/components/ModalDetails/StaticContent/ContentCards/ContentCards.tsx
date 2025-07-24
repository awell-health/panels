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
import { wellpathCards } from './Wellpath/wellpathCards'
import { useAuthentication } from '../../../../../../../hooks/use-authentication'
import defaultCards from './defaultCards'
import { waypointCards } from './Waypoint/waypointCards'
import encompassCards from './Encompass/encompassCards'
import type { WorklistPatient, WorklistTask } from '@/lib/fhir-to-table-data'
import { useReactivePanel } from '../../../../../../../hooks/use-reactive-data'
import { useParams } from 'next/navigation'

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

  const devContentCards = {
    'encompass-health': [...encompassCards],
    waypoint: [...waypointCards],
    wellpath: [...wellpathCards],
    default: [...defaultCards],
  }

  const [selectConfig, setSelectConfig] =
    useState<keyof typeof devContentCards>('default')

  let defaultContentCards: FHIRCard[] = []

  switch (organizationSlug) {
    case 'wellpath':
      defaultContentCards = [...wellpathCards]
      break
    case 'encompass-health':
      defaultContentCards = [...encompassCards]
      break
    case 'waypoint':
      defaultContentCards = [...waypointCards]
      break
    case 'awell-dev':
      defaultContentCards = [...devContentCards[selectConfig]]
      break
    default:
      defaultContentCards = [...defaultCards]
  }

  console.log('defaultContentCards', panel)

  const contentCards =
    (panel?.metadata?.cardsConfiguration as FHIRCard[]) ?? defaultContentCards

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
      {organizationSlug === 'awell-dev' && (
        <>
          {panel?.metadata?.cardsConfiguration && (
            <div className="text-xs p-2 bg-gray-200">
              Loaded from panel configuration
            </div>
          )}
          {!panel?.metadata?.cardsConfiguration && (
            <div className="flex-1 my-4 text-xs p-2 bg-gray-200">
              <label htmlFor="selectConfig">
                [awell-dev ONLY]: Select config
              </label>
              <select
                className="select"
                value={selectConfig}
                onChange={(e) =>
                  setSelectConfig(
                    e.target.value as keyof typeof devContentCards,
                  )
                }
              >
                {Object.keys(devContentCards).map((key) => (
                  <option key={key} value={key}>
                    {key}
                  </option>
                ))}
              </select>
            </div>
          )}
        </>
      )}
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
