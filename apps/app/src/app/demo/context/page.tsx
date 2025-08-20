import { cookies } from 'next/headers'
import { getSession } from '../../../lib/store'

async function fetchPatient(iss: string, patientId: string, accessToken: string): Promise<any | { error: string; status?: number }> {
  const url = `${iss.replace(/\/$/, '')}/Patient/${encodeURIComponent(patientId)}`
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/fhir+json',
    },
    cache: 'no-store',
  })
  if (!res.ok) {
    return { error: 'request_failed', status: res.status }
  }
  return res.json()
}

export default async function Page() {
  const cookieStore = await cookies()
  const sid = cookieStore.get('sid')?.value
  const session = sid ? getSession(sid) : undefined

  const context = {
    iss: session?.iss,
    scopes: session?.scope,
    patient: session?.patient,
    encounter: session?.encounter,
    fhirUser: session?.fhirUser,
  }

  let patientData: any | undefined
  if (session?.iss && session?.accessToken && session?.patient) {
    try {
      patientData = await fetchPatient(session.iss, session.patient, session.accessToken)
    } catch (e) {
      patientData = { error: 'network_error' }
    }
  }

  return (
    <div style={{ padding: 24, fontFamily: 'sans-serif' }}>
      <h2>SMART Context</h2>
      <pre>{JSON.stringify(context, null, 2)}</pre>
      <h3>Patient Probe</h3>
      {patientData ? (
        <pre>{JSON.stringify(
          typeof patientData === 'object' && 'resourceType' in (patientData as any)
            ? {
                id: (patientData as any).id,
                name: (patientData as any).name?.[0]?.text || (patientData as any).name?.[0]?.given?.[0] || undefined,
                birthDate: (patientData as any).birthDate,
              }
            : patientData,
          null,
          2,
        )}</pre>
      ) : (
        <p>No patient context or not fetched.</p>
      )}
    </div>
  )
}

