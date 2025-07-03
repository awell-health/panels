import fp from 'fastify-plugin'

// Export all entities
export * from '../change/entities/view-notification.entity.js'
export * from '../view/entities/view-filter.entity.js'
export * from '../view/entities/view-sort.entity.js'
export * from '../view/entities/view.entity.js'

import { viewCreate } from './routes/view-create.js'
import { viewDelete } from './routes/view-delete.js'
import { viewGet } from './routes/view-get.js'
import { viewList } from './routes/view-list.js'
import { viewSorts } from './routes/view-sorts.js'
import { viewUpdate } from './routes/view-update.js'

export default fp(
  async (fastify) => {
    fastify.register(viewCreate)
    fastify.register(viewGet)
    fastify.register(viewList)
    fastify.register(viewUpdate)
    fastify.register(viewDelete)
    fastify.register(viewSorts)
  },
  {
    name: 'view',
    dependencies: ['model'],
  },
)
