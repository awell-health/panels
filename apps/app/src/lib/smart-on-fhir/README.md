# SMART on FHIR Implementation

This directory contains the implementation of SMART on FHIR v1 for Cerner Millennium integration.

## Overview

The implementation provides a minimal-yet-production-grade SMART on FHIR app that:
- Launches in-context from Cerner (Millennium) using SMART App Launch with Auth Code + PKCE
- Discovers auth endpoints from `iss` (no hardcoding)
- Exchanges authorization code for access tokens
- Renders a context page showing launch context and patient data
- Fetches patient data from FHIR server to prove access

## Architecture

### Endpoints

- **GET /api/smart/launch** - Receives `iss` and `launch` parameters, performs SMART discovery, redirects to authorization endpoint with PKCE
- **GET /api/smart/callback** - Handles OAuth callback, exchanges code for tokens, creates session
- **GET /demo/context** - Displays launch context and fetches patient data

### Core Components

- **pkce.ts** - PKCE challenge/verifier generation and state management
- **discovery.ts** - SMART configuration discovery from `{iss}/.well-known/smart-configuration`
- **session-store.ts** - In-memory session storage for SMART state and tokens
- **jwt-utils.ts** - ID token parsing and fhirUser extraction

## Security Features

- **PKCE (Proof Key for Code Exchange)** - Uses SHA256 code challenge method
- **Server-side token storage** - Access tokens never exposed to client
- **State parameter validation** - CSRF protection with cryptographically secure state
- **Short-lived session storage** - Temporary state storage with TTL

## Configuration

Required environment variables:

```bash
SMART_CLIENT_ID=your-smart-client-id
SMART_REDIRECT_URI=http://localhost:3000/api/smart/callback
DEMO_FHIR_BASE_URL=https://fhir-ehr-code.cerner.com/r4/ec2458f2-1e24-41c8-b71b-0e701af7583d
```

## SMART Scopes

The implementation requests these scopes:
- `launch` - Basic launch capability
- `openid` - OIDC identity token
- `fhirUser` - Clinician identity in FHIR format
- `launch/patient` - Patient context from launch
- `launch/encounter` - Encounter context from launch
- `patient/*.read` - Read access to patient resources

## Testing

To test the SMART launch flow:

1. Start the development server: `pnpm run dev`
2. Simulate a launch from EHR by visiting:
   ```
   http://localhost:3000/api/smart/launch?iss=https://fhir-ehr-code.cerner.com/r4/ec2458f2-1e24-41c8-b71b-0e701af7583d&launch=test-launch-token
   ```
3. Follow the OAuth flow through to the context page

## Production Considerations

For production deployment:
- Replace in-memory session store with Redis or database
- Implement proper JWT signature verification
- Add structured logging with PII scrubbing
- Implement token refresh handling
- Add rate limiting on SMART endpoints
- Validate `iss` against allowlist of known FHIR servers

## Compliance

This implementation follows:
- SMART App Launch Framework v1.0
- FHIR R4 specification
- OAuth 2.0 with PKCE (RFC 7636)
- OpenID Connect Core 1.0
