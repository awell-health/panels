import z from 'zod'

export const ChangeType = {
  COLUMN_ADDED: 'column_added',
  COLUMN_REMOVED: 'column_removed',
  COLUMN_MODIFIED: 'column_modified',
  SOURCE_CHANGED: 'source_changed',
  COHORT_CHANGED: 'cohort_changed',
} as const

export type ChangeType = (typeof ChangeType)[keyof typeof ChangeType]

export const PanelChangesQuerySchema = z.object({
  tenantId: z.string(),
  userId: z.string(),
  panelId: z.string().optional(),
  changeType: z.enum(ChangeType).optional(),
  since: z.string().optional(), // ISO date string
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
})

export const PanelChangeResponseSchema = z.object({
  id: z.number(),
  panelId: z.number(),
  changeType: z.enum(ChangeType),
  description: z.string(),
  changedBy: z.string(),
  changedAt: z.date(),
  oldValues: z.record(z.string(), z.any()).optional(),
  newValues: z.record(z.string(), z.any()).optional(),
  affectedColumn: z.string().optional(),
})

export const PanelChangesResponseSchema = z.object({
  changes: z.array(PanelChangeResponseSchema),
  total: z.number(),
  hasMore: z.boolean(),
})

export type PanelChangesQuery = z.infer<typeof PanelChangesQuerySchema>
export type PanelChangesResponse = z.infer<typeof PanelChangesResponseSchema>
export type PanelChangeResponse = z.infer<typeof PanelChangeResponseSchema>
