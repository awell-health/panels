import { useWorklistAppointments } from '@/hooks/use-zustand-store'
import { useDateTimeFormat } from '@/hooks/use-date-time-format'
import { Calendar, Clock, MapPin, User } from 'lucide-react'
import StaticContent from '../StaticContent'
import type { WorklistPatient } from '../../../../../../lib/fhir-to-table-data'
import { getPatientName } from '@/lib/patient-utils'
import type { Appointment, Location, Patient } from '@medplum/fhirtypes'
import AppointmentsCard from '../StaticContent/ContentCards/AppointmentsCard'

interface AppointmentDetailsProps {
  appointment: Appointment
  patient: Patient
  location: Location | undefined
}

export default function AppointmentDetails({
  appointment,
  patient,
  location,
}: AppointmentDetailsProps) {
  const VIEWS = ['content', 'appointment']
  const { formatDateTime } = useDateTimeFormat()

  if (!appointment) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-gray-500">Appointment not found</p>
      </div>
    )
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed':
        return 'badge-success'
      case 'tentative':
        return 'badge-warning'
      case 'cancelled':
        return 'badge-error'
      case 'noshow':
        return 'badge-neutral'
      default:
        return 'badge-primary'
    }
  }

  const patientName = getPatientName(patient)

  return (
    <div className="flex flex-1 h-full">
      {VIEWS.map((view) => (
        <div
          key={view}
          className="overflow-y-auto p-2 border-r border-gray-200 h-full overflow-auto w-1/2"
        >
          {/* TEMP SOLUTION: use FHIRPath to get the patient name instead of mapping the custom patient object */}
          {view === 'content' && (
            <div className="flex flex-col gap-2">
              <StaticContent patient={patient as unknown as WorklistPatient} />
              <AppointmentsCard patientId={patient.id as string} />
            </div>
          )}
          {view === 'appointment' && (
            <div className="border border-gray-200 rounded-lg bg-white">
              <div className="btn btn-sm btn-ghost w-full justify-between h-auto min-h-8 p-3">
                <div className="flex-1 text-left cursor-pointer">
                  <h4 className="font-medium text-medium text-gray-900 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Appointment Details
                  </h4>
                </div>
              </div>
              <div className="px-3 pb-3 border-t border-gray-100">
                <div className="space-y-4 mt-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-gray-500">
                        Patient
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <span className="font-medium">{patientName}</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-medium text-gray-500">
                        Status
                      </div>
                      <div className="mt-1">
                        <span
                          className={`badge badge-xs badge-outline ${getStatusColor(appointment.status)}`}
                        >
                          {appointment.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  {appointment.start && (
                    <div>
                      <div className="text-xs font-medium text-gray-500">
                        Start Time
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <span>{formatDateTime(appointment.start)}</span>
                      </div>
                    </div>
                  )}

                  {appointment.end && (
                    <div>
                      <div className="text-xs font-medium text-gray-500">
                        End Time
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <span>{formatDateTime(appointment.end)}</span>
                      </div>
                    </div>
                  )}

                  {location?.name && (
                    <div>
                      <div className="text-xs font-medium text-gray-500">
                        Location
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <span>{location.name}</span>
                      </div>
                    </div>
                  )}

                  {appointment.description && (
                    <div>
                      <div className="text-xs font-medium text-gray-500">
                        Description
                      </div>
                      <div className="mt-1">
                        <p className="text-sm text-gray-700">
                          {appointment.description}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
