'use server'

/**
 * Server-side Stytch authentication using the Node.js library
 *
 * To use this, install the Stytch Node.js library:
 * npm install stytch
 *
 * Then add these environment variables:
 * - STYTCH_PROJECT_ID
 * - STYTCH_SECRET
 * - STYTCH_PUBLIC_TOKEN
 */

import { cookies } from 'next/headers'

// Uncomment these imports after installing the Stytch Node.js library
// import { Stytch } from 'stytch'

/**
 * Get Stytch client for server-side operations
 * This requires the Stytch Node.js library to be installed
 */
// async function getStytchServerClient() {
//   const projectId = process.env.STYTCH_PROJECT_ID
//   const secret = process.env.STYTCH_SECRET
//   const publicToken = process.env.STYTCH_PUBLIC_TOKEN

//   if (!projectId || !secret || !publicToken) {
//     throw new Error('Stytch server-side credentials not configured')
//   }

//   return new Stytch({
//     project_id: projectId,
//     secret: secret,
//     public_token: publicToken,
//   })
// }

/**
 * Authenticate a session token server-side
 * This verifies the session with Stytch's servers
 */
// export async function authenticateSessionServerSide(): Promise<string | null> {
//   try {
//     const stytch = await getStytchServerClient()
//     const cookieStore = await cookies()
//     const stytchSession = cookieStore.get('stytch_session')

//     if (!stytchSession?.value) {
//       console.warn('No Stytch session cookie found')
//       return null
//     }

//     // Verify the session with Stytch server-side
//     const session = await stytch.sessions.authenticate({
//       session_token: stytchSession.value,
//     })

//     // Return the authenticated session token
//     return session.session_token
//   } catch (error) {
//     console.warn('Failed to authenticate session server-side:', error)
//     return null
//   }
// }

/**
 * Get user information from authenticated session
 */
// export async function getAuthenticatedUser() {
//   try {
//     const stytch = await getStytchServerClient()
//     const cookieStore = await cookies()
//     const stytchSession = cookieStore.get('stytch_session')

//     if (!stytchSession?.value) {
//       return null
//     }

//     const session = await stytch.sessions.authenticate({
//       session_token: stytchSession.value,
//     })

//     return session.user
//   } catch (error) {
//     console.warn('Failed to get authenticated user:', error)
//     return null
//   }
// }

/**
 * Placeholder function that returns null
 * Replace this with the actual implementation after installing Stytch Node.js library
 */
export async function authenticateSessionServerSide(): Promise<string | null> {
  console.warn(
    'Stytch Node.js library not installed. Install with: npm install stytch',
  )
  return null
}

export async function getAuthenticatedUser() {
  console.warn(
    'Stytch Node.js library not installed. Install with: npm install stytch',
  )
  return null
}
