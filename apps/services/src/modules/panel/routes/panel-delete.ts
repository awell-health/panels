import { NotFoundError } from '@/errors/not-found-error.js'
import {
  ErrorSchema,
  IdParamSchema,
  type OperationResult,
  OperationResultSchema,
} from '@panels/types'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'

export const panelDelete = async (app: FastifyInstance) => {
  app.withTypeProvider<ZodTypeProvider>().route<{
    Params: {
      id: string
    }
    Reply: OperationResult
  }>({
    method: 'DELETE',
    schema: {
      description: 'Delete a panel',
      tags: ['panel'],
      params: IdParamSchema,
      response: {
        204: OperationResultSchema,
        404: ErrorSchema,
      },
    },
    url: '/panels/:id',
    handler: async (request, reply) => {
      const { id } = request.params as { id: string }
      const { tenantId } = request.query as {
        tenantId: string
        userId: string
      }

      const panel = await request.store.em.findOne('Panel', {
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

      for (const dataSource of dataSources) {
        await request.store.em.removeAndFlush(dataSource)
      }

      // Delete all views for this panel (cascade deletion)
      const views = await request.store.view.find(
        { panel: { id: Number(id) } },
        { populate: ['panel'] },
      )

      for (const view of views) {
        // Delete view sorts
        const sorts = await request.store.viewSort.find(
          { view: { id: view.id } },
          { populate: ['view'] },
        )
        for (const sort of sorts) {
          await request.store.em.removeAndFlush(sort)
        }

        // Delete view notifications if published
        if (view.isPublished) {
          await request.store.viewNotification.nativeDelete({
            view: { id: view.id },
          })
        }

        // Delete the view
        await request.store.em.removeAndFlush(view)
      }

      // Delete all base columns for this panel
      const baseColumns = await request.store.baseColumn.find(
        { panel: { id: Number(id) } },
        { populate: ['panel'] },
      )

      for (const baseColumn of baseColumns) {
        await request.store.em.removeAndFlush(baseColumn)
      }

      // Delete all calculated columns for this panel
      const calculatedColumns = await request.store.calculatedColumn.find(
        { panel: { id: Number(id) } },
        { populate: ['panel'] },
      )

      for (const calculatedColumn of calculatedColumns) {
        await request.store.em.removeAndFlush(calculatedColumn)
      }

      // Now we can safely delete the panel
      await request.store.em.removeAndFlush(panel)
      reply.statusCode = 204
      return { success: true }
    },
  })
}
