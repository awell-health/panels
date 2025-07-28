import { NotFoundError } from '@/errors/not-found-error.js'
import { ErrorSchema, type IdParam, IdParamSchema } from '@panels/types'
import { type View, ViewSchema } from '@panels/types/views'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'

const querystringSchema = z.object({
  tenantId: z.string(),
  ownerUserId: z.string(),
})

type QuerystringType = z.infer<typeof querystringSchema>

export const viewGet = async (app: FastifyInstance) => {
  app.withTypeProvider<ZodTypeProvider>().route<{
    Params: IdParam
    Querystring: QuerystringType
    Reply: View
  }>({
    method: 'GET',
    schema: {
      description: 'Get a specific view by ID',
      tags: ['views'],
      params: IdParamSchema,
      querystring: querystringSchema,
      response: {
        200: ViewSchema,
        404: ErrorSchema,
      },
    },
    url: '/views/:id',
    handler: async (request, reply) => {
      const { id } = request.params
      const { tenantId } = request.query

      const view = await request.store.view.findOne(
        {
          id: Number(id),
          $or: [
            { tenantId }, // User's own view
            { isPublished: true, tenantId }, // Published view in tenant
          ],
        },
        {
          populate: ['panel', 'sort'],
        },
      )

      if (!view) {
        throw new NotFoundError('View not found')
      }

      reply.statusCode = 200
      return {
        id: view.id,
        panelId: view.panel.id,
        name: view.name,
        ownerUserId: view.ownerUserId,
        tenantId: view.tenantId,
        isPublished: view.isPublished,
        publishedAt: view.publishedAt,
        visibleColumns: view.visibleColumns,
        sort: view.sort.getItems(),
        metadata: view.metadata,
        createdAt: view.createdAt,
        updatedAt: view.updatedAt,
      }
    },
  })
}
