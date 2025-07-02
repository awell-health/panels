'use client'

import type { WorklistPatient } from '@/hooks/use-medplum-store'
import type React from 'react'

// biome-ignore lint/suspicious/noExplicitAny: Not sure if we have a better type
const getFieldValue = (field: any): string => {
  if (!field) return ''
  if (typeof field === 'string') return field
  if (Array.isArray(field)) {
    return field
      .map((item) => getFieldValue(item))
      .filter(Boolean)
      .join(', ')
  }
  if (typeof field === 'object' && 'value' in field) return field.value
  return String(field)
}

// biome-ignore lint/suspicious/noExplicitAny: Not sure if we have a better type
const formatAddress = (address: any): React.ReactNode => {
  
  if (!address) return ''
  if (typeof address === 'string') return address
  const addresses = Array.isArray(address) ? address : [address]
  return addresses
    .map((addr, index) => {
      if (typeof addr === 'string') return addr
      if (typeof addr === 'object') {
        const parts = []
        if (addr.line)
          parts.push(
            Array.isArray(addr.line) ? addr.line.join(', ') : addr.line,
          )
        if (addr.city) parts.push(addr.city)
        if (addr.state) parts.push(addr.state)
        if (addr.postalCode) parts.push(addr.postalCode)
        const addressText = parts.filter(Boolean).join(', ')
        
        return (
          <div key={`address-${addr.use || 'unknown'}-${index}`} className="mb-2">
            <span className="text-sm rounded text-xs">
              {addr.use && <span className="font-bold capitalize">{addr.use}</span>}
              {addr.use && addressText && <span>: </span>}
              {addressText && <span>{addressText}</span>}
            </span>
          </div>
        )
      }
      return null
    })
    .filter(Boolean)
}

// biome-ignore lint/suspicious/noExplicitAny: Not sure if we have a better type
const formatTelecom = (telecom: any): React.ReactNode => {
  if (!telecom) return ''
  if (typeof telecom === 'string') return telecom
  
  const telecoms = Array.isArray(telecom) ? telecom : [telecom]
  
  return telecoms
    .map((t, index) => {
      if (typeof t === 'string') return t
      if (typeof t === 'object' && 'value' in t) {
        return (
          <div key={`telecom-${t.system || 'unknown'}-${index}`} className="mb-2">
            <span className="text-sm rounded text-xs">
              {t.system && <span className="font-bold capitalize">{t.system}</span>}
              {t.system && t.value && <span>: </span>}
              {t.value && <span>{t.value}</span>}
            </span>
          </div>
        )
      }
      return null
    })
    .filter(Boolean)
}

// biome-ignore lint/suspicious/noExplicitAny: Not sure if we have a better type
const formatIdentifier = (identifier: any): React.ReactNode => {
  if (!identifier) return ''
  if (typeof identifier === 'string') return identifier
  
  const identifiers = Array.isArray(identifier) ? identifier : [identifier]
  
  return identifiers
    .map((id, index) => {
      if (typeof id === 'string') return id
      if (typeof id === 'object') {
        return (
          <div key={`identifier-${id.system || 'unknown'}-${id.value || index}`} className="mb-2">
            <span className="text-sm rounded text-xs font-mono">
              {id.system && <span className="font-bold">{id.system}</span>}
              {id.system && id.value && <span>: </span>}
              {id.value && <span>{id.value}</span>}
              {id.type?.text && (
                <>
                  <span> (</span>
                  <span className="italic">{id.type.text}</span>
                  <span>)</span>
                </>
              )}
            </span>
          </div>
        )
      }
      return null
    })
    .filter(Boolean)
}

// biome-ignore lint/suspicious/noExplicitAny: Not sure if we have a better type
const formatMaritalStatus = (maritalStatus: any): string => {
  if (!maritalStatus) return ''
  if (typeof maritalStatus === 'string') return maritalStatus
  if (typeof maritalStatus === 'object' && 'coding' in maritalStatus) return maritalStatus.coding[0].display
  if (typeof maritalStatus === 'object' && 'text' in maritalStatus) return maritalStatus.text
  if (typeof maritalStatus === 'object' && 'value' in maritalStatus) return maritalStatus.value
  if (typeof maritalStatus === 'object' && 'coding' in maritalStatus) return maritalStatus.coding[0].display
  return String(maritalStatus)
}

// biome-ignore lint/suspicious/noExplicitAny: Not sure if we have a better type
const formatPhoto = (photo: any): string => {
  if (!photo) return ''
  if (typeof photo === 'string') return photo
  if (Array.isArray(photo)) {
    return photo
      .map((p) => {
        if (typeof p === 'string') return p
        if (typeof p === 'object' && 'url' in p) return p.url
        return ''
      })
      .filter(Boolean)
      .join(', ')
  }
  if (typeof photo === 'object' && 'url' in photo) return photo.url
  return String(photo)
}

type PatientDetailsProps = {
  patient: WorklistPatient
}

export function PatientDetails({ patient }: PatientDetailsProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="w-full">
        <span className="text-sm font-semibold text-gray-500 gap-4">
          Patient Details
        </span>
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="bg-gray-50 p-3 rounded">
            <p className="text-xs font-medium text-gray-500">Name</p>
            <p className="text-sm" title="FHIR Path: name">
              {getFieldValue(patient.name)}
            </p>
          </div>
          <div className="bg-gray-50 p-3 rounded">
            <p className="text-xs font-medium text-gray-500">Birth Date</p>
            <p className="text-sm" title="FHIR Path: birthDate">
              {getFieldValue(patient.birthDate)}
            </p>
          </div>
          <div className="bg-gray-50 p-3 rounded">
            <p className="text-xs font-medium text-gray-500">Gender</p>
            <p className="text-sm" title="FHIR Path: gender">
              {getFieldValue(patient.gender)}
            </p>
          </div>
         
          {patient.maritalStatus && (
            <div className="bg-gray-50 p-3 rounded">
              <p className="text-xs font-medium text-gray-500">Marital Status</p>
              <p className="text-sm" title="FHIR Path: maritalStatus">
                {formatMaritalStatus(patient.maritalStatus)}
              </p>
            </div>
          )}
        </div>

        {patient.identifier && (
            <div className="bg-gray-50 p-3 rounded mt-4">
                <p className="text-xs font-medium text-gray-500 mb-2">Identifiers</p>
                <div className="text-sm" title="FHIR Path: identifier.where(system='system_code').value">
                  {formatIdentifier(patient.identifier)}
                </div>
              </div>
          )}

        {patient.telecom && (
          <div className="bg-gray-50 p-3 rounded mt-4">
            <p className="text-xs font-medium text-gray-500">Contact</p>
            <div className="text-sm" title="FHIR Path: telecom">
              {formatTelecom(patient.telecom)}
            </div>
          </div>
        )}

        {patient.address && (
          <div className="bg-gray-50 p-3 rounded mt-4">
            <p className="text-xs font-medium text-gray-500 mb-2">Address</p>
            <div className="text-sm" title="FHIR Path: address">
              {formatAddress(patient.address)}
            </div>
          </div>
        )}

        {patient.photo && (
          <div className="bg-gray-50 p-3 rounded mt-4">
            <p className="text-xs font-medium text-gray-500 mb-2">Photos</p>
            <p className="text-sm" title="FHIR Path: photo">
              {formatPhoto(patient.photo)}
            </p>
          </div>
        )}

        
      </div>
    </div>
  )
}
