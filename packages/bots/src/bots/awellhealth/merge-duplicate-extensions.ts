/**
 * Bot Name: [PROJECT][Awell] Merge duplicate patient extensions
 *
 * Triggering Event:
 * - Bot execution (no input required)
 *
 * FHIR Resources Created/Updated:
 * - Patient: Updated (always) - Extensions array with duplicate extensions merged
 *   - Consolidates multiple extensions with the same URL into single extensions
 *   - Merges nested extension data when extensions have the same URL
 *   - Removes duplicate data within consolidated extensions at all nesting levels
 *   - Preserves all unique extension data while eliminating duplicates
 *
 * Process Overview:
 * - Executes automatically (no input required)
 * - Searches for Patient resources updated between 5 minutes ago and 1 minute ago
 * - Processes up to 100 patients in each execution
 * - For each patient, identifies duplicate extension URLs in the extensions array
 * - Merges extensions with the same URL by combining their nested extension data
 * - Removes duplicate data within consolidated extensions at all nesting levels
 * - Updates Patient resources with consolidated extensions using atomic patch operations
 * - Handles arbitrary levels of nested extensions through recursive merging and deduplication
 * - Provides batch processing summary with metrics
 */

import type { BotEvent, MedplumClient } from '@medplum/core'
import type { Patient, Extension } from '@medplum/fhirtypes'

/**
 * Recursively merges extensions, replacing existing ones that have matching URLs
 * with new ones, while preserving non-conflicting extensions.
 *
 * For extensions with nested extensions, recursively merges those as well.
 * This handles arbitrary levels of nesting.
 *
 * Copied from @utility_functions.ts - see that file for the latest version
 */
function mergeExtensions(
  existingExtensions: Extension[],
  newExtensions: Extension[],
): Extension[] {
  if (newExtensions.length === 0) return existingExtensions
  if (existingExtensions.length === 0) return newExtensions

  // Create lookup map for new extensions by URL
  const newExtensionsByUrl = new Map<string, Extension>()
  for (const ext of newExtensions) {
    if (ext.url) {
      newExtensionsByUrl.set(ext.url, ext)
    }
  }

  const mergedExtensions: Extension[] = []

  // Process existing extensions
  for (const existingExt of existingExtensions) {
    const matchingNewExt = existingExt.url
      ? newExtensionsByUrl.get(existingExt.url)
      : null

    if (!matchingNewExt) {
      // No conflict - keep existing extension as-is
      mergedExtensions.push(existingExt)
    } else {
      // Both extensions have the same URL - merge them
      if (existingExt.extension && matchingNewExt.extension) {
        // Both have nested extensions - recursively merge them
        const mergedNestedExtensions = mergeExtensions(
          existingExt.extension,
          matchingNewExt.extension,
        )
        mergedExtensions.push({
          ...matchingNewExt, // Use new extension as base
          extension: mergedNestedExtensions,
        })
      } else {
        // At least one doesn't have nested extensions - use the new one completely
        mergedExtensions.push(matchingNewExt)
      }

      // Mark as processed so we don't add it again
      if (existingExt.url) {
        newExtensionsByUrl.delete(existingExt.url)
      }
    }
  }

  // Add any completely new extensions that didn't exist before
  for (const remainingNewExt of newExtensionsByUrl.values()) {
    mergedExtensions.push(remainingNewExt)
  }

  return mergedExtensions
}

/**
 * Consolidates duplicate extensions by merging extensions with the same URL
 */
function consolidateDuplicateExtensions(extensions: Extension[]): Extension[] {
  if (!extensions || extensions.length === 0) {
    return extensions
  }

  // Group extensions by URL
  const extensionsByUrl = new Map<string, Extension[]>()

  for (const ext of extensions) {
    if (ext.url) {
      if (!extensionsByUrl.has(ext.url)) {
        extensionsByUrl.set(ext.url, [])
      }
      const extensions = extensionsByUrl.get(ext.url)
      if (extensions) {
        extensions.push(ext)
      }
    }
  }

  // Merge extensions with the same URL
  const consolidatedExtensions: Extension[] = []

  for (const [url, duplicateExtensions] of extensionsByUrl) {
    if (duplicateExtensions.length === 1) {
      // No duplicates, keep as-is
      const firstExt = duplicateExtensions[0]
      if (firstExt) {
        consolidatedExtensions.push(firstExt)
      }
    } else {
      // Multiple extensions with same URL - merge them
      console.log(
        `Merging ${duplicateExtensions.length} duplicate extensions for URL: ${url}`,
      )

      // Start with the first extension and merge the rest into it
      const firstExt = duplicateExtensions[0]
      if (!firstExt) continue

      let mergedExtension: Extension = { ...firstExt }

      for (let i = 1; i < duplicateExtensions.length; i++) {
        const currentExt = duplicateExtensions[i]
        if (!currentExt) continue

        if (mergedExtension.extension && currentExt.extension) {
          // Both have nested extensions - merge them
          const existingExtensions = mergedExtension.extension
          const newExtensions = currentExt.extension
          if (existingExtensions && newExtensions) {
            mergedExtension.extension = mergeExtensions(
              existingExtensions,
              newExtensions,
            )
          }
        } else if (currentExt.extension) {
          // Current has nested extensions but merged doesn't - use current's nested extensions
          mergedExtension.extension = [...currentExt.extension]
        }
        // If neither has nested extensions, just keep the first one
      }

      // Deduplicate the merged extension data
      mergedExtension = deduplicateExtensionData(mergedExtension)

      consolidatedExtensions.push(mergedExtension)
    }
  }

  return consolidatedExtensions
}

