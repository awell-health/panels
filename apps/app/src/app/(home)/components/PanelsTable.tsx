import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { Panel } from '@/types/panel'
import { DEFAULT_PANEL } from '@/utils/constants'
import { ChevronRight, LayoutGrid, Plus, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import React, { useEffect, useState } from 'react'
import { useDateTimeFormat } from '@/hooks/use-date-time-format'
import { useReactiveColumns, useReactiveViews } from '@/hooks/use-reactive-data'
import { useReactivePanelStore } from '@/hooks/use-reactive-panel-store'

type PanelsTableProps = {
  panels: Panel[]
  onDeletePanel: (panelId: string) => void
  onDeleteView: (panelId: string, viewId: string) => void
  createPanel: (panel: Panel) => Promise<Panel>
}

const PanelsTable: React.FC<PanelsTableProps> = ({
  panels,
  onDeletePanel,
  onDeleteView,
  createPanel,
}) => {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleDeletePanel = async (panelId: string) => {
    try {
      setDeleteError(null)
      await onDeletePanel(panelId)
    } catch (error) {
      console.error('Failed to delete panel:', error)
      setDeleteError(
        `Failed to delete panel: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
      // Clear error after 5 seconds
      setTimeout(() => setDeleteError(null), 5000)
    }
  }

  const handleDeleteView = async (panelId: string, viewId: string) => {
    try {
      setDeleteError(null)
      await onDeleteView(panelId, viewId)
    } catch (error) {
      console.error('Failed to delete view:', error)
      setDeleteError(
        `Failed to delete view: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
      // Clear error after 5 seconds
      setTimeout(() => setDeleteError(null), 5000)
    }
  }

  const onCreatePanel = () => {
    createPanel(DEFAULT_PANEL)
      .then((newPanel) => {
        router.push(`/panel/${newPanel.id}`)
      })
      .catch((error) => {
        console.error('Failed to create default panel:', error)
      })
  }

  // For now, all panels are expanded by default
  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-base font-medium">Panels</h2>
        <div className="flex gap-2">
          <button
            type="button"
            className="btn btn-xs btn-warning btn-outline"
            onClick={onCreatePanel}
          >
            <Plus className="h-3 w-3 mr-1" />
            Create new Panel
          </button>
        </div>
      </div>

      {deleteError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-800 text-sm">{deleteError}</p>
        </div>
      )}

      <div className="border border-neutral-200 rounded-md overflow-hidden">
        <div className="relative w-full overflow-auto">
          <table className="w-full">
            <TableHeader>
              <TableRow className="bg-neutral-50">
                <TableHead className="text-xs font-medium text-neutral-500 py-2">
                  Name
                </TableHead>
                <TableHead className="text-xs font-medium text-neutral-500 py-2">
                  Columns
                </TableHead>
                <TableHead className="text-xs font-medium text-neutral-500 py-2">
                  Created
                </TableHead>
                <TableHead className="text-xs font-medium text-neutral-500 py-2 w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {mounted &&
                panels.map((panel) => (
                  <PanelRow
                    key={panel.id}
                    panel={panel}
                    onDeletePanel={handleDeletePanel}
                    onDeleteView={handleDeleteView}
                  />
                ))}

              {mounted && panels.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center py-4 text-neutral-500 text-sm"
                  >
                    No panels yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </table>
        </div>
      </div>
    </>
  )
}

const PanelRow: React.FC<{
  panel: Panel
  onDeletePanel: (panelId: string) => void
  onDeleteView: (panelId: string, viewId: string) => void
}> = ({ panel, onDeletePanel, onDeleteView }) => {
  const { id, name, createdAt } = panel
  const router = useRouter()
  const { formatDateTime } = useDateTimeFormat()

  const { columns: allColumns } = useReactiveColumns(id)
  const { views } = useReactiveViews(id)

  const patientColumns = allColumns.filter((col) =>
    col.tags?.includes('panels:patients'),
  )
  const taskColumns = allColumns.filter((col) =>
    col.tags?.includes('panels:tasks'),
  )
  const totalColumns = patientColumns.length + taskColumns.length

  const { deletePanel } = useReactivePanelStore()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const handleDelete = async () => {
    try {
      await deletePanel(id)
      setShowDeleteConfirm(false)
    } catch (error) {
      console.error('Failed to delete panel:', error)
    }
  }

  return (
    <React.Fragment key={id}>
      <TableRow
        className="border-b transition-colors hover:bg-neutral-50 cursor-pointer"
        onClick={() => router.push(`/panel/${id}`)}
      >
        <TableCell className="p-4 align-middle [&:has([role=checkbox])]:pr-0 text-xs py-2 font-medium">
          <div className="flex items-center">
            <LayoutGrid className="h-3 w-3 mr-2 text-yellow-800" />
            {name}
          </div>
        </TableCell>
        <TableCell className="p-4 align-middle [&:has([role=checkbox])]:pr-0 text-xs py-2">
          {totalColumns}
        </TableCell>
        <TableCell className="p-4 align-middle [&:has([role=checkbox])]:pr-0 text-xs py-2">
          {formatDateTime(createdAt)}
        </TableCell>
        <TableCell className="p-4 align-middle [&:has([role=checkbox])]:pr-0 text-xs py-2 text-right">
          <button
            type="button"
            className="btn btn-xs btn-ghost btn-circle"
            onClick={(e) => {
              e.stopPropagation()
              setShowDeleteConfirm(true)
            }}
            aria-label="Remove from history"
          >
            <X className="h-3 w-3 text-neutral-400 hover:text-neutral-600" />
          </button>
        </TableCell>
      </TableRow>

      {views?.map((view) => (
        <TableRow
          key={view.id}
          className="border-b transition-colors hover:bg-neutral-50 cursor-pointer"
          onClick={() => router.push(`/panel/${id}/view/${view.id}`)}
        >
          <TableCell className="p-4 align-middle [&:has([role=checkbox])]:pr-0 text-xs py-2">
            <div className="flex items-center pl-6">
              <ChevronRight className="h-3 w-3 mr-2 text-neutral-400" />
              {view.name}
            </div>
          </TableCell>
          <TableCell className="p-4 align-middle [&:has([role=checkbox])]:pr-0 text-xs py-2">
            {view.visibleColumns.length}
          </TableCell>
          <TableCell className="p-4 align-middle [&:has([role=checkbox])]:pr-0 text-xs py-2">
            {formatDateTime(view.createdAt)}
          </TableCell>
          <TableCell className="p-4 align-middle [&:has([role=checkbox])]:pr-0 text-xs py-2 text-right">
            <button
              type="button"
              className="btn btn-xs btn-ghost btn-circle"
              onClick={(e) => {
                e.stopPropagation()
                onDeleteView(id, view.id)
              }}
              aria-label="Remove from history"
            >
              <X className="h-3 w-3 text-neutral-400 hover:text-neutral-600" />
            </button>
          </TableCell>
        </TableRow>
      ))}

      {showDeleteConfirm && (
        <TableRow>
          <TableCell colSpan={4} className="p-4 text-center">
            <div className="flex justify-center items-center gap-4">
              <button
                type="button"
                className="btn btn-xs btn-error btn-outline"
                onClick={handleDelete}
              >
                Confirm
              </button>
              <button
                type="button"
                className="btn btn-xs btn-ghost"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </button>
            </div>
          </TableCell>
        </TableRow>
      )}
    </React.Fragment>
  )
}

export default PanelsTable
