import { Entity, Index, PrimaryKey, Property } from '@mikro-orm/core'
import { ResourceModel } from '@/model/resource.entity.js'
import type { ResourceType, Permission } from '@/types/auth.js'

@Entity({ tableName: 'access_control_lists' })
@Index({ properties: ['tenantId', 'resourceType', 'resourceId'] })
@Index({ properties: ['tenantId', 'userEmail', 'resourceType'] })
@Index({ properties: ['tenantId', 'userEmail'] })
export class AccessControlList extends ResourceModel {
  @PrimaryKey()
  id!: number

  @Property()
  tenantId!: string

  @Property({ type: 'string', check: "resource_type IN ('panel', 'view')" })
  resourceType!: ResourceType

  @Property()
  resourceId!: number

  @Property()
  userEmail!: string // '_all' represents public access for the entire tenant

  @Property({
    type: 'string',
    check: "permission IN ('viewer', 'editor', 'owner')",
  })
  permission!: Permission
}
