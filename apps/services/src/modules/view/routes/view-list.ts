import type { FilterQuery } from '@mikro-orm/core'
import { ErrorSchema, type ErrorType } from '@panels/types'
import { type ViewsResponse, ViewsResponseSchema } from '@panels/types/views'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { ResourceType, UserRole, type UserContext } from '@/types/auth.js'
import type { View } from '../entities/view.entity.js'

// Zod Schemas
const querystringSchema = z.object({
  panelId: z.string().optional(),
  published: z.boolean().optional(),
})

// Types
type QuerystringType = z.infer<typeof querystringSchema>

export const viewList = async (app: FastifyInstance) => {
  app.withTypeProvider<ZodTypeProvider>().route<{
    Querystring: QuerystringType
    Reply: ViewsResponse | ErrorType
  }>({
    method: 'GET',
    schema: {
      description: 'List views for user/tenant with optional filtering',
      tags: ['view'],
      querystring: querystringSchema,
      response: {
        200: ViewsResponseSchema,
        401: ErrorSchema,
        404: ErrorSchema,
        400: ErrorSchema,
      },
    },
    url: '/views',
    handler: async (request, reply) => {
      const { panelId, published } = request.query

      // Get user context from JWT
      const userContext = (request as { authUser?: UserContext }).authUser
      if (!userContext) {
        return reply.status(401).send({
          message: 'User context not found',
        })
      }

      const getViewsByAcl = async (): Promise<View[]> => {
        console.log('Get views by ACL for user', userContext.userId)
        // Get shared views via ACLs

        // we need to keep this for now since before we were storing the user id in the ownerUserId field
        const sharedACLs = await request.store.acl.find({
          tenantId: userContext.tenantId,
          resourceType: ResourceType.VIEW,
          userEmail: userContext.userId,
        })

        const sharedACLsByEmail = await request.store.acl.find({
          tenantId: userContext.tenantId,
          resourceType: ResourceType.VIEW,
          userEmail: userContext.userEmail,
        })

        const publicACLs = await request.store.acl.find({
          tenantId: userContext.tenantId,
          resourceType: ResourceType.VIEW,
          userEmail: '_all',
        })

        if (sharedACLs.length > 0) {
          // Deduplicate ACLs by resourceId to avoid duplicate view queries
          const uniqueACLs = [
            ...sharedACLs,
            ...sharedACLsByEmail,
            ...publicACLs,
          ].filter(
            (acl, index, self) =>
              index === self.findIndex((a) => a.resourceId === acl.resourceId),
          )

          const sharedViewIds = uniqueACLs.map((acl) => acl.resourceId)
          return await request.store.view.find(
            { id: { $in: sharedViewIds } },
            {
              orderBy: { updatedAt: 'DESC' },
              populate: ['sort'],
            },
          )
        }

        return []
      }

      const getAllViews = async (): Promise<View[]> => {
        console.log(
          'Get all views for user',
          userContext.userId,
          userContext.role,
        )

        const where: FilterQuery<View> = { tenantId: userContext.tenantId }

        if (panelId) {
          where.panel = { id: Number(panelId) }
        }
        if (published !== undefined) {
          where.isPublished = published
        }

        return await request.store.view.find(where, {
          orderBy: { updatedAt: 'DESC' },
          populate: ['sort'],
        })
      }

      const views =
        userContext.role === UserRole.ADMIN
          ? await getAllViews()
          : await getViewsByAcl()

      return {
        views: views.map((view) => ({
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
        })),
        total: views.length,
      }
    },
  })
}
