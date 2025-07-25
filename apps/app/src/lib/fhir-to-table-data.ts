import type { Patient, Task } from '@medplum/fhirtypes'

export type WorklistPatient = {
  id: string
  name: string
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
  patientName: string
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  [key: string]: any // For dynamic columns
  // we shouldnt pass the worklist tasks inside the patient
  patient?: WorklistPatient
}

// Helper methods
function getPatientName(patient: Patient): string {
  if (!patient.name || patient.name.length === 0) return 'Unknown'
  const name = patient.name[0]
  return `${name.given?.join(' ') || ''} ${name.family || ''}`.trim()
}

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
    patientName: patient ? getPatientName(patient) : '',
    patient: patient
      ? {
          ...patient,
          id: patient.id || '',
          name: getPatientName(patient),
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
      name: getPatientName(patient),
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
