// Feature flags for controlling new functionality
// This makes it easy to revert changes by simply setting flags to false

export const FEATURE_FLAGS = {
  // Enable search functionality in additional information sections
  ENABLE_ADDITIONAL_INFO_SEARCH: true,

  // Enable search functionality in extension details
  ENABLE_EXTENSION_SEARCH: true,

  // Use JSON viewer for displaying extensions
  USE_JSON_VIEWER_FOR_EXTENSIONS: false,

  // Use enhanced JSON viewer with recursive parsing
  USE_ENHANCED_JSON_VIEWER: false,

  // Use simplified JSON viewer without decorative icons
  USE_SIMPLIFIED_JSON_VIEWER: true,

  // Use enhanced JSON search highlighting with smart collapsing
  USE_ENHANCED_JSON_SEARCH_HIGHLIGHTING: true,

  // Enable reactive data storage with TinyBase
  ENABLE_REACTIVE_DATA_STORAGE: true,
} as const

export type FeatureFlag = keyof typeof FEATURE_FLAGS

export function isFeatureEnabled(flag: FeatureFlag): boolean {
  return FEATURE_FLAGS[flag]
}
