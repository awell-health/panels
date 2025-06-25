"use client"

import type { WorklistPatient } from '@/hooks/use-medplum-store';

const getFieldValue = (field: any): string => {
  if (!field) return '';
  if (typeof field === 'string') return field;
  if (Array.isArray(field)) {
    return field.map(item => getFieldValue(item)).filter(Boolean).join(', ');
  }
  if (typeof field === 'object' && 'value' in field) return field.value;
  return String(field);
}

const formatAddress = (address: any): string => {
  if (!address) return '';
  if (typeof address === 'string') return address;
  if (Array.isArray(address)) {
    return address.map(addr => formatAddress(addr)).filter(Boolean).join(', ');
  }
  if (typeof address === 'object') {
    const parts = [];
    if (address.line) parts.push(Array.isArray(address.line) ? address.line.join(', ') : address.line);
    if (address.city) parts.push(address.city);
    if (address.state) parts.push(address.state);
    if (address.postalCode) parts.push(address.postalCode);
    return parts.filter(Boolean).join(', ');
  }
  return String(address);
}

const formatTelecom = (telecom: any): string => {
  if (!telecom) return '';
  if (typeof telecom === 'string') return telecom;
  if (Array.isArray(telecom)) {
    return telecom.map(t => {
      if (typeof t === 'string') return t;
      if (typeof t === 'object' && 'value' in t) return t.value;
      return '';
    }).filter(Boolean).join(', ');
  }
  if (typeof telecom === 'object' && 'value' in telecom) return telecom.value;
  return String(telecom);
}


type PatientDetailsProps = {
  patient: WorklistPatient
}

export function PatientDetails({ patient }: PatientDetailsProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="w-full">
        <span className="text-sm font-semibold text-gray-500 gap-4">Patient Details</span>
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="bg-gray-50 p-3 rounded">
            <p className="text-xs font-medium text-gray-500">Name</p>
            <p className="text-sm" title="FHIR Path: name">
              {getFieldValue(patient.name)}
            </p>
          </div>
          <div className="bg-gray-50 p-3 rounded">
            <p className="text-xs font-medium text-gray-500">Gender</p>
            <p className="text-sm" title="FHIR Path: gender">{getFieldValue(patient.gender)}</p>
          </div>
          <div className="bg-gray-50 p-3 rounded">
            <p className="text-xs font-medium text-gray-500">Birth Date</p>
            <p className="text-sm" title="FHIR Path: birthDate">{getFieldValue(patient.birthDate)}</p>
          </div>
          {patient.telecom && (
            <div className="bg-gray-50 p-3 rounded">
              <p className="text-xs font-medium text-gray-500">Contact</p>
              <p className="text-sm" title="FHIR Path: telecom">{formatTelecom(patient.telecom)}</p>
            </div>
          )}
        </div>

        {patient.address && (
          <div className="bg-gray-50 p-3 rounded">
            <p className="text-xs font-medium text-gray-500 mb-2">Address</p>
            <p className="text-sm" title="FHIR Path: address">
              {formatAddress(patient.address)}
            </p>
          </div>
        )}
      </div>
    </div>
  )
} 