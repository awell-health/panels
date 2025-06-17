import { NotFoundError } from '@/errors/not-found-error.js'
import { ErrorSchema, type IdParam, IdParamSchema } from '@panels/types'
import {
  type ColumnBaseCreate,
  type ColumnBaseCreateResponse,
  ColumnBaseCreateResponseSchema,
  ColumnBaseCreateSchema,
} from '@panels/types/columns'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'

export const columnCreateBase = async (app: FastifyInstance) => {
  app.withTypeProvider<ZodTypeProvider>().route<{
    Params: IdParam
    Body: ColumnBaseCreate
    Reply: ColumnBaseCreateResponse
  }>({
    method: 'POST',
    schema: {
      description: 'Create a new base column for a panel',
      tags: ['panel', 'column'],
      params: IdParamSchema,
      body: ColumnBaseCreateSchema,
      response: {
        201: ColumnBaseCreateResponseSchema,
        404: ErrorSchema,
        400: ErrorSchema,
      },
    },
    url: '/panels/:id/columns/base',
    handler: async (request, reply) => {
      const { id } = request.params
      const {
        name,
        type,
        sourceField,
        dataSourceId,
        properties,
        metadata,
        tenantId,
        userId,
        tags,
      } = request.body

      // First verify panel exists and user has access
      const panel = await request.store.panel.findOne({
        id: Number(id),
        tenantId,
        userId,
      })

      if (!panel) {
        throw new NotFoundError('Panel not found')
      }

      // Verify data source exists and belongs to this panel
      const dataSource = await request.store.dataSource.findOne({
        id: dataSourceId,
        panel: { id: Number(id) },
      })

      if (!dataSource) {
        throw new NotFoundError('Data source not found')
      }

      const baseColumn = request.store.baseColumn.create({
        name,
        type,
        sourceField,
        properties,
        metadata,
        dataSource,
        panel,
        tags,
      })

      await request.store.em.persistAndFlush(baseColumn)
      reply.statusCode = 201
      return baseColumn
    },
  })
}
