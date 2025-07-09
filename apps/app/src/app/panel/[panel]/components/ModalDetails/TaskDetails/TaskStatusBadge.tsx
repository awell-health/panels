export const statuses = {
  draft: {
    label: 'Draft',
    color: 'bg-gray-400',
  },
  requested: {
    label: 'Requested',
    color: 'bg-blue-400',
  },
  received: {
    label: 'Received',
    color: 'bg-green-500',
  },
  accepted: {
    label: 'Accepted',
    color: 'bg-yellow-400',
  },
  rejected: {
    label: 'Rejected',
    color: 'bg-red-400',
  },
  ready: {
    label: 'Ready',
    color: 'bg-purple-400',
  },
  cancelled: {
    label: 'Cancelled',
    color: 'bg-gray-400',
  },
  'in-progress': {
    label: 'In progress',
    color: 'bg-blue-400',
  },
  'on-hold': {
    label: 'On hold',
    color: 'bg-gray-400',
  },
  failed: {
    label: 'Failed',
    color: 'bg-red-400',
  },
  completed: {
    label: 'Completed',
    color: 'bg-green-500',
  },
  'entered-in-error': {
    label: 'Entered in error',
    color: 'bg-gray-400',
  },
}

export const isTaskStatus = (status: string): boolean => {
  return status.toLowerCase() in statuses
}

const TaskStatusBadge = ({ status }: { status: string }) => {
  const statusData = statuses[status as keyof typeof statuses]

  return (
    <div className={`badge badge-soft badge-xs text-white ${statusData.color}`}>
      {statusData.label}
    </div>
  )
}

export default TaskStatusBadge
