export interface SmartSession {
  iss: string
  launch: string
  code_verifier: string
  authorization_endpoint: string
  token_endpoint: string
  jwks_uri?: string
  created_at: number
}

export interface SmartTokens {
  access_token: string
  token_type: string
  scope: string
  expires_in?: number
  id_token?: string
  patient?: string
  encounter?: string
  refresh_token?: string
  fhirUser?: string
  iss?: string
}

/**
 * In-memory session store for SMART on FHIR state
 * In production, this should be replaced with Redis or database storage
 */
class SmartSessionStore {
  private sessions = new Map<string, SmartSession>()
  private tokens = new Map<string, SmartTokens>()
  private readonly TTL = 10 * 60 * 1000 // 10 minutes

  /**
   * Store SMART session data keyed by state
   */
  storeSession(state: string, session: SmartSession): void {
    this.sessions.set(state, {
      ...session,
      created_at: Date.now()
    })

    this.cleanupExpiredSessions()
  }

  /**
   * Retrieve and remove SMART session data by state
   */
  getAndRemoveSession(state: string): SmartSession | null {
    const session = this.sessions.get(state)
    if (!session) {
      return null
    }

    if (Date.now() - session.created_at > this.TTL) {
      this.sessions.delete(state)
      return null
    }

    this.sessions.delete(state)
    return session
  }

  /**
   * Store tokens for a session
   */
  storeTokens(sessionId: string, tokens: SmartTokens): void {
    this.tokens.set(sessionId, tokens)
  }

  /**
   * Retrieve tokens for a session
   */
  getTokens(sessionId: string): SmartTokens | null {
    return this.tokens.get(sessionId) || null
  }

  /**
   * Remove tokens for a session
   */
  removeTokens(sessionId: string): void {
    this.tokens.delete(sessionId)
  }

  /**
   * Clean up expired sessions
   */
  private cleanupExpiredSessions(): void {
    const now = Date.now()
    for (const [state, session] of this.sessions.entries()) {
      if (now - session.created_at > this.TTL) {
        this.sessions.delete(state)
      }
    }
  }
}

export const smartSessionStore = new SmartSessionStore()
