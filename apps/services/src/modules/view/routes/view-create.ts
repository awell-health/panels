import { NotFoundError } from '@/errors/not-found-error.js'
import { ErrorSchema } from '@panels/types'
import {
  type ViewCreate,
  ViewCreateSchema,
  type View,
  ViewSchema,
} from '@panels/types/views'

import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { ResourceType, Permission } from '@/types/auth.js'
import type { UserContext } from '@/types/auth.js'

// Zod Schemas
export const viewCreate = async (app: FastifyInstance) => {
  app.withTypeProvider<ZodTypeProvider>().route<{
    Body: ViewCreate
    Reply: View
  }>({
    method: 'POST',
    schema: {
      description: 'Create a new view for a panel',
      tags: ['view'],
      body: ViewCreateSchema,
      response: {
        201: ViewSchema,
        404: ErrorSchema,
        400: ErrorSchema,
      },
    },
    url: '/views',
    handler: async (request, reply) => {
      const { name, panelId, visibleColumns, metadata } = request.body

      // Get user context from JWT
      const userContext = (request as { authUser?: UserContext }).authUser
      if (!userContext) {
        throw new Error('User context not found')
      }

      // First verify panel exists and user has access
      const panel = await request.store.panel.findOne({
        id: panelId,
        tenantId: userContext.tenantId,
      })

      if (!panel) {
        throw new NotFoundError('Panel not found')
      }

      const view = request.store.view.create({
        name,
        panel,
        ownerUserId: userContext.userId,
        tenantId: userContext.tenantId,
        isPublished: false,
        visibleColumns,
        metadata,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      // Create ACL for view owner
      const ownerACL = request.store.acl.create({
        tenantId: userContext.tenantId,
        resourceType: ResourceType.VIEW,
        resourceId: view.id,
        userEmail: userContext.userEmail,
        permission: Permission.OWNER,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      // Persist both the view and ACLs
      await request.store.em.persistAndFlush([view, ownerACL])

      // Populate the sort collection after creation
      await request.store.em.populate(view, ['sort'])

      reply.statusCode = 201
      return {
        id: view.id,
        panelId: view.panel.id,
        name: view.name,
        ownerUserId: view.ownerUserId,
        tenantId: view.tenantId,
        isPublished: view.isPublished,
        publishedAt: view.publishedAt,
        visibleColumns: view.visibleColumns,
        sort: view.sort.getItems(),
        metadata: view.metadata,
        createdAt: view.createdAt,
        updatedAt: view.updatedAt,
      }
    },
  })
}
