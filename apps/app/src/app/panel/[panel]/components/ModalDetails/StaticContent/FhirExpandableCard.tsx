import {
  getNestedValue,
  getNestedValueFromBundle,
} from '../../../../../../lib/fhir-path'
import ExpandableCard from './ExpandableCard'
import CardRowItem from './CardRowItem'
import type { WorklistPatient, WorklistTask } from '@/lib/fhir-to-table-data'
import { useEffect, useState, type FC } from 'react'
import type { Bundle, Encounter, Observation } from '@medplum/fhirtypes'

export interface FHIRCard {
  name: string
  fields: {
    label: string
    key: string
    fhirPath: string
    resourceType?: 'Task' | 'Patient'
  }[]
}
interface Props {
  searchQuery: string
  card: FHIRCard
  expanded: boolean
  bundle: Bundle
}
type ResourceType = WorklistTask | WorklistPatient | Observation[] | Encounter

const FhirExpandableCard: FC<Props> = ({
  searchQuery,
  card,
  expanded,
  bundle,
}) => {
  const [cardValues, setCardValues] = useState<{
    [key: string]: string | string[]
  }>({})

  useEffect(() => {
    if (!bundle) {
      return
    }

    const initialCardValues: { [key: string]: string | string[] } = {}

    for (const field of card.fields) {
      const fieldValue = getNestedValueFromBundle(bundle, field.fhirPath)

      initialCardValues[field.key] = fieldValue
    }

    setCardValues(initialCardValues)
  }, [card, bundle])

  if (searchQuery) {
    const containString = card.fields.some((field) => {
      const isInLabels = field.label
        .toLowerCase()
        .includes(searchQuery.toLowerCase())

      const isInValue = cardValues[field.key]
        ?.toString()
        .toLowerCase()
        .includes(searchQuery.toLowerCase())

      return isInLabels || isInValue
    })

    if (!containString) {
      return <></>
    }
  }

  const isEmptyBox = Object.values(cardValues).every(
    (value) => !value || value === '',
  )

  if (isEmptyBox) {
    return <></>
  }

  return (
    <ExpandableCard title={card.name} defaultExpanded={expanded}>
      <div className="space-y-2 mt-3">
        {card.fields.map((field) => {
          const fieldValue = getNestedValueFromBundle(bundle, field.fhirPath)

          return (
            <CardRowItem
              key={field.key}
              fhirPath={field.fhirPath}
              label={field.label}
              value={fieldValue as string}
              searchQuery={searchQuery}
            />
          )
        })}
      </div>
    </ExpandableCard>
  )
}

export default FhirExpandableCard
