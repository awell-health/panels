import { z } from 'zod'

export const NotificationStatus = {
  PENDING: 'pending',
  ACKNOWLEDGED: 'acknowledged',
  RESOLVED: 'resolved',
} as const

export type NotificationStatus =
  (typeof NotificationStatus)[keyof typeof NotificationStatus]

export const NotificationImpact = {
  BREAKING: 'breaking',
  WARNING: 'warning',
  INFO: 'info',
} as const

export type NotificationImpact =
  (typeof NotificationImpact)[keyof typeof NotificationImpact]

export const ViewNotificationsQuerySchema = z.object({
  tenantId: z.string(),
  userId: z.string(),
  isRead: z.boolean().optional(),
  notificationType: z.nativeEnum(NotificationImpact).optional(),
  since: z.string().optional(), // ISO date string
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
})

export const ViewNotificationResponseSchema = z.object({
  id: z.number(),
  viewId: z.number(),
  userId: z.string(),
  tenantId: z.string(),
  impact: z.nativeEnum(NotificationImpact),
  message: z.string(),
  isRead: z.boolean(),
  createdAt: z.date(),
  readAt: z.date().optional(),
  view: z.object({
    id: z.number(),
    name: z.string(),
    panelId: z.number(),
    publishedBy: z.string().optional(),
  }),
})

export const ViewNotificationsResponseSchema = z.object({
  notifications: z.array(ViewNotificationResponseSchema),
  total: z.number(),
  unreadCount: z.number(),
  hasMore: z.boolean(),
})

export const MarkReadSchema = z.object({
  notificationIds: z.array(z.number()),
})

export const MarkReadResponseSchema = z.object({
  updated: z.number(),
})

// Types
export type ViewNotificationsQuery = z.infer<
  typeof ViewNotificationsQuerySchema
>
export type ViewNotificationsResponse = z.infer<
  typeof ViewNotificationsResponseSchema
>
export type MarkRead = z.infer<typeof MarkReadSchema>
export type MarkReadResponse = z.infer<typeof MarkReadResponseSchema>
