import { ErrorSchema, type ErrorType } from '@panels/types'
import type { ResourceType } from '@/types/auth.js'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'

// Zod schema for params
const paramsSchema = z.object({
  resourceType: z.enum(['panel', 'view']),
  resourceId: z.string(),
  userEmail: z.string(),
})

export const aclDelete = async (app: FastifyInstance) => {
  app.withTypeProvider<ZodTypeProvider>().route<{
    Params: z.infer<typeof paramsSchema>
    Reply: null | ErrorType
  }>({
    method: 'DELETE',
    schema: {
      description: 'Delete an ACL entry',
      tags: ['acl'],
      params: paramsSchema,
      response: {
        204: z.null(),
        401: ErrorSchema,
        404: ErrorSchema,
        500: ErrorSchema,
      },
    },
    url: '/acls/:resourceType/:resourceId/:userEmail',
    handler: async (request, reply) => {
      const { resourceType, resourceId, userEmail } = request.params
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

        await request.store.em.removeAndFlush(acl)

        return reply.status(204).send()
      } catch (error) {
        request.log.error('Error deleting ACL:', error)
        return reply.status(500).send({ message: 'Failed to delete ACL' })
      }
    },
  })
}
