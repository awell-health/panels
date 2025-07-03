// src/utils/constants.ts
import type { Panel } from '@/types/panel'

export const DEFAULT_PANEL: Panel = {
  id: 'new-panel',
  name: 'New Panel',
  createdAt: new Date(),
  metadata: {
    filters: [],
  },
}

// Default columns to be created separately with tags
export const DEFAULT_PATIENT_COLUMNS = [
  {
    name: 'Patient Name',
    type: 'text' as const,
    sourceField: 'name',
    tags: ['panels:patients'],
    properties: {
      display: {
        visible: true,
        order: 0,
      },
    },
    metadata: {
      description: "Patient's full name",
    },
  },
  {
    name: 'Date of Birth',
    type: 'date' as const,
    sourceField: 'birthDate',
    tags: ['panels:patients'],
    properties: {
      display: {
        visible: true,
        order: 1,
      },
    },
    metadata: {
      description: "Patient's date of birth",
    },
  },
  {
    name: 'Gender',
    type: 'text' as const,
    sourceField: 'gender',
    tags: ['panels:patients'],
    properties: {
      display: {
        visible: true,
        order: 2,
      },
    },
    metadata: {
      description: "Patient's gender",
    },
  },
  {
    name: 'Tasks',
    type: 'text' as const,
    sourceField: 'taskDescriptionsSummary',
    tags: ['panels:patients'],
    properties: {
      display: {
        visible: true,
        order: 3,
      },
    },
    metadata: {
      description: 'Tasks for this patient',
    },
  },
]

export const DEFAULT_TASK_COLUMNS = [
  {
    name: 'Task ID',
    type: 'text' as const,
    sourceField: 'id',
    tags: ['panels:tasks'],
    properties: {
      display: {
        visible: true,
        order: 0,
      },
    },
    metadata: {
      description: 'Task ID',
    },
  },
  {
    name: 'Patient Name',
    type: 'text' as const,
    sourceField: 'patientName',
    tags: ['panels:tasks'],
    properties: {
      display: {
        visible: true,
        order: 1,
      },
    },
    metadata: {
      description: "Patient's full name",
    },
  },
  {
    name: 'Description',
    type: 'text' as const,
    sourceField: 'description',
    tags: ['panels:tasks'],
    properties: {
      display: {
        visible: true,
        order: 2,
      },
    },
    metadata: {
      description: 'Task description',
    },
  },
  {
    name: 'Status',
    type: 'text' as const,
    sourceField: 'status',
    tags: ['panels:tasks'],
    properties: {
      display: {
        visible: true,
        order: 3,
      },
    },
    metadata: {
      description: 'Task status',
    },
  },
  {
    name: 'Priority',
    type: 'text' as const,
    sourceField: 'priority',
    tags: ['panels:tasks'],
    properties: {
      display: {
        visible: true,
        order: 4,
      },
    },
    metadata: {
      description: 'Task priority',
    },
  },
  {
    name: 'Due Date',
    type: 'date' as const,
    sourceField: 'executionPeriod.end',
    tags: ['panels:tasks'],
    properties: {
      display: {
        visible: true,
        order: 5,
      },
    },
    metadata: {
      description: 'Task due date',
    },
  },
  {
    name: 'Assignee',
    type: 'user' as const,
    sourceField: 'owner.display',
    tags: ['panels:tasks'],
    properties: {
      display: {
        visible: true,
        order: 6,
      },
    },
    metadata: {
      description: 'Task assignee',
    },
  },
]
