'use server'

import { Suspense } from 'react'
import { getAllAppointments } from '../../../lib/server/medplum-server'
import { getServerReactiveStore } from '../../../lib/server/reactive-store-server'
import type { Column, Panel, ViewType } from '../../../types/panel'
import HybridPanelPage from './HybridPanelPage'
import PanelPage from './PanelPage'
import LoadingDataComponent from './components/LoadingDataComponent'
import FHIRTable from './FHIRTable'

interface PageProps {
  params: Promise<{
    panel: string
  }>
  searchParams: Promise<{
    viewType?: string
  }>
}

export default async function Page({ params, searchParams }: PageProps) {
  try {
    // Extract params
    const { panel: panelId } = await params

    // Initialize store
    const store = await getServerReactiveStore()

    // Get panel
    const panel = await store.getPanel(panelId)

    if (!panel) {
      return <div>Panel not found</div>
    }

    // Determine view type
    const viewType =
      ((await searchParams).viewType as ViewType) ||
      (panel.metadata.viewType as ViewType)

    if (!viewType) {
      return <div>View type not found</div>
    }

    if (viewType !== 'appointment') {
      return <PanelPage viewType={viewType as ViewType} panelId={panelId} />
    }

    // Get columns
    const columns = await store.getColumns(panelId)

    const appointmentsBundle = await getAllAppointments(
      columns,
      panel.metadata?.filters || [],
    )

    const component = (
      <Suspense fallback={<LoadingDataComponent dataSource="Appointments" />}>
        <FHIRTable
          resourceType="Appointment"
          viewType={viewType as ViewType}
          panel={panel as unknown as Panel}
          columns={columns as unknown as Column[]}
          data={appointmentsBundle}
        />
      </Suspense>
    )

    return component
  } catch (error) {
    console.error('Error in page component:', error)
    throw error
  }
}
