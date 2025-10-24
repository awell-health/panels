import { formatDateTime } from '@medplum/core'
import ExpandableCard from '../ExpandableCard'
import type { Appointment } from '@medplum/fhirtypes'
import RenderValue from '../RenderValue'
import { useMemo, memo, useState, useEffect } from 'react'
import CardRowItem from '../CardRowItem'
import { getPatientAppointments } from '../../../../../../../lib/server/medplum-server'
import { Loader2 } from 'lucide-react'

interface Props {
  patientId: string
}

const AppointmentsCard = memo(({ patientId }: Props) => {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchAppointments = async () => {
      const appointments = await getPatientAppointments(patientId)
      setAppointments(appointments)
      setIsLoading(false)
    }
    fetchAppointments()
  }, [patientId])

  // Memoize the appointments rendering to avoid unnecessary re-renders
  const renderedAppointments = useMemo(() => {
    return appointments.map((appointment) => {
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
          <CardRowItem label="Comment" value={appointment.comment} />
        </div>
      )
    })
  }, [appointments])

  return (
    <ExpandableCard title="Appointments" defaultExpanded={true}>
      {isLoading ? (
        <div className="flex justify-center items-center h-full">
          <Loader2 className="w-4 h-4 animate-spin" />
        </div>
      ) : null}
      <div className="space-y-2 mt-2 flex flex-col gap-2">
        {renderedAppointments}
      </div>
    </ExpandableCard>
  )
})

AppointmentsCard.displayName = 'AppointmentsCard'

export default AppointmentsCard
