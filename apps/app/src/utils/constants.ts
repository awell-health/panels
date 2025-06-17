// src/utils/constants.ts
import type { PanelDefinition } from '@/types/worklist'

export const DEFAULT_WORKLIST: PanelDefinition = {
  id: 'new-panel',
  title: 'New Panel',
  createdAt: new Date(),
  filters: [],
  patientViewColumns: [
    {
      name: 'Patient Name',
      type: 'string',
      key: 'name',
      description: "Patient's full name",
      id: 'name',
    },
    {
      name: 'Date of Birth',
      type: 'date',
      key: 'birthDate',
      description: "Patient's date of birth",
      id: 'birthDate',
    },
    {
      name: 'Gender',
      type: 'string',
      key: 'gender',
      description: "Patient's gender",
      id: 'gender',
    },
    {
      name: 'Tasks',
      type: 'string',
      key: 'taskDescriptionsSummary',
      description: 'Tasks for this patient',
      id: 'taskDescriptionsSummary',
    },
  ],
  taskViewColumns: [
    {
      name: 'Task ID',
      type: 'string',
      key: 'id',
      description: 'Task ID',
      id: 'taskId',
    },
    {
      name: 'Patient Name',
      type: 'string',
      key: 'patientName',
      description: "Patient's full name",
      id: 'patientName',
    },
    {
      name: 'Description',
      type: 'string',
      key: 'description',
      description: 'Task description',
      id: 'description',
    },
    {
      name: 'Status',
      type: 'string',
      key: 'status',
      description: 'Task status',
      id: 'status',
    },
    {
      name: 'Priority',
      type: 'string',
      key: 'priority',
      description: 'Task priority',
      id: 'priority',
    },
    {
      name: 'Due Date',
      type: 'date',
      key: 'executionPeriod.end',
      description: 'Task due date',
      id: 'executionPeriod.end',
    },
    {
      name: 'Assignee',
      type: 'assignee',
      key: 'owner.display',
      description: 'Task assignee',
      id: 'assignee',
    },
  ],
  views: [],
}
