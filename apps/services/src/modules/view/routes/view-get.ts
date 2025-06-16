import { NotFoundError } from '@/errors/not-found-error.js'
import { ErrorSchema, type IdParam, IdParamSchema } from '@panels/types'
import { type ViewConfig, ViewConfigSchema } from '@panels/types/views'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'

const querystringSchema = z.object({
  tenantId: z.string(),
  userId: z.string(),
})

type QuerystringType = z.infer<typeof querystringSchema>

export const viewGet = async (app: FastifyInstance) => {
  app.withTypeProvider<ZodTypeProvider>().route<{
    Params: IdParam
    Querystring: QuerystringType
    Reply: ViewConfig
  }>({
    method: 'GET',
    schema: {
      description: 'Get a specific view by ID',
      tags: ['view'],
      params: IdParamSchema,
      querystring: querystringSchema,
      response: {
        200: ViewConfigSchema,
        404: ErrorSchema,
      },
    },
    url: '/views/:id',
    handler: async (request, reply) => {
      const { id } = request.params
      const { tenantId, userId } = request.query

      const view = await request.store.view.findOne(
        {
          id: Number(id),
          $or: [
            { ownerUserId: userId, tenantId }, // User's own view
            { isPublished: true, tenantId }, // Published view in tenant
          ],
        },
        {
          populate: ['panel'],
        },
      )

      if (!view) {
        throw new NotFoundError('View not found')
      }

      reply.statusCode = 200
      return {
          id: view.id,
          name: view.name,
          description: '',
          panelId: view.panel.id,
          userId: view.ownerUserId,
          tenantId: view.tenantId,
          isPublished: view.isPublished,
          publishedBy: view.isPublished ? view.ownerUserId : undefined,
          publishedAt: view.publishedAt && view.publishedAt !== null ? new Date(view.publishedAt) : undefined,
          config: {
            columns: view.visibleColumns,
            groupBy: [],
            layout: 'table',
          },
          metadata: {},
          panel: {
            id: view.panel.id,
            name: '',
          },
      }
    },
  })
}
