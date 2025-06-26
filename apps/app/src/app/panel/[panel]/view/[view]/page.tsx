"use client";
import { isFeatureEnabled } from '@/utils/featureFlags'
import ReactiveWorklistViewPage from './page-reactive'
import WorklistFooter from "@/app/panel/[panel]/components/WorklistFooter";
import WorklistNavigation from "@/app/panel/[panel]/components/WorklistNavigation";
import WorklistTable from "@/app/panel/[panel]/components/WorklistTable";
import WorklistToolbar from "@/app/panel/[panel]/components/WorklistToolbar";
import { useColumnCreator } from "@/hooks/use-column-creator";
import { useMedplumStore } from "@/hooks/use-medplum-store";
import { usePanelStore } from "@/hooks/use-panel-store";
import { useSearch } from "@/hooks/use-search";
import { arrayMove } from "@/lib/utils";
import type { ColumnDefinition, Filter, PanelDefinition, SortConfig, ViewDefinition, WorklistDefinition } from "@/types/worklist";
import type { DragEndEvent } from "@dnd-kit/core";
import { Loader2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface TableFilter {
  key: string;
  value: string;
}

export default function WorklistViewPage() {
  const isReactiveEnabled = isFeatureEnabled('ENABLE_REACTIVE_DATA_STORAGE')

  // If reactive is enabled, use the reactive component
  if (isReactiveEnabled) {
    return <ReactiveWorklistViewPage />
  }

  // Original implementation for when reactive is disabled
  const { patients, tasks, toggleTaskOwner, isLoading: isMedplumLoading } = useMedplumStore();
  const { getPanel, getView, updatePanel, addView, isLoading: isPanelLoading } = usePanelStore();
  const params = useParams();
  const panelId = params.panel as string;
  const viewId = params.view as string;
  const router = useRouter();

  const [tableFilters, setTableFilters] = useState<TableFilter[]>([]);
  const [panel, setPanel] = useState<PanelDefinition | null>(null);
  const [view, setView] = useState<ViewDefinition | null>(null);

  // Get panel and view data
  useEffect(() => {
    const currentPanel = getPanel(panelId);
    if (currentPanel) {
      setPanel(currentPanel);
      const currentView = getView(panelId, viewId);
      if (currentView) {
        setView(currentView);
        setTableFilters(currentView.filters.map((filter: Filter) => ({
          key: filter.fhirPathFilter[0],
          value: filter.fhirPathFilter[1],
        })));
      }
    }
  }, [getPanel, getView, panelId, viewId]);

  const searchData = view?.viewType === 'patient' ? patients : tasks;
  // @ts-ignore - Type mismatch between patient/task arrays but useSearch handles both
  const { searchTerm, setSearchTerm, searchMode, setSearchMode, filteredData } = useSearch(searchData);

  const columns = view?.columns && view.columns.length > 0
    ? view.columns
    : (view?.viewType === 'patient' ? panel?.patientViewColumns ?? [] : panel?.taskViewColumns ?? []);
  const tableData = filteredData ?? [];

  // Handle panel or view not found
  useEffect(() => {
    if (!isPanelLoading && !panel) {
      router.push('/');
      return;
    }
    if (!isPanelLoading && !view) {
      router.push(`/panel/${panelId}`);
      return;
    }
  }, [isPanelLoading, panel, view, router, panelId]);

  const onColumnUpdate = async (updates: Partial<ColumnDefinition>) => {
    if (!view || !panel) {
      return;
    }

    const panelColumns = view.viewType === 'patient' ? panel.patientViewColumns ?? [] : panel.taskViewColumns ?? []

    const newColumns = updates.properties?.display?.visible
      ? view.columns.some((col: ColumnDefinition) => col.id === updates.id)
        ? view.columns
        : [...view.columns, panelColumns.find((col: ColumnDefinition) => col.id === updates.id)].filter((col): col is ColumnDefinition => col !== undefined)
      : view.columns.filter((column: ColumnDefinition) => column.id !== updates.id).filter((col): col is ColumnDefinition => col !== undefined)

    const newView = {
      ...view,
      columns: newColumns
    }

    const newPanel = {
      ...panel,
      views: panel.views?.map((v: ViewDefinition) => v.id === viewId ? newView : v) ?? [newView]
    }

    try {
      await updatePanel(panel.id, newPanel);
      setView(newView);
      setPanel(newPanel);
    } catch (error) {
      console.error('Failed to update column:', error);
    }
  }

  const onFiltersChange = async (newTableFilters: TableFilter[]) => {
    if (!view || !panel) {
      return;
    }

    // Convert table filters to view filters
    const newFilters: Filter[] = newTableFilters.map((filter: TableFilter) => ({
      fhirPathFilter: [filter.key, filter.value]
    }));
    const newView = {
      ...view,
      filters: newFilters,
    }

    const newPanel = {
      ...panel,
      views: panel.views?.map((v: ViewDefinition) => v.id === viewId ? newView : v) ?? [newView]
    }

    try {
      await updatePanel(panel.id, newPanel);
      setTableFilters(newTableFilters);
      setView(newView);
      setPanel(newPanel);
    } catch (error) {
      console.error('Failed to update filters:', error);
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !view || !panel) {
      return;
    }

    // Find the active column's index and the over column's index
    const oldIndex = columns.findIndex((col: ColumnDefinition) => col.id === active.id);
    const newIndex = columns.findIndex((col: ColumnDefinition) => col.id === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    // Reorder the columns
    const reorderedColumns = arrayMove(columns, oldIndex, newIndex);

    // Update the view definition
    const newView = {
      ...view,
      columns: reorderedColumns,
    };

    const newPanel = {
      ...panel,
      views: panel.views?.map((v: ViewDefinition) => v.id === viewId ? newView : v) ?? [newView]
    }

    try {
      await updatePanel(panel.id, newPanel);
      setView(newView);
      setPanel(newPanel);
    } catch (error) {
      console.error('Failed to reorder columns:', error);
    }
  }

  const onColumnChange = async (column: ViewDefinition | WorklistDefinition) => {
    if (!view || !panel) {
      return;
    }

    const newView = {
      ...view,
      ...column,
    }

    const newPanel = {
      ...panel,
      views: panel.views?.map((v: ViewDefinition) => v.id === viewId ? newView : v) ?? [newView]
    }

    try {
      await updatePanel(panel.id, newPanel);
      setView(newView);
      setPanel(newPanel);
    } catch (error) {
      console.error('Failed to update view:', error);
    }
  }

  const { onAddColumn } = useColumnCreator({
    currentView: view?.viewType ?? 'patient',
    patients,
    tasks,
    worklistDefinition: view || undefined,
    onDefinitionChange: onColumnChange,
  });

  const onNewView = async () => {
    if (!panel) {
      return;
    }

    try {
      const newView = await addView(panel.id, {
        title: "New View",
        filters: view?.filters ?? panel.filters,
        columns: view?.viewType === 'patient' ? panel.patientViewColumns : panel.taskViewColumns,
        createdAt: new Date(),
        viewType: view?.viewType ?? 'task',
        sortConfig: view?.sortConfig ?? [],
      });
      if (newView) {
        router.push(`/panel/${panelId}/view/${newView.id}`);
      }
    } catch (error) {
      console.error('Failed to create new view:', error);
    }
  }

  const onSortConfigUpdate = async (sortConfig: SortConfig | undefined) => {
    if (!view || !panel) {
      return;
    }
    const newView = {
      ...view,
      sortConfig: sortConfig ? [sortConfig] : [],
    }
    const newPanel = {
      ...panel,
      views: panel.views?.map((v: ViewDefinition) => v.id === viewId ? newView : v) ?? [newView]
    }
    await updatePanel(panel.id, newPanel);
    setView(newView);
    setPanel(newPanel);
  }

  const onViewTitleChange = async (newTitle: string) => {
    if (!view || !panel) {
      console.log("viewDefinition not found");
      return;
    }

    try {
      const newView = {
        ...view,
        title: newTitle,
      }
      const newPanel = {
        ...panel,
        views: panel.views?.map((v: ViewDefinition) => v.id === viewId ? newView : v) ?? [newView]
      }
      await updatePanel(panel.id, newPanel);
      setView(newView);
      setPanel(newPanel);
    } catch (error) {
      console.error('Failed to update view title:', error);
    }
  };

  if (!panel || !view) {
    return null;
  }

  return (
    <>
      {/* Navigation Area */}
      <div className="navigation-area">
        <WorklistNavigation panelDefinition={panel} selectedViewId={viewId} onNewView={onNewView} onViewTitleChange={onViewTitleChange} />
      </div>

      {/* Toolbar Area */}
      <div className="toolbar-area">
        <WorklistToolbar
          searchTerm={searchTerm}
          onSearch={setSearchTerm}
          searchMode={searchMode}
          onSearchModeChange={setSearchMode}
          currentView={view?.viewType}
          setCurrentView={() => { }}
          worklistColumns={columns}
          onAddColumn={onAddColumn}
          onColumnVisibilityChange={(columnId, visible) => onColumnUpdate({ id: columnId, properties: { display: { visible } } })}
        />
      </div>

      {/* Content Area */}
      <div className="content-area">
        <div className="table-scroll-container">
          <WorklistTable
            isLoading={isMedplumLoading}
            selectedRows={[]}
            toggleSelectAll={() => { }}
            worklistColumns={columns}
            onSortConfigUpdate={onSortConfigUpdate}
            tableData={filteredData}
            handlePDFClick={() => { }}
            handleTaskClick={() => { }}
            handleRowHover={() => { }}
            toggleSelectRow={() => { }}
            handleAssigneeClick={(taskId: string) => toggleTaskOwner(taskId)}
            setIsAddingIngestionSource={() => { }}
            currentView={view?.viewType ?? 'patient'}
            handleDragEnd={handleDragEnd}
            onColumnUpdate={onColumnUpdate}
            filters={tableFilters}
            onFiltersChange={onFiltersChange}
            initialSortConfig={view?.sortConfig?.[0] ?? null}
          />
        </div>
      </div>

      {/* Footer Area */}
      <div className="footer-area">
        <WorklistFooter
          columnsCounter={columns.length}
          rowsCounter={tableData.length}
          navigateToHome={() => router.push('/')}
          isAISidebarOpen={false}
        />
      </div>
    </>
  );
}