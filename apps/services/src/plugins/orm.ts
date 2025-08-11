import config from '@/model/orm.config.js'
import { AccessControlList } from '@/modules/acl/entities/access-control-list.entity.js'
import { PanelChange } from '@/modules/change/entities/panel-change.entity.js'
import { ViewNotification } from '@/modules/change/entities/view-notification.entity.js'
import { BaseColumn } from '@/modules/column/entities/base-column.entity.js'
import { CalculatedColumn } from '@/modules/column/entities/calculated-column.entity.js'
import { DataSource } from '@/modules/datasource/entities/data-source.entity.js'
import { Panel } from '@/modules/panel/entities/panel.entity.js'
import { ViewFilter } from '@/modules/view/entities/view-filter.entity.js'
import { ViewSort } from '@/modules/view/entities/view-sort.entity.js'
import { View } from '@/modules/view/entities/view.entity.js'
import {
  type EntityRepository,
  MikroORM,
  type Options,
  type SqlEntityManager,
} from '@mikro-orm/postgresql'
import fp from 'fastify-plugin'

type SeverDataSoreOptions = {
  forkOnRequest?: boolean
}

type DataStorePluginOptions = Options & SeverDataSoreOptions

export interface DataStore {
  orm: MikroORM
  em: SqlEntityManager
  acl: EntityRepository<AccessControlList>
  panel: EntityRepository<Panel>
  panelChange: EntityRepository<PanelChange>
  view: EntityRepository<View>
  dataSource: EntityRepository<DataSource>
  baseColumn: EntityRepository<BaseColumn>
  calculatedColumn: EntityRepository<CalculatedColumn>
  viewFilter: EntityRepository<ViewFilter>
  viewSort: EntityRepository<ViewSort>
  viewNotification: EntityRepository<ViewNotification>
}

export default fp<DataStorePluginOptions>(
  async (fastify, options) => {
    if (options.forkOnRequest === undefined) {
      options.forkOnRequest = true
    }

    const dataStoreGenerator = (orm: MikroORM) => ({
      orm,
      em: orm.em as SqlEntityManager,
      acl: orm.em.getRepository(AccessControlList),
      panel: orm.em.getRepository(Panel),
      panelChange: orm.em.getRepository(PanelChange),
      view: orm.em.getRepository(View),
      dataSource: orm.em.getRepository(DataSource),
      baseColumn: orm.em.getRepository(BaseColumn),
      calculatedColumn: orm.em.getRepository(CalculatedColumn),
      viewFilter: orm.em.getRepository(ViewFilter),
      viewSort: orm.em.getRepository(ViewSort),
      viewNotification: orm.em.getRepository(ViewNotification),
    })

    const orm = await MikroORM.init(Object.assign({}, options, config))
    const mikroORM = dataStoreGenerator(orm)
    fastify.decorate('store', mikroORM)

    if (options.forkOnRequest) {
      fastify.addHook(
        'onRequest',
        async function (this: typeof fastify, request, reply) {
          const orm = Object.assign({}, this.store.orm)
          orm.em = orm.em.fork()

          request.store = dataStoreGenerator(orm as MikroORM)
        },
      )
    } else {
      fastify.addHook(
        'onRequest',
        async function (this: typeof fastify, request, reply) {
          request.store = this.store
        },
      )
    }

    fastify.addHook('onClose', () => orm.close())
  },
  {
    name: 'model',
    dependencies: ['configuration'],
  },
)

declare module 'fastify' {
  interface FastifyInstance {
    store: DataStore
  }
  interface FastifyRequest {
    store: DataStore
  }
}
