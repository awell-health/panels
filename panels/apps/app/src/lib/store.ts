import crypto from 'node:crypto'

export type TempStateRecord = {
  iss: string
  launch?: string
  codeVerifier: string
  authorizationEndpoint?: string
  tokenEndpoint?: string
  createdAt: number
  ttlMs: number
}

export type SessionRecord = {
  sid: string
  iss: string
  accessToken: string
  scope: string
  expiresAt?: number
  patient?: string
  encounter?: string
  idToken?: string
  fhirUser?: string
}

const tempStore = new Map<string, TempStateRecord>()
const sessionStore = new Map<string, SessionRecord>()

function now(): number {
  return Date.now()
}

function pruneTemp(): void {
  const t = now()
  for (const [key, rec] of tempStore.entries()) {
    if (t - rec.createdAt > rec.ttlMs) tempStore.delete(key)
  }
}

export function generateOpaqueId(bytes = 16): string {
  return crypto.randomBytes(bytes).toString('hex')
}

export function putTempState(state: string, record: Omit<TempStateRecord, 'createdAt'>): void {
  pruneTemp()
  tempStore.set(state, { ...record, createdAt: now() })
}

export function getTempState(state: string): TempStateRecord | undefined {
  pruneTemp()
  return tempStore.get(state)
}

export function deleteTempState(state: string): void {
  tempStore.delete(state)
}

export function createSession(rec: Omit<SessionRecord, 'sid'>): SessionRecord {
  const sid = generateOpaqueId(24)
  const session: SessionRecord = { ...rec, sid }
  sessionStore.set(sid, session)
  return session
}

export function getSession(sid: string): SessionRecord | undefined {
  return sessionStore.get(sid)
}

export function deleteSession(sid: string): void {
  sessionStore.delete(sid)
}

