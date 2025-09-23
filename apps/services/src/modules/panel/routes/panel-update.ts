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
import type { UserContext } from '@/types/auth.js'

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
      const { name, description, metadata } = request.body

      // Get user context from JWT
      const userContext = (request as { authUser?: UserContext }).authUser
      if (!userContext) {
        throw new Error('User context not found')
      }

      request.log.info(
        { id, name, description, metadata, userContext },
        `Updating panel with id ${id}`,
      )

      const panel = await request.store.panel.findOne({
        id: Number(id),
        tenantId: userContext.tenantId,
      })

      if (!panel) {
        throw new NotFoundError('Panel not found')
      }

      if (name) panel.name = name
      if (description !== undefined) panel.description = description
      // Only overwrite the explicitly provided metadata
      // This is important as there is no guarantee that the frontend provides all
      // metadata fields.
      // Frontend can still erase metadata fields by explicitly setting them to undefined.
      if (metadata !== undefined)
        panel.metadata = { ...panel.metadata, ...metadata }

      await request.store.em.persistAndFlush(panel)

      return {
        id: panel.id,
        name: panel.name,
        description: panel.description ?? null,
        tenantId: panel.tenantId,
        userId: panel.userId,
        cohortRule: panel.cohortRule,
        createdAt: panel.createdAt,
        updatedAt: panel.updatedAt,
        metadata: panel.metadata || {},
      }
    },
  })
}
