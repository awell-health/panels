'use client'

import { useReactivePanelStore } from '@/hooks/use-reactive-panel-store'
import { useReactivePanels } from '@/hooks/use-reactive-data'
import { Loader2 } from 'lucide-react'
import PanelsCards from '@/components/PanelsCards'
import PageNavigation from '../../components/PageNavigation'

export default function Home() {
  const {
    panels,
    isLoading: isPanelLoading,
    error: panelError,
  } = useReactivePanels()
  const { createPanel } = useReactivePanelStore()

  const renderContent = () => {
    // Panels page
    if (isPanelLoading) {
      return (
        <div className="flex justify-center items-center py-12">
          <div className="flex flex-col items-center">
            <Loader2 className="h-8 w-8 text-blue-500 animate-spin mb-2" />
            <p className="text-gray-600">Loading panels...</p>
          </div>
        </div>
      )
    }

    if (panelError) {
      return (
        <div className="flex justify-center items-center py-12">
          <div className="text-center">
            <div className="text-red-500 mb-2">Error loading panels</div>
            <p className="text-gray-600 text-sm">{panelError}</p>
          </div>
        </div>
      )
    }

    return <PanelsCards panels={panels} createPanel={createPanel} />
  }

  return (
    <PageNavigation
      title="Available Panels"
      description="Monitor and manage patient care through specialized dashboard panels."
      breadcrumb={[{ label: 'Panels' }]}
    >
      {renderContent()}
    </PageNavigation>
  )
}
