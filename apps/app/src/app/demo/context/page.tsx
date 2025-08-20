import { cookies } from 'next/headers'
import { smartSessionStore } from '@/lib/smart-on-fhir/session-store'
import { redirect } from 'next/navigation'

interface PatientData {
  id?: string
  name?: Array<{
    given?: string[]
    family?: string
  }>
  birthDate?: string
  gender?: string
  telecom?: Array<{
    system?: string
    value?: string
  }>
}

async function fetchPatientData(iss: string, patientId: string, accessToken: string): Promise<PatientData | null> {
  try {
    const response = await fetch(`${iss}/Patient/${patientId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/fhir+json'
      }
    })

    if (!response.ok) {
      console.error(`Failed to fetch patient data: ${response.status} ${response.statusText}`)
      return null
    }

    return await response.json()
  } catch (error) {
    console.error('Error fetching patient data:', error)
    return null
  }
}

interface SmartContextPageProps {
  searchParams: { session?: string }
}

export default async function SmartContextPage({ searchParams }: SmartContextPageProps) {
  const cookieStore = await cookies()
  const sessionId = searchParams.session || cookieStore.get('smart_session')?.value

  if (!sessionId) {
    redirect('/api/smart/launch?error=no_session')
  }

  const tokens = smartSessionStore.getTokens(sessionId)
  if (!tokens) {
    redirect('/api/smart/launch?error=invalid_session')
  }

  const contextData = {
    iss: tokens.iss || 'Unknown',
    patient: tokens.patient,
    encounter: tokens.encounter,
    fhirUser: tokens.fhirUser,
    scopes: tokens.scope?.split(' ') || [],
    tokenType: tokens.token_type,
    expiresIn: tokens.expires_in
  }

  let patientData: PatientData | null = null
  if (tokens.patient && tokens.access_token && tokens.iss) {
    patientData = await fetchPatientData(tokens.iss, tokens.patient, tokens.access_token)
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="bg-white shadow-lg rounded-lg p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          SMART on FHIR Context Demo
        </h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Context Information */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h2 className="text-xl font-semibold text-blue-900 mb-4">
              Launch Context
            </h2>
            <dl className="space-y-2">
              <div>
                <dt className="font-medium text-gray-700">FHIR Server (iss):</dt>
                <dd className="text-gray-900 font-mono text-sm break-all">
                  {contextData.iss}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-gray-700">Patient ID:</dt>
                <dd className="text-gray-900 font-mono">
                  {contextData.patient || 'Not provided'}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-gray-700">Encounter ID:</dt>
                <dd className="text-gray-900 font-mono">
                  {contextData.encounter || 'Not provided'}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-gray-700">FHIR User:</dt>
                <dd className="text-gray-900 font-mono text-sm break-all">
                  {contextData.fhirUser || 'Not provided'}
                </dd>
              </div>
            </dl>
          </div>

          {/* Token Information */}
          <div className="bg-green-50 p-4 rounded-lg">
            <h2 className="text-xl font-semibold text-green-900 mb-4">
              Token Information
            </h2>
            <dl className="space-y-2">
              <div>
                <dt className="font-medium text-gray-700">Token Type:</dt>
                <dd className="text-gray-900">{contextData.tokenType}</dd>
              </div>
              <div>
                <dt className="font-medium text-gray-700">Expires In:</dt>
                <dd className="text-gray-900">
                  {contextData.expiresIn ? `${contextData.expiresIn} seconds` : 'Not specified'}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-gray-700">Granted Scopes:</dt>
                <dd className="text-gray-900">
                  <div className="flex flex-wrap gap-1 mt-1">
                    {contextData.scopes.map((scope, index) => (
                      <span
                        key={index}
                        className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs"
                      >
                        {scope}
                      </span>
                    ))}
                  </div>
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Patient Data */}
        {patientData && (
          <div className="mt-6 bg-purple-50 p-4 rounded-lg">
            <h2 className="text-xl font-semibold text-purple-900 mb-4">
              Patient Data (FHIR API Call Result)
            </h2>
            <dl className="space-y-2">
              <div>
                <dt className="font-medium text-gray-700">Patient ID:</dt>
                <dd className="text-gray-900 font-mono">{patientData.id}</dd>
              </div>
              {patientData.name && patientData.name[0] && (
                <div>
                  <dt className="font-medium text-gray-700">Name:</dt>
                  <dd className="text-gray-900">
                    {patientData.name[0].given?.join(' ')} {patientData.name[0].family}
                  </dd>
                </div>
              )}
              {patientData.birthDate && (
                <div>
                  <dt className="font-medium text-gray-700">Birth Date:</dt>
                  <dd className="text-gray-900">{patientData.birthDate}</dd>
                </div>
              )}
              {patientData.gender && (
                <div>
                  <dt className="font-medium text-gray-700">Gender:</dt>
                  <dd className="text-gray-900 capitalize">{patientData.gender}</dd>
                </div>
              )}
            </dl>
          </div>
        )}

        {/* Error State */}
        {tokens.patient && !patientData && (
          <div className="mt-6 bg-red-50 p-4 rounded-lg">
            <h2 className="text-xl font-semibold text-red-900 mb-2">
              Patient Data Fetch Failed
            </h2>
            <p className="text-red-700">
              Unable to fetch patient data from the FHIR server. This could be due to:
            </p>
            <ul className="list-disc list-inside text-red-700 mt-2">
              <li>Network connectivity issues</li>
              <li>Invalid or expired access token</li>
              <li>Insufficient permissions</li>
              <li>FHIR server configuration issues</li>
            </ul>
          </div>
        )}

        {/* Success Indicator */}
        <div className="mt-6 bg-gray-50 p-4 rounded-lg">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            ✅ SMART on FHIR Integration Status
          </h2>
          <p className="text-gray-700">
            Successfully completed SMART App Launch flow with PKCE authentication.
            The app has been launched in-context from the EHR and received the necessary
            tokens and context information.
          </p>
        </div>
      </div>
    </div>
  )
}
