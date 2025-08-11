import type { ViewNotification } from '@/modules/change/entities/view-notification.entity.js'
import type { FilterQuery } from '@mikro-orm/core'
import { ErrorSchema } from '@panels/types'
import {
  type MarkRead,
  type MarkReadResponse,
  MarkReadResponseSchema,
  MarkReadSchema,
  NotificationStatus,
  type ViewNotificationsQuery,
  ViewNotificationsQuerySchema,
  type ViewNotificationsResponse,
  ViewNotificationsResponseSchema,
} from '@panels/types/view-notifications'

import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import type { UserContext } from '@/types/auth.js'

// Zod Schemas

export const viewNotifications = async (app: FastifyInstance) => {
  // GET /notifications/views - List view notifications
  app.withTypeProvider<ZodTypeProvider>().route<{
    Querystring: ViewNotificationsQuery
    Reply: ViewNotificationsResponse
  }>({
    method: 'GET',
    schema: {
      description: 'List view notifications for user',
      tags: ['change-tracking', 'notifications'],
      querystring: ViewNotificationsQuerySchema,
      response: {
        200: ViewNotificationsResponseSchema,
      },
    },
    url: '/notifications/views',
    handler: async (request, reply) => {
      const {
        tenantId,
        userId,
        isRead,
        notificationType,
        since,
        limit,
        offset,
      } = request.query

      const where: FilterQuery<ViewNotification> = {
        view: {
          tenantId,
        },
      }

      if (isRead !== undefined) {
        where.status = isRead
          ? NotificationStatus.ACKNOWLEDGED
          : NotificationStatus.PENDING
      }

      if (notificationType) {
        where.impact = notificationType
      }

      if (since) {
        where.createdAt = { $gte: new Date(since) }
      }

      const [notifications, total, unreadCount] = await Promise.all([
        request.store.viewNotification.find(where, {
          populate: ['view'],
          orderBy: { createdAt: 'DESC' },
          limit,
          offset,
        }),
        request.store.em.count('ViewNotification', where),
        request.store.em.count('ViewNotification', {
          userId,
          tenantId,
          isRead: false,
        }),
      ])

      return {
        notifications: notifications.map((notification) => ({
          id: notification.id,
          viewId: notification.view.id,
          userId: notification.userId,
          tenantId: notification.view.tenantId,
          impact: notification.impact,
          message: notification.message,
          isRead: notification.status === NotificationStatus.ACKNOWLEDGED,
          createdAt: notification.createdAt,
          readAt: notification.acknowledgedAt,
          view: {
            id: notification.view.id,
            name: notification.view.name,
            panelId: notification.view.panel.id,
            publishedBy: '',
          },
        })),
        total,
        unreadCount,
        hasMore: total > offset + limit,
      }
    },
  })

  // PUT /notifications/views/mark-read - Mark notifications as read
  app.withTypeProvider<ZodTypeProvider>().route<{
    Body: MarkRead
    Reply: MarkReadResponse
  }>({
    method: 'PUT',
    schema: {
      description: 'Mark view notifications as read',
      tags: ['change-tracking', 'notifications'],
      body: MarkReadSchema,
      response: {
        200: MarkReadResponseSchema,
        400: ErrorSchema,
      },
    },
    url: '/notifications/views/mark-read',
    handler: async (request, reply) => {
      const { notificationIds } = request.body

      // Get user context from JWT
      const userContext = (request as { authUser?: UserContext }).authUser
      if (!userContext) {
        throw new Error('User context not found')
      }

      const updated = await request.store.em.nativeUpdate(
        'ViewNotification',
        {
          id: { $in: notificationIds },
          userId: userContext.userId,
          tenantId: userContext.tenantId,
          isRead: false, // Only update unread notifications
        },
        {
          isRead: true,
          readAt: new Date(),
        },
      )

      return { updated }
    },
  })
}
