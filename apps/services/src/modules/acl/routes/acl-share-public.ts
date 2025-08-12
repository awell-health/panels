import { ErrorSchema, type ErrorType } from '@panels/types'
import {
  type ACLSharePublic,
  ACLSharePublicSchema,
  type ACLResponse,
  ACLResponseSchema,
} from '@panels/types/acls'
import type { ResourceType, Permission } from '@/types/auth.js'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'

// Zod schema for params
const paramsSchema = z.object({
  resourceType: z.enum(['panel', 'view']),
  resourceId: z.string(),
})

export const aclSharePublic = async (app: FastifyInstance) => {
  app.withTypeProvider<ZodTypeProvider>().route<{
    Params: z.infer<typeof paramsSchema>
    Body: ACLSharePublic
    Reply: ACLResponse | ErrorType
  }>({
    method: 'POST',
    schema: {
      description: 'Share a resource publicly',
      tags: ['acl'],
      params: paramsSchema,
      body: ACLSharePublicSchema,
      response: {
        200: ACLResponseSchema,
        201: ACLResponseSchema,
        401: ErrorSchema,
        500: ErrorSchema,
      },
    },
    url: '/acls/:resourceType/:resourceId/share-public',
    handler: async (request, reply) => {
      const { resourceType, resourceId } = request.params
      const { permission } = request.body
      const { tenantId } = request.authUser || {}

      if (!tenantId) {
        return reply.status(401).send({
          message: 'Missing authentication context',
        })
      }

      try {
        // Check if public ACL already exists
        const existingACL = await request.store.acl.findOne({
          tenantId,
          resourceType: resourceType as ResourceType,
          resourceId: Number.parseInt(resourceId),
          userEmail: '_all',
        })

        if (existingACL) {
          // Update existing public ACL
          existingACL.permission = permission as Permission
          await request.store.em.flush()
          return reply.send({ acl: existingACL })
        }

        // Create new public ACL
        const acl = request.store.acl.create({
          tenantId,
          resourceType: resourceType as ResourceType,
          resourceId: Number.parseInt(resourceId),
          userEmail: '_all',
          permission: permission as Permission,
          createdAt: new Date(),
          updatedAt: new Date(),
        })

        await request.store.em.persistAndFlush(acl)
        return reply.status(201).send({ acl })
      } catch (error) {
        request.log.error('Error sharing resource publicly:', error)
        return reply
          .status(500)
          .send({ message: 'Failed to share resource publicly' })
      }
    },
  })
}
