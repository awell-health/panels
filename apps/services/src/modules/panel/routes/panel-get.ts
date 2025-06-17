import { NotFoundError } from '@/errors/not-found-error.js'
import { ErrorSchema, type IdParam, IdParamSchema } from '@panels/types'
import { type PanelResponse, PanelResponseSchema } from '@panels/types/panels'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'

export const panelGet = async (app: FastifyInstance) => {
  app.withTypeProvider<ZodTypeProvider>().route<{
    Params: IdParam
    Querystring: {
      tenantId: string
      userId: string
    }
    Reply: PanelResponse
  }>({
    method: 'GET',
    schema: {
      description: 'Get a panel by ID',
      tags: ['panel'],
      params: IdParamSchema,
      querystring: z.object({
        tenantId: z.string(),
        userId: z.string(),
      }),
      response: {
        200: PanelResponseSchema,
        404: ErrorSchema,
      },
    },
    url: '/panels/:id',
    handler: async (request, reply) => {
      const { id } = request.params as { id: string }
      const { tenantId, userId } = request.query as {
        tenantId: string
        userId: string
      }

      const panel = await request.store.panel.findOne(
        {
          id: Number(id),
          tenantId,
          userId,
        },
        {
          populate: [
            'dataSources',
            'baseColumns',
            'baseColumns.dataSource',
            'calculatedColumns',
            'views',
          ],
        },
      )

      if (!panel) {
        throw new NotFoundError('Panel not found')
      }

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
