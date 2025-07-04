'use client'
import type { WorklistPatient, WorklistTask } from '@/hooks/use-medplum-store'
import { isFeatureEnabled } from '@/utils/featureFlags'
import { useState } from 'react'
import { ExtensionDetails } from './ExtensionDetails'
import { SearchableExtensionDetails } from './SearchableExtensionDetails'
import { PatientDetails } from './PatientDetails'
import type { Extension } from '@medplum/fhirtypes'

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
const formatAddress = (address: any): string => {
  if (!address) return ''
  if (typeof address === 'string') return address
  if (Array.isArray(address)) {
    return address
      .map((addr) => formatAddress(addr))
      .filter(Boolean)
      .join(', ')
  }
  if (typeof address === 'object') {
    const parts = []
    if (address.line)
      parts.push(
        Array.isArray(address.line) ? address.line.join(', ') : address.line,
      )
    if (address.city) parts.push(address.city)
    if (address.state) parts.push(address.state)
    if (address.postalCode) parts.push(address.postalCode)
    return parts.filter(Boolean).join(', ')
  }
  return String(address)
}

// biome-ignore lint/suspicious/noExplicitAny: Not sure if we have a better type
const formatTelecom = (telecom: any): string => {
  if (!telecom) return ''
  if (typeof telecom === 'string') return telecom
  if (Array.isArray(telecom)) {
    return telecom
      .map((t) => {
        if (typeof t === 'string') return t
        if (typeof t === 'object' && 'value' in t) return t.value
        return ''
      })
      .filter(Boolean)
      .join(', ')
  }
  if (typeof telecom === 'object' && 'value' in telecom) return telecom.value
  return String(telecom)
}

// Helper to recursively find and remove the summary extension
function extractSummaryExtension(extensions: Extension[] = []): {
  summaryHtml: string | null
  filteredExtensions: Extension[]
} {
  let summaryHtml = null
  const filteredExtensions: Extension[] = []

  for (const ext of extensions) {
    if (ext.url?.includes('SummaryBeforeFirstTask_MainTrack')) {
      summaryHtml = ext.valueString || null
      continue // skip adding this extension
    }
    // If nested extensions, recurse
    const newExt = { ...ext }
    if (ext.extension && Array.isArray(ext.extension)) {
      const { summaryHtml: nestedSummary, filteredExtensions: nestedFiltered } =
        extractSummaryExtension(ext.extension)
      if (nestedSummary && !summaryHtml) summaryHtml = nestedSummary
      newExt.extension = nestedFiltered
    }
    filteredExtensions.push(newExt)
  }
  return { summaryHtml, filteredExtensions }
}

type PatientContextProps = {
  patient: WorklistPatient
}

export function PatientContext({ patient }: PatientContextProps) {
  const [activeTab, setActiveTab] = useState<'context' | 'tasks'>('context')

  // Extract summary and filtered extensions
  const { summaryHtml, filteredExtensions } = extractSummaryExtension(
    patient.extension,
  )

  return (
    <div className="flex-1 overflow-y-auto flex flex-col">
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-4" aria-label="Tabs">
          <button
            type="button"
            onClick={() => setActiveTab('context')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'context'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Context
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('tasks')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'tasks'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Tasks
          </button>
        </nav>
      </div>

      <div className="p-4">
        {activeTab === 'context' && (
          <>
            <PatientDetails patient={patient} />
            <div className="flex flex-col h-full mt-4">
              <div className="w-full space-y-4">
                {/* Summary Section */}
                {summaryHtml && (
                  <>
                    <h3 className="text-sm font-medium mb-2">Summary</h3>
                    <div className="bg-gray-50 p-3 rounded mb-4">
                      <div
                        className="prose prose-sm max-w-none"
                        // biome-ignore lint/security/noDangerouslySetInnerHtml: html is safe
                        dangerouslySetInnerHTML={{ __html: summaryHtml }}
                      />
                    </div>
                  </>
                )}
                {/* Extensions */}
                {filteredExtensions &&
                  filteredExtensions.length > 0 &&
                  (isFeatureEnabled('ENABLE_EXTENSION_SEARCH') ? (
                    <SearchableExtensionDetails
                      extensions={filteredExtensions}
                    />
                  ) : (
                    <ExtensionDetails extensions={filteredExtensions} />
                  ))}
              </div>
            </div>
          </>
        )}

        {activeTab === 'tasks' && (
          <div className="flex flex-col h-full">
            <div className="w-full space-y-4">
              {patient.tasks && patient.tasks.length > 0 ? (
                patient.tasks.map((task: WorklistTask, index: number) => (
                  <div
                    key={task.id ?? index}
                    className="bg-gray-50 p-3 rounded"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium text-gray-700">
                          {getFieldValue(task.description)}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Status: {getFieldValue(task.status)}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-1 text-xs rounded ${
                          getFieldValue(task.priority) === 'stat'
                            ? 'bg-red-100 text-red-800'
                            : getFieldValue(task.priority) === 'urgent'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {getFieldValue(task.priority) || 'routine'}
                      </span>
                    </div>
                    {task.extension &&
                      (isFeatureEnabled('ENABLE_EXTENSION_SEARCH') ? (
                        <SearchableExtensionDetails
                          extensions={task.extension}
                          title="Task Details"
                        />
                      ) : (
                        <ExtensionDetails
                          extensions={task.extension}
                          title="Task Details"
                        />
                      ))}
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500">
                  No tasks available for this patient
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
