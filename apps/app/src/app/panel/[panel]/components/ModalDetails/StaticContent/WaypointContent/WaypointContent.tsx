import type { WorklistTask } from '@/hooks/use-medplum-store'
import FhirExpandableCard from '../FhirExpandableCard'
import { waypointCards } from './waypointCards'
import CardRowItem from '../CardRowItem'
import ExpandableCard from '../ExpandableCard'
import { getNestedValue } from '../../../../../../../lib/fhir-path'
import { get, startCase } from 'lodash'

const WaypointContent: React.FC<{
  task: WorklistTask
  searchQuery: string
  expanded: boolean
}> = ({ task, searchQuery, expanded }) => {
  const { patient } = task

  const showPatientDemographics = searchQuery
    ? patient?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient?.birthDate?.toLowerCase().includes(searchQuery.toLowerCase())
    : true

  const getExtensionValue = (url: string) => {
    return patient?.extension?.[0]?.extension?.find(
      (extension: { url: string }) => extension.url === url,
    )?.valueString
  }

  const communicationPref = getExtensionValue('communication_pref')
  const dialysisProvider = getExtensionValue('organization')

  return (
    <>
      {showPatientDemographics && patient && (
        <ExpandableCard title="Patient demographics" defaultExpanded={expanded}>
          <div className="space-y-2 text-sm mt-3">
            <CardRowItem
              label="Full name"
              value={get(patient, 'name')}
              searchQuery={searchQuery}
            />
            <CardRowItem
              label="Date of birth"
              value={get(patient, 'birthDate')}
              searchQuery={searchQuery}
            />
            {communicationPref && (
              <CardRowItem
                label="Preferred communication"
                value={communicationPref}
                searchQuery={searchQuery}
              />
            )}

            {patient?.telecom?.map(
              (telecom: { system: string; value: string }) => (
                <CardRowItem
                  key={telecom.system}
                  label={startCase(telecom.system)}
                  value={telecom.value}
                  searchQuery={searchQuery}
                />
              ),
            )}
            {dialysisProvider && (
              <CardRowItem
                label="Dialysis provider"
                value={dialysisProvider}
                searchQuery={searchQuery}
              />
            )}
          </div>
        </ExpandableCard>
      )}
      {waypointCards.map((card) => (
        <ExpandableCard
          key={card.name}
          title={card.name}
          defaultExpanded={expanded}
        >
          <div className="space-y-2 text-sm mt-3">
            {card.fields.map((field) => (
              <CardRowItem
                key={field.key}
                label={field.label}
                value={getExtensionValue(field.key)}
                searchQuery={searchQuery}
              />
            ))}
          </div>
        </ExpandableCard>
      ))}
    </>
  )
}

export default WaypointContent
