"use client"

import { useReactivePanelStore } from "@/hooks/use-reactive-panel-store";
import { useReactivePanels } from "@/hooks/use-reactive-data";
import { Loader2, Menu } from "lucide-react";
import PanelsTable from "./components/PanelsTable";
import TeamTable from "./components/TeamTable";
import { useAuthentication } from "@/hooks/use-authentication";

const users = [
    { id: '1', name: 'Thomas Vande Casteele', email: 'thomas@turtle.care', role: 'Builder', panels: 'All available panels' },
    { id: '2', name: 'Sanne Willekens', email: 'sanne@turtle.care', role: 'User', panels: '' },
];

const ReactiveHome = () => {
    const { name } = useAuthentication()
    const { panels, isLoading: isPanelLoading, error: panelError } = useReactivePanels();
    const { deletePanel, deleteView, createPanel } = useReactivePanelStore();

    return (
        <div className="flex min-h-screen ml-0 transition-all duration-300">
            <div className="flex-1">
                <div className="p-4">
                    <div className="flex items-center mb-6">
                        <button
                            type="button"
                            className="btn btn-ghost btn-sm fixed top-4 left-4 z-30 flex items-center justify-center"
                        >
                            <Menu className="h-4 w-4" />
                        </button>

                        <div className="ml-12">
                            <h1 className="text-xl font-medium">Welcome {name ?? ''}!</h1>
                            <p className="text-sm text-gray-600">
                                Quickly access your organization's Panels and manage your Team below.
                            </p>
                        </div>
                    </div>

                    {isPanelLoading ? (
                        <div className="flex justify-center items-center py-8">
                            <div className="flex flex-col items-center">
                                <Loader2 className="h-8 w-8 text-blue-500 animate-spin mb-2" />
                            </div>
                        </div>
                    ) : panelError ? (
                        <div className="flex justify-center items-center py-8">
                            <div className="text-red-500">Error loading panels: {panelError}</div>
                        </div>
                    ) : (
                        <>
                            <PanelsTable
                                panels={panels}
                                onDeletePanel={(id: string) => deletePanel?.(id)}
                                onDeleteView={(panelId: string, viewId: string) => deleteView?.(panelId, viewId)}
                                createPanel={createPanel}
                            />
                            {/* <TeamTable users={users} /> */}
                        </>
                    )}

                </div>
            </div>
        </div>
    );
};

export default ReactiveHome; 