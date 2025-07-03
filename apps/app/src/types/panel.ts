export type Filter = {
  columnId: string
  value: string
  fhirExpressionTemplate: string
  // Here for backwards compatibility only
  fhirPathFilter?: [columnKey: string, value: string]
}

export type Sort = {
  columnName: string
  direction: 'asc' | 'desc'
  order: number
  id: number
}

export type Column = {
  id: string
  panelId: string
  name: string
  type:
    | 'text'
    | 'number'
    | 'date'
    | 'boolean'
    | 'select'
    | 'multi_select'
    | 'user'
    | 'file'
    | 'custom'
  sourceField?: string
  tags?: string[] // ['panels:patients'] or ['panels:tasks']
  properties: {
    display?: {
      width?: number
      format?: string
      visible?: boolean
      order?: number
    }
  }
  metadata?: {
    description?: string
    [key: string]: unknown
  }
}

export type ViewType = 'patient' | 'task'

export type View = {
  id: string
  name: string
  panelId: string
  visibleColumns: string[] // Column IDs visible in this view
  sort: Sort[]
  createdAt: Date
  isPublished: boolean
  metadata: {
    filters: Filter[]
    viewType: ViewType
    [key: string]: unknown
  }
}

export type Panel = {
  id: string
  name: string
  description?: string
  createdAt: Date
  metadata: {
    filters: Filter[]
    [key: string]: unknown
  }
}

export type ColumnChangeOperation = 'create' | 'update' | 'delete'

export type ColumnChange = {
  id: string
  operation: ColumnChangeOperation
  order?: number
  column?: Partial<Pick<Column, 'name' | 'type' | 'sourceField'>>
  viewType: ViewType
}

export type ColumnChangesResponse = {
  changes: ColumnChange[]
  explanation: string
}
