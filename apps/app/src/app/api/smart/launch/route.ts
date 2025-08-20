import { NextRequest, NextResponse } from 'next/server'
import { discoverSmartConfiguration } from '@/lib/smart-on-fhir/discovery'
import { generatePKCE, generateState } from '@/lib/smart-on-fhir/pkce'
import { smartSessionStore } from '@/lib/smart-on-fhir/session-store'

const SMART_SCOPES = [
  'launch',
  'openid',
  'fhirUser',
  'launch/patient',
  'launch/encounter',
  'patient/*.read'
].join(' ')

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const iss = searchParams.get('iss')
    const launch = searchParams.get('launch')

    if (!iss) {
      return NextResponse.json(
        { error: 'Missing required parameter: iss' },
        { status: 400 }
      )
    }

    if (!launch) {
      return NextResponse.json(
        { error: 'Missing required parameter: launch' },
        { status: 400 }
      )
    }

    const smartConfig = await discoverSmartConfiguration(iss)

    const pkce = generatePKCE()
    const state = generateState()

    smartSessionStore.storeSession(state, {
      iss,
      launch,
      code_verifier: pkce.verifier,
      authorization_endpoint: smartConfig.authorization_endpoint,
      token_endpoint: smartConfig.token_endpoint,
      jwks_uri: smartConfig.jwks_uri,
      created_at: Date.now()
    })

    const authUrl = new URL(smartConfig.authorization_endpoint)
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('client_id', process.env.SMART_CLIENT_ID || '')
    authUrl.searchParams.set('redirect_uri', process.env.SMART_REDIRECT_URI || `${request.nextUrl.origin}/api/smart/callback`)
    authUrl.searchParams.set('scope', SMART_SCOPES)
    authUrl.searchParams.set('aud', iss)
    authUrl.searchParams.set('state', state)
    authUrl.searchParams.set('launch', launch)
    authUrl.searchParams.set('code_challenge', pkce.challenge)
    authUrl.searchParams.set('code_challenge_method', pkce.method)

    return NextResponse.redirect(authUrl.toString())

  } catch (error) {
    console.error('SMART launch error:', error)
    return NextResponse.json(
      { 
        error: 'SMART launch failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
