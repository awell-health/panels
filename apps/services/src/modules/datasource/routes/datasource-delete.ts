import { NotFoundError } from '@/errors/not-found-error.js'
import {
  ErrorSchema,
  type ErrorType,
  type OperationResult,
  OperationResultSchema,
} from '@panels/types'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'

// Zod Schemas
const paramsSchema = z.object({
  id: z.string(),
  dsId: z.string(),
})

const bodySchema = z.object({})

// Types
type ParamsType = z.infer<typeof paramsSchema>
type BodyType = z.infer<typeof bodySchema>

export const datasourceDelete = async (app: FastifyInstance) => {
  app.withTypeProvider<ZodTypeProvider>().route<{
    Params: ParamsType
    Body: BodyType
    Reply: OperationResult | ErrorType
  }>({
    method: 'DELETE',
    schema: {
      description: 'Delete a data source',
      tags: ['panel', 'datasource'],
      params: paramsSchema,
      body: bodySchema,
      response: {
        204: OperationResultSchema,
        401: ErrorSchema,
        404: ErrorSchema,
      },
    },
    url: '/panels/:id/datasources/:dsId',
    handler: async (request, reply) => {
      const { id, dsId } = request.params

      // Extract tenantId from JWT token
      const { tenantId } = request.authUser || {}

      if (!tenantId) {
        return reply.status(401).send({
          message: 'Missing authentication context',
        })
      }

      // First verify panel exists and user has access
      const panel = await request.store.em.findOne('Panel', {
        id: Number(id),
        tenantId,
      })

      if (!panel) {
        throw new NotFoundError('Panel not found')
      }

      // Find the data source
      const dataSource = await request.store.em.findOne('DataSource', {
        id: Number(dsId),
        panel: { id: Number(id) },
      })

      if (!dataSource) {
        throw new NotFoundError('Data source not found')
      }

      await request.store.em.removeAndFlush(dataSource)
      reply.statusCode = 204
      return { success: true }
    },
  })
}
