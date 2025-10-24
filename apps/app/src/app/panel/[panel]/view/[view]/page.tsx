'use server'

import { Suspense } from 'react'
import { getServerReactiveStore } from '../../../../../lib/server/reactive-store-server'
import type { Column, Panel, ViewType } from '../../../../../types/panel'
import ViewPage from './ViewPage'
import { getAllAppointments } from '../../../../../lib/server/medplum-server'
import FHIRTable from '../../FHIRTable'
import LoadingDataComponent from '../../components/LoadingDataComponent'

interface PageProps {
  params: Promise<{
    panel: string
    view: string
  }>
}

export default async function Page({ params }: PageProps) {
  try {
    // Extract params
    const { panel: panelId, view: viewId } = await params

    // Initialize store
    const store = await getServerReactiveStore()

    // Get view directly by ID
    const view = await store.getView(panelId, viewId)

    if (!view) {
      return <div>View not found</div>
    }

    if (view.metadata.viewType === 'appointment') {
      const viewType = view.metadata.viewType as ViewType
      const panel = await store.getPanel(panelId)

      if (!panel) {
        return <div>Panel not found</div>
      }
      // Get columns
      const columns = await store.getColumns(panelId)

      const appointmentsBundle = await getAllAppointments(
        columns,
        view.metadata.filters || [],
      )

      return (
        <Suspense fallback={<LoadingDataComponent dataSource="Appointments" />}>
          <FHIRTable
            resourceType="Appointment"
            viewType={viewType as ViewType}
            panel={panel as unknown as Panel}
            columns={columns as unknown as Column[]}
            data={appointmentsBundle}
            view={view}
          />
        </Suspense>
      )
    }

    return <ViewPage />
  } catch (error) {
    console.error('Error in page component:', error)
    throw error
  }
}
