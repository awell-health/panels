import { Property } from '@mikro-orm/core'

export abstract class ResourceModel {
  @Property({ type: 'jsonb' })
  metadata?: Record<string, unknown>

  @Property()
  createdAt: Date = new Date()

  @Property({ onUpdate: () => new Date() })
  updatedAt: Date = new Date()
}
