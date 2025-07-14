import type { FC } from 'react'
import type { WorklistPatient } from '../../../../../../hooks/use-medplum-store'
import ExpandableCard from '../StaticContent/ExpandableCard'
import CardRowItem from '../StaticContent/CardRowItem'
import { divide, startCase } from 'lodash'
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
      {patient?.address && patient?.address.length > 0 && (
        <ExpandableCard title="Address" defaultExpanded={true}>
          <div className="space-y-2 text-sm mt-3">
            {patient?.address?.map(
              (address: { system: string; value: string }, index: number) => (
                <div
                  // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
                  key={`${index}`}
                  className="mb-2 border-b border-gray-200 pb-2"
                >
                  {Object.keys(address).map((key) => (
                    <div className="flex justify-between" key={key}>
                      <span className="text-gray-600">{startCase(key)}</span>
                      <span className="text-gray-900 font-normal max-w-[60%]">
                        {address[key as keyof typeof address] ?? '-'}
                      </span>
                    </div>
                  ))}
                </div>
              ),
            )}
          </div>
        </ExpandableCard>
      )}
      {patient?.telecom && patient?.telecom.length > 0 && (
        <ExpandableCard title="Patient telecom" defaultExpanded={true}>
          <div className="space-y-2 text-sm mt-3">
            {patient?.telecom?.map(
              (telecom: { system: string; value: string; use?: string }) => (
                <CardRowItem
                  key={telecom.system + telecom.value + telecom.use}
                  label={
                    telecom.system + (telecom.use ? ` [${telecom.use}]` : '')
                  }
                  value={telecom.value}
                />
              ),
            )}
          </div>
        </ExpandableCard>
      )}
      {patient?.identifier && patient?.identifier.length > 0 && (
        <ExpandableCard title="Identifiers" defaultExpanded={true}>
          <div className="space-y-2 text-sm mt-3">
            {patient?.identifier.map(
              (
                identifier: { system: string; value: string },
                index: number,
              ) => (
                <CardRowItem
                  key={`${identifier.value}-${index}`}
                  label={identifier.system}
                  value={identifier.value}
                />
              ),
            )}
          </div>
        </ExpandableCard>
      )}
      {patient.extension && <StaticContent patient={patient} />}
    </div>
  )
}

export default PatientData
