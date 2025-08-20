export interface SmartConfiguration {
  authorization_endpoint: string
  token_endpoint: string
  jwks_uri?: string
  scopes_supported?: string[]
  response_types_supported?: string[]
  capabilities?: string[]
}

/**
 * Discover SMART on FHIR configuration from FHIR server
 * @param iss FHIR server base URL
 * @returns SMART configuration
 */
export async function discoverSmartConfiguration(iss: string): Promise<SmartConfiguration> {
  if (!iss || !isValidUrl(iss)) {
    throw new Error('Invalid iss parameter: must be a valid URL')
  }

  const wellKnownUrl = `${iss.replace(/\/$/, '')}/.well-known/smart-configuration`
  
  try {
    const response = await fetch(wellKnownUrl, {
      headers: {
        'Accept': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch SMART configuration: ${response.status} ${response.statusText}`)
    }

    const config = await response.json() as SmartConfiguration

    if (!config.authorization_endpoint || !config.token_endpoint) {
      throw new Error('Invalid SMART configuration: missing required endpoints')
    }

    return config
  } catch (error) {
    console.error('SMART discovery failed:', error)
    throw new Error(`SMART discovery failed for ${iss}: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Validate URL format
 * @param url URL to validate
 * @returns true if valid URL
 */
function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}
