'use server'

import type { Appointment } from '@medplum/fhirtypes'
import { getAppointmentsPaginated } from '../../../lib/server/medplum-server'
import { getServerReactiveStore } from '../../../lib/server/reactive-store-server'
import type { Column, Panel, ViewType } from '../../../types/panel'
import { createEnhancedAppointments } from '../../../lib/fhir-bundle-utils'
import HybridPanelPage from './HybridPanelPage'
import PanelPage from './PanelPage'

interface PageProps {
  params: Promise<{
    panel: string
  }>
  searchParams: Promise<{
    viewType?: string
  }>
}

export default async function Page({ params, searchParams }: PageProps) {
  const { panel: panelId } = await params
  const { viewType } = await searchParams

  if (viewType === 'appointment') {
    const store = await getServerReactiveStore()
    const columns = await store.getColumns(panelId)
    const panel = await store.getPanel(panelId)

    const appointmentsBundle = await getAppointmentsPaginated({
      pageSize: 2,
    })

    console.log('appointmentsBundle', appointmentsBundle)

    // Create enhanced appointment objects with resolved participant data
    const enhancedAppointments = createEnhancedAppointments(
      appointmentsBundle.bundle,
    )

    console.log('enhancedAppointments', enhancedAppointments)

    return (
      <HybridPanelPage
        viewType={viewType as ViewType}
        panel={panel as unknown as Panel}
        columns={columns as unknown as Column[]}
        data={{
          data: [],
          hasMore: appointmentsBundle.hasMore,
          nextCursor: appointmentsBundle.nextCursor ?? '',
          totalCount: appointmentsBundle.totalCount ?? 0,
        }}
      />
    )
  }

  return <PanelPage viewType={viewType as ViewType} panelId={panelId} />
}
