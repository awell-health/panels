import fp from 'fastify-plugin'
import { customAlphabet } from 'nanoid'

const alphabet =
  'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
const hash = customAlphabet(alphabet, 15)

const defaultOptions = {
  generateHash: (_: unknown) => hash(),
  requestIDName: 'x-request-id',
  sessionIDName: 'x-session-id',
}

export default fp(
  async (fastify, opts) => {
    fastify.decorateRequest('reqID', '')
    fastify.decorateRequest('sesID', '')
    fastify.decorateRequest('ids', {
      getter() {
        return { reqID: '', sesID: '' }
      },
    })

    const options = Object.assign({}, defaultOptions, opts)

    fastify.addHook('onRequest', async (request, reply) => {
      request.reqID =
        request.headers[options.requestIDName]?.at(0) ||
        options.generateHash('requestID')
      request.sesID =
        request.headers[options.sessionIDName]?.at(0) ||
        options.generateHash('sessionID')
      request.ids.reqID = request.reqID
      request.ids.sesID = request.sesID
    })

    fastify.addHook('onSend', async (request, reply, _payload) => {
      reply.header(options.requestIDName, request.reqID)
      reply.header(options.sessionIDName, request.sesID)
    })
  },
  { name: 'request-id-ts' },
)

declare module 'fastify' {
  interface FastifyRequest {
    reqID: string
    sesID: string
    ids: {
      reqID: string
      sesID: string
    }
  }
}
