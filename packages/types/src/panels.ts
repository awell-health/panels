import { z } from 'zod'

export const CohortLogic = {
  AND: 'AND',
  OR: 'OR',
} as const

export const CohortOperator = {
  EQ: 'eq',
  GT: 'gt',
  LT: 'lt',
  GTE: 'gte',
  LTE: 'lte',
} as const

export type CohortLogic = (typeof CohortLogic)[keyof typeof CohortLogic]
export type CohortOperator =
  (typeof CohortOperator)[keyof typeof CohortOperator]

// Create / Update Panel
export const PanelInfoSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  tenantId: z.string(),
  userId: z.string(),
})

export type PanelInfo = z.infer<typeof PanelInfoSchema>

export const CreatePanelResponseSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  tenantId: z.string(),
  userId: z.string(),
  cohortRule: z.object({
    conditions: z.array(
      z.object({
        field: z.string(),
        operator: z.nativeEnum(CohortOperator),
        value: z.any(),
      }),
    ),
    logic: z.nativeEnum(CohortLogic),
  }),
  createdAt: z.date(),
  updatedAt: z.date(),
  metadata: z.record(z.string(), z.any()).optional(),
})

export type CreatePanelResponse = z.infer<typeof CreatePanelResponseSchema>

// List Panels
export const PanelResponseSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  tenantId: z.string(),
  userId: z.string(),
  cohortRule: z.object({
    conditions: z.array(
      z.object({
        field: z.string(),
        operator: z.enum(CohortOperator),
        value: z.any(),
      }),
    ),
    logic: z.nativeEnum(CohortLogic),
  }),
  createdAt: z.date(),
  updatedAt: z.date(),
  metadata: z.record(z.string(), z.any()).optional(),
})

export const PanelsResponseSchema = z.array(PanelResponseSchema)

export type PanelResponse = z.infer<typeof PanelResponseSchema>
export type PanelsResponse = z.infer<typeof PanelsResponseSchema>
