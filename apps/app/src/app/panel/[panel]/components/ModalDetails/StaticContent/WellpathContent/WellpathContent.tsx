import type { WorklistTask } from '@/lib/fhir-to-table-data'
import ExpandableCard from '../ExpandableCard'
import CardRowItem from '../CardRowItem'
import { wellpathCards } from './wellpathCards'
import FhirExpandableCard from '../FhirExpandableCard'
import { useEffect, useState } from 'react'
import { useMedplumStore } from '@/hooks/use-medplum-store'
import type { Composition } from '@medplum/fhirtypes'
import RenderValue from '../RenderValue'

const WellpathContent: React.FC<{
  task: WorklistTask
  searchQuery: string
  expanded: boolean
}> = ({ task, searchQuery, expanded }) => {
  const { patient } = task

  const showPatientDemographics = searchQuery
    ? patient?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient?.birthDate?.toLowerCase().includes(searchQuery.toLowerCase())
    : true

  const { getPatientCompositions } = useMedplumStore()
  const [compositions, setCompositions] = useState<Composition[]>([])

  useEffect(() => {
    const fetchCompositions = async () => {
      const compositions = await getPatientCompositions(patient?.id ?? '')
      setCompositions(compositions)
    }
    fetchCompositions()
  }, [patient, getPatientCompositions])

  return (
    <>
      {showPatientDemographics && (
        <ExpandableCard
          title="Patient demographics"
          defaultExpanded={expanded}
          summary={`${patient?.name}, ${patient?.birthDate}`}
        >
          <div className="space-y-2 text-sm mt-3">
            <CardRowItem
              label="Full Name"
              value={patient?.name}
              searchQuery={searchQuery}
            />
            <CardRowItem
              label="Date of Birth"
              value={patient?.birthDate}
              searchQuery={searchQuery}
            />
          </div>
        </ExpandableCard>
      )}
      {wellpathCards.map((card) => (
        <FhirExpandableCard
          key={card.name}
          task={task}
          searchQuery={searchQuery}
          card={card}
          expanded={expanded}
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

export default WellpathContent
