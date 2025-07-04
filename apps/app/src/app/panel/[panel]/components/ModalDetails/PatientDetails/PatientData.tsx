import type { FC } from 'react'
import type { WorklistPatient } from '../../../../../../hooks/use-medplum-store'
import ExpandableCard from '../StaticContent/ExpandableCard'
import CardRowItem from '../StaticContent/CardRowItem'
import { startCase } from 'lodash'
import StaticContent from '../StaticContent'

interface PatientDataProps {
  patient: WorklistPatient
}

const PatientData: FC<PatientDataProps> = ({ patient }) => {
  return (
    <div className="flex flex-col gap-3 pb-4">
      <ExpandableCard title="Patient demographics" defaultExpanded={true}>
        <div className="space-y-2 text-sm mt-3">
          <CardRowItem label="Full Name" value={patient?.name} />
          <CardRowItem label="Date of Birth" value={patient?.birthDate} />
          <CardRowItem label="Gender" value={patient?.gender} />
        </div>
      </ExpandableCard>
      <ExpandableCard title="Adress" defaultExpanded={true}>
        <div className="space-y-2 text-sm mt-3">
          {patient?.address?.map(
            (address: { system: string; value: string }, index: number) => (
              <div
                // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
                key={`${index}`}
                className="mb-2 border-b border-gray-200 pb-2"
              >
                {Object.keys(address).map((key) => (
                  <CardRowItem
                    key={key}
                    label={startCase(key)}
                    value={address[key as keyof typeof address] ?? '-'}
                  />
                ))}
              </div>
            ),
          )}
        </div>
      </ExpandableCard>
      <ExpandableCard title="Patient telecom" defaultExpanded={true}>
        <div className="space-y-2 text-sm mt-3">
          {patient?.telecom?.map(
            (telecom: { system: string; value: string }) => (
              <CardRowItem
                key={telecom.value}
                label={telecom.system}
                value={telecom.value}
              />
            ),
          )}
        </div>
      </ExpandableCard>
      <ExpandableCard title="Identifiers" defaultExpanded={true}>
        <div className="space-y-2 text-sm mt-3">
          {patient?.identifier.map(
            (identifier: { system: string; value: string }) => (
              <CardRowItem
                key={identifier.value}
                label={identifier.system}
                value={identifier.value}
              />
            ),
          )}
        </div>
      </ExpandableCard>
      <StaticContent patient={patient} />
    </div>
  )
}

export default PatientData
