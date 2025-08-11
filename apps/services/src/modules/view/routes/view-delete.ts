import { NotFoundError } from '@/errors/not-found-error.js'
import { ErrorSchema, type IdParam, IdParamSchema } from '@panels/types'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'

// Zod Schemas

const querystringSchema = z.object({})

// Types
type QuerystringType = z.infer<typeof querystringSchema>

export const viewDelete = async (app: FastifyInstance) => {
  app.withTypeProvider<ZodTypeProvider>().route<{
    Params: IdParam
    Querystring: QuerystringType
  }>({
    method: 'DELETE',
    schema: {
      description: 'Delete a view (only owner can delete)',
      tags: ['view'],
      params: IdParamSchema,
      querystring: querystringSchema,
      response: {
        204: z.void(),
        401: ErrorSchema,
        404: ErrorSchema,
        400: ErrorSchema,
      },
    },
    url: '/views/:id',
    handler: async (request, reply) => {
      const { id } = request.params

      // Extract tenantId from JWT token
      const { tenantId } = request.authUser || {}

      if (!tenantId) {
        return reply.status(401).send({
          message: 'Missing authentication context',
        })
      }

      // Only owner can delete their own view
      const view = await request.store.view.findOne({
        id: Number(id),
        tenantId,
      })

      if (!view) {
        throw new NotFoundError('View not found')
      }

      // If view is published, also delete related notifications
      if (view.isPublished) {
        await request.store.viewNotification.nativeDelete({
          view: { id: Number(id) },
        })
      }

      const sorts = await request.store.viewSort.find(
        { view: { id: Number(id) } },
        { populate: ['view'] },
      )

      for (const sort of sorts) {
        await request.store.em.removeAndFlush(sort)
      }

      await request.store.view.nativeDelete(view)
      reply.statusCode = 204
    },
  })
}
