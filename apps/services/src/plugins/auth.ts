import fp from 'fastify-plugin'
import fastifyJwt from '@fastify/jwt'
import { UserRole, type UserContext, type JWTPayload } from '@/types/auth.js'

export default fp(
  async (fastify) => {
    // Register JWT plugin
    await fastify.register(fastifyJwt, {
      secret: fastify.configuration.JWT_SECRET,
      sign: {
        algorithm: 'HS256',
        expiresIn: '24h',
      },
    })

    // Add authentication hook
    fastify.addHook('preHandler', async (request, reply) => {
      try {
        // Skip authentication for health checks and public endpoints
        if (request.url === '/healthz' || request.url === '/liveness') {
          return
        }

        // Verify JWT token
        const token = request.headers.authorization?.replace('Bearer ', '')
        if (!token) {
          return reply.status(401).send({
            error: 'Unauthorized',
            message: 'No authorization token provided',
          })
        }

        // Verify and decode the token
        const decoded = await request.jwtDecode<JWTPayload>()

        console.log('decoded', decoded)

        // Extract user information from Stytch JWT structure
        const userId = decoded.sub
        const tenantId = decoded['https://stytch.com/organization']?.slug
        const roles = decoded['https://stytch.com/session']?.roles || []

        // Find the highest priority role (prioritize admin, builder, then clinician)
        let role: UserRole = UserRole.USER // default role

        // for now we are hardcoding the roles but we must allow them via environment variables
        if (roles.includes('Panels Admin') || roles.includes('Org Admin')) {
          role = UserRole.ADMIN
        } else if (roles.includes('Panels Builder')) {
          role = UserRole.BUILDER
        } else if (roles.includes('Panels User')) {
          role = UserRole.USER
        }

        // Validate required fields
        if (!userId || !tenantId) {
          return reply.status(401).send({
            error: 'Unauthorized',
            message: 'Invalid token payload - missing required fields',
          })
        }

        // Validate role
        if (!Object.values(UserRole).includes(role)) {
          return reply.status(401).send({
            error: 'Unauthorized',
            message: 'Invalid user role',
          })
        }

        // Create user context
        const userContext: UserContext = {
          userId,
          userEmail: '', // Stytch JWT doesn't include email directly
          role,
          tenantId,
        }

        // Attach user context to request using a different property name
        ;(request as { authUser?: UserContext }).authUser = userContext

        // Log successful authentication (in development)
        if (fastify.configuration.NODE_ENV === 'development') {
          request.log.info({
            msg: 'User authenticated',
            userId: userContext.userId,
            userEmail: userContext.userEmail,
            role: userContext.role,
            tenantId: userContext.tenantId,
          })
        }
      } catch (error) {
        // Handle JWT verification errors
        if (error && typeof error === 'object' && 'code' in error) {
          if (error.code === 'FST_JWT_AUTHORIZATION_TOKEN_EXPIRED') {
            return reply.status(401).send({
              error: 'Unauthorized',
              message: 'Token expired',
            })
          }

          if (error.code === 'FST_JWT_AUTHORIZATION_TOKEN_INVALID') {
            return reply.status(401).send({
              error: 'Unauthorized',
              message: 'Invalid token',
            })
          }
        }

        // Log unexpected errors
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error'
        const errorStack = error instanceof Error ? error.stack : undefined

        request.log.error({
          msg: 'Authentication error',
          error: errorMessage,
          stack: errorStack,
        })

        return reply.status(500).send({
          error: 'Internal Server Error',
          message: 'Authentication failed',
        })
      }
    })

    // Add helper method to check if user has specific role
    fastify.decorate(
      'hasRole',
      (user: UserContext, role: UserRole): boolean => {
        return user.role === role
      },
    )

    // Add helper method to check if user is admin
    fastify.decorate('isAdmin', (user: UserContext): boolean => {
      return user.role === UserRole.ADMIN
    })

    // Add helper method to check if user is builder or admin
    fastify.decorate('isBuilderOrAdmin', (user: UserContext): boolean => {
      return user.role === UserRole.BUILDER || user.role === UserRole.ADMIN
    })
  },
  {
    name: 'auth',
    dependencies: ['configuration'],
  },
)

// Extend Fastify types
declare module 'fastify' {
  interface FastifyRequest {
    authUser?: UserContext
  }

  interface FastifyInstance {
    hasRole(user: UserContext, role: UserRole): boolean
    isAdmin(user: UserContext): boolean
    isBuilderOrAdmin(user: UserContext): boolean
  }
}
