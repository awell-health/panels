import {
  getNestedValue,
  getNestedValueFromBundle,
} from '../../../../../../lib/fhir-path'
import ExpandableCard from './ExpandableCard'
import CardRowItem from './CardRowItem'
import type { WorklistPatient, WorklistTask } from '@/lib/fhir-to-table-data'
import { useEffect, useState, type FC } from 'react'
import type { Bundle, Encounter, Observation } from '@medplum/fhirtypes'
import { handleError, createSearchFilter } from './utils'

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
  bundle: Bundle | undefined
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
    if (!bundle || !card?.fields) {
      return
    }

    const initialCardValues: { [key: string]: string | string[] } = {}

    try {
      for (const field of card.fields) {
        const fieldValue = getNestedValueFromBundle(bundle, field.fhirPath)
        initialCardValues[field.key] = fieldValue ?? ''
      }
      setCardValues(initialCardValues)
    } catch (error) {
      handleError(error, 'FhirExpandableCard.processCardValues')
      setCardValues({})
    }
  }, [card, bundle])

  if (searchQuery) {
    const searchFilter = createSearchFilter(searchQuery)

    const containString = card.fields.some((field) => {
      try {
        const fieldValue = cardValues[field.key]
        return searchFilter.matchesAnyText(field.label, fieldValue?.toString())
      } catch (error) {
        handleError(error, 'FhirExpandableCard.searchFilter')
        return false
      }
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
          try {
            const fieldValue = bundle
              ? getNestedValueFromBundle(bundle, field.fhirPath)
              : ''

            return (
              <CardRowItem
                key={field.key}
                fhirPath={field.fhirPath}
                label={field.label}
                value={fieldValue as string}
                searchQuery={searchQuery}
              />
            )
          } catch (error) {
            handleError(error, `FhirExpandableCard.renderField.${field.key}`)
            return null
          }
        })}
      </div>
    </ExpandableCard>
  )
}

export default FhirExpandableCard
