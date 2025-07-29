export type Filter = {
  columnId: string
  value: string
  fhirExpressionTemplate: string
  // Here for backwards compatibility only
  fhirPathFilter?: [columnKey: string, value: string]
}

export type Sort = {
  columnId: string
  direction: 'asc' | 'desc'
}

export type Column = {
  id: string
  panelId: string
  name: string
  type:
    | 'text'
    | 'number'
    | 'date'
    | 'datetime'
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
      lock?: boolean
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
  createdAt: Date
  isPublished: boolean
  metadata: {
    filters: Filter[]
    viewType: ViewType
    sort?: Sort
    // Column visibility state for this view (columnId -> visible)
    columnVisibility?: Record<string, boolean>
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
    sort?: Sort
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

// Column visibility management types
export type ColumnVisibilityContext = {
  type: 'panel' | 'view'
  panelId: string
  viewId?: string
  columns: Column[]
  getVisibility: (columnId: string) => boolean
  setVisibility: (columnId: string, visible: boolean) => Promise<void>
  getVisibleColumns: () => Column[]
  getAllColumns: () => Column[]
}

export type ColumnWithVisibility = Pick<Column, 'id' | 'name'> & {
  visible: boolean
}
