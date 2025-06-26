"use client";
import type { ColumnDefinition } from "@/types/worklist";
import { Code, Plus, Search } from "lucide-react";
import { ColumnsDropdown } from "./ColumnsDropdown";
import WorklistViewDropDown from "./WorklistViewDropDown";

interface WorklistToolbarProps {
    searchTerm: string;
    onSearch: (term: string) => void;
    searchMode: 'text' | 'fhirpath';
    onSearchModeChange: (mode: 'text' | 'fhirpath') => void;
    onNewWorklist?: () => void;
    onEnrichData?: () => void;
    currentView: 'patient' | 'task' | undefined;
    setCurrentView?: (view: 'patient' | 'task') => void;
    worklistColumns: ColumnDefinition[];
    onAddColumn: () => void;
    onColumnVisibilityChange: (columnId: string, visible: boolean) => void;
}

export default function WorklistToolbar({
    searchTerm,
    onSearch,
    searchMode,
    onSearchModeChange,
    onEnrichData,
    currentView,
    setCurrentView,
    worklistColumns,
    onAddColumn,
    onColumnVisibilityChange,
}: WorklistToolbarProps) {
    return (
        <div className="border-b border-gray-200 bg-white">
            <div className="flex items-center justify-between p-2">
                {currentView && (
                    <div className="flex items-center space-x-3">
                        {/* View dropdown */}
                        <WorklistViewDropDown currentView={currentView} onViewChange={setCurrentView || (() => { })} />
                    </div>
                )}

                {/* Search bar and column management */}
                <div className="flex-1 mx-4 flex items-center space-x-2">
                    <div className="relative flex-1">
                        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
                            <Search className="h-4 w-4 text-gray-400" />
                            <button
                                type="button"
                                onClick={() => onSearchModeChange(searchMode === 'text' ? 'fhirpath' : 'text')}
                                className="text-xs text-gray-500 hover:text-gray-700"
                                title={searchMode === 'text' ? 'Switch to FHIRPath search' : 'Switch to text search'}
                            >
                                <Code className="h-3 w-3" />
                            </button>
                        </div>
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => onSearch(e.target.value)}
                            placeholder={searchMode === 'text' ? "Search..." : "Enter FHIRPath expression..."}
                            className="w-full pl-16 pr-4 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400 placeholder:font-normal"
                        />
                    </div>

                    {/* Column management buttons */}
                    <button
                        type="button"
                        className="btn text-xs font-normal h-8 px-2 flex items-center text-gray-700"
                        onClick={onAddColumn}
                    >
                        <Plus className="mr-1 h-3 w-3" /> Add column
                    </button>

                    <ColumnsDropdown
                        columns={worklistColumns}
                        onColumnVisibilityChange={onColumnVisibilityChange}
                    />
                </div>

                <div className="flex items-center space-x-2">
                    {/* biome-ignore lint/a11y/useButtonType: <explanation> */}
                    <button
                        className="btn text-xs font-normal h-8 px-2 flex items-center text-gray-700"
                        onClick={() => {
                            console.log("Actions");
                        }}
                    >
                        Actions
                    </button>
                    {/* biome-ignore lint/a11y/useButtonType: <explanation> */}
                    <button
                        className="text-xs font-normal h-8 px-2 bg-blue-500 hover:bg-blue-600 text-white flex items-center"
                        onClick={onEnrichData}
                    >
                        <Plus className="mr-1 h-3 w-3" /> Enrich data
                    </button>
                </div>
            </div>
        </div>
    );
}