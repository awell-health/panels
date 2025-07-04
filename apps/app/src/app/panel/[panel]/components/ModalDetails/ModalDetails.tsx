import type { WorklistPatient, WorklistTask } from '@/hooks/use-medplum-store'
import PatientDetails from './PatientDetails/PatientDetails'
import TaskDetails from './TaskDetails/TaskDetails'

interface ModalDetailsProps {
  row: WorklistPatient | WorklistTask
  onClose: () => void
}

const ModalDetails = ({ row, onClose }: ModalDetailsProps) => {
  console.log(row)
  if (row.resourceType === 'Patient') {
    return <PatientDetails patient={row as WorklistPatient} onClose={onClose} />
  }

  if (row.resourceType === 'Task') {
    return <TaskDetails task={row as WorklistTask} onClose={onClose} />
  }

  return null
}

export default ModalDetails
