import { useMedplumStore, type WorklistTask } from '@/hooks/use-medplum-store'
import { encompassCards } from './encompassCards'
import FhirExpandableCard from '../FhirExpandableCard'
import { useState, useEffect } from 'react'
import type { Composition } from '@medplum/fhirtypes'
import RenderValue from '../RenderValue'
import ExpandableCard from '../ExpandableCard'

const EncompassContent: React.FC<{
  task: WorklistTask
  searchQuery: string
  expanded: boolean
}> = ({ task, searchQuery, expanded }) => {
  const { patient } = task

  const { getPatientCompositions } = useMedplumStore()

  const [compositions, setCompositions] = useState<Composition[]>([])

  useEffect(() => {
    const fetchCompositions = async () => {
      const compositions = await getPatientCompositions(patient?.id ?? '')
      setCompositions(compositions)
    }
    fetchCompositions()
  }, [patient, getPatientCompositions])

  const patientCard = {
    name: 'Patient Demographics',
    fields: [
      {
        label: 'MRN',
        key: 'mrn',
        fhirPath:
          "identifier.where(system='https://www.encompasshealth.com').value",
      },
      { label: 'Name', key: 'name', fhirPath: 'name.first().text' },
      {
        label: 'Date of Birth / Age',
        key: 'date_of_birth_age',
        fhirPath: 'birthDate',
      },
      { label: 'Age', key: 'age', fhirPath: 'NO_DATA' },
      { label: 'Gender', key: 'gender', fhirPath: 'gender' },
      {
        label: 'Primary Language',
        key: 'primary_language',
        fhirPath: 'communication.language.coding.code',
      },
    ],
  }

  return (
    <>
      {task.patient && (
        <FhirExpandableCard
          key={patientCard.name}
          resource={task.patient}
          searchQuery={searchQuery}
          card={patientCard}
          expanded={expanded}
        />
      )}
      {encompassCards.map((card) => (
        <FhirExpandableCard
          key={card.name}
          resource={task}
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

export default EncompassContent
