import { NotFoundError } from '@/errors/not-found-error.js'
import { ErrorSchema, type IdParam, IdParamSchema } from '@panels/types'
import {
  type ColumnsResponse,
  ColumnsResponseSchema,
} from '@panels/types/columns'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'

const querystringSchema = z.object({
  tenantId: z.string(),
  userId: z.string(),
  tags: z.array(z.string()).optional(),
})

type QuerystringType = z.infer<typeof querystringSchema>

export const columnList = async (app: FastifyInstance) => {
  app.withTypeProvider<ZodTypeProvider>().route<{
    Params: IdParam
    Querystring: QuerystringType
    Reply: ColumnsResponse
  }>({
    method: 'GET',
    schema: {
      description: 'List all columns for a panel, optionally filtered by tags',
      tags: ['panel', 'column'],
      params: IdParamSchema,
      querystring: querystringSchema,
      response: {
        200: ColumnsResponseSchema,
        404: ErrorSchema,
      },
    },
    url: '/panels/:id/columns',
    handler: async (request, reply) => {
      const { id } = request.params
      const { tenantId, userId, tags } = request.query

      // First verify panel exists and user has access
      const panel = await request.store.panel.findOne({
        id: Number(id),
        tenantId,
        userId,
      })

      if (!panel) {
        throw new NotFoundError('Panel not found')
      }

      const baseColumns = await request.store.baseColumn.find(
        {
          panel: { id: Number(id) },
          ...(tags && { tags: { $in: tags } }),
        },
        { populate: ['dataSource'] },
      )

      const calculatedColumns = await request.store.calculatedColumn.find({
        panel: { id: Number(id) },
        ...(tags && { tags: { $in: tags } }),
      })

      return {
        baseColumns: baseColumns.map((col) => ({
          ...col,
          columnType: 'base' as const,
        })),
        calculatedColumns: calculatedColumns.map((col) => ({
          ...col,
          columnType: 'calculated' as const,
        })),
      }
    },
  })
}
