import type { Extension } from '@medplum/fhirtypes'

/**
 * Recursively merges extensions, replacing existing ones that have matching URLs
 * with new ones, while preserving non-conflicting extensions.
 *
 * For extensions with nested extensions, recursively merges those as well.
 * This handles arbitrary levels of nesting.
 *
 * Example:
 * - existing: [{url: "age", value: "30"}, {url: "name", value: "John"}]
 * - new: [{url: "age", value: "31"}]
 * - result: [{url: "name", value: "John"}, {url: "age", value: "31"}]
 */
export function mergeExtensions(
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
