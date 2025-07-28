import { NotFoundError } from '@/errors/not-found-error.js'
import { ErrorSchema } from '@panels/types'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'

// Zod Schemas
const paramsSchema = z.object({
  id: z.string(),
  colId: z.string(),
})

const querystringSchema = z.object({
  tenantId: z.string(),
  userId: z.string(),
})

// Types
type ParamsType = z.infer<typeof paramsSchema>
type QuerystringType = z.infer<typeof querystringSchema>

export const columnDelete = async (app: FastifyInstance) => {
  app.withTypeProvider<ZodTypeProvider>().route<{
    Params: ParamsType
    Querystring: QuerystringType
  }>({
    method: 'DELETE',
    schema: {
      description: 'Delete a column (base or calculated) from a panel',
      tags: ['panels', 'columns'],
      params: paramsSchema,
      querystring: querystringSchema,
      response: {
        204: z.void(),
        404: ErrorSchema,
        400: ErrorSchema,
      },
    },
    url: '/panels/:id/columns/:colId',
    handler: async (request, reply) => {
      const { id, colId } = request.params
      const { tenantId } = request.query

      // First verify panel exists and user has access
      const panel = await request.store.em.findOne('Panel', {
        id: Number(id),
        tenantId,
      })

      if (!panel) {
        throw new NotFoundError('Panel not found')
      }

      // Try to find as base column first
      let column = await request.store.em.findOne('BaseColumn', {
        id: Number(colId),
        panel: { id: Number(id) },
      })

      // If not found, try calculated column
      if (!column) {
        column = await request.store.em.findOne('CalculatedColumn', {
          id: Number(colId),
          panel: { id: Number(id) },
        })
      }

      if (!column) {
        throw new NotFoundError('Column not found')
      }

      await request.store.em.removeAndFlush(column)
      reply.statusCode = 204
    },
  })
}
