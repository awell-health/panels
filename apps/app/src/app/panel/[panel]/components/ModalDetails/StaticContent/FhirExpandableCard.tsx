import { getNestedValue } from '../../../../../../lib/fhir-path'
import ExpandableCard from './ExpandableCard'
import CardRowItem from './CardRowItem'
import type {
  WorklistPatient,
  WorklistTask,
} from '../../../../../../hooks/use-medplum-store'
import type { FC } from 'react'
import type { Observation } from '@medplum/fhirtypes'

export interface FHIRCard {
  name: string
  fields: {
    label: string
    key: string
    fhirPath: string
    resourceType: string
  }[]
}
interface Props {
  searchQuery: string
  card: FHIRCard
  expanded: boolean
  resources: {
    Task?: WorklistTask
    Patient?: WorklistPatient
    // Observation?: Observation[] // fix FHIR paths to work with Observation type
  }
}
type ResourceType = WorklistTask | WorklistPatient | Observation[]

const FhirExpandableCard: FC<Props> = ({
  searchQuery,
  card,
  expanded,
  resources,
}) => {
  const getFieldResourceValue = (
    res: ResourceType | undefined,
    fhirPath: string,
  ) => {
    if (!res) {
      return ''
    }

    const fieldValue = getNestedValue(res, fhirPath)

    return fieldValue
  }

  const renderResourceRow = (
    rowResource: ResourceType | undefined,
    field: {
      label: string
      key: string
      fhirPath: string
      resourceType?: string
    },
  ) => {
    if (!rowResource) {
      return null
    }
    const value = getFieldResourceValue(rowResource, field.fhirPath)

    return (
      <CardRowItem
        key={field.key}
        label={field.label}
        value={value}
        searchQuery={searchQuery}
      />
    )
  }

  if (searchQuery) {
    const containString = card.fields.some((field) => {
      const isInLabels = field.label
        .toLowerCase()
        .includes(searchQuery.toLowerCase())

      const resourceItem =
        resources[field.resourceType as keyof typeof resources]

      const isInValue = getFieldResourceValue(resourceItem, field.fhirPath)
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase())
      return isInLabels || isInValue
    })

    if (!containString) {
      return <></>
    }
  }

  const isEmptyBox = card.fields.every((field) => {
    const resourceType = field.resourceType
    const rowResource = resources[resourceType as keyof typeof resources]
    return !rowResource
  })

  if (isEmptyBox) {
    return <></>
  }

  return (
    <ExpandableCard title={card.name} defaultExpanded={expanded}>
      <div className="space-y-2 mt-3">
        {card.fields.map((field) => {
          const resourceType = field.resourceType
          const rowResource = resources[resourceType as keyof typeof resources]
          return renderResourceRow(rowResource, field)
        })}
      </div>
    </ExpandableCard>
  )
}

export default FhirExpandableCard
