'use client'
import { Code, Plus, Search, Share2 } from 'lucide-react'
import { ColumnsDropdown } from './ColumnsDropdown'
import WorklistViewDropDown from './ViewTypeDropdown'
import { FilterSortIndicators } from './FilterSortIndicators'
import { ShareModal } from './ShareModal'
import { ViewRoleBadge } from '@/components/ViewRoleBadge'
import { Tooltip } from '@/components/ui/tooltip'
import { useState } from 'react'
import type {
  ViewType,
  ColumnVisibilityContext,
  Filter,
  Sort,
  Column,
} from '@/types/panel'
import { useACL } from '../../../../contexts/ACLContext'

interface PanelToolbarProps {
  searchTerm: string
  onSearch: (term: string) => void
  searchMode: 'text' | 'fhirpath'
  onSearchModeChange: (mode: 'text' | 'fhirpath') => void
  onNewWorklist?: () => void
  onEnrichData?: () => void
  currentView: ViewType
  setCurrentView?: (view: ViewType) => void
  columnVisibilityContext: ColumnVisibilityContext
  onAddColumn: () => void
  isViewPage?: boolean
  viewId?: string
  viewName?: string
  panelId?: string
  // Filter/sort props
  filters?: Filter[]
  sort?: Sort | null
  columns?: Column[]
  onFiltersChange?: (filters: Filter[]) => void
  onSortUpdate?: (sort: Sort | undefined) => void
}

export default function PanelToolbar({
  searchTerm,
  onSearch,
  searchMode,
  onSearchModeChange,
  onEnrichData,
  currentView,
  setCurrentView,
  columnVisibilityContext,
  onAddColumn,
  isViewPage = false,
  viewId,
  viewName,
  panelId,
  filters = [],
  sort,
  columns = [],
  onFiltersChange,
  onSortUpdate,
}: PanelToolbarProps) {
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)
  const { hasPermission } = useACL()

  const canEditPanel = panelId
    ? hasPermission('panel', panelId, 'editor')
    : false

  const canEditView = viewId ? hasPermission('view', viewId, 'editor') : false

  const canEdit = isViewPage ? canEditView : canEditPanel

  return (
    <div className="border-b border-gray-200 bg-white">
      <div className="flex items-center justify-between p-2">
        {!isViewPage && (
          <div className="flex items-center space-x-2 mr-2">
            {/* View dropdown - only show on panel page */}
            <Tooltip
              content="You don't have permissions to change views on this panel"
              show={!canEditPanel}
              position="bottom"
            >
              <div>
                <WorklistViewDropDown
                  currentView={currentView}
                  onViewChange={setCurrentView || (() => {})}
                  disabled={!canEditPanel}
                />
              </div>
            </Tooltip>
          </div>
        )}

        {/* Search bar and column management */}
        <div className="flex-1 flex items-center space-x-2">
          <div className="relative flex-1">
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
              <Search className="h-4 w-4 text-gray-400" />
              <button
                type="button"
                onClick={() =>
                  onSearchModeChange(
                    searchMode === 'text' ? 'fhirpath' : 'text',
                  )
                }
                className="text-xs text-gray-500 hover:text-gray-700"
                title={
                  searchMode === 'text'
                    ? 'Switch to FHIRPath search'
                    : 'Switch to text search'
                }
              >
                <Code className="h-3 w-3" />
              </button>
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => onSearch(e.target.value)}
              placeholder={
                searchMode === 'text'
                  ? 'Search...'
                  : 'Enter FHIRPath expression...'
              }
              className="w-full pl-16 pr-4 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400 placeholder:font-normal"
            />
          </div>

          <FilterSortIndicators
            filters={filters}
            sort={sort}
            columns={columns}
            onFiltersChange={onFiltersChange || (() => {})}
            onSortUpdate={onSortUpdate || (() => {})}
            allColumns={columnVisibilityContext.getAllColumns()}
            canEdit={canEdit}
          />

          {/* Column management buttons */}
          <Tooltip
            content="You don't have permissions to add columns to this panel"
            show={!canEditPanel}
            position="left"
          >
            <button
              type="button"
              className="btn btn-sm btn-primary btn-outline min-w-32"
              onClick={onAddColumn}
              disabled={!canEditPanel}
            >
              <Plus className="h-3 w-3" /> Add column
            </button>
          </Tooltip>

          <ColumnsDropdown
            context={columnVisibilityContext}
            canEdit={canEdit}
          />

          {/* Share button and role badge */}
          <div className="flex items-center gap-2">
            <Tooltip
              content="You don't have permissions to share this panel/view"
              show={!canEdit}
              position="left"
            >
              <button
                type="button"
                className="btn btn-sm btn-default"
                onClick={() => setIsShareModalOpen(true)}
                disabled={!canEdit}
              >
                <Share2 className="h-2 w-2" /> Share
              </button>
            </Tooltip>
            {panelId && (
              <ViewRoleBadge
                panelId={panelId}
                viewId={viewId}
                showPanelFallback={false}
              />
            )}
          </div>

          {onEnrichData && (
            <Tooltip
              content="You don't have permissions to enrich data"
              position="left"
              show={!canEdit}
            >
              <button
                type="button"
                className={`btn btn-sm btn-primary btn-outline ${!canEdit ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={onEnrichData}
                disabled={!canEdit}
              >
                <Plus className="mr-1 h-3 w-3" /> Enrich data
              </button>
            </Tooltip>
          )}
        </div>
      </div>

      {/* Share Modal */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        viewName={viewName}
      />
    </div>
  )
}
