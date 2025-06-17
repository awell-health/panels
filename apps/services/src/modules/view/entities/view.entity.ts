import {
  Collection,
  Entity,
  Index,
  ManyToOne,
  OneToMany,
  PrimaryKey,
  Property,
} from '@mikro-orm/core'
import { Panel } from '../../panel/entities/panel.entity.js'
import { ViewFilter } from './view-filter.entity.js'
import { ViewSort } from './view-sort.entity.js'
import { ResourceModel } from '@/model/resource.entity.js'

@Entity()
@Index({ properties: ['tenantId', 'ownerUserId'] })
@Index({ properties: ['tenantId', 'isPublished'] })
export class View extends ResourceModel {
  @PrimaryKey()
  id!: number

  @Property()
  name!: string

  @Property()
  ownerUserId!: string

  @Property()
  tenantId!: string

  @Property()
  isPublished = false

  @Property({ nullable: true })
  publishedAt?: Date

  @Property({ type: 'jsonb' })
  visibleColumns!: string[] // column IDs that are visible

  @OneToMany(
    () => ViewSort,
    (sort) => sort.view,
  )
  sort = new Collection<ViewSort>(this)

  @OneToMany(
    () => ViewFilter,
    (filter) => filter.view,
  )
  filters = new Collection<ViewFilter>(this)

  @ManyToOne(() => Panel)
  panel!: Panel
}
