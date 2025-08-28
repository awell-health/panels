import type { BotEvent, MedplumClient } from '@medplum/core'
import type { Task, Extension } from '@medplum/fhirtypes'

/**
 * [AwellHealth] Refresh Patient Data
 *
 * Triggering Event: Manual bot execution with patient ID list
 *
 * FHIR Resources:
 * - Task: Updated - Removes enrichment status extensions from the last task of each specified patient
 *
 * Process Overview: This bot refreshes patient data for a specific list of patients by finding their
 * most recent task and removing the Awell enrichment status extension to allow for fresh data processing
 * and enrichment.
 */

const AWELL_ENRICHMENT_STATUS_EXTENSION_URL =
  'https://awellhealth.com/fhir/StructureDefinition/awell-enrichment-status'

/**
 * Removes extensions with a specific URL from a resource
 * @param extensions - Array of extensions to filter
 * @param urlToRemove - The URL of extensions to remove
 * @returns Filtered array without the specified extensions
 *
 * Note: This function is copied from @utility_functions.ts as per bot best practices
 */
function removeExtensionsByUrl(
  extensions: Extension[] | undefined,
  urlToRemove: string,
): Extension[] {
  if (!extensions) return []
  return extensions.filter((ext: Extension) => ext.url !== urlToRemove)
}

/**
 * Processes a single patient to refresh their data by removing enrichment status extensions
 * @param medplum - Medplum client instance
 * @param patientId - The patient ID to process
 * @returns Object containing processing results
 */
async function processPatientData(
  medplum: MedplumClient,
  patientId: string,
): Promise<{ success: boolean; taskId?: string; error?: string }> {
  try {
    // Find the last task for this patient
    const tasks = await medplum.search('Task', {
      patient: `Patient/${patientId}`,
      _sort: '-_lastUpdated',
      _count: '1',
    })

    if (!tasks.entry || tasks.entry.length === 0) {
      return {
        success: false,
        error: `No tasks found for patient ${patientId}`,
      }
    }

    const lastTaskEntry = tasks.entry[0]
    if (!lastTaskEntry || !lastTaskEntry.resource) {
      return {
        success: false,
        error: `No valid task resource found for patient ${patientId}`,
      }
    }

    const lastTask = lastTaskEntry.resource as Task
    if (!lastTask.id) {
      return {
        success: false,
        error: `Task for patient ${patientId} has no ID`,
      }
    }

    // Check if the task has the enrichment status extension
    if (!lastTask.extension || lastTask.extension.length === 0) {
      return {
        success: false,
        error: `Task ${lastTask.id} for patient ${patientId} has no extensions`,
      }
    }

    const hasEnrichmentExtension = lastTask.extension.some(
      (ext: Extension) => ext.url === AWELL_ENRICHMENT_STATUS_EXTENSION_URL,
    )

    if (!hasEnrichmentExtension) {
      return {
        success: false,
        error: `Task ${lastTask.id} for patient ${patientId} has no enrichment status extension`,
      }
    }

    // Transform Phase: Prepare the updated task
    const updatedExtensions = removeExtensionsByUrl(
      lastTask.extension,
      AWELL_ENRICHMENT_STATUS_EXTENSION_URL,
    )

    // Update Phase: Execute FHIR store update
    const updatedTask = {
      ...lastTask,
      extension: updatedExtensions,
    }

    await medplum.updateResource(updatedTask)

    return { success: true, taskId: lastTask.id }
  } catch (error) {
    // Enhanced error handling to capture more details
    let errorMessage: string
    if (error instanceof Error) {
      errorMessage = error.message
    } else if (typeof error === 'string') {
      errorMessage = error
    } else if (error && typeof error === 'object' && 'message' in error) {
      errorMessage = String((error as { message: string }).message)
    } else {
      errorMessage = `Unknown error type: ${typeof error}, value: ${JSON.stringify(error)}`
    }

    // Log the full error for debugging
    console.log(`Full error details for patient ${patientId}:`, error)

    return {
      success: false,
      error: `Error processing patient ${patientId}: ${errorMessage}`,
    }
  }
}

export async function handler(
  medplum: MedplumClient,
  event: BotEvent,
): Promise<void> {
  try {
    // Extract patient IDs from the event input
    const input = event.input as { patientIds?: string[] }
    const patientIds = input?.patientIds

    if (!patientIds || !Array.isArray(patientIds) || patientIds.length === 0) {
      console.log(
        'No patient IDs provided. Please provide a list of patient IDs in the input.',
      )
      return
    }

    console.log(
      `Starting patient data refresh process for ${patientIds.length} patients`,
    )
    console.log('Input received:', JSON.stringify(input, null, 2))

    // Fetch Phase: Process the provided patient IDs
    let processedCount = 0
    let updatedCount = 0
    let errorCount = 0

    // Process each patient ID
    for (const patientId of patientIds) {
      if (!patientId || typeof patientId !== 'string') {
        console.log(`Invalid patient ID: ${patientId}`)
        continue
      }

      console.log(`Processing patient: ${patientId}`)
      const result = await processPatientData(medplum, patientId)
      processedCount++

      if (result.success) {
        updatedCount++
        console.log(
          `Successfully removed enrichment status extension from task ${result.taskId} for patient ${patientId}`,
        )
      } else {
        errorCount++
        console.log(`Failed to process patient ${patientId}: ${result.error}`)
      }
    }

    // Process Outcome: Log final results
    console.log(
      `Patient data refresh completed: processed ${processedCount} patients, updated ${updatedCount} tasks, ${errorCount} errors`,
    )
  } catch (error) {
    // Enhanced error handling in main handler as well
    let errorMessage: string
    if (error instanceof Error) {
      errorMessage = error.message
    } else if (typeof error === 'string') {
      errorMessage = error
    } else if (error && typeof error === 'object' && 'message' in error) {
      errorMessage = String((error as { message: string }).message)
    } else {
      errorMessage = `Unknown error type: ${typeof error}, value: ${JSON.stringify(error)}`
    }

    console.log(`Patient data refresh failed: ${errorMessage}`)
    console.log('Full error details:', error)
    throw error
  }
}
