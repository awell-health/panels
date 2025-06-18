import { type PanelsResponse, PanelsResponseSchema } from '@panels/types/panels'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'

const querystringSchema = z.object({
  tenantId: z.string(),
  userId: z.string(),
})

type QuerystringType = z.infer<typeof querystringSchema>

export const panelList = async (app: FastifyInstance) => {
  app.withTypeProvider<ZodTypeProvider>().route<{
    Querystring: QuerystringType
    Reply: PanelsResponse
  }>({
    method: 'GET',
    schema: {
      description: 'List all panels for a user',
      tags: ['panel'],
      querystring: querystringSchema,
      response: {
        200: PanelsResponseSchema,
      },
    },
    url: '/panels',
    handler: async (request, reply) => {
      const { tenantId } = request.query

      const panels = await request.store.panel.find(
        { tenantId },
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
