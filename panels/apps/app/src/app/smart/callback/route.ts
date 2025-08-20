import { NextRequest, NextResponse } from 'next/server'
import { createSession, deleteTempState, getTempState } from '../../../lib/store'
import { parseIdTokenFhirUser } from '../../../lib/jwt'
export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')

  if (!code || !state) {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 })
  }

  const temp = getTempState(state)
  if (!temp) {
    return NextResponse.json({ error: 'invalid_state' }, { status: 400 })
  }

  const clientId = process.env.SMART_CLIENT_ID
  const redirectUri = process.env.SMART_REDIRECT_URI
  if (!clientId || !redirectUri) {
    return NextResponse.json({ error: 'server_misconfig' }, { status: 500 })
  }

  const tokenEndpoint = temp.tokenEndpoint as string
  const form = new URLSearchParams()
  form.set('grant_type', 'authorization_code')
  form.set('code', code)
  form.set('redirect_uri', redirectUri)
  form.set('client_id', clientId)
  form.set('code_verifier', temp.codeVerifier)

  const tokenRes = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  })

  if (!tokenRes.ok) {
    deleteTempState(state)
    return NextResponse.json({ error: 'token_exchange_failed', status: tokenRes.status }, { status: 502 })
  }

  const tokenJson = (await tokenRes.json()) as Record<string, unknown>
  const accessToken = tokenJson['access_token'] as string
  const scope = (tokenJson['scope'] as string) || ''
  const idToken = tokenJson['id_token'] as string | undefined
  const patient = tokenJson['patient'] as string | undefined
  const encounter = tokenJson['encounter'] as string | undefined
  const expiresIn = tokenJson['expires_in'] as number | undefined

  if (!accessToken) {
    deleteTempState(state)
    return NextResponse.json({ error: 'invalid_token_response' }, { status: 502 })
  }

  const fhirUser = parseIdTokenFhirUser(idToken)

  const session = createSession({
    iss: temp.iss,
    accessToken,
    scope,
    idToken,
    fhirUser,
    patient,
    encounter,
    expiresAt: expiresIn ? Date.now() + expiresIn * 1000 : undefined,
  })

  deleteTempState(state)

  // Set HTTP-only cookie with session id
  const res = NextResponse.redirect(new URL('/demo/context', url.origin))
  res.cookies.set('sid', session.sid, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60, // 1h
  })
  return res
}

