import type { WorklistTask } from '@/hooks/use-medplum-store'
import { encompassCards } from './encompassCards'
import FhirExpandableCard from '../FhirExpandableCard'

const EncompassContent: React.FC<{
  task: WorklistTask
  searchQuery: string
  expanded: boolean
}> = ({ task, searchQuery, expanded }) => {
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
    </>
  )
}

export default EncompassContent
