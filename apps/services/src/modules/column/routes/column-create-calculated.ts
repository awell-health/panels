import { NotFoundError } from '@/errors/not-found-error.js'
import { ErrorSchema, type IdParam, IdParamSchema } from '@panels/types'
import {
  type ColumnCalculatedCreate,
  type ColumnCalculatedCreateResponse,
  ColumnCalculatedCreateResponseSchema,
  ColumnCalculatedCreateSchema,
} from '@panels/types/columns'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'

export const columnCreateCalculated = async (app: FastifyInstance) => {
  app.withTypeProvider<ZodTypeProvider>().route<{
    Params: IdParam
    Body: ColumnCalculatedCreate
    Reply: ColumnCalculatedCreateResponse
  }>({
    method: 'POST',
    schema: {
      description: 'Create a new calculated column for a panel',
      tags: ['panels', 'columns'],
      params: IdParamSchema,
      body: ColumnCalculatedCreateSchema,
      response: {
        201: ColumnCalculatedCreateResponseSchema,
        404: ErrorSchema,
        400: ErrorSchema,
      },
    },
    url: '/panels/:id/columns/calculated',
    handler: async (request, reply) => {
      const { id } = request.params
      const {
        name,
        type,
        formula,
        dependencies,
        properties,
        metadata,
        tenantId,
        tags,
      } = request.body

      // First verify panel exists and user has access
      const panel = await request.store.panel.findOne({
        id: Number(id),
        tenantId,
      })

      if (!panel) {
        throw new NotFoundError('Panel not found')
      }

      // TODO: Validate formula and dependencies exist in panel

      const calculatedColumn = request.store.calculatedColumn.create({
        name,
        type,
        formula,
        dependencies,
        properties,
        metadata,
        panel,
        tags,
      })

      await request.store.em.persistAndFlush(calculatedColumn)
      reply.statusCode = 201
      return {
        ...calculatedColumn,
        tags: calculatedColumn.tags ?? [],
      }
    },
  })
}
