import crypto from 'node:crypto'

function base64UrlEncode(buffer: Buffer): string {
  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

export type PkcePair = {
  verifier: string
  challenge: string
}

export function makePkce(): PkcePair {
  // Generate a verifier between 43 and 128 chars (URL-safe)
  let verifier: string
  do {
    const bytes = crypto.randomBytes(64)
    verifier = base64UrlEncode(bytes)
    if (verifier.length > 128) verifier = verifier.slice(0, 128)
  } while (verifier.length < 43)

  const challenge = base64UrlEncode(crypto.createHash('sha256').update(verifier).digest())
  return { verifier, challenge }
}

