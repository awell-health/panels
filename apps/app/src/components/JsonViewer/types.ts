export type JsonViewerMode = 'view' | 'json'

export interface JsonViewerProps {
  data: string | object
  title?: string
  defaultMode?: JsonViewerMode
  onModeChange?: (mode: JsonViewerMode) => void
  className?: string
  isExpanded?: boolean
}

export interface JsonViewModeProps {
  data: object
  level?: number
  isExpanded?: boolean
  onToggle?: () => void
}

export interface JsonRawModeProps {
  data: object
  className?: string
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
