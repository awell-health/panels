import { useMedplumStore, type WorklistTask } from "@/hooks/use-medplum-store";
import { Loader2 } from "lucide-react";
import { useState } from "react";

interface TaskCommentProps {
  notes: WorklistTask["note"];
  taskId: string;
}

const TaskComment = ({ notes, taskId }: TaskCommentProps) => {
  const [newComment, setNewComment] = useState("");
  const [comments, setComments] = useState(notes);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { addNotesToTask } = useMedplumStore();

  const handleSubmitComment = async () => {
    if (newComment.trim() && taskId) {
      setIsSubmitting(true);
      const task = await addNotesToTask(taskId, newComment.trim());

      setNewComment("");
      setComments(task.note);
      setIsSubmitting(false);
    }
  };
  return (
    <div className="flex flex-col p-2 gap-2">
      {comments && comments.length > 0 && (
        <div className=" rounded w-full mb-4 flex flex-col gap-2">
          {comments.map(
            // biome-ignore lint/suspicious/noExplicitAny: Not sure if we have a better type
            (note: any, index: number) => (
              <div
                key={note.id ?? index}
                className="bg-white p-3 rounded-md shadow-md border border-gray-200"
              >
                <p className="text-sm text-gray-800 mb-1">{note.text}</p>
                <p className="text-xs text-gray-500">
                  {note.time
                    ? new Date(note.time).toLocaleString()
                    : "No timestamp"}
                </p>
              </div>
            )
          )}
        </div>
      )}

      <div className="w-full">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          className="w-full p-3 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={3}
        />
        <button
          type="button"
          onClick={handleSubmitComment}
          disabled={!newComment.trim() || isSubmitting}
          className="w-full bg-blue-500 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors duration-200"
        >
          {isSubmitting ? (
            <span className="flex items-center gap-1 w-full justify-center">
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </span>
          ) : (
            "Add Comment"
          )}
        </button>
      </div>
    </div>
  );
};

export default TaskComment;
