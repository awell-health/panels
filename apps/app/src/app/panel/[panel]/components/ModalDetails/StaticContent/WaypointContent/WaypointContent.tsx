import { useMedplumStore, type WorklistTask } from '@/hooks/use-medplum-store'
import FhirExpandableCard from '../FhirExpandableCard'
import { waypointCards } from './waypointCards'
import CardRowItem from '../CardRowItem'
import ExpandableCard from '../ExpandableCard'
import { getNestedValue } from '../../../../../../../lib/fhir-path'
import { get, startCase, take } from 'lodash'
import { getCardSummary, getExtensionValue } from '../utils'
import { useEffect, useState } from 'react'
import type { Observation } from '@medplum/fhirtypes'
import HighlightText from '../HighlightContent'

const WaypointContent: React.FC<{
  task: WorklistTask
  searchQuery: string
  expanded: boolean
}> = ({ task, searchQuery, expanded }) => {
  const { patient } = task

  const { getPatientObservations } = useMedplumStore()

  const showPatientDemographics = searchQuery
    ? patient?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient?.birthDate?.toLowerCase().includes(searchQuery.toLowerCase())
    : true

  const communicationPref = getExtensionValue(patient, 'communication_pref')
  const dialysisProvider = getExtensionValue(patient, 'organization')

  const [observations, setObservations] = useState<Observation[]>([])

  useEffect(() => {
    const fetchObservations = async () => {
      const observations = await getPatientObservations(patient?.id ?? '')
      setObservations(observations)
    }

    fetchObservations()
  }, [patient, getPatientObservations])

  const ckdStage = observations.find(
    (observation) => observation.code?.text === 'CKD Stage',
  )

  return (
    <>
      {showPatientDemographics && patient && (
        <ExpandableCard
          title="Patient demographics"
          defaultExpanded={expanded}
          summary={`${patient?.name}, ${patient?.birthDate}${dialysisProvider ? `, ${dialysisProvider}` : ''}`}
        >
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
      {waypointCards.map((card, index) => (
        <ExpandableCard
          key={card.name}
          title={card.name}
          defaultExpanded={expanded}
          summary={patient ? getCardSummary(patient, card) : ''}
        >
          <div className="space-y-2 text-sm mt-3">
            {card.fields.map((field) => (
              <CardRowItem
                key={field.key}
                label={field.label}
                value={getExtensionValue(patient, field.key)}
                searchQuery={searchQuery}
              />
            ))}
            {index === 0 && ckdStage && (
              <div className="flex justify-between">
                <span className="text-gray-600">
                  <HighlightText text={'CKD Stage'} searchQuery={searchQuery} />
                </span>
                <span className="text-gray-900 font-normal max-w-[60%]">
                  <div className="badge badge-error badge-sm text-white">
                    {ckdStage.valueString}
                  </div>
                </span>
              </div>
            )}
          </div>
        </ExpandableCard>
      ))}
    </>
  )
}

export default WaypointContent
