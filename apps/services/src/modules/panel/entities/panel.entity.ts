import {
  Collection,
  Entity,
  Index,
  OneToMany,
  PrimaryKey,
  Property,
} from '@mikro-orm/core'
import { BaseColumn } from '../../column/entities/base-column.entity.js'
import { CalculatedColumn } from '../../column/entities/calculated-column.entity.js'
import { DataSource } from '../../datasource/entities/data-source.entity.js'
import { View } from '../../view/entities/view.entity.js'
import type { CohortRule } from './cohort-rule.js'
import { ResourceModel } from '@/model/resource.entity.js'

@Entity()
@Index({ properties: ['tenantId', 'userId'] })
export class Panel extends ResourceModel {
  @PrimaryKey()
  id!: number

  @Property()
  tenantId!: string

  @Property()
  userId!: string

  @Property()
  name!: string

  @Property({ nullable: true })
  description?: string

  @OneToMany(
    () => DataSource,
    (dataSource) => dataSource.panel,
  )
  dataSources = new Collection<DataSource>(this)

  @Property({ type: 'jsonb' })
  cohortRule!: CohortRule

  @OneToMany(
    () => BaseColumn,
    (column) => column.panel,
  )
  baseColumns = new Collection<BaseColumn>(this)

  @OneToMany(
    () => CalculatedColumn,
    (column) => column.panel,
  )
  calculatedColumns = new Collection<CalculatedColumn>(this)

  @OneToMany(
    () => View,
    (view) => view.panel,
  )
  views = new Collection<View>(this)
}
