import type { Task, Extension } from '@medplum/fhirtypes'
import type { WorklistTask } from './fhir-to-table-data'

/**
 * Extract pathway ID from a FHIR Task resource
 * Following the existing pattern used in the bots
 */
export function extractPathwayId(task: Task | WorklistTask): string | null {
  const awellExtension = task.extension
    ?.find(
      (ext: Extension) =>
        ext.url ===
        'https://awellhealth.com/fhir/StructureDefinition/awell-task',
    )
    ?.extension?.find((ext: Extension) => ext.url === 'pathway-id')

  return awellExtension?.valueString || null
}

/**
 * Extract all pathway IDs from an array of tasks
 * Returns unique pathway IDs only
 */
export function extractUniquePathwayIds(
  tasks: (Task | WorklistTask)[],
): string[] {
  const pathwayIds = new Set<string>()

  for (const task of tasks) {
    const pathwayId = extractPathwayId(task)
    if (pathwayId) {
      pathwayIds.add(pathwayId)
    }
  }

  return Array.from(pathwayIds)
}
