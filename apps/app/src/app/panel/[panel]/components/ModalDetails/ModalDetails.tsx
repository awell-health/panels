import type { WorklistPatient, WorklistTask } from '@/hooks/use-medplum-store'
import PatientDetails from './PatientDetails/PatientDetails'
import TaskDetails from './TaskDetails/TaskDetails'
import { User, X } from 'lucide-react'
import TaskStatusBadge from './TaskDetails/TaskStatusBadge'

interface ModalDetailsProps {
  row: WorklistPatient | WorklistTask
  onClose: () => void
}

const ModalDetails = ({ row, onClose }: ModalDetailsProps) => {
  const { patient } = row
  const patientName = patient?.name || row.name || ''
  const dateOfBirth = patient?.birthDate || row.birthDate || ''

  return (
    <dialog className="modal modal-open">
      <div className="modal-box max-w-[95vw] min-h-[70vh] max-h-[80vh] p-0 flex flex-col">
        <div className="h-12 border-b border-gray-200 bg-gray-50 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2 text-sm text-gray-700 pl-4">
            <User className="h-5 w-5" />
            <span className="font-medium">{patientName}</span>
            {dateOfBirth && (
              <>
                <span>·</span>
                <span>DOB {dateOfBirth}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="h-8 w-8 p-0" type="button">
              <X className="h-6 w-6 cursor-pointer hover:text-gray-800" />
            </button>
          </div>
        </div>
        <div className="flex flex-1 overflow-hidden">
          {row.resourceType === 'Patient' && (
            <PatientDetails patient={row as WorklistPatient} />
          )}
          {row.resourceType === 'Task' && (
            <TaskDetails task={row as WorklistTask} />
          )}
        </div>
      </div>
    </dialog>
  )
}

export default ModalDetails
