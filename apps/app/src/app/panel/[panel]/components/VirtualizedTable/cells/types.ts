import type { Column } from '@/types/panel'

export interface BaseCellProps {
  value: unknown
  column: Column
  // biome-ignore lint/suspicious/noExplicitAny: Not sure if we have a better type
  row: Record<string, any>
  rowIndex: number
  columnIndex: number
  style?: React.CSSProperties
  className?: string
}

export interface InteractiveCellProps extends BaseCellProps {
  onPDFClick?: (pdfUrl: string, patientName: string) => void
  onTaskClick?: (task: string, taskStatus: string, patientName: string) => void
  onAssigneeClick?: () => Promise<void>
  currentUserName?: string
  currentView?: string
}
