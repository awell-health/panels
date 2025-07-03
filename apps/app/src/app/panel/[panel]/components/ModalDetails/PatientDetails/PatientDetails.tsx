import type { WorklistPatient } from "@/hooks/use-medplum-store";
import { X, User } from "lucide-react";
import StaticContent from "../StaticContent";
import PatientTimeline from "./PatientTimeline";
import PatientActions from "./PatientActionts";

interface PatientDetailsProps {
  patient: WorklistPatient;
  onClose: () => void;
}

const PatientDetails = ({ patient, onClose }: PatientDetailsProps) => {
  const VIEWS = ["timeline", "actions", "content"];
  const { tasks } = patient;

  const AHP_URL = tasks[0]?.input[0]?.valueUrl;

  return (
    <dialog className="modal modal-open">
      <div className="modal-box max-w-[95vw] max-h-[80vh] p-0 flex flex-col">
        <div className="h-12 border-b border-gray-200 bg-gray-50 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2 text-sm text-gray-700 pl-4">
            <User className="h-4 w-4" />
            <span className="font-medium">{patient.name}</span>
            <span>·</span>
            <span>DOB {patient.birthDate}</span>
            <span>·</span>
            <span>
              ID{" "}
              {patient.identifier
                .map((id: { value: string }) => id.value)
                .join(", ")}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="h-8 w-8 p-0" type="button">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="flex flex-1 overflow-hidden">
          {VIEWS.map((view) => (
            <div
              key={view}
              className={`flex-1  overflow-y-auto p-2 border-r border-gray-200 ${
                view === "content" ? "w-[40%]" : "w-[30%]"
              }`}
            >
              <div className="h-full">
                {view === "actions" && <PatientActions patient={patient} />}
                {view === "content" && <StaticContent task={tasks[0]} />}
                {view === "timeline" && <PatientTimeline patient={patient} />}
              </div>
            </div>
          ))}
        </div>
      </div>
    </dialog>
  );
};

export default PatientDetails;
