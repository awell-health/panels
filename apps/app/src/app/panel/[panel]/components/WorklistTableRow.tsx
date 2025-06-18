"use client"

import { TaskDetails } from "@/app/panel/[panel]/components/TaskDetails"
import { useDrawer } from "@/contexts/DrawerContext"
import type { WorklistPatient, WorklistTask } from "@/hooks/use-medplum-store"
import { getNestedValue } from "@/lib/fhir-path"
import { formatTasksForPatientView, renderTaskStatus } from "@/lib/task-utils"
import type { ColumnDefinition } from "@/types/worklist"
import { CheckSquare, File } from "lucide-react"
import { useRef } from "react"
import { TableCell, TableRow } from "../../../../components/ui/table"
import { cn } from "../../../../lib/utils"
import { PatientDetails } from "./PatientDetails"
import { formatDateWithType } from "@/lib/date-utils"

interface WorklistTableRowWithHoverProps {
    rowIndex: number;
    onRowHover: (rowIndex: number, isHovered: boolean, rect: DOMRect | null) => void;
    selectedRows: number[];
    toggleSelectRow: (rowIndex: number) => void;
    columns: ColumnDefinition[];
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    row: Record<string, any>;
    handlePDFClick: (pdfUrl: string, patientName: string) => void;
    handleTaskClick: (task: string, taskStatus: string, patientName: string) => void;
    handleAssigneeClick: () => void;
    currentView: string;
}

export default function WorklistTableRow({
    rowIndex,
    onRowHover,
    selectedRows,
    toggleSelectRow,
    columns,
    handlePDFClick,
    handleTaskClick,
    handleAssigneeClick,
    currentView,
    row
}: WorklistTableRowWithHoverProps) {
    const rowRef = useRef<HTMLTableRowElement>(null)
    const { openDrawer } = useDrawer()

    const handleRowClick = () => {
        if (currentView === "task") {
            openDrawer(
                <TaskDetails
                    taskData={row as WorklistTask}
                />,
                row.description || "Task Details"
            )
        } else if (currentView === "patient") {
            openDrawer(
                <PatientDetails
                    patient={row as WorklistPatient}
                />,
                `${row.name} - Patient Details`
            )
        }
    }

    // Handle hover events
    const handleMouseEnter = () => {
        if (rowRef.current) {
            onRowHover(rowIndex, true, rowRef.current.getBoundingClientRect())
        }
    }

    const handleMouseLeave = () => {
        onRowHover(rowIndex, false, null)
    }

    const renderColumnValue = (column: ColumnDefinition, colIndex: number) => {
        const columnValue = getNestedValue(row, column.key);
        return (
            <TableCell
                key={`${rowIndex}-${colIndex}`}
                className={cn("py-1 px-2 border-r border-gray-200 text-xs max-w-[200px]", "truncate")}
                title={typeof columnValue === "string" ? columnValue : ""}
            >
                {column.name === "Discharge Summary" && columnValue ? (
                    <button
                        type="button"
                        className="btn btn-ghost btn-sm text-xs h-6 px-2 text-blue-500 hover:text-blue-600 hover:bg-blue-50"
                        onClick={() => handlePDFClick(columnValue, row["Patient Name"] || "Patient")}
                    >
                        <File className="h-3 w-3 mr-1" />
                        {columnValue}
                    </button>
                ) : column.type === "date" && columnValue ? (
                    formatDateWithType(columnValue)
                ) : column.name === "Task Status" && columnValue ? (
                    renderTaskStatus(columnValue, row.Task, row["Patient Name"], handleTaskClick)
                ) : column.type === "tasks" && currentView === "Patient view" && row._raw?.tasks ? (
                    formatTasksForPatientView(row._raw.tasks, row["Patient Name"], handleTaskClick)
                ) : column.type === "array" ? (
                    <div className="flex flex-wrap gap-1">
                        {Array.isArray(columnValue) ? (
                            columnValue.map((item: unknown, index: number) => {
                                const itemKey = typeof item === 'object'
                                    ? JSON.stringify(item)
                                    : String(item);
                                return (
                                    <span
                                        key={`${rowIndex}-${colIndex}-${itemKey}`}
                                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800"
                                    >
                                        {typeof item === 'object' ? Object.values(item as Record<string, unknown>).join(', ') : String(item)}
                                    </span>
                                );
                            })
                        ) : (
                            <span className="text-gray-500">-</span>
                        )}
                    </div>
                ) : column.type === "assignee" ? (
                    <div className="flex items-center">
                        {columnValue ? (
                            <button
                                type="button"
                                className="text-xs text-gray-700 hover:text-blue-600"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleAssigneeClick();
                                }}>
                                {columnValue}
                            </button>
                        ) : (
                            <button
                                type="button"
                                className="btn btn-outline btn-sm text-xs h-6 px-2 text-blue-500 hover:text-blue-600 border-blue-200"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleAssigneeClick();
                                }}
                            >
                                Assign to me
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="truncate">
                        {(() => {
                            if (columnValue === null || columnValue === undefined) return "";
                            if (typeof columnValue === "string") return columnValue;
                            if (Array.isArray(columnValue)) return columnValue.join(", ");
                            if (typeof columnValue === "object") return JSON.stringify(columnValue);
                            return String(columnValue);
                        })()}
                    </div>
                )}
            </TableCell>
        )
    }

    return (
        <TableRow
            ref={rowRef}
            className="border-b border-gray-200 hover:bg-gray-50 cursor-pointer"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onClick={handleRowClick}
            data-row-id={rowIndex}
        >
            <TableCell className="w-10 p-0 pl-3">
                <div className="h-10 flex items-center justify-center">
                    <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300"
                        checked={selectedRows.includes(rowIndex)}
                        onChange={() => toggleSelectRow(rowIndex)}
                    />
                </div>
            </TableCell>
            {columns.map((column, colIndex) => renderColumnValue(column, colIndex))}
            <TableCell className="p-0" colSpan={2} />
        </TableRow>
    )
}