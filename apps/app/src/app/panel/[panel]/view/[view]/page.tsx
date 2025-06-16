"use client";
import WorklistFooter from "@/app/panel/[panel]/components/WorklistFooter";
import WorklistNavigation from "@/app/panel/[panel]/components/WorklistNavigation";
import WorklistTable from "@/app/panel/[panel]/components/WorklistTable";
import WorklistToolbar from "@/app/panel/[panel]/components/WorklistToolbar";
import { useColumnCreator } from "@/hooks/use-column-creator";
import { useMedplumStore } from "@/hooks/use-medplum-store";
import { usePanelStore } from "@/hooks/use-panel-store";
import { useSearch } from "@/hooks/use-search";
import { arrayMove } from "@/lib/utils";
import type { ColumnDefinition, Filter, PanelDefinition, ViewDefinition, WorklistDefinition } from "@/types/worklist";
import type { DragEndEvent } from "@dnd-kit/core";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface TableFilter {
  key: string;
  value: string;
}

export default function WorklistPage() {
  const { patients, tasks, toggleTaskOwner, isLoading: isMedplumLoading } = useMedplumStore();
  const { getPanel, getView, updateView, addView, isLoading: isPanelLoading, panels } = usePanelStore();
  const params = useParams();
  const panelId = params.panel as string;
  const viewId = params.view as string;
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  const [panelDefinition, setPanelDefinition] = useState<PanelDefinition | null>(null);
  const [viewDefinition, setViewDefinition] = useState<ViewDefinition | null>(null);
  const [tableFilters, setTableFilters] = useState<TableFilter[]>([]);

  const searchData = viewDefinition?.viewType === 'patient' ? patients : tasks;
  // @ts-ignore - Type mismatch between patient/task arrays but useSearch handles both
  const { searchTerm, setSearchTerm, searchMode, setSearchMode, filteredData } = useSearch(searchData);

  const columns = viewDefinition?.columns ?? [];
  const tableData = filteredData ?? [];

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    setIsLoading(isPanelLoading || !viewDefinition || !panelDefinition);
  }, [isPanelLoading, panelId, viewId, viewDefinition, panelDefinition]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    if (isPanelLoading) {
      return;
    }

    const panel = getPanel(panelId);
    if (!panel) {
      // TODO panel not found
      return;
    }
    setPanelDefinition(panel);
    const view = getView(panelId, viewId);
    if (!view) {
      // TODO view not found
      return;
    }
    setViewDefinition(view);

    setTableFilters(view.filters.map(filter => ({
      key: filter.fhirPathFilter[0],
      value: filter.fhirPathFilter[1],
    })));
  }, [panelId, viewId, isPanelLoading]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    if (isPanelLoading) {
      return;
    }

    const panel = getPanel(panelId);
    if (!panel) {
      // TODO panel not found
      return;
    }
    setPanelDefinition(panel);
  }, [panels]);

  const onColumnUpdate = async (updates: Partial<ColumnDefinition>) => {
    if (!viewDefinition) {
      return;
    }

    const newView = {
      ...viewDefinition,
      columns: viewDefinition.columns.map(column => {
        if (column.id === updates.id) {
          return {
            ...column,
            ...updates,
          }
        }
        return column;
      }),
    }

    try {
      await updateView(panelId, viewId, newView);
      setViewDefinition(newView);
    } catch (error) {
      console.error('Failed to update column:', error);
    }
  }

  const onFiltersChange = async (newTableFilters: TableFilter[]) => {
    if (!viewDefinition) {
      return;
    }

    // Convert table filters to view filters
    const newFilters: Filter[] = newTableFilters.map(filter => ({
      fhirPathFilter: [filter.key, filter.value]
    }));
    const newView = {
      ...viewDefinition,
      filters: newFilters,
    }

    try {
      await updateView(panelId, viewId, newView);
      setViewDefinition(newView);
      setTableFilters(newTableFilters);
    } catch (error) {
      console.error('Failed to update filters:', error);
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !viewDefinition) {
      return;
    }

    // Find the active column's index and the over column's index
    const oldIndex = columns.findIndex(col => col.id === active.id);
    const newIndex = columns.findIndex(col => col.id === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    // Reorder the columns
    const reorderedColumns = arrayMove(columns, oldIndex, newIndex);

    // Update the view definition
    const newView = {
      ...viewDefinition,
      columns: reorderedColumns,
    };

    try {
      await updateView(panelId, viewId, newView);
      setViewDefinition(newView);
    } catch (error) {
      console.error('Failed to reorder columns:', error);
    }
  }

  const onColumnChange = async (column: ViewDefinition | WorklistDefinition) => {
    if (!viewDefinition) {
      return;
    }

    const newView = {
      ...viewDefinition,
      ...column,
    }

    try {
      await updateView(panelId, viewId, newView);
      setViewDefinition(newView);
    } catch (error) {
      console.error('Failed to update view:', error);
    }
  }

  const { onAddColumn } = useColumnCreator({
    currentView: viewDefinition?.viewType ?? 'patient',
    patients,
    tasks,
    worklistDefinition: viewDefinition || undefined,
    onDefinitionChange: onColumnChange,
  });

  const onNewView = async () => {
    const panel = getPanel(panelId);
    if (!panel) {
      return;
    }

    try {
      const newView = await addView(panelId, {
        title: "New View",
        filters: viewDefinition?.filters ?? panel.filters,
        columns: viewDefinition?.columns ?? panel.taskViewColumns,
        createdAt: new Date(),
        viewType: viewDefinition?.viewType ?? 'task',
      });
      router.push(`/panel/${panelId}/view/${newView.id}`);
    } catch (error) {
      console.error('Failed to create new view:', error);
      // Optionally show user-friendly error message
    }
  }

  const onViewTitleChange = async (newTitle: string) => {
    if (!viewDefinition) {
      console.log("viewDefinition not found");
      return;
    }
    console.log("newTitle", newTitle);

    try {
      await updateView(panelId, viewId, { title: newTitle });
      const updatedView = {
        ...viewDefinition,
        title: newTitle,
      };
      setViewDefinition(updatedView);
    } catch (error) {
      console.error('Failed to update view title:', error);
      // Optionally show user-friendly error message
    }
  };

  return (
    <>
      {panelDefinition && (
        <WorklistNavigation panelDefinition={panelDefinition} selectedViewId={viewId} onNewView={onNewView} onViewTitleChange={onViewTitleChange} />
      )}
      {isLoading ? (
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900" />
        </div>
      ) : (
        <>
          <WorklistToolbar
            searchTerm={searchTerm}
            onSearch={setSearchTerm}
            searchMode={searchMode}
            onSearchModeChange={setSearchMode}
            currentView={viewDefinition?.viewType}
            setCurrentView={() => { }}
            worklistColumns={columns}
            onAddColumn={onAddColumn}
            onColumnVisibilityChange={(columnId, visible) => onColumnUpdate({ id: columnId, properties: { display: { visible } } })}
          />
          <WorklistTable isLoading={isMedplumLoading}
            selectedRows={[]}
            toggleSelectAll={() => { }}
            worklistColumns={columns}
            onAddColumn={onAddColumn}
            isBlank={false}
            tableData={filteredData}
            handlePDFClick={() => { }}
            handleTaskClick={() => { }}
            handleRowHover={() => { }}
            toggleSelectRow={() => { }}
            handleAssigneeClick={(taskId: string) => toggleTaskOwner(taskId, process.env.NEXT_PUBLIC_AUTH_USER_ID ?? '')}
            setIsAddingIngestionSource={() => { }}
            currentView={viewDefinition?.viewType ?? 'patient'}
            handleDragEnd={handleDragEnd}
            onColumnUpdate={onColumnUpdate}
            filters={tableFilters}
            onFiltersChange={onFiltersChange}
          />
          <WorklistFooter
            columnsCounter={columns.length}
            rowsCounter={tableData.length}
            navigateToHome={() => router.push('/')}
            isAISidebarOpen={false}
          />
        </>
      )}
    </>
  );
}