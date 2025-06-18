import { NotFoundError } from '@/errors/not-found-error.js'
import { ErrorSchema, type IdParam, IdParamSchema } from '@panels/types'
import {
  type DataSourcesResponse,
  DataSourcesResponseSchema,
} from '@panels/types/datasources'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'

const querystringSchema = z.object({
  tenantId: z.string(),
  userId: z.string(),
})

// Types
type QuerystringType = z.infer<typeof querystringSchema>

export const datasourceList = async (app: FastifyInstance) => {
  app.withTypeProvider<ZodTypeProvider>().route<{
    Params: IdParam
    Querystring: QuerystringType
    Reply: DataSourcesResponse
  }>({
    method: 'GET',
    schema: {
      description: 'List all data sources for a panel',
      tags: ['panel', 'datasource'],
      params: IdParamSchema,
      querystring: querystringSchema,
      response: {
        200: DataSourcesResponseSchema,
        404: ErrorSchema,
      },
    },
    url: '/panels/:id/datasources',
    handler: async (request, reply) => {
      const { id } = request.params
      const { tenantId } = request.query

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
