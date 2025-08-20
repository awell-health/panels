# SMART on FHIR v1 — Agent Implementation Guide (R4, Cerner Millennium)

This app implements a minimal, production-ready SMART App Launch v1 flow for Oracle Health (Cerner Millennium).

## Endpoints

- GET `/smart/launch` — discovery and redirect with PKCE
- GET `/smart/callback` — token exchange, session creation
- GET `/demo/context` — shows launch context and probes `Patient/{patient}`

## Environment

- `SMART_CLIENT_ID`
- `SMART_REDIRECT_URI`

## Notes

- Public client with PKCE; no secret in browser
- Runtime discovery from `{iss}/.well-known/smart-configuration`
- Access tokens stored server-side only
- Basic id_token parsing to extract `fhirUser` (no signature verification in v1)