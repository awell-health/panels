import { z } from 'zod'

export const SupportedColumnTypes = [
  'text',
  'number',
  'date',
  'datetime',
  'boolean',
  'select',
  'multi_select',
  'user',
  'file',
  'custom',
] as const

export const ColumnPropertiesSchema = z.object({
  required: z.boolean().optional(),
  unique: z.boolean().optional(),
  defaultValue: z.any().optional(),
  validation: z
    .object({
      min: z.number().optional(),
      max: z.number().optional(),
      pattern: z.string().optional(),
      options: z.array(z.string()).optional(),
    })
    .optional(),
  display: z
    .object({
      width: z.number().optional(),
      format: z.string().optional(),
      visible: z.boolean().optional(),
      order: z.number().int().nonnegative().optional(),
    })
    .optional(),
})

export const ColumnBaseCreateSchema = z.object({
  name: z.string(),
  type: z.enum(SupportedColumnTypes),
  sourceField: z.string(),
  dataSourceId: z.number(),
  properties: ColumnPropertiesSchema,
  metadata: z.record(z.string(), z.any()).optional(),
  tenantId: z.string(),
  userId: z.string(),
  tags: z.array(z.string()).optional(),
})

export const ColumnBaseCreateResponseSchema = z.object({
  id: z.number(),
  name: z.string(),
  type: z.enum(SupportedColumnTypes),
  sourceField: z.string(),
  tags: z.array(z.string()).optional(),
  properties: ColumnPropertiesSchema,
  metadata: z.record(z.string(), z.any()).optional(),
})

// Types
export type ColumnBaseCreate = z.infer<typeof ColumnBaseCreateSchema>
export type ColumnBaseCreateResponse = z.infer<
  typeof ColumnBaseCreateResponseSchema
>

// Zod Schemas

export const ColumnCalculatedCreateSchema = z.object({
  name: z.string(),
  type: z.enum(SupportedColumnTypes),
  formula: z.string(),
  dependencies: z.array(z.string()),
  properties: ColumnPropertiesSchema,
  metadata: z.record(z.string(), z.any()).optional(),
  tenantId: z.string(),
  userId: z.string(),
  tags: z.array(z.string()).optional(),
})

export const ColumnCalculatedCreateResponseSchema = z.object({
  id: z.number(),
  name: z.string(),
  type: z.enum(SupportedColumnTypes),
  formula: z.string(),
  dependencies: z.array(z.string()),
  properties: ColumnPropertiesSchema,
  metadata: z.record(z.string(), z.any()).optional(),
  tags: z.array(z.string()).optional(),
})

// Types
export type ColumnCalculatedCreate = z.infer<
  typeof ColumnCalculatedCreateSchema
>
export type ColumnCalculatedCreateResponse = z.infer<
  typeof ColumnCalculatedCreateResponseSchema
>

export const ColumnBaseSchema = z.object({
  id: z.number(),
  name: z.string(),
  type: z.enum(SupportedColumnTypes),
  sourceField: z.string(),
  properties: ColumnPropertiesSchema,
  metadata: z.record(z.string(), z.any()).optional(),
  columnType: z.literal('base'),
  tags: z.array(z.string()).optional(),
})

export const ColumnCalculatedSchema = z.object({
  id: z.number(),
  name: z.string(),
  type: z.enum(SupportedColumnTypes),
  formula: z.string(),
  dependencies: z.array(z.string()),
  properties: ColumnPropertiesSchema,
  metadata: z.record(z.string(), z.any()).optional(),
  columnType: z.literal('calculated'),
  tags: z.array(z.string()).optional(),
})

export const ColumnsResponseSchema = z.object({
  baseColumns: z.array(ColumnBaseSchema),
  calculatedColumns: z.array(ColumnCalculatedSchema),
})

export type ColumnsResponse = z.infer<typeof ColumnsResponseSchema>

export const ColumnInfoSchema = z.object({
  name: z.string().optional(),
  type: z.enum(SupportedColumnTypes).optional(),
  properties: ColumnPropertiesSchema.optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  // For calculated columns
  formula: z.string().optional(),
  dependencies: z.array(z.string()).optional(),
  // For base columns
  sourceField: z.string().optional(),
  tenantId: z.string(),
  userId: z.string(),
  tags: z.array(z.string()).optional(),
})

export const ColumnInfoResponseSchema = z.object({
  id: z.number(),
  name: z.string(),
  type: z.enum(SupportedColumnTypes),
  properties: ColumnPropertiesSchema,
  metadata: z.record(z.string(), z.any()).optional(),
  // For calculated columns
  formula: z.string().optional(),
  dependencies: z.array(z.string()).optional(),
  // For base columns
  sourceField: z.string().optional(),
  tags: z.array(z.string()).optional(),
})

export type ColumnInfo = z.infer<typeof ColumnInfoSchema>
export type ColumnInfoResponse = z.infer<typeof ColumnInfoResponseSchema>
