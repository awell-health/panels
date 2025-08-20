import { NextRequest, NextResponse } from 'next/server'
import { makePkce } from '../../../lib/pkce'
import { generateOpaqueId, putTempState } from '../../../lib/store'
export const runtime = 'nodejs'

const SCOPES = 'launch openid fhirUser launch/patient launch/encounter patient/*.read'

function isValidUrl(maybeUrl: string): boolean {
  try {
    const u = new URL(maybeUrl)
    return u.protocol === 'https:' || u.hostname === 'localhost'
  } catch {
    return false
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const iss = searchParams.get('iss') || ''
  const launch = searchParams.get('launch') || undefined

  if (!iss || !isValidUrl(iss)) {
    return NextResponse.json({ error: 'invalid_iss', message: 'Missing or invalid iss' }, { status: 400 })
  }

  const clientId = process.env.SMART_CLIENT_ID
  const redirectUri = process.env.SMART_REDIRECT_URI
  if (!clientId || !redirectUri) {
    return NextResponse.json({ error: 'server_misconfig', message: 'Missing SMART env vars' }, { status: 500 })
  }

  // SMART discovery
  const wellKnownUrl = `${iss.replace(/\/$/, '')}/.well-known/smart-configuration`
  const discovery = await fetch(wellKnownUrl, { headers: { Accept: 'application/json' } })
  if (!discovery.ok) {
    return NextResponse.json({ error: 'discovery_failed', status: discovery.status }, { status: 502 })
  }
  const { authorization_endpoint, token_endpoint } = await discovery.json()
  if (!authorization_endpoint || !token_endpoint) {
    return NextResponse.json({ error: 'invalid_discovery' }, { status: 502 })
  }

  // PKCE + state
  const { verifier, challenge } = makePkce()
  const state = generateOpaqueId(16)
  putTempState(state, {
    iss,
    launch,
    codeVerifier: verifier,
    authorizationEndpoint: authorization_endpoint,
    tokenEndpoint: token_endpoint,
    ttlMs: 10 * 60 * 1000,
  })

  const authUrl = new URL(authorization_endpoint as string)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('scope', SCOPES)
  authUrl.searchParams.set('aud', iss)
  authUrl.searchParams.set('state', state)
  if (launch) authUrl.searchParams.set('launch', launch)
  authUrl.searchParams.set('code_challenge', challenge)
  authUrl.searchParams.set('code_challenge_method', 'S256')

  return NextResponse.redirect(authUrl.toString())
}

