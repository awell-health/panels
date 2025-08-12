import { z } from 'zod'

// ACL entry schema matching the entity structure
export const ACLSchema = z.object({
  id: z.number(),
  tenantId: z.string(),
  resourceType: z.enum(['panel', 'view']),
  resourceId: z.number(),
  userEmail: z.string(),
  permission: z.enum(['viewer', 'editor', 'owner']),
  createdAt: z.date(),
  updatedAt: z.date(),
})

// For creating ACL entries
export const ACLCreateSchema = z.object({
  userEmail: z.string(),
  permission: z.enum(['viewer', 'editor', 'owner']),
})

// For updating ACL entries
export const ACLUpdateSchema = z.object({
  permission: z.enum(['viewer', 'editor', 'owner']),
})

// ACL list response
export const ACLsResponseSchema = z.object({
  acls: z.array(ACLSchema),
})

// ACL single response
export const ACLResponseSchema = z.object({
  acl: ACLSchema,
})

// Public sharing request
export const ACLSharePublicSchema = z.object({
  permission: z.enum(['viewer', 'editor', 'owner']),
})

// Type exports
export type ACL = z.infer<typeof ACLSchema>
export type ACLCreate = z.infer<typeof ACLCreateSchema>
export type ACLUpdate = z.infer<typeof ACLUpdateSchema>
export type ACLsResponse = z.infer<typeof ACLsResponseSchema>
export type ACLResponse = z.infer<typeof ACLResponseSchema>
export type ACLSharePublic = z.infer<typeof ACLSharePublicSchema>
