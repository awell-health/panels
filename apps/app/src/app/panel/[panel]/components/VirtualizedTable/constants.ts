import type { Column } from '@/types/panel'

// Column width mapping based on column types - now used as minimum widths
export const COLUMN_MIN_WIDTH_MAPPING: Record<Column['type'], number> = {
  text: 120,
  number: 100,
  date: 120,
  datetime: 120,
  boolean: 80,
  select: 120,
  multi_select: 150,
  user: 140,
  file: 150,
  custom: 150,
}

// Text measurement constants
const AVERAGE_CHAR_WIDTH = 8 // Average character width in pixels
const PADDING_WIDTH = 32 // Left + right padding
const ICON_WIDTH = 20 // Sort icon width
const BUFFER_WIDTH = 32 // Extra buffer for comfortable reading

/**
 * Calculate column width based on title length and column type
 * @param title - The column title/name
 * @param type - The column type for minimum width constraints
 * @returns Calculated width in pixels
 */
export function calculateColumnWidthByTitle(
  title: string,
  type: Column['type'],
): number {
  if (!title) {
    return COLUMN_MIN_WIDTH_MAPPING[type] || COLUMN_MIN_WIDTH_MAPPING.text
  }

  // Calculate width based on title length
  const titleWidth = title.length * AVERAGE_CHAR_WIDTH
  const totalCalculatedWidth =
    titleWidth + PADDING_WIDTH + ICON_WIDTH + BUFFER_WIDTH

  // Get minimum width for this column type
  const minWidth =
    COLUMN_MIN_WIDTH_MAPPING[type] || COLUMN_MIN_WIDTH_MAPPING.text

  // Return the larger of calculated width or minimum width, capped at maximum
  return Math.max(
    Math.min(totalCalculatedWidth, MAX_COLUMN_WIDTH),
    Math.max(minWidth, MIN_COLUMN_WIDTH),
  )
}

// Dimension constants
export const MIN_COLUMN_WIDTH = 80
export const MAX_COLUMN_WIDTH = 400
export const SELECTION_COLUMN_WIDTH = 40
export const HEADER_HEIGHT = 40
export const ROW_HEIGHT = 40

// Default dimensions for initial render
export const DEFAULT_TABLE_WIDTH = 1200
export const DEFAULT_TABLE_HEIGHT = 600
