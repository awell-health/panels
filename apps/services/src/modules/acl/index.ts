import fp from 'fastify-plugin'
import { aclList } from './routes/acl-list.js'
import { aclCreate } from './routes/acl-create.js'
import { aclUpdate } from './routes/acl-update.js'
import { aclDelete } from './routes/acl-delete.js'
import { aclSharePublic } from './routes/acl-share-public.js'

// Export all entities
export { AccessControlList } from './entities/access-control-list.entity.js'

export default fp(
  async (fastify) => {
    fastify.register(aclList)
    fastify.register(aclCreate)
    fastify.register(aclUpdate)
    fastify.register(aclDelete)
    fastify.register(aclSharePublic)
  },
  {
    name: 'acl',
    dependencies: ['model'],
  },
)
