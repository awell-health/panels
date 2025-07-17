import { useMedplumStore, type WorklistTask } from '@/hooks/use-medplum-store'
import { LoaderCircle } from 'lucide-react'
import { useState } from 'react'
import NotesTimeline, { type TimelineDatItem } from '../NotesTimeline'

interface TaskCommentProps {
  task: WorklistTask
}

const TaskComment = ({ task }: TaskCommentProps) => {
  const [newComment, setNewComment] = useState('')
  const [comments, setComments] = useState<WorklistTask['note']>(
    task.note ?? [],
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const taskId = task.id

  const { addNotesToTask } = useMedplumStore()

  const handleSubmitComment = async () => {
    if (newComment.trim() && taskId) {
      setIsSubmitting(true)
      const tempID = new Date().toISOString()

      setComments((prev: WorklistTask['note']) => [
        ...prev,
        {
          id: tempID,
          text: newComment.trim(),
          time: new Date().toISOString(),
        },
      ])

      setNewComment('')

      try {
        const task = await addNotesToTask(taskId, newComment.trim())
        setComments((prev: WorklistTask['note']) =>
          prev.map((n: WorklistTask['note']) =>
            n.id === tempID ? task.note : n,
          ),
        )

        setComments(task.note)
        setIsSubmitting(false)
      } catch (error) {
        console.error('Failed to add comment:', error)
      } finally {
        setIsSubmitting(false)
      }
    }
  }

  const timelineItems: TimelineDatItem[] = [
    {
      type: 'task',
      title: 'Task created',
      datetime: task.authoredOn,
    },
  ]

  if (task.status === 'completed') {
    timelineItems.push({
      type: 'task',
      title: 'Task completed',
      datetime: task.lastModified,
    })
  }

  return (
    <div className="flex flex-col p-2 gap-2">
      <NotesTimeline
        notes={comments}
        patientId={task.patientId}
        timelineItems={timelineItems}
      />

      <div className="w-full mt-auto">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          className="w-full p-2 border border-gray-200 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={3}
        />
        <button
          type="button"
          onClick={handleSubmitComment}
          disabled={!newComment.trim() || isSubmitting}
          className="w-full bg-blue-500 text-white py-2 rounded-md text-xs hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors duration-200"
        >
          {isSubmitting ? (
            <span className="flex items-center gap-1 w-full justify-center">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Saving...
            </span>
          ) : (
            'Add Comment'
          )}
        </button>
      </div>
    </div>
  )
}

export default TaskComment
