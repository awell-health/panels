import { NotFoundError } from '@/errors/not-found-error.js'
import { ErrorSchema, type IdParam, IdParamSchema } from '@panels/types'
import {
  type PanelInfo,
  PanelInfoSchema,
  type PanelResponse,
  PanelResponseSchema,
} from '@panels/types/panels'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'

export const panelUpdate = async (app: FastifyInstance) => {
  app.withTypeProvider<ZodTypeProvider>().route<{
    Params: IdParam
    Body: PanelInfo
    Reply: PanelResponse
  }>({
    method: 'PUT',
    schema: {
      description: 'Update a panel',
      tags: ['panel'],
      params: IdParamSchema,
      body: PanelInfoSchema,
      response: {
        200: PanelResponseSchema,
        404: ErrorSchema,
      },
    },
    url: '/panels/:id',
    handler: async (request, reply) => {

      const { id } = request.params as { id: string }
      const { name, description, tenantId, userId } = request.body as {
        name?: string
        description?: string
        tenantId: string
        userId: string
      }

      const panel = await request.store.panel.findOne({
        id: Number(id),
        tenantId,
        userId,
      })

      if (!panel) {
        throw new NotFoundError('Panel not found')
      }

      if (name) panel.name = name
      if (description !== undefined) panel.description = description

      await request.store.em.flush()
      return {
        id: panel.id,
        name: panel.name,
        description: panel.description ?? null,
        tenantId: panel.tenantId,
        userId: panel.userId,
        cohortRule: panel.cohortRule,
        createdAt: panel.createdAt,
        updatedAt: panel.updatedAt,
      }
    },
  })
}
