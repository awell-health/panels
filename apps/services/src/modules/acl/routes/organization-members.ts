import { ErrorSchema, type ErrorType } from '@panels/types'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { env } from '../../../env.js'

const responseSchema = z.object({
  members: z.array(
    z.object({
      member_id: z.string(),
      name: z.string().nullable(),
      email_address: z.string(),
    }),
  ),
})

export const organizationMembers = async (app: FastifyInstance) => {
  app.withTypeProvider<ZodTypeProvider>().route<{
    Reply: z.infer<typeof responseSchema> | ErrorType
  }>({
    method: 'GET',
    url: '/organization/members',
    schema: {
      description: 'Get all members of the current organization',
      tags: ['acl'],
      response: {
        200: responseSchema,
        401: ErrorSchema,
        500: ErrorSchema,
      },
    },
    handler: async (request, reply) => {
      // Extract tenantId from JWT token
      const { organizationId } = request.authUser || {}

      if (!organizationId) {
        return reply.status(401).send({
          message: 'Missing authentication context',
        })
      }

      try {
        // Get Stytch configuration from environment
        const stytchSecret = env.STYTCH_SECRET_KEY
        const stytchProjectId = env.STYTCH_PROJECT_ID
        const stytchBaseUrl = env.STYTCH_BASE_URL

        if (!stytchSecret || !stytchProjectId) {
          request.log.error(
            'STYTCH_SECRET_KEY or STYTCH_PROJECT_ID not configured',
          )
          return reply.status(500).send({
            message: 'Stytch configuration not available',
          })
        }

        // Make HTTP request to Stytch's organization members search endpoint
        const response = await fetch(
          `${stytchBaseUrl}/v1/b2b/organizations/members/search`,
          {
            method: 'POST',
            headers: {
              Authorization: `Basic ${Buffer.from(`${env.STYTCH_PROJECT_ID}:${stytchSecret}`).toString('base64')}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              organization_ids: [organizationId],
            }),
          },
        )

        if (!response.ok) {
          const errorData = await response.text()
          request.log.error('Stytch API error:', {
            status: response.status,
            error: errorData,
          })
          throw new Error(`Stytch API error: ${response.status}`)
        }

        const data = (await response.json()) as {
          members?: Array<{
            member_id: string
            name: string | null
            email_address: string
          }>
        }
        return { members: data.members || [] }
      } catch (error) {
        console.log('Error fetching organization members:', error)
        return reply.status(500).send({
          message: 'Failed to fetch organization members',
        })
      }
    },
  })
}
