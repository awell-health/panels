import type {
  Appointment,
  Location as FhirLocation,
  Patient,
  Task,
} from '@medplum/fhirtypes'

export type WorklistPatient = {
  id: string
  tasks: WorklistTask[]
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  [key: string]: any // For dynamic columns
}

export type WorklistTask = {
  id: string
  description: string
  status: string
  priority?: string
  dueDate?: string
  patientId: string
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  [key: string]: any // For dynamic columns
  // we shouldnt pass the worklist tasks inside the patient
  patient?: WorklistPatient
}

export type WorklistAppointment = {
  id: string
  status: string
  start?: string
  end?: string
  patientId: string
  locationId?: string
  locationName?: string
  description?: string
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  [key: string]: any // For dynamic columns
  patient?: WorklistPatient
  location?: FhirLocation
}

// Helper methods

const taskToWorklistData = (
  patient: Patient | undefined,
  task: Task,
): WorklistTask => {
  return {
    ...task,
    id: task.id || '',
    status: task.status || 'unknown',
    priority: task.priority,
    description: task.description || '',
    patientId: patient?.id || '',
    patient: patient
      ? {
          ...patient,
          id: patient.id || '',
          tasks: [],
        }
      : undefined,
  }
}

const appointmentToWorklistData = (
  patient: Patient | undefined,
  appointment: Appointment,
  locations: FhirLocation[] = [],
): WorklistAppointment => {
  // Find location reference in appointment participants
  const locationRef = appointment.participant?.find((p) =>
    p.actor?.reference?.startsWith('Location/'),
  )?.actor?.reference

  let locationId: string | undefined
  let locationName: string | undefined
  let location: FhirLocation | undefined

  if (locationRef) {
    locationId = locationRef.split('/')[1]
    location = locations.find((loc) => loc.id === locationId)
    locationName =
      location?.name ||
      location?.alias?.[0] ||
      location?.description ||
      `Location ${locationId}`
  }

  return {
    ...appointment,
    id: appointment.id || '',
    status: appointment.status || 'unknown',
    start: appointment.start,
    end: appointment.end,
    description: appointment.description,
    patientId: patient?.id || '',
    locationId,
    locationName,
    location: location
      ? {
          ...location,
          id: location?.id || '',
          name: location?.name || '',
        }
      : undefined,
    patient: patient
      ? {
          ...patient,
          id: patient.id || '',
          tasks: [],
        }
      : undefined,
  }
}

export const mapPatientsToWorklistPatients = (
  patients: Patient[],
  tasks: Task[],
): WorklistPatient[] => {
  return patients.map((patient) => {
    const patientTasks = tasks.filter(
      (task) => task.for?.reference === `${patient.resourceType}/${patient.id}`,
    )

    const taskDescriptions = patientTasks
      .map((task) => task.description)
      .join('; ')
    const rawPatient = patient as Patient

    return {
      ...rawPatient,
      id: patient.id || '',
      taskDescriptionsSummary: taskDescriptions,
      tasks: patientTasks.map((task) => taskToWorklistData(patient, task)),
    }
  })
}

export const mapTasksToWorklistTasks = (
  patients: Patient[],
  tasks: Task[],
): WorklistTask[] => {
  return tasks.map((task) => {
    const patient = patients.find(
      (p) => `${p.resourceType}/${p.id}` === task.for?.reference,
    )
    return taskToWorklistData(patient, task)
  })
}

export const mapAppointmentsToWorklistAppointments = (
  patients: Patient[],
  appointments: Appointment[],
  locations: FhirLocation[] = [],
): WorklistAppointment[] => {
  return appointments.map((appointment) => {
    const patient = patients.find((p) =>
      appointment.participant?.some(
        (participant) =>
          participant.actor?.reference === `${p.resourceType}/${p.id}`,
      ),
    )

    return appointmentToWorklistData(patient, appointment, locations)
  })
}