/**
 * Recursively removes duplicate data within an extension and its nested extensions
 */
function deduplicateExtensionData(extension: Extension): Extension {
  if (!extension.extension || extension.extension.length === 0) {
    return extension
  }

  // Group nested extensions by URL to identify duplicates
  const nestedExtensionsByUrl = new Map<string, Extension[]>()

  for (const nestedExt of extension.extension) {
    if (nestedExt.url) {
      if (!nestedExtensionsByUrl.has(nestedExt.url)) {
        nestedExtensionsByUrl.set(nestedExt.url, [])
      }
      const extensions = nestedExtensionsByUrl.get(nestedExt.url)
      if (extensions) {
        extensions.push(nestedExt)
      }
    }
  }

  // Deduplicate nested extensions
  const deduplicatedNestedExtensions: Extension[] = []

  for (const [nestedUrl, duplicateNestedExtensions] of nestedExtensionsByUrl) {
    if (duplicateNestedExtensions.length === 1) {
      // No duplicates, keep as-is but recursively deduplicate
      const firstNested = duplicateNestedExtensions[0]
      if (firstNested) {
        const deduplicatedNested = deduplicateExtensionData(firstNested)
        deduplicatedNestedExtensions.push(deduplicatedNested)
      }
    } else {
      // Multiple nested extensions with same URL - merge and deduplicate
      console.log(
        `Deduplicating ${duplicateNestedExtensions.length} nested extensions for URL: ${nestedUrl}`,
      )

      // Start with the first nested extension and merge the rest into it
      const firstNestedExt = duplicateNestedExtensions[0]
      if (!firstNestedExt) continue

      const mergedNestedExtension: Extension = { ...firstNestedExt }

      for (let i = 1; i < duplicateNestedExtensions.length; i++) {
        const currentNestedExt = duplicateNestedExtensions[i]
        if (!currentNestedExt) continue

        if (mergedNestedExtension.extension && currentNestedExt.extension) {
          // Both have nested extensions - merge them
          const existingNestedExtensions = mergedNestedExtension.extension
          const newNestedExtensions = currentNestedExt.extension
          if (existingNestedExtensions && newNestedExtensions) {
            mergedNestedExtension.extension = mergeExtensions(
              existingNestedExtensions,
              newNestedExtensions,
            )
          }
        } else if (currentNestedExt.extension) {
          // Current has nested extensions but merged doesn't - use current's nested extensions
          mergedNestedExtension.extension = [...currentNestedExt.extension]
        }
        // If neither has nested extensions, just keep the first one
      }

      // Recursively deduplicate the merged nested extension
      const deduplicatedNested = deduplicateExtensionData(mergedNestedExtension)
      deduplicatedNestedExtensions.push(deduplicatedNested)
    }
  }

  return {
    ...extension,
    extension: deduplicatedNestedExtensions,
  }
}

/**
 * Updates patient with consolidated extensions
 */
async function updatePatientWithConsolidatedExtensions(
  medplum: MedplumClient,
  patientId: string,
  consolidatedExtensions: Extension[],
): Promise<void> {
  await medplum.patchResource('Patient', patientId, [
    {
      op: 'replace',
      path: '/extension',
      value: consolidatedExtensions,
    },
  ])
}

