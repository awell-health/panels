"use client";

import WorklistFooter from "@/app/panel/[panel]/components/WorklistFooter";
import WorklistNavigation from "@/app/panel/[panel]/components/WorklistNavigation";
import WorklistTable from "@/app/panel/[panel]/components/WorklistTable";
import WorklistToolbar from "@/app/panel/[panel]/components/WorklistToolbar";
import { useColumnCreator } from "@/hooks/use-column-creator";
import { type WorklistPatient, type WorklistTask, useMedplumStore } from "@/hooks/use-medplum-store";
import { usePanelStore } from "@/hooks/use-panel-store";
import { useSearch } from "@/hooks/use-search";
import { arrayMove } from "@/lib/utils";
import type { ColumnDefinition, Filter, PanelDefinition, SortConfig, ViewDefinition, WorklistDefinition } from "@/types/worklist";
import type { DragEndEvent } from "@dnd-kit/core";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AddIngestionModal } from "./components/AddIngestionModal";

interface TableFilter {
  key: string;
  value: string;
}


export default function WorklistPage() {
  const params = useParams();
  const panelId = params.panel as string;
  const [currentView, setCurrentView] = useState<'patient' | 'task'>('patient');
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingIngestionSource, setIsAddingIngestionSource] = useState(false);
  const [panelDefinition, setPanelDefinition] = useState<PanelDefinition | undefined>(undefined);
  const [columns, setColumns] = useState<ColumnDefinition[]>([]);
  const [tableData, setTableData] = useState<(WorklistPatient | WorklistTask)[]>([]);
  const { searchTerm, setSearchTerm, searchMode, setSearchMode, filteredData } = useSearch(tableData);
  const [tableFilters, setTableFilters] = useState<TableFilter[]>([]);
  const [sortConfig, setSortConfig] = useState<SortConfig | undefined>(undefined);

  const { patients, tasks, toggleTaskOwner, isLoading: isMedplumLoading } = useMedplumStore();
  const { getPanel, updatePanel, addView, isLoading: isPanelLoading } = usePanelStore();

  const router = useRouter();

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    setIsLoading(isPanelLoading || !panelDefinition);
  }, [isPanelLoading, panelId, panelDefinition]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    if (isPanelLoading) {
      return;
    }

    const panel = getPanel(panelId);
    if (!panel) {
      throw new Error('Panel not found');
    } else {
      setPanelDefinition(panel);
    }
  }, [panelId, router, isPanelLoading]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    if (!panelDefinition) {
      return;
    }
    setColumns(currentView === 'patient' ? panelDefinition.patientViewColumns : panelDefinition.taskViewColumns);
    setTableData(currentView === 'patient' ? patients : tasks);
    setTableFilters(panelDefinition.filters.map(filter => ({
      key: filter.fhirPathFilter[0],
      value: filter.fhirPathFilter[1],
    })));
  }, [panelDefinition, currentView, tasks, patients, isLoading]);

  const onColumnChange = async (column: WorklistDefinition | ViewDefinition) => {
    if (!panelDefinition) {
      return;
    }

    const newPanel = {
      ...panelDefinition,
      ...column,
    }

    try {
      await updatePanel(panelDefinition.id, newPanel);
      setPanelDefinition(newPanel);
    } catch (error) {
      console.error('Failed to update panel:', error);
    }
  }

  const { onAddColumn } = useColumnCreator({
    currentView,
    patients,
    tasks,
    worklistDefinition: panelDefinition,
    onDefinitionChange: onColumnChange,
  });

  const onNewView = async () => {
    if (!panelDefinition) {
      return;
    }

    try {
      const newView = await addView?.(panelDefinition.id, {
        title: "New View",
        filters: panelDefinition.filters,
        columns: currentView === 'patient' ? panelDefinition.patientViewColumns : panelDefinition.taskViewColumns,
        createdAt: new Date(),
        viewType: currentView,
        sortConfig: sortConfig ? [sortConfig] : [],
      });
      if (newView) {
        router.push(`/panel/${panelDefinition.id}/view/${newView.id}`);
      }
    } catch (error) {
      console.error('Failed to create new view:', error);
      // Optionally show user-friendly error message
    }
  }

  const onPanelTitleChange = async (newTitle: string) => {
    if (!panelDefinition) {
      return;
    }

    try {
      await updatePanel?.(panelDefinition.id, { title: newTitle });
      const updatedPanel = {
        ...panelDefinition,
        title: newTitle,
      };
      setPanelDefinition(updatedPanel);
    } catch (error) {
      console.error('Failed to update panel title:', error);
      // Optionally show user-friendly error message
    }
  }

  const onColumnUpdate = async (updates: Partial<ColumnDefinition>) => {
    if (!panelDefinition) {
      return;
    }

    const newPanel = {
      ...panelDefinition,
      taskViewColumns: panelDefinition.taskViewColumns.map(column => {
        if (column.id === updates.id) {
          return {
            ...column,
            ...updates,
          }
        }
        return column;
      }),
      patientViewColumns: panelDefinition.patientViewColumns.map(column => {
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
      await updatePanel?.(panelDefinition.id, newPanel);
      setPanelDefinition(newPanel);
    } catch (error) {
      console.error('Failed to update column:', error);
    }
  }

  const onFiltersChange = async (newTableFilters: TableFilter[]) => {
    if (!panelDefinition) {
      return;
    }

    // Convert table filters to view filters
    const newFilters: Filter[] = newTableFilters.map(filter => ({
      fhirPathFilter: [filter.key, filter.value]
    }));
    const newPanel = {
      ...panelDefinition,
      filters: newFilters,
    }

    try {
      await updatePanel?.(panelId, newPanel);
      setPanelDefinition(newPanel);
      setTableFilters(newTableFilters);
    } catch (error) {
      console.error('Failed to update filters:', error);
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !panelDefinition) {
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

    // Update the panel definition based on current view
    const newPanel = {
      ...panelDefinition,
      taskViewColumns: currentView === 'task' ? reorderedColumns : panelDefinition.taskViewColumns,
      patientViewColumns: currentView === 'patient' ? reorderedColumns : panelDefinition.patientViewColumns,
    };

    try {
      await updatePanel?.(panelDefinition.id, newPanel);
      setPanelDefinition(newPanel);
    } catch (error) {
      console.error('Failed to reorder columns:', error);
    }
  }


  return (
    <>
      {isLoading ? (
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900" />
        </div>
      ) : (
        <div className="flex flex-col h-screen">
          {/* biome-ignore lint/style/noNonNullAssertion: <explanation> */}
          <WorklistNavigation panelDefinition={panelDefinition!} onNewView={onNewView} onPanelTitleChange={onPanelTitleChange} />
          <WorklistToolbar
            searchTerm={searchTerm}
            onSearch={setSearchTerm}
            searchMode={searchMode}
            onSearchModeChange={setSearchMode}
            currentView={currentView}
            setCurrentView={setCurrentView}
            worklistColumns={columns}
            onAddColumn={onAddColumn}
            visibleColumns={columns}
            onColumnVisibilityChange={(columnId, visible) => onColumnUpdate({
              id: columnId,
              properties: {
                display: { visible }
              }
            })}
          />
          <div className="flex-1 overflow-hidden"> {/* This container prevents double scrollbars */}
            <WorklistTable isLoading={isMedplumLoading}
              selectedRows={[]}
              toggleSelectAll={() => { }}
              onSortConfigUpdate={setSortConfig}
              worklistColumns={columns}
              tableData={filteredData}
              handlePDFClick={() => { }}
              handleTaskClick={() => { }}
              handleRowHover={() => { }}
              toggleSelectRow={() => { }}
              handleAssigneeClick={(taskId: string) => toggleTaskOwner(taskId, process.env.NEXT_PUBLIC_AUTH_USER_ID ?? '')}
              setIsAddingIngestionSource={() => setIsAddingIngestionSource(true)}
              currentView={currentView}
              handleDragEnd={handleDragEnd}
              onColumnUpdate={onColumnUpdate}
              filters={tableFilters}
              onFiltersChange={onFiltersChange}
              initialSortConfig={sortConfig ?? null}
            />
            {isAddingIngestionSource && (
              <AddIngestionModal
                isOpen={isAddingIngestionSource}
                onClose={() => setIsAddingIngestionSource(false)}
                onSelectSource={() => { }}
                ingestionBots={[]}
              />
            )}
          </div>
          <WorklistFooter
            columnsCounter={columns.length}
            rowsCounter={tableData.length}
            navigateToHome={() => router.push('/')}
            isAISidebarOpen={false}
          />
        </div>
      )}
    </>
  );
}