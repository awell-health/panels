import { ErrorSchema, type ErrorType } from '@panels/types'
import { type ACLsResponse, ACLsResponseSchema } from '@panels/types/acls'
import type { ResourceType } from '@/types/auth.js'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'

// Zod schema for params
const paramsSchema = z.object({
  resourceType: z.enum(['panel', 'view']),
  resourceId: z.string(),
})

export const aclList = async (app: FastifyInstance) => {
  app.withTypeProvider<ZodTypeProvider>().route<{
    Params: z.infer<typeof paramsSchema>
    Reply: ACLsResponse | ErrorType
  }>({
    method: 'GET',
    schema: {
      description: 'List ACLs for a resource',
      tags: ['acl'],
      params: paramsSchema,
      response: {
        200: ACLsResponseSchema,
        401: ErrorSchema,
        500: ErrorSchema,
      },
    },
    url: '/acls/:resourceType/:resourceId',
    handler: async (request, reply) => {
      const { resourceType, resourceId } = request.params
      const { tenantId } = request.authUser || {}

      if (!tenantId) {
        return reply.status(401).send({
          message: 'Missing authentication context',
        })
      }

      try {
        const acls = await request.store.acl.find({
          tenantId,
          resourceType: resourceType as ResourceType,
          resourceId: Number.parseInt(resourceId),
        })

        return reply.send({ acls })
      } catch (error) {
        request.log.error('Error listing ACLs:', error)
        return reply.status(500).send({ message: 'Failed to list ACLs' })
      }
    },
  })
}
