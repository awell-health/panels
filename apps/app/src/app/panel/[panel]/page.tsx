import { Suspense } from 'react'
import { getAllAppointments } from '../../../lib/server/medplum-server'
import { getServerReactiveStore } from '../../../lib/server/reactive-store-server'
import type { Column, Panel, ViewType } from '../../../types/panel'
import PanelPage from './PanelPage'
import LoadingDataComponent from './components/LoadingDataComponent'
import FHIRTable from './FHIRTable'

export const dynamic = 'force-dynamic'

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
    const { viewType: viewTypeId } = await searchParams

    // Initialize store
    const store = await getServerReactiveStore()

    // Get panel
    const panel = await store.getPanel(panelId)

    if (!panel) {
      return <div>Panel not found</div>
    }

    const viewType = viewTypeId || (panel.metadata.viewType as ViewType)

    if (!viewType) {
      return <div>View type not found</div>
    }

    if (viewType === 'appointment') {
      const columns = await store.getColumns(panelId)
      const appointmentsBundle = await getAllAppointments(
        columns,
        panel.metadata?.filters || [],
      )

      return (
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
    }

    return <PanelPage viewType={viewType as ViewType} panelId={panelId} />
  } catch (error) {
    console.error('Error in page component:', error)
    throw error
  }
}
