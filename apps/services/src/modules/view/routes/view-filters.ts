import { NotFoundError } from '@/errors/not-found-error.js'
import { ErrorSchema, type IdParam, IdParamSchema } from '@panels/types'
import {
  type ViewFiltersInfo,
  type ViewFiltersInfoResponse,
  ViewFiltersInfoResponseSchema,
  ViewFiltersInfoSchema,
  type ViewFiltersResponse,
  ViewFiltersResponseSchema,
} from '@panels/types/views'

import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'

const querystringSchema = z.object({
  tenantId: z.string(),
  userId: z.string(),
})

// Types
type QuerystringType = z.infer<typeof querystringSchema>

export const viewFilters = async (app: FastifyInstance) => {
  // GET /views/:id/filters - List view filters
  app.withTypeProvider<ZodTypeProvider>().route<{
    Params: IdParam
    Querystring: QuerystringType
    Reply: ViewFiltersResponse
  }>({
    method: 'GET',
    schema: {
      description: 'Get filters for a view',
      tags: ['view', 'configuration'],
      params: IdParamSchema,
      querystring: querystringSchema,
      response: {
        200: ViewFiltersResponseSchema,
        404: ErrorSchema,
      },
    },
    url: '/views/:id/filters',
    handler: async (request, reply) => {
      const { id } = request.params
      const { tenantId, userId } = request.query

      // Verify view exists and user has access
      const view = await request.store.view.findOne({
        id: Number(id),
        $or: [
          { ownerUserId: userId, tenantId },
          { isPublished: true, tenantId },
        ],
      })

      if (!view) {
        throw new NotFoundError('View not found')
      }

      const filters = await request.store.viewFilter.find(
        {
          view: { id: Number(id) },
        },
        { populate: ['view'] },
      )

      return {
        filters: filters.map((filter) => ({
          id: filter.id,
          columnName: filter.columnId,
          operator: filter.operator,
          value: filter.value,
          logicalOperator: 'and',
        })),
      }
    },
  })

  // PUT /views/:id/filters - Update view filters
  app.withTypeProvider<ZodTypeProvider>().route<{
    Params: IdParam
    Body: ViewFiltersInfo
    Reply: ViewFiltersInfoResponse
  }>({
    method: 'PUT',
    schema: {
      description: 'Update filters for a view (only owner can update)',
      tags: ['view', 'configuration'],
      params: IdParamSchema,
      body: ViewFiltersInfoSchema,
      response: {
        200: ViewFiltersInfoResponseSchema,
        404: ErrorSchema,
        400: ErrorSchema,
      },
    },
    url: '/views/:id/filters',
    handler: async (request, reply) => {
      const { id } = request.params
      const { filters, tenantId } = request.body

      // Only owner can update their view
      const view = await request.store.view.findOne({
        id: Number(id),
        tenantId,
      })

      if (!view) {
        throw new NotFoundError('View not found')
      }

      // Delete existing filters and create new ones
      await request.store.viewFilter.nativeDelete({
        view: { id: Number(id) },
      })

      const newFilters = filters.map((filter) =>
        request.store.viewFilter.create({
          view,
          columnId: filter.columnName,
          operator: filter.operator,
          value: filter.value,
          // logicalOperator: filter.logicalOperator,
        }),
      )

      // await request.store.viewFilter.persist(newFilters)
      // await request.store.viewFilter.flush()

      return {
        filters: newFilters.map((filter) => ({
          id: filter.id,
          columnName: filter.columnId,
          operator: filter.operator,
          value: filter.value,
          logicalOperator: 'and',
        })),
      }
    },
  })
}
