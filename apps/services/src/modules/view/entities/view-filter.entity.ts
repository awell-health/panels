import { Entity, ManyToOne, PrimaryKey, Property } from '@mikro-orm/core'
// import { FilterOperator } from '@panels/types/views'
import { View } from './view.entity.js'

@Entity()
export class ViewFilter {
  @PrimaryKey()
  id!: number

  @Property()
  columnId!: string

  // @Enum({ items: () => FilterOperator })
  // operator!: FilterOperator

  @Property({ type: 'jsonb' })
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  value!: any

  @ManyToOne(() => View)
  view!: View
}
