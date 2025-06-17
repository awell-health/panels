import type { EntityManager } from '@mikro-orm/core'
import { BaseColumn } from '../entities/base-column.entity.js'
import { CalculatedColumn } from '../entities/calculated-column.entity.js'
import { Panel } from '../../panel/entities/panel.entity.js'

export async function setColumnOrder(em: EntityManager) {
  // Get all panels
  const panels = await em.find(Panel, {})

  for (const panel of panels) {
    // Get all base columns for this panel
    const baseColumns = await em.find(BaseColumn, { panel: { id: panel.id } })
    // Get all calculated columns for this panel
    const calculatedColumns = await em.find(CalculatedColumn, {
      panel: { id: panel.id },
    })

    // Set order for base columns
    for (let i = 0; i < baseColumns.length; i++) {
      const column = baseColumns[i]
      if (column) {
        const existingProperties = column.properties || {}
        const existingDisplay = existingProperties.display || {}

        column.properties = {
          ...existingProperties,
          display: {
            ...existingDisplay,
            order: i,
          },
        }
      }
    }

    // Set order for calculated columns
    for (let i = 0; i < calculatedColumns.length; i++) {
      const column = calculatedColumns[i]
      if (column) {
        const existingProperties = column.properties || {}
        const existingDisplay = existingProperties.display || {}

        column.properties = {
          ...existingProperties,
          display: {
            ...existingDisplay,
            order: i + baseColumns.length, // Continue order after base columns
          },
        }
      }
    }
  }

  // Flush all changes
  await em.flush()
}
