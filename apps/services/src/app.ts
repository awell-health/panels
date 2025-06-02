import autoload from '@fastify/autoload'
import cors from '@fastify/cors'
import arecibo from 'arecibo'
import Fastify, {
  type FastifyInstance,
  type FastifyServerOptions,
} from 'fastify'
import {
  serializerCompiler,
  validatorCompiler,
} from 'fastify-type-provider-zod'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export async function createApp(
  opts: FastifyServerOptions = {},
): Promise<FastifyInstance> {
  const __dirname = dirname(fileURLToPath(import.meta.url))

  const app = Fastify(opts)
  app.setValidatorCompiler(validatorCompiler)
  app.setSerializerCompiler(serializerCompiler)

  await app.register(arecibo, {
    message: 'Worklist services health check',
    logLevel: 'info',
    readinessURL: '/healthz',
    livenessURL: '/liveness',
  })

  await app.register(cors, { origin: true })
  await app.register(autoload, {
    dir: resolve(__dirname, 'plugins'),
    forceESM: true,
  })
  await app.register(autoload, {
    dir: resolve(__dirname, 'modules'),
    prefix: 'api',
    maxDepth: 1,
    ignorePattern: /^.*(?:test|spec|entity).*(?:js|ts)$/,
  })

  return app
}
