export function parseJwtPayload<T = Record<string, unknown>>(jwt: string): T | undefined {
  const parts = jwt.split('.')
  if (parts.length < 2) return undefined
  try {
    const payload = parts[1]
    const json = Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
    return JSON.parse(json) as T
  } catch {
    return undefined
  }
}

export function parseIdTokenFhirUser(idToken?: string): string | undefined {
  if (!idToken) return undefined
  const payload = parseJwtPayload<Record<string, unknown>>(idToken)
  if (!payload) return undefined
  const fhirUser = (payload['fhirUser'] as string) || (payload['profile'] as string) || (payload['sub'] as string)
  return typeof fhirUser === 'string' ? fhirUser : undefined
}

