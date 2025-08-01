'use client'
import { Code, Plus, Search } from 'lucide-react'
import { ColumnsDropdown } from './ColumnsDropdown'
import WorklistViewDropDown from './ViewTypeDropdown'
import { FilterSortIndicators } from './FilterSortIndicators'
import type {
  ViewType,
  ColumnVisibilityContext,
  Filter,
  Sort,
  Column,
} from '@/types/panel'

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
  filters = [],
  sort,
  columns = [],
  onFiltersChange,
  onSortUpdate,
}: PanelToolbarProps) {
  return (
    <div className="border-b border-gray-200 bg-white">
      <div className="flex items-center justify-between p-2">
        {!isViewPage && (
          <div className="flex items-center space-x-2 mr-2">
            {/* View dropdown - only show on panel page */}
            <WorklistViewDropDown
              currentView={currentView}
              onViewChange={setCurrentView || (() => {})}
            />
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
          />

          <ColumnsDropdown context={columnVisibilityContext} />

          {/* Column management buttons */}
          <button
            type="button"
            className="btn btn-sm btn-primary btn-outline min-w-32"
            onClick={onAddColumn}
          >
            <Plus className="h-3 w-3" /> Add column
          </button>

          {onEnrichData && (
            <button
              type="button"
              className="btn btn-sm btn-primary btn-outline"
              onClick={onEnrichData}
            >
              <Plus className="mr-1 h-3 w-3" /> Enrich data
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
