export const statuses = {
  draft: {
    label: 'Draft',
    color: 'badge-neutral',
  },
  requested: {
    label: 'Requested',
    color: 'badge-primary',
  },
  received: {
    label: 'Received',
    color: 'badge-success',
  },
  accepted: {
    label: 'Accepted',
    color: 'badge-warning',
  },
  rejected: {
    label: 'Rejected',
    color: 'badge-error',
  },
  ready: {
    label: 'Ready',
    color: 'badge-info',
  },
  cancelled: {
    label: 'Cancelled',
    color: 'badge-neutral',
  },
  'in-progress': {
    label: 'In progress',
    color: 'badge-primary',
  },
  'on-hold': {
    label: 'On hold',
    color: 'badge-neutral',
  },
  failed: {
    label: 'Failed',
    color: 'badge-error',
  },
  completed: {
    label: 'Completed',
    color: 'badge-success',
  },
  'entered-in-error': {
    label: 'Entered in error',
    color: 'badge-neutral',
  },
}

export const taskStatuses = Object.keys(statuses)

export const isTaskStatus = (status: string): boolean => {
  return status.toLowerCase() in statuses
}

const TaskStatusBadge = ({ status }: { status: string }) => {
  const statusData = statuses[status as keyof typeof statuses]

  return (
    <span className={`badge badge-xs ${statusData.color}`}>
      {statusData.label}
    </span>
  )
}

export default TaskStatusBadge
