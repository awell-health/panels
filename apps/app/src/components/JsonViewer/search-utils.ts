import type { SearchMatch } from './types'

// Find all search matches in JSON data
export const findSearchMatches = (
  data: unknown,
  searchTerm: string,
  searchMode: 'key' | 'value' | 'both',
  path: string[] = [],
): SearchMatch[] => {
  if (!searchTerm.trim()) {
    return []
  }

  const normalizedSearchTerm = searchTerm.toLowerCase().trim()
  const matches: SearchMatch[] = []

  const searchRecursive = (obj: unknown, currentPath: string[]): void => {
    if (typeof obj === 'string') {
      if (
        searchMode !== 'key' &&
        obj.toLowerCase().includes(normalizedSearchTerm)
      ) {
        matches.push({
          path: currentPath,
          type: 'value',
          startIndex: 0,
          endIndex: obj.length,
          value: obj,
        })
      }
      return
    }

    if (typeof obj === 'number' || typeof obj === 'boolean') {
      const strValue = String(obj)
      if (
        searchMode !== 'key' &&
        strValue.toLowerCase().includes(normalizedSearchTerm)
      ) {
        matches.push({
          path: currentPath,
          type: 'value',
          startIndex: 0,
          endIndex: strValue.length,
          value: strValue,
        })
      }
      return
    }

    if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        searchRecursive(item, [...currentPath, index.toString()])
      })
      return
    }

    if (typeof obj === 'object' && obj !== null) {
      for (const [key, value] of Object.entries(obj)) {
        const newPath = [...currentPath, key]

        // Check if key matches
        if (
          searchMode !== 'value' &&
          key.toLowerCase().includes(normalizedSearchTerm)
        ) {
          matches.push({
            path: currentPath,
            type: 'key',
            startIndex: 0,
            endIndex: key.length,
            value: key,
          })
        }

        // Recursively search value
        searchRecursive(value, newPath)
      }
    }
  }

  searchRecursive(data, path)
  return matches
}

// Check if a specific path contains any matches
export const pathContainsMatches = (
  path: string[],
  matches: SearchMatch[],
): boolean => {
  return matches.some((match) => {
    // Check if this path is a prefix of any match path
    if (match.path.length < path.length) {
      return false
    }

    for (let i = 0; i < path.length; i++) {
      if (match.path[i] !== path[i]) {
        return false
      }
    }
    return true
  })
}

// Check if a specific path has direct matches (not just nested)
export const pathHasDirectMatches = (
  path: string[],
  matches: SearchMatch[],
): boolean => {
  return matches.some((match) => {
    // Check if this path exactly matches any match path
    if (match.path.length !== path.length) {
      return false
    }

    for (let i = 0; i < path.length; i++) {
      if (match.path[i] !== path[i]) {
        return false
      }
    }
    return true
  })
}

// Get matches for a specific path
export const getMatchesForPath = (
  path: string[],
  matches: SearchMatch[],
): SearchMatch[] => {
  return matches.filter((match) => {
    if (match.path.length !== path.length) {
      return false
    }

    for (let i = 0; i < path.length; i++) {
      if (match.path[i] !== path[i]) {
        return false
      }
    }
    return true
  })
}

// Determine if a node should be auto-expanded based on search matches
export const shouldAutoExpand = (
  path: string[],
  matches: SearchMatch[],
  autoCollapse: boolean,
): boolean => {
  if (!autoCollapse) {
    return true
  }

  return pathContainsMatches(path, matches)
}

// Highlight text with search term
export const highlightText = (
  text: string,
  searchTerm: string,
  type: 'key' | 'value' | 'both',
): { text: string; isHighlighted: boolean } => {
  if (!searchTerm.trim() || type === 'key') {
    return { text, isHighlighted: false }
  }

  const normalizedSearchTerm = searchTerm.toLowerCase().trim()
  const normalizedText = text.toLowerCase()
  const index = normalizedText.indexOf(normalizedSearchTerm)

  if (index === -1) {
    return { text, isHighlighted: false }
  }

  return { text, isHighlighted: true }
}

// Get CSS classes for highlighting
export const getHighlightClasses = (
  type: 'key' | 'value' | 'both',
  isHighlighted: boolean,
): string => {
  if (!isHighlighted) {
    return ''
  }

  switch (type) {
    case 'key':
      return 'bg-blue-100 text-blue-800 px-1 rounded'
    case 'value':
      return 'bg-green-100 text-green-800 px-1 rounded'
    case 'both':
      return 'bg-orange-100 text-orange-800 px-1 rounded'
    default:
      return ''
  }
}
