"use client";

import WorklistFooter from "@/app/panel/[panel]/components/WorklistFooter";
import WorklistNavigation from "@/app/panel/[panel]/components/WorklistNavigation";
import WorklistTable from "@/app/panel/[panel]/components/WorklistTable";
import WorklistToolbar from "@/app/panel/[panel]/components/WorklistToolbar";
import { useColumnCreator } from "@/hooks/use-column-creator";
import { type WorklistPatient, type WorklistTask, useMedplumStore } from "@/hooks/use-medplum-store";
import { useReactivePanelStore } from "@/hooks/use-reactive-panel-store";
import { useReactivePanel } from "@/hooks/use-reactive-data";
import { useSearch } from "@/hooks/use-search";
import { arrayMove } from "@/lib/utils";
import type { ColumnDefinition, Filter, PanelDefinition, SortConfig, ViewDefinition, WorklistDefinition } from "@/types/worklist";
import type { DragEndEvent } from "@dnd-kit/core";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AddIngestionModal } from "./components/AddIngestionModal";
import { Loader2 } from "lucide-react";

interface TableFilter {
    key: string;
    value: string;
}

export default function ReactiveWorklistPage() {
    const params = useParams();
    const panelId = params.panel as string;
    const [currentView, setCurrentView] = useState<'patient' | 'task'>('patient');
    const [isAddingIngestionSource, setIsAddingIngestionSource] = useState(false);
    const [tableFilters, setTableFilters] = useState<TableFilter[]>([]);
    const [sortConfig, setSortConfig] = useState<SortConfig | undefined>(undefined);

    const { patients, tasks, toggleTaskOwner, isLoading: isMedplumLoading } = useMedplumStore();
    const { updatePanel, addView, updateColumn } = useReactivePanelStore();
    const { panel, isLoading: isPanelLoading, error: panelError } = useReactivePanel(panelId);

    const router = useRouter();

    // Get columns for current view type
    const columns = currentView === 'patient'
        ? (panel?.patientViewColumns || [])
        : (panel?.taskViewColumns || []);

    // Set table data based on current view
    const tableData = currentView === 'patient' ? patients : tasks;
    // @ts-ignore - Type mismatch between patient/task arrays but useSearch handles both
    const { searchTerm, setSearchTerm, searchMode, setSearchMode, filteredData } = useSearch(tableData);

    // Set filters from panel
    useEffect(() => {
        if (panel) {
            setTableFilters(panel.filters.map(filter => ({
                key: filter.fhirPathFilter[0],
                value: filter.fhirPathFilter[1],
            })));
        }
    }, [panel]);

    // Handle panel not found
    useEffect(() => {
        if (!isPanelLoading && !panel && !panelError) {
            router.push('/');
        }
    }, [isPanelLoading, panel, panelError, router]);

    const onColumnChange = async (column: WorklistDefinition | ViewDefinition) => {
        if (!panel) {
            return;
        }

        const newPanel = {
            ...panel,
            ...column,
        }

        try {
            await updatePanel(panel.id, newPanel);
        } catch (error) {
            console.error('Failed to update panel:', error);
        }
    }

    const { onAddColumn } = useColumnCreator({
        currentView,
        patients,
        tasks,
        worklistDefinition: panel || undefined,
        onDefinitionChange: onColumnChange,
    });

    const onNewView = async () => {
        if (!panel) {
            return;
        }

        try {
            const newView = await addView?.(panel.id, {
                title: "New View",
                filters: panel.filters,
                columns: currentView === 'patient' ? panel.patientViewColumns : panel.taskViewColumns,
                createdAt: new Date(),
                viewType: currentView,
                sortConfig: sortConfig ? [sortConfig] : [],
            });
            if (newView) {
                router.push(`/panel/${panel.id}/view/${newView.id}`);
            }
        } catch (error) {
            console.error('Failed to create new view:', error);
        }
    }

    const onPanelTitleChange = async (newTitle: string) => {
        if (!panel) {
            return;
        }

        try {
            await updatePanel?.(panel.id, { title: newTitle });
        } catch (error) {
            console.error('Failed to update panel title:', error);
        }
    }

    const onColumnUpdate = async (updates: Partial<ColumnDefinition>) => {
        if (!panel || !updates.id) {
            return;
        }

        try {
            await updateColumn?.(panel.id, updates.id, updates);
        } catch (error) {
            console.error('Failed to update column:', error);
        }
    }

    const onFiltersChange = async (newTableFilters: TableFilter[]) => {
        if (!panel) {
            return;
        }

        // Convert table filters to view filters
        const newFilters: Filter[] = newTableFilters.map(filter => ({
            fhirPathFilter: [filter.key, filter.value]
        }));
        const newPanel = {
            ...panel,
            filters: newFilters,
        }

        try {
            await updatePanel?.(panelId, newPanel);
            setTableFilters(newTableFilters);
        } catch (error) {
            console.error('Failed to update filters:', error);
        }
    }

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id || !panel) {
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

        // Update the order property for all columns to ensure sequential order
        const columnsWithOrder = reorderedColumns.map((col, index) => {
            // Preserve existing properties
            const existingProperties = col.properties || {};
            const existingDisplay = existingProperties.display || {};

            return {
                ...col,
                properties: {
                    ...existingProperties,
                    display: {
                        ...existingDisplay,
                        order: index, // Ensure sequential order
                    },
                },
            };
        });

        // Update the panel definition based on current view
        const newPanel = {
            ...panel,
            taskViewColumns: currentView === 'task' ? columnsWithOrder : panel.taskViewColumns,
            patientViewColumns: currentView === 'patient' ? columnsWithOrder : panel.patientViewColumns,
        };

        try {
            await updatePanel?.(panel.id, newPanel);
        } catch (error) {
            console.error('Failed to reorder columns:', error);
        }
    }

    const isLoading = isPanelLoading || !panel;

    return (
        <>
            {isLoading ? (
                <div className="flex items-center justify-center h-screen">
                    <Loader2 className="h-8 w-8 text-blue-500 animate-spin mb-2" aria-label="Loading Panel" />
                </div>
            ) : (
                <>
                    <div className="navigation-area">
                        {panel && (
                            <WorklistNavigation panelDefinition={panel} onNewView={onNewView} onPanelTitleChange={onPanelTitleChange} />
                        )}
                    </div>
                    <div className="toolbar-area">
                        <WorklistToolbar
                            key={`${panelId}-${currentView}-${columns.length}`}
                            searchTerm={searchTerm}
                            onSearch={setSearchTerm}
                            searchMode={searchMode}
                            onSearchModeChange={setSearchMode}
                            currentView={currentView}
                            setCurrentView={setCurrentView}
                            worklistColumns={columns}
                            onAddColumn={onAddColumn}
                            onColumnVisibilityChange={(columnId, visible) => onColumnUpdate({
                                id: columnId,
                                properties: {
                                    display: { visible }
                                }
                            })}
                        />
                    </div>
                    <div className="content-area">
                        <div className="table-scroll-container">
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
                                handleAssigneeClick={(taskId: string) => toggleTaskOwner(taskId)}
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
                    </div>
                    <div className="footer-area">
                        <WorklistFooter
                            columnsCounter={columns.length}
                            rowsCounter={tableData.length}
                            navigateToHome={() => router.push('/')}
                            isAISidebarOpen={false}
                        />
                    </div>
                </>
            )}
        </>
    );
} 