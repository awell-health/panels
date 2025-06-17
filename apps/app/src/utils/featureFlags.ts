// Feature flags for controlling new functionality
// This makes it easy to revert changes by simply setting flags to false

export const FEATURE_FLAGS = {
  // Enable search functionality in additional information sections
  ENABLE_ADDITIONAL_INFO_SEARCH: true,

  // Enable search functionality in extension details
  ENABLE_EXTENSION_SEARCH: true,
} as const

export type FeatureFlag = keyof typeof FEATURE_FLAGS

export function isFeatureEnabled(flag: FeatureFlag): boolean {
  return FEATURE_FLAGS[flag]
}
