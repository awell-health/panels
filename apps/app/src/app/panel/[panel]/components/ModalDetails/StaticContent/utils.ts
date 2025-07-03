export function calculateAge(dateString: string): number {
  const birthDate = new Date(dateString)
  const today = new Date()

  return today.getFullYear() - birthDate.getFullYear()
}
