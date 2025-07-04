import type { WorklistPatient } from '@/hooks/use-medplum-store'
import StaticContent from '../StaticContent'
import PatientData from './PatientData'
import ExpandableCard from '../StaticContent/ExpandableCard'

interface PatientDetailsProps {
  patient: WorklistPatient
}

const PatientDetails = ({ patient }: PatientDetailsProps) => {
  const VIEWS = ['data', 'content']
  const { tasks } = patient

  return (
    <>
      {VIEWS.map((view) => (
        <div
          key={view}
          className={`flex-1  overflow-y-auto p-2 border-r border-gray-200 ${
            view === 'content' ? 'w-[50%]' : 'w-[50%]'
          }`}
        >
          <div className="h-full p-2">
            {view === 'data' && <PatientData patient={patient} />}
            {/* {view === 'actions' && <PatientActions patient={patient} />} */}
            {view === 'content' && (
              <div>
                <div className="text-lg font-medium text-gray-500 my-4">
                  Tasks list:
                </div>
                <div className="flex flex-col gap-3">
                  {tasks.map((task) => (
                    <ExpandableCard title={task.description} key={task.id}>
                      <StaticContent key={task.id} task={task} />
                    </ExpandableCard>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ))}
    </>
  )
}

export default PatientDetails