export async function handler(
  medplum: MedplumClient,
  event: BotEvent<Record<string, never>>,
): Promise<void> {
  console.log('Starting extension consolidation for recently updated patients')

  try {
    // Calculate time range: from 5 minutes ago to 1 minute ago
    const now = new Date()
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000)
    const oneMinuteAgo = new Date(now.getTime() - 1 * 60 * 1000)

    console.log(
      'Current time and calculated ranges:',
      JSON.stringify(
        {
          currentTime: now.toISOString(),
          fiveMinutesAgo: fiveMinutesAgo.toISOString(),
          oneMinuteAgo: oneMinuteAgo.toISOString(),
          timeWindowMinutes: 4,
        },
        null,
        2,
      ),
    )

    console.log(
      'Searching for patients updated between:',
      JSON.stringify(
        {
          from: fiveMinutesAgo.toISOString(),
          to: oneMinuteAgo.toISOString(),
        },
        null,
        2,
      ),
    )

    // Search for patients updated in the specified time range
    // Use separate search parameters for proper FHIR date filtering
    const searchResult = await medplum.search('Patient', {
      _lastUpdated: `gt${fiveMinutesAgo.toISOString()}`,
      _count: 1000, // Process up to 1000 patients at a time
    })

    console.log(
      'Search result:',
      JSON.stringify(
        {
          total: searchResult.total,
          entryCount: searchResult.entry?.length || 0,
          searchParams: {
            '_lastUpdated:gt': fiveMinutesAgo.toISOString(),
            '_lastUpdated:lt': oneMinuteAgo.toISOString(),
          },
        },
        null,
        2,
      ),
    )

    const patients =
      searchResult.entry
        ?.map((entry) => entry.resource as Patient)
        .filter((patient) => {
          if (!patient.meta?.lastUpdated) return false
          const lastUpdated = new Date(patient.meta.lastUpdated)
          return lastUpdated < oneMinuteAgo
        }) || []

    console.log(
      'Found patients to process:',
      JSON.stringify(
        {
          patientCount: patients.length,
          timeRange: {
            from: fiveMinutesAgo.toISOString(),
            to: oneMinuteAgo.toISOString(),
          },
        },
        null,
        2,
      ),
    )

    let totalPatientsProcessed = 0
    let totalPatientsWithDuplicates = 0
    let totalExtensionsRemoved = 0

    // Process each patient
    for (const patient of patients) {
      if (!patient.id) {
        console.log('Skipping patient without ID')
        continue
      }

      try {
        if (!patient.extension || patient.extension.length === 0) {
          console.log(`Patient ${patient.id} has no extensions to consolidate`)
          continue
        }

        // Count extensions by URL to identify duplicates
        const extensionsByUrl = new Map<string, number>()
        for (const ext of patient.extension) {
          if (ext.url) {
            extensionsByUrl.set(
              ext.url,
              (extensionsByUrl.get(ext.url) || 0) + 1,
            )
          }
        }

        const duplicateUrls = Array.from(extensionsByUrl.entries())
          .filter(([_, count]) => count > 1)
          .map(([url, count]) => ({ url, count }))

        if (duplicateUrls.length === 0) {
          console.log(
            `Patient ${patient.id} has no duplicate extensions to consolidate`,
          )
          continue
        }

        console.log(
          `Processing patient ${patient.id}:`,
          JSON.stringify(
            {
              patientId: patient.id,
              duplicateUrls,
            },
            null,
            2,
          ),
        )

        // Consolidate duplicate extensions
        const consolidatedExtensions = consolidateDuplicateExtensions(
          patient.extension,
        )

        // Update patient with consolidated extensions
        await updatePatientWithConsolidatedExtensions(
          medplum,
          patient.id,
          consolidatedExtensions,
        )

        const extensionsRemoved =
          patient.extension.length - consolidatedExtensions.length
        totalExtensionsRemoved += extensionsRemoved
        totalPatientsWithDuplicates++

        console.log(
          `Extension consolidation completed for patient ${patient.id}:`,
          JSON.stringify(
            {
              patientId: patient.id,
              originalExtensionCount: patient.extension.length,
              consolidatedExtensionCount: consolidatedExtensions.length,
              extensionsRemoved,
              duplicateUrlsProcessed: duplicateUrls.length,
            },
            null,
            2,
          ),
        )
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error)
        console.log(
          `Extension consolidation failed for patient ${patient.id}: ${errorMessage}`,
        )
        // Continue processing other patients even if one fails
      }

      totalPatientsProcessed++
    }

    console.log(
      'Batch extension consolidation completed:',
      JSON.stringify(
        {
          totalPatientsProcessed,
          totalPatientsWithDuplicates,
          totalExtensionsRemoved,
          timeRange: {
            from: fiveMinutesAgo.toISOString(),
            to: oneMinuteAgo.toISOString(),
          },
        },
        null,
        2,
      ),
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.log(`Batch extension consolidation failed: ${errorMessage}`)
    throw error
  }
}
