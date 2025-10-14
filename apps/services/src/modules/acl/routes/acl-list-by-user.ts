import { ErrorSchema, type ErrorType } from '@panels/types'
import { type ACLsResponse, ACLsResponseSchema } from '@panels/types/acls'
import type { ResourceType } from '@/types/auth.js'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'

// Zod schema for params
const paramsSchema = z.object({
  userEmail: z.string().email(),
})

// Zod schema for query params
const querySchema = z.object({
  resourceType: z.enum(['panel', 'view']).optional(),
})

export const aclListByUser = async (app: FastifyInstance) => {
  app.withTypeProvider<ZodTypeProvider>().route<{
    Params: z.infer<typeof paramsSchema>
    Querystring: z.infer<typeof querySchema>
    Reply: ACLsResponse | ErrorType
  }>({
    method: 'GET',
    schema: {
      description: 'List ACLs for a specific user',
      tags: ['acl'],
      params: paramsSchema,
      querystring: querySchema,
      response: {
        200: ACLsResponseSchema,
        401: ErrorSchema,
        500: ErrorSchema,
      },
    },
    url: '/acls/user/:userEmail',
    handler: async (request, reply) => {
      const { userEmail } = request.params
      const { resourceType } = request.query
      const { tenantId } = request.authUser || {}

      if (!tenantId) {
        return reply.status(401).send({
          message: 'Missing authentication context',
        })
      }

      try {
        // Get ACLs for the specific user
        const userQuery: {
          tenantId: string
          userEmail: string
          resourceType?: ResourceType
        } = {
          tenantId,
          userEmail,
        }

        // Add resourceType filter if provided
        if (resourceType) {
          userQuery.resourceType = resourceType as ResourceType
        }

        const userAcls = await request.store.acl.find(userQuery)

        // Get ACLs for '_all' (public access)
        const allQuery: {
          tenantId: string
          userEmail: string
          resourceType?: ResourceType
        } = {
          tenantId,
          userEmail: '_all',
        }

        // Add resourceType filter if provided
        if (resourceType) {
          allQuery.resourceType = resourceType as ResourceType
        }

        const allAcls = await request.store.acl.find(allQuery)

        // Combine both results
        const acls = [...userAcls, ...allAcls]

        return reply.send({ acls })
      } catch (error) {
        request.log.error('Error listing ACLs by user:', error)
        return reply
          .status(500)
          .send({ message: 'Failed to list ACLs by user' })
      }
    },
  })
}
