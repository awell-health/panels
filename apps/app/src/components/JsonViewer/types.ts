export type JsonViewerMode = 'view' | 'json'

export interface JsonViewerProps {
  data: string | object
  title?: string
  defaultMode?: JsonViewerMode
  onModeChange?: (mode: JsonViewerMode) => void
  className?: string
  isExpanded?: boolean
  // Search highlighting props
  searchTerm?: string
  searchMode?: 'key' | 'value' | 'both'
  highlightMatches?: boolean
  autoCollapse?: boolean
}

export interface JsonViewModeProps {
  data: object
  level?: number
  isExpanded?: boolean
  onToggle?: () => void
  // Search highlighting props
  searchTerm?: string
  searchMode?: 'key' | 'value' | 'both'
  highlightMatches?: boolean
  autoCollapse?: boolean
  path?: string[]
}

export interface JsonRawModeProps {
  data: object
  className?: string
  // Search highlighting props
  searchTerm?: string
  searchMode?: 'key' | 'value' | 'both'
  highlightMatches?: boolean
}

export interface JsonToggleProps {
  mode: JsonViewerMode
  onChange: (mode: JsonViewerMode) => void
  className?: string
}

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonObject
  | JsonArray

export interface JsonObject {
  [key: string]: JsonValue
}

export type JsonArray = JsonValue[]

// Search highlighting types
export interface SearchMatch {
  path: string[]
  type: 'key' | 'value' | 'both'
  startIndex: number
  endIndex: number
  value: string
}

export interface HighlightedJsonProps {
  data: unknown
  searchTerm?: string
  searchMode?: 'key' | 'value' | 'both'
  highlightMatches?: boolean
  autoCollapse?: boolean
  className?: string
  isExpanded?: boolean
  onToggle?: () => void
  level?: number
  path?: string[]
}
