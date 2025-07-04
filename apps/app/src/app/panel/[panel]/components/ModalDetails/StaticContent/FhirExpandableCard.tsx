import { getNestedValue } from '../../../../../../lib/fhir-path'
import ExpandableCard from './ExpandableCard'
import CardRowItem from './CardRowItem'
import type { WorklistTask } from '../../../../../../hooks/use-medplum-store'
import type { FC } from 'react'

interface Props {
  task: WorklistTask
  searchQuery: string
  card: {
    name: string
    fields: { label: string; key: string; fhirPath: string }[]
  }
}

const FhirExpandableCard: FC<Props> = ({ task, searchQuery, card }) => {
  const getFieldValue = (fhirPath: string) => {
    const fieldValue = getNestedValue(task, fhirPath)

    return fieldValue
  }

  return (
    <ExpandableCard title={card.name} defaultExpanded={true}>
      <div className="space-y-2 text-sm mt-3">
        {card.fields.map((field) => (
          <CardRowItem
            key={field.key}
            label={field.label}
            value={getFieldValue(field.fhirPath)}
            searchQuery={searchQuery}
          />
        ))}
      </div>
    </ExpandableCard>
  )
}

export default FhirExpandableCard
