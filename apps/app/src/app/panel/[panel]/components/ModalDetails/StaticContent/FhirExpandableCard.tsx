import { getNestedValue } from '../../../../../../lib/fhir-path'
import ExpandableCard from './ExpandableCard'
import CardRowItem from './CardRowItem'
import type { WorklistTask } from '../../../../../../hooks/use-medplum-store'
import type { FC } from 'react'
import { getCardSummary } from './utils'

interface Props {
  task: WorklistTask
  searchQuery: string
  card: {
    name: string
    fields: { label: string; key: string; fhirPath: string }[]
  }
  expanded: boolean
}

const FhirExpandableCard: FC<Props> = ({
  task,
  searchQuery,
  card,
  expanded,
}) => {
  const getFieldValue = (fhirPath: string) => {
    const fieldValue = getNestedValue(task, fhirPath)

    return fieldValue
  }

  if (searchQuery) {
    const containString = card.fields.some(
      (field) =>
        field.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        getNestedValue(task, field.fhirPath)
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase()),
    )

    if (!containString) {
      return <></>
    }
  }

  return (
    <ExpandableCard
      title={card.name}
      defaultExpanded={expanded}
      summary={getCardSummary(task, card)}
    >
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
