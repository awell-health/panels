import { z } from 'zod'

export const SortDirection = {
  ASC: 'asc',
  DESC: 'desc',
} as const
export type SortDirection = (typeof SortDirection)[keyof typeof SortDirection]

export const ViewSortSchema = z.object({
  id: z.number(),
  columnName: z.string(), // ViewSort entity uses columnName
  direction: z.nativeEnum(SortDirection),
  order: z.number(),
})

// Base view schema matching the entity structure
export const ViewSchema = z.object({
  id: z.number(),
  panelId: z.number(),
  name: z.string(),
  ownerUserId: z.string(),
  tenantId: z.string(),
  isPublished: z.boolean(),
  publishedAt: z.date().nullable().optional(),
  visibleColumns: z.array(z.string()),
  metadata: z.record(z.any()).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  sort: z.array(ViewSortSchema),
})

// For creating views
export const ViewCreateSchema = z.object({
  name: z.string(),
  panelId: z.number(),
  visibleColumns: z.array(z.string()),
  metadata: z.record(z.any()).optional(),
})

// For updating views
export const ViewUpdateSchema = z.object({
  name: z.string().optional(),
  visibleColumns: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional(),
})

// Views list response
export const ViewsResponseSchema = z.object({
  views: z.array(ViewSchema),
  total: z.number(),
})

export const ViewSortsResponseSchema = z.object({
  sorts: z.array(ViewSortSchema),
})

export const ViewSortsUpdateSchema = z.object({
  sorts: z.array(
    z.object({
      columnName: z.string(),
      direction: z.nativeEnum(SortDirection),
      order: z.number(),
    }),
  ),
})

// Type exports
export type View = z.infer<typeof ViewSchema>
export type ViewCreate = z.infer<typeof ViewCreateSchema>
export type ViewUpdate = z.infer<typeof ViewUpdateSchema>
export type ViewsResponse = z.infer<typeof ViewsResponseSchema>

export type ViewSort = z.infer<typeof ViewSortSchema>
export type ViewSortsResponse = z.infer<typeof ViewSortsResponseSchema>
export type ViewSortsUpdate = z.infer<typeof ViewSortsUpdateSchema>
