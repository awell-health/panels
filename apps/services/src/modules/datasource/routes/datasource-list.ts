import { NotFoundError } from '@/errors/not-found-error.js'
import {
  ErrorSchema,
  type ErrorType,
  type IdParam,
  IdParamSchema,
} from '@panels/types'
import {
  type DataSourcesResponse,
  DataSourcesResponseSchema,
} from '@panels/types/datasources'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'

const querystringSchema = z.object({})

// Types
type QuerystringType = z.infer<typeof querystringSchema>

export const datasourceList = async (app: FastifyInstance) => {
  app.withTypeProvider<ZodTypeProvider>().route<{
    Params: IdParam
    Querystring: QuerystringType
    Reply: DataSourcesResponse | ErrorType
  }>({
    method: 'GET',
    schema: {
      description: 'List all data sources for a panel',
      tags: ['panel', 'datasource'],
      params: IdParamSchema,
      querystring: querystringSchema,
      response: {
        200: DataSourcesResponseSchema,
        401: ErrorSchema,
        404: ErrorSchema,
      },
    },
    url: '/panels/:id/datasources',
    handler: async (request, reply) => {
      const { id } = request.params

      // Extract tenantId from JWT token
      const { tenantId } = request.authUser || {}

      if (!tenantId) {
        return reply.status(401).send({
          message: 'Missing authentication context',
        })
      }

      // First verify panel exists and user has access
      const panel = await request.store.panel.findOne({
        id: Number(id),
        tenantId,
      })

      if (!panel) {
        throw new NotFoundError('Panel not found')
      }

      const dataSources = await request.store.dataSource.find(
        { panel: { id: Number(id) } },
        { populate: ['panel'] },
      )

      return dataSources
    },
  })
}
