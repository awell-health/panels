import { ErrorSchema, type ErrorType } from '@panels/types'
import {
  type ACLUpdate,
  ACLUpdateSchema,
  type ACLResponse,
  ACLResponseSchema,
} from '@panels/types/acls'
import type { ResourceType, Permission } from '@/types/auth.js'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'

export const aclUpdate = async (app: FastifyInstance) => {
  app.withTypeProvider<ZodTypeProvider>().route<{
    Params: { resourceType: string; resourceId: string; userEmail: string }
    Body: ACLUpdate
    Reply: ACLResponse | ErrorType
  }>({
    method: 'PUT',
    schema: {
      description: 'Update an ACL entry',
      tags: ['acl'],
      params: {
        type: 'object',
        properties: {
          resourceType: { type: 'string', enum: ['panel', 'view'] },
          resourceId: { type: 'string' },
          userEmail: { type: 'string' },
        },
        required: ['resourceType', 'resourceId', 'userEmail'],
      },
      body: ACLUpdateSchema,
      response: {
        200: ACLResponseSchema,
        401: ErrorSchema,
        404: ErrorSchema,
        500: ErrorSchema,
      },
    },
    url: '/acls/:resourceType/:resourceId/:userEmail',
    handler: async (request, reply) => {
      const { resourceType, resourceId, userEmail } = request.params
      const { permission } = request.body
      const { tenantId } = request.authUser || {}

      if (!tenantId) {
        return reply.status(401).send({
          message: 'Missing authentication context',
        })
      }

      try {
        const acl = await request.store.acl.findOne({
          tenantId,
          resourceType: resourceType as ResourceType,
          resourceId: Number.parseInt(resourceId),
          userEmail,
        })

        if (!acl) {
          return reply.status(404).send({ message: 'ACL entry not found' })
        }

        acl.permission = permission as Permission
        await request.store.em.flush()

        return reply.send({ acl })
      } catch (error) {
        request.log.error('Error updating ACL:', error)
        return reply.status(500).send({ message: 'Failed to update ACL' })
      }
    },
  })
}
