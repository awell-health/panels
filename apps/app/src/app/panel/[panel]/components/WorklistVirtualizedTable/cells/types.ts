import type { ColumnDefinition } from "@/types/worklist";

export interface BaseCellProps {
  value: unknown;
  column: ColumnDefinition;
  row: Record<string, any>;
  rowIndex: number;
  columnIndex: number;
  style?: React.CSSProperties;
  className?: string;
}

export interface InteractiveCellProps extends BaseCellProps {
  onPDFClick?: (pdfUrl: string, patientName: string) => void;
  onTaskClick?: (task: string, taskStatus: string, patientName: string) => void;
  onAssigneeClick?: () => void;
  currentUserName?: string;
  currentView?: string;
} 