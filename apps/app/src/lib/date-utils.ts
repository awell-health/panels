/**
 * Formats a date into a human-readable string based on its type:
 * - Full date & time: "MM-DD-YYYY h:mmam/pm"
 * - Date only: "MM-DD-YYYY"
 * - Time only: "h:mmam/pm"
 * @param date - The date to format (string, Date, null, or undefined)
 * @returns Formatted date string or empty string if date is invalid
 */
export const formatDateWithType = (
  date: string | Date | null | undefined,
): string => {
  if (!date) return ''

  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return String(date)

  // Check if it's a time-only value (hours and minutes are set, but date is 1970-01-01)
  const isTimeOnly =
    d.getFullYear() === 1970 && d.getMonth() === 0 && d.getDate() === 1

  // Check if it's a date-only value (time is 00:00:00)
  const isDateOnly =
    d.getHours() === 0 && d.getMinutes() === 0 && d.getSeconds() === 0

  if (isTimeOnly) {
    // Format time only
    return d.toLocaleString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  }

  if (isDateOnly) {
    // Format date only
    return d.toLocaleString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
    })
  }

  // Format full date and time
  return d.toLocaleString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

/**
 * Formats a date into a human-readable string in the format "MM-DD-YYYY h:mmam/pm"
 * @param date - The date to format (string, Date, null, or undefined)
 * @returns Formatted date string or empty string if date is invalid
 */
export const formatDate = (date: string | Date | null | undefined): string => {
  return formatDateWithType(date)
}
