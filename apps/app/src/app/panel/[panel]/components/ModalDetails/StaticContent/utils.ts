export function calculateAge(dateString: string): number {
  const birthDate = new Date(dateString)
  const today = new Date()

  return today.getFullYear() - birthDate.getFullYear()
}

export const isJSON = (str: string): boolean => {
  if (typeof str !== 'string') return false
  try {
    JSON.parse(str)
    return true
  } catch {
    return false
  }
}

// More comprehensive isObject function
// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export const isObject = (value: any): boolean => {
  // Check if value is null (typeof null === 'object' in JavaScript)
  if (value === null) return false

  // Check if it's an object type
  if (typeof value !== 'object') return false

  // Check if it's not an array
  if (Array.isArray(value)) return false

  // Check if it's not a Date, RegExp, or other built-in objects if you want to exclude them
  // if (value instanceof Date) return false;
  // if (value instanceof RegExp) return false;

  return true
}
