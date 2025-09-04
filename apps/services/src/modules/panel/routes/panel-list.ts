import { type PanelsResponse, PanelsResponseSchema } from '@panels/types/panels'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { ResourceType, UserRole, type UserContext } from '@/types/auth.js'
import type { Panel } from '../entities/panel.entity.js'

export const panelList = async (app: FastifyInstance) => {
  app.withTypeProvider<ZodTypeProvider>().route<{
    Reply: PanelsResponse
  }>({
    method: 'GET',
    schema: {
      description: 'List all panels for a user',
      tags: ['panel'],
      response: {
        200: PanelsResponseSchema,
      },
    },
    url: '/panels',
    handler: async (request, reply) => {
      // Get user context from JWT
      const userContext = (request as { authUser?: UserContext }).authUser
      if (!userContext) {
        throw new Error('User context not found')
      }

      const getPanelsByAcl = async (): Promise<Panel[]> => {
        console.log('Get panels by ACL for user', userContext.userId)
        // we need to keep this for now since before we were storing the user id in the ownerUserId field
        const sharedACLs = await request.store.acl.find({
          tenantId: userContext.tenantId,
          resourceType: ResourceType.PANEL,
          userEmail: userContext.userId,
        })

        const sharedACLsByEmail = await request.store.acl.find({
          tenantId: userContext.tenantId,
          resourceType: ResourceType.PANEL,
          userEmail: userContext.userEmail,
        })

        const publicACLs = await request.store.acl.find({
          tenantId: userContext.tenantId,
          resourceType: ResourceType.PANEL,
          userEmail: '_all',
        })

        // Deduplicate ACLs by resourceId to avoid duplicate panel queries
        const uniqueACLs = [
          ...sharedACLs,
          ...sharedACLsByEmail,
          ...publicACLs,
        ].filter(
          (acl, index, self) =>
            index === self.findIndex((a) => a.resourceId === acl.resourceId),
        )

        if (uniqueACLs.length > 0) {
          const sharedPanelIds = uniqueACLs.map((acl) => acl.resourceId)
          return await request.store.panel.find(
            { id: { $in: sharedPanelIds } },
            { populate: ['dataSources', 'baseColumns', 'calculatedColumns'] },
          )
        }

        return []
      }

      const getAllPanels = async (): Promise<Panel[]> => {
        console.log(
          'Get all panels for user',
          userContext.userId,
          userContext.role,
        )

        return await request.store.panel.find(
          { tenantId: userContext.tenantId },
          { populate: ['dataSources', 'baseColumns', 'calculatedColumns'] },
        )
      }

      const panels =
        userContext.role === UserRole.ADMIN
          ? await getAllPanels()
          : await getPanelsByAcl()

      return panels.map((panel) => ({
        id: panel.id,
        name: panel.name,
        description: panel.description ?? null,
        tenantId: panel.tenantId,
        userId: panel.userId,
        cohortRule: panel.cohortRule,
        createdAt: panel.createdAt,
        updatedAt: panel.updatedAt,
        metadata: panel.metadata || {},
      }))
    },
  })
}
