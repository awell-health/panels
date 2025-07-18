import {
  useMedplumStore,
  type WorklistPatient,
  type WorklistTask,
} from '@/hooks/use-medplum-store'
import FhirExpandableCard from '../FhirExpandableCard'
import { useEffect, useState } from 'react'
import type { Composition } from '@medplum/fhirtypes'
import ExpandableCard from '../ExpandableCard'
import RenderValue from '../RenderValue'
import { wellpathCards } from './Wellpath/wellpathCards'
import { useAuthentication } from '../../../../../../../hooks/use-authentication'
import defaultCards from './defaultCards'
import { waypointCards } from './Waypoint/waypointCards'
import encompassCards from './Encompass/encompassCards'

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

  let contentCards = []

  switch (organizationSlug) {
    case 'wellpath':
      contentCards = [...wellpathCards]
      break
    case 'encompass-health':
      contentCards = [...encompassCards]
      break
    case 'waypoint':
      contentCards = [...waypointCards]
      break
    case 'awell-dev':
      contentCards = [
        ...defaultCards,
        ...wellpathCards,
        ...encompassCards,
        ...waypointCards,
      ]
      break
    default:
      contentCards = [...defaultCards]
  }

  console.log(organizationSlug)

  const { getPatientObservations, getPatientCompositions } = useMedplumStore()
  // const [observations, setObservations] = useState<Observation[]>([])
  const [compositions, setCompositions] = useState<Composition[]>([])

  useEffect(() => {
    // const fetchObservations = async () => {
    //   const observations = await getPatientObservations(patient?.id ?? '')
    //   setObservations(observations)
    // }

    const fetchCompositions = async () => {
      const compositions = await getPatientCompositions(patient?.id ?? '')
      setCompositions(compositions)
    }

    // fetchObservations()
    fetchCompositions()
  }, [patient, getPatientCompositions])

  return (
    <>
      {contentCards.map((card, index) => (
        <FhirExpandableCard
          key={`${card.name}-${index}`}
          searchQuery={searchQuery}
          card={card}
          expanded={expanded}
          resources={{
            Task: task,
            Patient: patient,
            // Observation: observations, // TODO: fix FHIR paths to work with Observation type
          }}
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
