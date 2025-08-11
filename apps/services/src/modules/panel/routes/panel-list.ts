import { type PanelsResponse, PanelsResponseSchema } from '@panels/types/panels'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import type { UserContext } from '@/types/auth.js'

export const panelList = async (app: FastifyInstance) => {
  app.withTypeProvider<ZodTypeProvider>().route<{
    Reply: PanelsResponse
  }>({
    method: 'GET',
    schema: {
      description: 'List all panels for a user',
      tags: ['panel'],
      response: {
        200: PanelsResponseSchema,
      },
    },
    url: '/panels',
    handler: async (request, reply) => {
      // Get user context from JWT
      const userContext = (request as { authUser?: UserContext }).authUser
      if (!userContext) {
        throw new Error('User context not found')
      }

      const panels = await request.store.panel.find(
        { tenantId: userContext.tenantId },
        { populate: ['dataSources', 'baseColumns', 'calculatedColumns'] },
      )

      return panels.map((panel) => ({
        id: panel.id,
        name: panel.name,
        description: panel.description ?? null,
        tenantId: panel.tenantId,
        userId: panel.userId,
        cohortRule: panel.cohortRule,
        createdAt: panel.createdAt,
        updatedAt: panel.updatedAt,
        metadata: panel.metadata || {},
      }))
    },
  })
}
