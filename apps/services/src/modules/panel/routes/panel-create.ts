import { ErrorSchema } from '@panels/types'
import {
  type CreatePanelResponse,
  CreatePanelResponseSchema,
  type PanelInfo,
  PanelInfoSchema,
} from '@panels/types/panels'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { ResourceType, Permission } from '@/types/auth.js'
import type { UserContext } from '@/types/auth.js'

export const panelCreate = async (app: FastifyInstance) => {
  app.withTypeProvider<ZodTypeProvider>().route<{
    Body: PanelInfo
    Reply: CreatePanelResponse
  }>({
    method: 'POST',
    schema: {
      description: 'Create a new panel',
      tags: ['panel'],
      body: PanelInfoSchema,
      response: {
        201: CreatePanelResponseSchema,
        400: ErrorSchema,
      },
    },
    url: '/panels',
    handler: async (request, reply) => {
      const { name, description, metadata } = request.body

      // Get user context from JWT
      const userContext = (request as { authUser?: UserContext }).authUser
      if (!userContext) {
        throw new Error('User context not found')
      }

      const panel = request.store.panel.create({
        name: name ?? 'New Panel',
        description,
        tenantId: userContext.tenantId,
        userId: userContext.userId,
        cohortRule: { conditions: [], logic: 'AND' },
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata,
      })

      // First persist the panel to get its ID
      await request.store.em.persistAndFlush(panel)

      // Create ACL for panel owner with the now-available panel ID
      const ownerACL = request.store.acl.create({
        tenantId: userContext.tenantId,
        resourceType: ResourceType.PANEL,
        resourceId: panel.id,
        userEmail: userContext.userEmail,
        permission: Permission.OWNER,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      // Persist the ACL
      await request.store.em.persistAndFlush(ownerACL)

      reply.statusCode = 201
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
