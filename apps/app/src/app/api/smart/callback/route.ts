import { NextRequest, NextResponse } from 'next/server'
import { smartSessionStore } from '@/lib/smart-on-fhir/session-store'
import { extractFhirUser } from '@/lib/smart-on-fhir/jwt-utils'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    if (error) {
      return NextResponse.json(
        { 
          error: 'Authorization failed',
          details: searchParams.get('error_description') || error
        },
        { status: 400 }
      )
    }

    if (!code || !state) {
      return NextResponse.json(
        { error: 'Missing required parameters: code and state' },
        { status: 400 }
      )
    }

    const session = smartSessionStore.getAndRemoveSession(state)
    if (!session) {
      return NextResponse.json(
        { error: 'Invalid or expired state parameter' },
        { status: 400 }
      )
    }

    const tokenResponse = await fetch(session.token_endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: process.env.SMART_REDIRECT_URI || `${request.nextUrl.origin}/api/smart/callback`,
        client_id: process.env.SMART_CLIENT_ID || '',
        code_verifier: session.code_verifier
      })
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error('Token exchange failed:', errorText)
      return NextResponse.json(
        { 
          error: 'Token exchange failed',
          details: `HTTP ${tokenResponse.status}: ${errorText}`
        },
        { status: 500 }
      )
    }

    const tokens = await tokenResponse.json()

    let fhirUser: string | undefined
    if (tokens.id_token) {
      fhirUser = extractFhirUser(tokens.id_token)
    }

    const sessionId = `smart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    smartSessionStore.storeTokens(sessionId, {
      ...tokens,
      fhirUser,
      iss: session.iss
    })

    const redirectUrl = new URL(`${request.nextUrl.origin}/demo/context`)
    redirectUrl.searchParams.set('session', sessionId)
    
    const response = NextResponse.redirect(redirectUrl.toString())
    
    response.cookies.set('smart_session', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: tokens.expires_in ? tokens.expires_in : 3600 // 1 hour default
    })

    return response

  } catch (error) {
    console.error('SMART callback error:', error)
    return NextResponse.json(
      { 
        error: 'SMART callback failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
