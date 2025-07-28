import { ErrorSchema } from '@panels/types'
import {
  type CreatePanelResponse,
  CreatePanelResponseSchema,
  type PanelInfo,
  PanelInfoSchema,
} from '@panels/types/panels'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'

export const panelCreate = async (app: FastifyInstance) => {
  app.withTypeProvider<ZodTypeProvider>().route<{
    Body: PanelInfo
    Reply: CreatePanelResponse
  }>({
    method: 'POST',
    schema: {
      description: 'Create a new panel',
      tags: ['panels'],
      body: PanelInfoSchema,
      response: {
        201: CreatePanelResponseSchema,
        400: ErrorSchema,
      },
    },
    url: '/panels',
    handler: async (request, reply) => {
      const { name, description, tenantId, userId, metadata } = request.body

      const panel = request.store.panel.create({
        name: name ?? 'New Panel',
        description,
        tenantId,
        userId,
        cohortRule: { conditions: [], logic: 'AND' },
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata,
      })

      await request.store.em.persistAndFlush(panel)
      reply.statusCode = 201
      return {
        id: panel.id,
        name: panel.name,
        description: panel.description ?? null,
        tenantId: panel.tenantId,
        userId: panel.userId,
        cohortRule: panel.cohortRule,
        createdAt: panel.createdAt,
        updatedAt: panel.updatedAt,
        metadata: panel.metadata || {},
      }
    },
  })
}
