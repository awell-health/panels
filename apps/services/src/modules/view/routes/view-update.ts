import { NotFoundError } from '@/errors/not-found-error.js'
import { ErrorSchema, type IdParam, IdParamSchema } from '@panels/types'
import {
  type ViewUpdate,
  type View,
  ViewSchema,
  ViewUpdateSchema,
} from '@panels/types/views'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'

export const viewUpdate = async (app: FastifyInstance) => {
  app.withTypeProvider<ZodTypeProvider>().route<{
    Params: IdParam
    Body: ViewUpdate
    Reply: View
  }>({
    method: 'PUT',
    schema: {
      description: 'Update a view (only owner can update)',
      tags: ['view'],
      params: IdParamSchema,
      body: ViewUpdateSchema,
      response: {
        200: ViewSchema,
        404: ErrorSchema,
        400: ErrorSchema,
      },
    },
    url: '/views/:id',
    handler: async (request, reply) => {
      const { id } = request.params
      const { name, visibleColumns, tenantId, metadata } = request.body

      const view = await request.store.view.findOne(
        {
          id: Number(id),
          tenantId,
        },
        {
          populate: ['sort'],
        },
      )

      if (!view) {
        throw new NotFoundError('View not found')
      }

      // Update fields
      if (name) view.name = name
      if (visibleColumns) view.visibleColumns = visibleColumns
      if (metadata !== undefined)
        view.metadata = { ...view.metadata, ...metadata }

      await request.store.em.persistAndFlush(view)
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
