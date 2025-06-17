import { z } from 'zod'

export const ViewInfoSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  panelId: z.number(),
  config: z.object({
    columns: z.array(z.string()),
    groupBy: z.array(z.string()).optional(),
    layout: z.enum(['table', 'card', 'kanban']).optional(),
  }),
  metadata: z.record(z.any()).optional(),
  tenantId: z.string(),
  userId: z.string(),
})

export const ViewResponseSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().optional(),
  panelId: z.number(),
  userId: z.string(),
  tenantId: z.string(),
  isPublished: z.boolean(),
  config: z.object({
    columns: z.array(z.string()),
    groupBy: z.array(z.string()).optional(),
    layout: z.enum(['table', 'card', 'kanban']).optional(),
  }),
  metadata: z.record(z.any()).optional(),
})

export const FilterOperator = {
  EQ: 'eq',
  GT: 'gt',
  LT: 'lt',
  GTE: 'gte',
  LTE: 'lte',
  CONTAINS: 'contains',
  IN: 'in',
  BETWEEN: 'between',
  NE: 'ne',
  STARTS_WITH: 'startsWith',
  ENDS_WITH: 'endsWith',
  NOT_IN: 'notIn',
  IS_NULL: 'isNull',
  IS_NOT_NULL: 'isNotNull',
} as const

export type FilterOperator =
  (typeof FilterOperator)[keyof typeof FilterOperator]

export const ViewFilterSchema = z.object({
  id: z.number(),
  columnName: z.string(),
  operator: z.nativeEnum(FilterOperator),
  value: z.any(),
  logicalOperator: z.enum(['and', 'or']).optional(),
})

export const ViewFiltersResponseSchema = z.object({
  filters: z.array(ViewFilterSchema),
})

export const ViewFiltersInfoSchema = z.object({
  filters: z.array(
    z.object({
      columnName: z.string(),
      operator: z.nativeEnum(FilterOperator),
      value: z.any(),
      logicalOperator: z.enum(['and', 'or']).optional(),
    }),
  ),
  tenantId: z.string(),
  userId: z.string(),
})

export const ViewFiltersInfoResponseSchema = z.object({
  filters: z.array(ViewFilterSchema),
})

export const ViewConfigSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().optional(),
  panelId: z.number(),
  userId: z.string(),
  tenantId: z.string(),
  isPublished: z.boolean(),
  publishedBy: z.string().optional(),
  publishedAt: z.date().optional(),
  config: z.object({
    columns: z.array(z.string()),
    groupBy: z.array(z.string()).optional(),
    layout: z.enum(['table', 'card', 'kanban']).optional(),
  }),
  metadata: z.record(z.any()).optional(),
  panel: z.object({
    id: z.number(),
    name: z.string(),
  }),
})

export const ViewsResponseSchema = z.object({
  views: z.array(ViewConfigSchema),
  total: z.number(),
})

export const ViewPublishInfoSchema = z.object({
  tenantId: z.string(),
  userId: z.string(),
})

export const ViewPublishResponseSchema = z.object({
  id: z.number(),
  name: z.string(),
  isPublished: z.boolean(),
  publishedBy: z.string(),
  publishedAt: z.date(),
})

export const SortDirection = {
  ASC: 'asc',
  DESC: 'desc',
} as const

export type SortDirection = (typeof SortDirection)[keyof typeof SortDirection]

export const ViewSortSchema = z.object({
  id: z.number(),
  columnName: z.string(),
  direction: z.nativeEnum(SortDirection),
  order: z.number(),
})

export const ViewSortsResponseSchema = z.object({
  sorts: z.array(ViewSortSchema),
})

export const ViewSortsInfoSchema = z.object({
  sorts: z.array(
    z.object({
      columnName: z.string(),
      direction: z.nativeEnum(SortDirection),
      order: z.number(),
    }),
  ),
  tenantId: z.string(),
  userId: z.string(),
})

export const ViewSortsInfoResponseSchema = z.object({
  sorts: z.array(ViewSortSchema),
})

export const ViewUpdateInfoSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  config: z
    .object({
      columns: z.array(z.string()),
      groupBy: z.array(z.string()).optional(),
      layout: z.enum(['table', 'card', 'kanban']).optional(),
    })
    .optional(),
  metadata: z.record(z.any()).optional(),
  tenantId: z.string(),
  userId: z.string(),
})

export const ViewUpdateInfoResponseSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().optional(),
  panelId: z.number(),
  userId: z.string(),
  tenantId: z.string(),
  isPublished: z.boolean(),
  config: z.object({
    columns: z.array(z.string()),
    groupBy: z.array(z.string()).optional(),
    layout: z.enum(['table', 'card', 'kanban']).optional(),
  }),
  metadata: z.record(z.any()).optional(),
})

export type ViewConfig = z.infer<typeof ViewConfigSchema>
export type ViewsResponse = z.infer<typeof ViewsResponseSchema>

export type ViewInfo = z.infer<typeof ViewInfoSchema>
export type ViewResponse = z.infer<typeof ViewResponseSchema>
export type ViewFiltersResponse = z.infer<typeof ViewFiltersResponseSchema>
export type ViewFiltersInfo = z.infer<typeof ViewFiltersInfoSchema>
export type ViewFiltersInfoResponse = z.infer<
  typeof ViewFiltersInfoResponseSchema
>
export type ViewPublishInfo = z.infer<typeof ViewPublishInfoSchema>
export type ViewPublishResponse = z.infer<typeof ViewPublishResponseSchema>

export type ViewSort = z.infer<typeof ViewSortSchema>
export type ViewSortsResponse = z.infer<typeof ViewSortsResponseSchema>
export type ViewSortsInfo = z.infer<typeof ViewSortsInfoSchema>
export type ViewSortsInfoResponse = z.infer<typeof ViewSortsInfoResponseSchema>

export type ViewUpdateInfo = z.infer<typeof ViewUpdateInfoSchema>
export type ViewUpdateInfoResponse = z.infer<
  typeof ViewUpdateInfoResponseSchema
>
