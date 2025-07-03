import { NotFoundError } from '@/errors/not-found-error.js'
import { ErrorSchema } from '@panels/types'
import {
  type ViewCreate,
  ViewCreateSchema,
  type View,
  ViewSchema,
} from '@panels/types/views'

import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'

// Zod Schemas
export const viewCreate = async (app: FastifyInstance) => {
  app.withTypeProvider<ZodTypeProvider>().route<{
    Body: ViewCreate
    Reply: View
  }>({
    method: 'POST',
    schema: {
      description: 'Create a new view for a panel',
      tags: ['view'],
      body: ViewCreateSchema,
      response: {
        201: ViewSchema,
        404: ErrorSchema,
        400: ErrorSchema,
      },
    },
    url: '/views',
    handler: async (request, reply) => {
      const { name, panelId, visibleColumns, tenantId, ownerUserId, metadata } =
        request.body

      // First verify panel exists and user has access
      const panel = await request.store.panel.findOne({
        id: panelId,
        tenantId,
      })

      if (!panel) {
        throw new NotFoundError('Panel not found')
      }

      const view = request.store.view.create({
        name,
        panel,
        ownerUserId,
        tenantId,
        isPublished: false,
        visibleColumns,
        metadata,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      await request.store.em.persistAndFlush(view)

      // Populate the sort collection after creation
      await request.store.em.populate(view, ['sort'])

      reply.statusCode = 201
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
