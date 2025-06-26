"use client"

import { isFeatureEnabled } from '@/utils/featureFlags'
import ReactiveHome from './page-reactive'
import { usePanelStore } from "@/hooks/use-panel-store";
import { Loader2, Menu } from "lucide-react";
import PanelsTable from "./components/PanelsTable";
import TeamTable from "./components/TeamTable";
import { useAuthentication } from "@/hooks/use-authentication";

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
    <div className="home-layout">
      <div className="home-content">
        <div className="home-header">
          <button className="home-menu-button btn btn-ghost btn-sm flex items-center justify-center">
            <Menu className="h-4 w-4" />
          </button>

          <div className="home-title-section">
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
        ) : (
          <div className="home-panels-section">
            <PanelsTable
              panels={panels}
              onDeletePanel={(id: string) => deletePanel?.(id)}
              onDeleteView={(panelId: string, viewId: string) => deleteView?.(panelId, viewId)}
              createPanel={createPanel}
            />
            {/* <TeamTable users={users} /> */}
          </div>
        )}
      </div>
    </div>
  );
};

export default Home; 