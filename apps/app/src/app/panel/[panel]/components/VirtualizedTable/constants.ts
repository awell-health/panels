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
 * @param isHeader - Whether this is for header calculation (includes UI elements)
 * @returns Calculated width in pixels
 */
export function calculateColumnWidthByTitle(
  title: string,
  type: Column['type'],
  isHeader = false,
): number {
  if (!title) {
    return COLUMN_MIN_WIDTH_MAPPING[type] || COLUMN_MIN_WIDTH_MAPPING.text
  }

  // Calculate width based on title length
  const titleWidth = title.length * AVERAGE_CHAR_WIDTH

  if (isHeader) {
    // Header-specific calculation that accounts for all UI elements
    const DRAG_HANDLE_WIDTH = 20 // Drag handle/lock icon + margins
    const TYPE_ICON_WIDTH = 20 // Type icon + margin
    const SORT_ICON_WIDTH = 20 // Sort indicator + margin
    const MENU_BUTTON_WIDTH = 30 // Menu button (filter icon + more icon + padding)
    const HEADER_PADDING = 16 // Left + right padding for header
    const HEADER_BUFFER = 4 // Extra buffer for header layout

    const totalHeaderWidth =
      titleWidth +
      DRAG_HANDLE_WIDTH +
      TYPE_ICON_WIDTH +
      SORT_ICON_WIDTH +
      MENU_BUTTON_WIDTH +
      HEADER_PADDING +
      HEADER_BUFFER

    // Get minimum width for this column type, but ensure it's enough for header content
    const minWidth = Math.max(
      COLUMN_MIN_WIDTH_MAPPING[type] || COLUMN_MIN_WIDTH_MAPPING.text,
      DRAG_HANDLE_WIDTH +
        TYPE_ICON_WIDTH +
        SORT_ICON_WIDTH +
        MENU_BUTTON_WIDTH +
        HEADER_PADDING +
        HEADER_BUFFER,
    )

    return Math.max(
      Math.min(totalHeaderWidth, MAX_COLUMN_WIDTH),
      Math.max(minWidth, MIN_COLUMN_WIDTH),
    )
  }
  // Original calculation for data cells
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

/**
 * Determine if content should be truncated based on available column width
 * @param content - The text content to check
 * @param availableWidth - Available width in pixels
 * @param padding - Padding to account for (default 32px from PADDING_WIDTH)
 * @returns Object with shouldTruncate boolean and maxLength if truncation needed
 */
export function shouldTruncateContent(
  content: string,
  availableWidth: number,
  padding = 32,
): { shouldTruncate: boolean; maxLength?: number } {
  if (!content) return { shouldTruncate: false }

  const usableWidth = availableWidth - padding
  const estimatedContentWidth = content.length * AVERAGE_CHAR_WIDTH

  if (estimatedContentWidth <= usableWidth) {
    return { shouldTruncate: false }
  }

  const maxLength = Math.floor(usableWidth / AVERAGE_CHAR_WIDTH)
  return { shouldTruncate: true, maxLength: Math.max(maxLength, 10) }
}
