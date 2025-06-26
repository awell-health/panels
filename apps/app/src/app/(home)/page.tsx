"use client"

import { isFeatureEnabled } from '@/utils/featureFlags'
import ReactiveHome from './page-reactive'
import { usePanelStore } from "@/hooks/use-panel-store";
import { Loader2, Menu } from "lucide-react";
import PanelsTable from "./components/PanelsTable";
import TeamTable from "./components/TeamTable";
import { useAuthentication } from "@/hooks/use-authentication";
import { DateTimeFormatSelector } from "@/components/DateTimeFormatSelector";

const users = [
  { id: '1', name: 'Thomas Vande Casteele', email: 'thomas@turtle.care', role: 'Builder', panels: 'All available panels' },
  { id: '2', name: 'Sanne Willekens', email: 'sanne@turtle.care', role: 'User', panels: '' },
];

const Home = () => {
  const isReactiveEnabled = isFeatureEnabled('ENABLE_REACTIVE_DATA_STORAGE')

  // If reactive is enabled, use the reactive component
  if (isReactiveEnabled) {
    return <ReactiveHome />
  }

  // Original implementation for when reactive is disabled
  const { name } = useAuthentication()
  const { panels, isLoading: isPanelLoading, deletePanel, deleteView, createPanel } = usePanelStore();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-6">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center mb-6">
            <button className="btn btn-ghost btn-sm mr-4">
              <Menu className="h-4 w-4" />
            </button>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Welcome {name ?? ''}!</h1>
              <p className="text-gray-600 mt-1">
                Quickly access your organization's Panels and manage your Team below.
              </p>
            </div>
          </div>
        </div>

        {/* Main Grid Layout */}
        <div className="home-grid">
          {/* Date Time Format Selector */}
          <div className="home-preferences">
            <DateTimeFormatSelector />
          </div>

          {/* Content Section */}
          <div className="home-content">
            {isPanelLoading ? (
              <div className="flex justify-center items-center py-12">
                <div className="flex flex-col items-center">
                  <Loader2 className="h-8 w-8 text-blue-500 animate-spin mb-2" />
                </div>
              </div>
            ) : (
              <PanelsTable
                panels={panels}
                onDeletePanel={(id: string) => deletePanel?.(id)}
                onDeleteView={(panelId: string, viewId: string) => deleteView?.(panelId, viewId)}
                createPanel={createPanel}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home; 