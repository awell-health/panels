import { formatDateTime } from '@medplum/core'
import ExpandableCard from '../ExpandableCard'
import type { Appointment } from '@medplum/fhirtypes'
import RenderValue from '../RenderValue'
import { useMemo, memo } from 'react'
import CardRowItem from '../CardRowItem'
import { useLocationsArray } from '../../../../../../../hooks/use-zustand-store'

interface Props {
  appointments: Appointment[]
  expanded: boolean
}

const AppointmentsCard = memo(({ appointments, expanded }: Props) => {
  // Get locations Map from the global store
  const locations = useLocationsArray()
  console.log(locations)

  // Memoize the appointments rendering to avoid unnecessary re-renders
  const renderedAppointments = useMemo(() => {
    return appointments.map((appointment) => {
      // Get location reference from appointment participants
      const locationReference =
        appointment.participant?.find((p) =>
          p.actor?.reference?.startsWith('Location/'),
        )?.actor?.reference ?? ''

      const locationId = locationReference.split('/')[1]
      const location = locations.find((l) => l.id === locationId)
      const locationName =
        location?.name ||
        location?.alias?.[0] ||
        location?.description ||
        `Location ${locationId}`

      return (
        <div
          key={appointment.id}
          className="flex-col justify-between gap-2 border-b border-gray-200 pb-2 last:border-b-0"
        >
          <div className="font-medium">
            <RenderValue value={appointment.description} />
          </div>

          <CardRowItem
            label="Start"
            value={formatDateTime(appointment.start)}
          />
          <CardRowItem label="End" value={formatDateTime(appointment.end)} />
          <CardRowItem label="Location" value={locationName} />
        </div>
      )
    })
  }, [appointments, locations])

  return (
    <ExpandableCard title="Appointments" defaultExpanded={expanded}>
      <div className="space-y-2 mt-2 flex flex-col gap-2">
        {renderedAppointments}
      </div>
    </ExpandableCard>
  )
})

AppointmentsCard.displayName = 'AppointmentsCard'

export default AppointmentsCard
