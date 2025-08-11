import { NotFoundError } from '@/errors/not-found-error.js'
import {
  ErrorSchema,
  type ErrorType,
  type IdParam,
  IdParamSchema,
} from '@panels/types'
import {
  type ColumnsResponse,
  ColumnsResponseSchema,
} from '@panels/types/columns'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'

const querystringSchema = z.object({
  ids: z.union([z.array(z.string()), z.string()]).optional(),
  tags: z.array(z.string()).optional(),
})

type QuerystringType = z.infer<typeof querystringSchema>

// Helper function to get order value, using MAX_SAFE_INTEGER for columns without order
const getOrderValue = (col: {
  properties?: { display?: { order?: number } }
}) => {
  return col.properties?.display?.order ?? Number.MAX_SAFE_INTEGER
}

export const columnList = async (app: FastifyInstance) => {
  app.withTypeProvider<ZodTypeProvider>().route<{
    Params: IdParam
    Querystring: QuerystringType
    Reply: ColumnsResponse | ErrorType
  }>({
    method: 'GET',
    schema: {
      description: 'List all columns for a panel, optionally filtered by tags',
      tags: ['panel', 'column'],
      params: IdParamSchema,
      querystring: querystringSchema,
      response: {
        200: ColumnsResponseSchema,
        401: ErrorSchema,
        404: ErrorSchema,
      },
    },
    url: '/panels/:id/columns',
    handler: async (request, reply) => {
      const { id } = request.params
      const { tags, ids } = request.query

      // Extract tenantId and userId from JWT token
      const { tenantId, userId } = request.authUser || {}

      if (!tenantId || !userId) {
        return reply.status(401).send({
          message: 'Missing authentication context',
        })
      }

      const idsArray = Array.isArray(ids) ? ids : [ids]

      // First verify panel exists and user has access
      const panel = await request.store.panel.findOne({
        id: Number(id),
        tenantId,
      })

      if (!panel) {
        throw new NotFoundError('Panel not found')
      }

      const baseColumns = await request.store.baseColumn.find(
        {
          panel: { id: Number(id) },
          ...(tags && { tags: { $in: tags } }),
          ...(ids && { id: { $in: idsArray.map(Number) } }),
        },
        { populate: ['dataSource'] },
      )

      const calculatedColumns = await request.store.calculatedColumn.find({
        panel: { id: Number(id) },
        ...(tags && { tags: { $in: tags } }),
        ...(ids && { id: { $in: idsArray.map(Number) } }),
      })

      // Sort columns by order property
      const sortedBaseColumns = [...baseColumns].sort(
        (a, b) => getOrderValue(a) - getOrderValue(b),
      )
      const sortedCalculatedColumns = [...calculatedColumns].sort(
        (a, b) => getOrderValue(a) - getOrderValue(b),
      )

      return {
        baseColumns: sortedBaseColumns.map((col) => ({
          ...col,
          tags: col.tags ?? [],
          columnType: 'base' as const,
        })),
        calculatedColumns: sortedCalculatedColumns.map((col) => ({
          ...col,
          tags: col.tags ?? [],
          columnType: 'calculated' as const,
        })),
      }
    },
  })
}
