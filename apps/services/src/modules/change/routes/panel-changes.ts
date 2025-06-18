import type { FilterQuery } from '@mikro-orm/core'
import {
  type ChangeType,
  type PanelChangesQuery,
  PanelChangesQuerySchema,
  type PanelChangesResponse,
  PanelChangesResponseSchema,
} from '@panels/types/changes'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import type { PanelChange } from '../entities/panel-change.entity.js'

// Zod Schemas

export const panelChanges = async (app: FastifyInstance) => {
  app.withTypeProvider<ZodTypeProvider>().route<{
    Querystring: PanelChangesQuery
    Reply: PanelChangesResponse
  }>({
    method: 'GET',
    schema: {
      description: 'List panel changes with affected views',
      tags: ['change-tracking'],
      querystring: PanelChangesQuerySchema,
      response: {
        200: PanelChangesResponseSchema,
      },
    },
    url: '/changes/panels',
    handler: async (request, reply) => {
      const { tenantId, panelId, changeType, since, limit, offset } =
        request.query

      const where: FilterQuery<PanelChange> = {
        panel: {
          $or: [
            { tenantId }, // User's own panels
            {
              // Panels with published views in tenant
              views: {
                isPublished: true,
                tenantId,
              },
            },
          ],
        },
      }

      if (panelId) {
        where.panel = { id: Number(panelId) }
      }

      if (changeType) {
        where.changeType = changeType as ChangeType
      }

      if (since) {
        where.createdAt = { $gte: new Date(since) }
      }

      const [changes, total] = await Promise.all([
        request.store.panelChange.find(where, {
          populate: ['panel', 'affectedColumn'],
          orderBy: { createdAt: 'DESC' },
          limit,
          offset,
        }),
        request.store.em.count('PanelChange', where),
      ])

      return {
        changes: changes.map((change) => ({
          id: change.id,
          panelId: change.panel.id,
          changeType: change.changeType,
          description: change.changeDetails.description,
          changedBy: change.panel.userId,
          changedAt: change.createdAt,
          affectedColumn: change.affectedColumn,
        })),
        total,
        hasMore: total > offset + limit,
      }
    },
  })
}
