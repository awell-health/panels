import type { WorklistTask } from '@/hooks/use-medplum-store'
import ExpandableCard from '../ExpandableCard'
import CardRowItem from '../CardRowItem'
import { wellpathCards } from './wellpathCards'
import FhirExpandableCard from '../FhirExpandableCard'

const WellpathContent: React.FC<{
  task: WorklistTask
  searchQuery: string
}> = ({ task, searchQuery }) => {
  const { patient } = task

  return (
    <>
      <ExpandableCard title="Patient demographics" defaultExpanded={true}>
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
      {wellpathCards.map((card) => (
        <FhirExpandableCard
          key={card.name}
          task={task}
          searchQuery={searchQuery}
          card={card}
        />
      ))}
    </>
  )
}

export default WellpathContent
