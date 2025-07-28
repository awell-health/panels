import { NotFoundError } from '@/errors/not-found-error.js'
import { ErrorSchema, type IdParam, IdParamSchema } from '@panels/types'
import {
  type ViewSortsUpdate,
  type ViewSortsResponse,
  ViewSortsResponseSchema,
  ViewSortsUpdateSchema,
} from '@panels/types/views'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'

// Zod Schemas
const querystringSchema = z.object({
  tenantId: z.string(),
  ownerUserId: z.string(),
})

// Types
type QuerystringType = z.infer<typeof querystringSchema>

export const viewSorts = async (app: FastifyInstance) => {
  // GET /views/:id/sorts - List view sorts
  app.withTypeProvider<ZodTypeProvider>().route<{
    Params: IdParam
    Querystring: QuerystringType
    Reply: ViewSortsResponse
  }>({
    method: 'GET',
    schema: {
      description: 'Get sorts for a view',
      tags: ['views'],
      params: IdParamSchema,
      querystring: querystringSchema,
      response: {
        200: ViewSortsResponseSchema,
        404: ErrorSchema,
      },
    },
    url: '/views/:id/sorts',
    handler: async (request, reply) => {
      const { id } = request.params
      const { tenantId } = request.query

      const view = await request.store.view.findOne({
        id: Number(id),
        $or: [{ tenantId }, { isPublished: true, tenantId }],
      })

      if (!view) {
        throw new NotFoundError('View not found')
      }

      const sorts = await request.store.viewSort.find(
        { view: { id: Number(id) } },
        { orderBy: { order: 'ASC' } },
      )

      return {
        sorts: sorts.map((sort) => ({
          id: sort.id,
          columnName: sort.columnName,
          direction: sort.direction,
          order: sort.order,
        })),
      }
    },
  })

  // PUT /views/:id/sorts - Update view sorts
  app.withTypeProvider<ZodTypeProvider>().route<{
    Params: IdParam
    Body: ViewSortsUpdate
    Reply: ViewSortsResponse
  }>({
    method: 'PUT',
    schema: {
      description: 'Update sorts for a view (only owner can update)',
      tags: ['views'],
      params: IdParamSchema,
      body: ViewSortsUpdateSchema,
      response: {
        200: ViewSortsResponseSchema,
        404: ErrorSchema,
        400: ErrorSchema,
      },
    },
    url: '/views/:id/sorts',
    handler: async (request, reply) => {
      const { id } = request.params
      const { sorts, tenantId, ownerUserId } = request.body

      const view = await request.store.view.findOne({
        id: Number(id),
        ownerUserId,
        tenantId,
      })

      if (!view) {
        throw new NotFoundError('View not found')
      }

      // Delete existing sorts and create new ones
      await request.store.viewSort.nativeDelete({
        view: { id: Number(id) },
      })

      const newSorts = sorts.map((sort) =>
        request.store.viewSort.create({
          view,
          columnName: sort.columnName,
          direction: sort.direction,
          order: sort.order,
        }),
      )

      await request.store.em.persistAndFlush(newSorts)
      return {
        sorts: newSorts.map((sort) => ({
          id: sort.id,
          columnName: sort.columnName,
          direction: sort.direction,
          order: sort.order,
        })),
      }
    },
  })
}
