import { Entity, Enum, ManyToOne, PrimaryKey, Property } from '@mikro-orm/core'
import { Panel } from '../../panel/entities/panel.entity.js'
import { type ColumnProperties, ColumnType } from './base-column.entity.js'

@Entity()
export class CalculatedColumn {
  @PrimaryKey()
  id!: number

  @Property()
  name!: string

  @Enum({ items: () => ColumnType })
  type!: ColumnType

  @Property()
  formula!: string

  @Property({ type: 'jsonb', nullable: true })
  tags?: string[]

  @Property({ type: 'jsonb' })
  dependencies!: string[] // references to other column IDs

  @Property({ type: 'jsonb' })
  properties!: ColumnProperties

  @Property({ type: 'jsonb', nullable: true })
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  metadata?: Record<string, any>

  @ManyToOne(() => Panel)
  panel!: Panel
}
