import { NotFoundError } from '@/errors/not-found-error.js'
import { ErrorSchema } from '@panels/types'
import {
  type ColumnInfo,
  type ColumnInfoResponse,
  ColumnInfoResponseSchema,
  ColumnInfoSchema,
} from '@panels/types/columns'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import type { BaseColumn } from '../entities/base-column.entity.js'
import type { CalculatedColumn } from '../entities/calculated-column.entity.js'

// Zod Schemas
const paramsSchema = z.object({
  id: z.string(),
  colId: z.string(),
})

// Types
type ParamsType = z.infer<typeof paramsSchema>

export const columnUpdate = async (app: FastifyInstance) => {
  app.withTypeProvider<ZodTypeProvider>().route<{
    Params: ParamsType
    Body: ColumnInfo
    Reply: ColumnInfoResponse
  }>({
    method: 'PUT',
    schema: {
      description: 'Update a column (base or calculated)',
      tags: ['panel', 'column'],
      params: paramsSchema,
      body: ColumnInfoSchema,
      response: {
        200: ColumnInfoResponseSchema,
        404: ErrorSchema,
        400: ErrorSchema,
      },
    },
    url: '/panels/:id/columns/:colId',
    handler: async (request, reply) => {
      const { id, colId } = request.params
      const {
        name,
        properties,
        metadata,
        formula,
        dependencies,
        sourceField,
        tenantId,
        userId,
        tags,
      } = request.body

      // First verify panel exists and user has access
      const panel = await request.store.panel.findOne({
        id: Number(id),
        tenantId,
        userId,
      })

      if (!panel) {
        throw new NotFoundError('Panel not found')
      }

      // Try to find as base column first
      let column: BaseColumn | CalculatedColumn | null =
        await request.store.baseColumn.findOne({
          id: Number(colId),
          panel: { id: Number(id) },
        })

      // If not found, try calculated column
      if (!column) {
        column = await request.store.calculatedColumn.findOne({
          id: Number(colId),
          panel: { id: Number(id) },
        })
      }

      if (!column) {
        throw new NotFoundError('Column not found')
      }

      // Update common fields
      if (name) column.name = name
      if (properties) column.properties = properties
      if (metadata !== undefined) column.metadata = metadata

      // Update specific fields based on column type
      if ('formula' in column) {
        // Calculated column
        if (formula) column.formula = formula
        if (dependencies) column.dependencies = dependencies
        if (tags) column.tags = tags
      } else if ('sourceField' in column) {
        // Base column
        if (sourceField) column.sourceField = sourceField
      }

      await request.store.em.flush()
      return column
    },
  })
}
