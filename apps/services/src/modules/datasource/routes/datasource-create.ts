import { NotFoundError } from '@/errors/not-found-error.js'
import {
  ErrorSchema,
  type ErrorType,
  type IdParam,
  IdParamSchema,
} from '@panels/types'
import {
  type DataSourceInfo,
  DataSourceInfoSchema,
  type DataSourceResponse,
  DataSourceResponseSchema,
} from '@panels/types/datasources'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'

export const datasourceCreate = async (app: FastifyInstance) => {
  app.withTypeProvider<ZodTypeProvider>().route<{
    Params: IdParam
    Body: DataSourceInfo
    Reply: DataSourceResponse | ErrorType
  }>({
    method: 'POST',
    schema: {
      description: 'Create a new data source for a panel',
      tags: ['panel', 'datasource'],
      params: IdParamSchema,
      body: DataSourceInfoSchema,
      response: {
        201: DataSourceResponseSchema,
        401: ErrorSchema,
        404: ErrorSchema,
        400: ErrorSchema,
      },
    },
    url: '/panels/:id/datasources',
    handler: async (request, reply) => {
      const { id } = request.params
      const { type, config } = request.body

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

      const dataSource = request.store.dataSource.create({
        type,
        config,
        lastSync: new Date(),
        panel,
      })

      await request.store.em.persistAndFlush(dataSource)
      reply.statusCode = 201
      return dataSource
    },
  })
}
