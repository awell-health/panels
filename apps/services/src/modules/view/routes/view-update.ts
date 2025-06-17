import { NotFoundError } from '@/errors/not-found-error.js'
import { ErrorSchema, type IdParam, IdParamSchema } from '@panels/types'
import {
  type ViewUpdateInfo,
  type ViewUpdateInfoResponse,
  ViewUpdateInfoResponseSchema,
  ViewUpdateInfoSchema,
} from '@panels/types/views'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'

export const viewUpdate = async (app: FastifyInstance) => {
  app.withTypeProvider<ZodTypeProvider>().route<{
    Params: IdParam
    Body: ViewUpdateInfo
    Reply: ViewUpdateInfoResponse
  }>({
    method: 'PUT',
    schema: {
      description: 'Update a view (only owner can update)',
      tags: ['view'],
      params: IdParamSchema,
      body: ViewUpdateInfoSchema,
      response: {
        200: ViewUpdateInfoResponseSchema,
        404: ErrorSchema,
        400: ErrorSchema,
      },
    },
    url: '/views/:id',
    handler: async (request, reply) => {
      const { id } = request.params
      const { name, config, tenantId, userId, metadata } = request.body

      // Only owner can update their own view
      const view = await request.store.view.findOne({
        id: Number(id),
        ownerUserId: userId,
        tenantId,
      })

      if (!view) {
        throw new NotFoundError('View not found')
      }

      // Update fields
      if (name) view.name = name
      // !!! description is not used yet !!!
      //if (description !== undefined) view.description = description
      if (config) view.visibleColumns = config.columns
      if (metadata !== undefined) view.metadata = metadata

      await request.store.em.persistAndFlush(view)
      return {
        id: view.id,
        name: view.name,
        panelId: view.panel.id,
        userId: view.ownerUserId,
        tenantId,
        isPublished: view.isPublished,
        config: {
          columns: view.visibleColumns,
          groupBy: [],
          layout: 'table',
        },
        metadata,
      }
    },
  })
}
