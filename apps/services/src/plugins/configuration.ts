import fp from 'fastify-plugin'
import { env } from '@/env.js'

export default fp(
  async (fastify) => {
    fastify.decorate('configuration', env)
  },
  { name: 'configuration' },
)

declare module 'fastify' {
  interface FastifyInstance {
    configuration: typeof env
  }
}
