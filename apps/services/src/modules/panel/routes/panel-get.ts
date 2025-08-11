import { NotFoundError } from '@/errors/not-found-error.js'
import { ErrorSchema, type IdParam, IdParamSchema } from '@panels/types'
import { type PanelResponse, PanelResponseSchema } from '@panels/types/panels'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import type { UserContext } from '@/types/auth.js'

export const panelGet = async (app: FastifyInstance) => {
  app.withTypeProvider<ZodTypeProvider>().route<{
    Params: IdParam
    Reply: PanelResponse
  }>({
    method: 'GET',
    schema: {
      description: 'Get a panel by ID',
      tags: ['panel'],
      params: IdParamSchema,
      response: {
        200: PanelResponseSchema,
        404: ErrorSchema,
      },
    },
    url: '/panels/:id',
    handler: async (request, reply) => {
      const { id } = request.params as { id: string }

      // Get user context from JWT
      const userContext = (request as { authUser?: UserContext }).authUser
      if (!userContext) {
        throw new Error('User context not found')
      }

      const panel = await request.store.panel.findOne(
        {
          id: Number(id),
          tenantId: userContext.tenantId,
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
