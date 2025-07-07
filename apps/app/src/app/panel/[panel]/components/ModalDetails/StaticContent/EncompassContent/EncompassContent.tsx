import type { WorklistTask } from '@/hooks/use-medplum-store'
import { encompassCards } from './encompassCards'
import FhirExpandableCard from '../FhirExpandableCard'

const EncompassContent: React.FC<{
  task: WorklistTask
  searchQuery: string
  expanded: boolean
}> = ({ task, searchQuery, expanded }) => {
  return (
    <>
      {encompassCards.map((card) => (
        <FhirExpandableCard
          key={card.name}
          task={task}
          searchQuery={searchQuery}
          card={card}
          expanded={expanded}
        />
      ))}
    </>
  )
}

export default EncompassContent
