import type { WorklistTask } from "@/hooks/use-medplum-store";
import TaskComments from "./TaskComments";
import { User, X } from "lucide-react";
import FramePanel from "../FramePanel";
import { useState } from "react";
import TaskStaticContent from "../StaticContent";
import StaticContent from "../StaticContent";

interface TaskDetailsProps {
  task: WorklistTask;
  onClose: () => void;
}

const TaskDetails = ({ task: taskData, onClose }: TaskDetailsProps) => {
  const VIEWS = ["content", "ahp", "comments"];
  const [task, setTask] = useState(taskData);

  const AHP_URL = task.input[0]?.valueUrl;
  const { patient } = task;

  return (
    <dialog className="modal modal-open">
      <div className="modal-box max-w-[95vw] min-h-[70vh] max-h-[85vh] p-0 flex flex-col">
        <div className="h-12 border-b border-gray-200 bg-gray-50 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2 text-sm text-gray-700 pl-4">
            <User className="h-4 w-4" />
            <span className="font-medium">{patient?.name}</span>
            <span>·</span>
            <span>DOB {patient?.birthDate}</span>
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
              className={`overflow-y-auto p-2 border-r border-gray-200 ${
                view === "content" ? "w-[40%]" : "w-[30%]"
              }`}
            >
              <div className="h-full">
                {view === "ahp" && <FramePanel url={AHP_URL} />}
                {view === "content" && <StaticContent task={task} />}
                {view === "comments" && (
                  <TaskComments notes={task.note} taskId={task.id} />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </dialog>
  );
};

export default TaskDetails;
