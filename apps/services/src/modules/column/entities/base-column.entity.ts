import { Entity, Enum, ManyToOne, PrimaryKey, Property } from '@mikro-orm/core'
import { DataSource } from '../../datasource/entities/data-source.entity.js'
import { Panel } from '../../panel/entities/panel.entity.js'

export const ColumnType = {
  TEXT: 'text',
  NUMBER: 'number',
  DATE: 'date',
  DATETIME: 'datetime',
  BOOLEAN: 'boolean',
  SELECT: 'select',
  MULTI_SELECT: 'multi_select',
  USER: 'user',
  FILE: 'file',
  CUSTOM: 'custom',
} as const

export type ColumnType = (typeof ColumnType)[keyof typeof ColumnType]

export interface ColumnProperties {
  required?: boolean
  unique?: boolean
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  defaultValue?: any
  validation?: {
    min?: number
    max?: number
    pattern?: string
    options?: string[]
  }
  display?: {
    width?: number
    format?: string
    visible?: boolean
    order?: number
  }
}

@Entity()
export class BaseColumn {
  @PrimaryKey()
  id!: number

  @Property()
  name!: string

  @Enum({ items: () => ColumnType })
  type!: ColumnType

  @Property()
  sourceField!: string

  @Property({ type: 'jsonb', nullable: true })
  tags?: string[]

  @Property({ type: 'jsonb' })
  properties!: ColumnProperties

  @Property({ type: 'jsonb', nullable: true })
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  metadata?: Record<string, any>

  @ManyToOne(() => DataSource, { nullable: true })
  dataSource?: DataSource

  @ManyToOne(() => Panel)
  panel!: Panel
}
