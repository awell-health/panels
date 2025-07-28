import { z } from 'zod'

export const DataSourceInfoSchema = z.object({
  type: z.enum(['database', 'api', 'file', 'custom']),
  config: z.record(z.string(), z.any()),
  tenantId: z.string(),
  userId: z.string(),
})

export const DataSourceResponseSchema = z.object({
  id: z.number(),
  type: z.enum(['database', 'api', 'file', 'custom']),
  config: z.record(z.string(), z.any()),
  lastSync: z.date(),
})

export const DataSourcesResponseSchema = z.array(DataSourceResponseSchema)

export const DataSourceSyncResponseSchema = z.object({
  id: z.number(),
  type: z.enum(['database', 'api', 'file', 'custom']),
  config: z.record(z.string(), z.any()),
  lastSync: z.date(),
  syncStatus: z.enum(['success', 'error']),
  message: z.string().optional(),
})

// Types
export type DataSourceInfo = z.infer<typeof DataSourceInfoSchema>
export type DataSourceResponse = z.infer<typeof DataSourceResponseSchema>
export type DataSourcesResponse = z.infer<typeof DataSourcesResponseSchema>
export type DataSourceSyncResponse = z.infer<
  typeof DataSourceSyncResponseSchema
>
