import { NotFoundError } from '@/errors/not-found-error.js'
import { ErrorSchema } from '@panels/types'
import {
  type DataSourceSyncResponse,
  DataSourceSyncResponseSchema,
} from '@panels/types/datasources'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'

// Zod Schemas
const paramsSchema = z.object({
  id: z.string(),
  dsId: z.string(),
})

const bodySchema = z.object({
  tenantId: z.string(),
  userId: z.string(),
})

// Types
type ParamsType = z.infer<typeof paramsSchema>
type BodyType = z.infer<typeof bodySchema>

export const datasourceSync = async (app: FastifyInstance) => {
  app.withTypeProvider<ZodTypeProvider>().route<{
    Params: ParamsType
    Body: BodyType
    Reply: DataSourceSyncResponse
  }>({
    method: 'POST',
    schema: {
      description: 'Sync a data source',
      tags: ['panels', 'datasources'],
      params: paramsSchema,
      body: bodySchema,
      response: {
        200: DataSourceSyncResponseSchema,
        404: ErrorSchema,
        400: ErrorSchema,
      },
    },
    url: '/panels/:id/datasources/:dsId/sync',
    handler: async (request, reply) => {
      const { id, dsId } = request.params
      const { tenantId } = request.body

      // First verify panel exists and user has access
      const panel = await request.store.panel.findOne({
        id: Number(id),
        tenantId,
      })

      if (!panel) {
        throw new NotFoundError('Panel not found')
      }

      // Find the data source
      const dataSource = await request.store.dataSource.findOne({
        id: Number(dsId),
        panel: { id: Number(id) },
      })

      if (!dataSource) {
        throw new NotFoundError('Data source not found')
      }

      // TODO: Implement actual sync logic based on data source type
      // For now, just update lastSync timestamp
      dataSource.lastSync = new Date()

      await request.store.em.flush()

      return {
        ...dataSource,
        syncStatus: 'success' as const,
        message: 'Data source synced successfully',
      }
    },
  })
}
