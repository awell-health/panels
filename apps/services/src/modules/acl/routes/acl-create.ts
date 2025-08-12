import { ErrorSchema, type ErrorType } from '@panels/types'
import {
  type ACLCreate,
  ACLCreateSchema,
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

export const aclCreate = async (app: FastifyInstance) => {
  app.withTypeProvider<ZodTypeProvider>().route<{
    Params: z.infer<typeof paramsSchema>
    Body: ACLCreate
    Reply: ACLResponse | ErrorType
  }>({
    method: 'POST',
    schema: {
      description: 'Create a new ACL entry',
      tags: ['acl'],
      params: paramsSchema,
      body: ACLCreateSchema,
      response: {
        201: ACLResponseSchema,
        401: ErrorSchema,
        409: ErrorSchema,
        500: ErrorSchema,
      },
    },
    url: '/acls/:resourceType/:resourceId',
    handler: async (request, reply) => {
      const { resourceType, resourceId } = request.params
      const { userEmail, permission } = request.body
      const { tenantId } = request.authUser || {}

      if (!tenantId) {
        return reply.status(401).send({
          message: 'Missing authentication context',
        })
      }

      try {
        // Check if ACL already exists
        const existingACL = await request.store.acl.findOne({
          tenantId,
          resourceType: resourceType as ResourceType,
          resourceId: Number.parseInt(resourceId),
          userEmail,
        })

        if (existingACL) {
          return reply.status(409).send({ message: 'ACL entry already exists' })
        }

        const acl = request.store.acl.create({
          tenantId,
          resourceType: resourceType as ResourceType,
          resourceId: Number.parseInt(resourceId),
          userEmail,
          permission: permission as Permission,
          createdAt: new Date(),
          updatedAt: new Date(),
        })

        await request.store.em.persistAndFlush(acl)

        return reply.status(201).send({ acl })
      } catch (error) {
        request.log.error('Error creating ACL:', error)
        return reply.status(500).send({ message: 'Failed to create ACL' })
      }
    },
  })
}
