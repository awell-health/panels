import { NotFoundError } from '@/errors/not-found-error.js'
import { ErrorSchema } from '@panels/types'
import {
  type ViewInfo,
  ViewInfoSchema,
  type ViewResponse,
  ViewResponseSchema,
} from '@panels/types/views'

import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'

// Zod Schemas
export const viewCreate = async (app: FastifyInstance) => {
  app.withTypeProvider<ZodTypeProvider>().route<{
    Body: ViewInfo
    Reply: ViewResponse
  }>({
    method: 'POST',
    schema: {
      description: 'Create a new view for a panel',
      tags: ['view'],
      body: ViewInfoSchema,
      response: {
        201: ViewResponseSchema,
        404: ErrorSchema,
        400: ErrorSchema,
      },
    },
    url: '/views',
    handler: async (request, reply) => {
      // !! TODO: Add description and metadata !!
      const { name, panelId, config, tenantId, userId, metadata } = request.body

      // First verify panel exists and user has access
      const panel = await request.store.panel.findOne({
        id: panelId,
        tenantId,
        userId,
      })

      if (!panel) {
        throw new NotFoundError('Panel not found')
      }

      const view = request.store.view.create({
        name,
        // description,
        panel,
        ownerUserId: userId,
        tenantId,
        isPublished: false,
        visibleColumns: config.columns,
        metadata,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      await request.store.em.persistAndFlush(view)
      reply.statusCode = 201
      return {
        id: view.id,
        name: view.name,
        description: '',
        panelId: view.panel.id,
        userId: view.ownerUserId,
        tenantId,
        isPublished: false,
        config: {
          columns: view.visibleColumns,
          groupBy: [],
          layout: 'table',
        },
        metadata: view.metadata,
      }
    },
  })
}
