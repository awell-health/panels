import { NotFoundError } from '@/errors/not-found-error.js'
import { ErrorSchema } from '@panels/types'
import {
  type DataSourceInfo,
  DataSourceInfoSchema,
  type DataSourceResponse,
  DataSourceResponseSchema,
} from '@panels/types/datasources'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'

// Zod Schemas
const paramsSchema = z.object({
  id: z.string(),
  dsId: z.string(),
})

// Types
type ParamsType = z.infer<typeof paramsSchema>

export const datasourceUpdate = async (app: FastifyInstance) => {
  app.withTypeProvider<ZodTypeProvider>().route<{
    Params: ParamsType
    Body: DataSourceInfo
    Reply: DataSourceResponse
  }>({
    method: 'PUT',
    schema: {
      description: 'Update a data source',
      tags: ['panel', 'datasource'],
      params: paramsSchema,
      body: DataSourceInfoSchema,
      response: {
        200: DataSourceResponseSchema,
        404: ErrorSchema,
        400: ErrorSchema,
      },
    },
    url: '/panels/:id/datasources/:dsId',
    handler: async (request, reply) => {
      const { id, dsId } = request.params
      const { type, config, tenantId } = request.body

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

      // Update fields
      if (type) dataSource.type = type
      if (config) dataSource.config = config

      await request.store.em.flush()
      return dataSource
    },
  })
}
