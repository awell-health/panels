'use client'

import type { Extension } from '@medplum/fhirtypes'
import { type WorklistTask, useMedplumStore } from '@/hooks/use-medplum-store'
import { isFeatureEnabled } from '@/utils/featureFlags'
import { useEffect, useState } from 'react'
import { ExtensionDetails } from './ExtensionDetails'
import { JsonSearchableExtensionDetails } from './JsonSearchableExtensionDetails'
import { SearchableAdditionalInfo } from './SearchableAdditionalInfo'
import { SearchableExtensionDetails } from './SearchableExtensionDetails'

type TaskContentProps = {
  taskData: WorklistTask
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
      // Prefer valueString, fallback to other value types if needed
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

export function TaskDetails({ taskData }: TaskContentProps) {
  const [activeTab, setActiveTab] = useState<'context' | 'comments'>('context')
  const [newComment, setNewComment] = useState('')
  const [task, setTask] = useState(taskData)
  const [connectors, setConnectors] = useState<
    { connectorName: string; url: string }[]
  >([])

  useEffect(() => {
    setTask(taskData)

    // Extract connectors from task input
    const extractedConnectors =
      taskData.input
        ?.filter(
          // biome-ignore lint/suspicious/noExplicitAny: Not sure if we have a better type
          (input: any) =>
            input.type?.coding?.[0]?.system ===
            'http://awellhealth.com/fhir/connector-type',
        )
        // biome-ignore lint/suspicious/noExplicitAny: Not sure if we have a better type
        .map((input: any) => ({
          connectorName: input.type.coding[0].display,
          url: input.valueUrl,
        })) || []

    setConnectors(extractedConnectors)
  }, [taskData])

  const { addNotesToTask } = useMedplumStore()

  const handleSubmitComment = async () => {
    if (newComment.trim() && taskData.id) {
      const task = await addNotesToTask(taskData.id, newComment.trim())
      setNewComment('')
      setTask({
        ...taskData,
        ...task,
      })
    }
  }

  const { summaryHtml, filteredExtensions } = extractSummaryExtension(
    taskData.extension,
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
            Task
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('comments')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'comments'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Comments
          </button>
        </nav>
      </div>
      <div className="flex-1 overflow-y-auto p-4 flex flex-col">
        {activeTab === 'context' && (
          <div className="flex flex-col h-full">
            <>
              <h3 className="text-sm font-medium mb-2">Complete Task</h3>
              <div className="w-full space-y-4">
                {/* System Connectors Section */}
                <div className="bg-gray-50 p-3 rounded">
                  <div className="space-y-2">
                    {connectors.length > 0 ? (
                      connectors.map((connector, index) => (
                        <button
                          key={`connector-${connector.connectorName}-${index}`}
                          type="button"
                          onClick={() => {
                            window.open(connector.url, '_blank')
                          }}
                          className="w-full bg-blue-400 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-blue-500 transition-colors duration-200 text-left"
                        >
                          Complete the task in {connector.connectorName}
                        </button>
                      ))
                    ) : (
                      <p className="text-xs text-gray-500">
                        No connectors available
                      </p>
                    )}
                  </div>
                </div>

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

                {/* <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-xs font-medium text-gray-500">Status</p>
                    <p className="text-sm">{taskData.status}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-xs font-medium text-gray-500">Intent</p>
                    <p className="text-sm">{taskData.intent}</p>
                  </div>
                  {taskData.priority && (
                    <div className="bg-gray-50 p-3 rounded">
                      <p className="text-xs font-medium text-gray-500">Priority</p>
                      <p className="text-sm">{taskData.priority}</p>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-gray-500">Authored On</p>
                    <p className="text-sm">{formatDateWithType(taskData.authoredOn)}</p>
                  </div>
                </div> */}

                {/* {taskData.executionPeriod && (
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-xs font-medium text-gray-500 mb-2">Execution Period</p>
                    <div className="grid grid-cols-2 gap-4">
                      {taskData.executionPeriod.start && (
                        <div>
                          <p className="text-xs text-gray-500">Start</p>
                          <p className="text-sm">{formatDateWithType(taskData.executionPeriod.start)}</p>
                        </div>
                      )}
                      {taskData.executionPeriod.end && (
                        <div>
                          <p className="text-xs text-gray-500">End</p>
                          <p className="text-sm">{formatDateWithType(taskData.executionPeriod.end)}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )} */}

                {taskData.input &&
                  taskData.input.length > 0 &&
                  (() => {
                    // Filter out connector inputs (same logic as used for connectors section)
                    const nonConnectorInputs = taskData.input.filter(
                      // biome-ignore lint/suspicious/noExplicitAny: Not sure if we have a better type
                      (input: any) =>
                        input.type?.coding?.[0]?.system !==
                        'http://awellhealth.com/fhir/connector-type',
                    )

                    if (nonConnectorInputs.length === 0) return null

                    return isFeatureEnabled('ENABLE_ADDITIONAL_INFO_SEARCH') ? (
                      <SearchableAdditionalInfo input={nonConnectorInputs} />
                    ) : (
                      <div className="bg-gray-50 p-3 rounded">
                        <p className="text-xs font-medium text-gray-500 mb-2">
                          Additional Information
                        </p>
                        <div className="space-y-2">
                          {nonConnectorInputs.map(
                            // biome-ignore lint/suspicious/noExplicitAny: Not sure if we have a better type
                            (input: any, index: number) => (
                              <div
                                key={input.id ?? index}
                                className="border-b border-gray-200 pb-2 last:border-0"
                              >
                                <p className="text-xs text-gray-500">
                                  {input.type?.coding?.[0]?.display ||
                                    'Unknown Field'}
                                </p>
                                <p className="text-sm">{input.valueString}</p>
                              </div>
                            ),
                          )}
                        </div>
                      </div>
                    )
                  })()}

                {/* {taskData.patient && (
                  <PatientDetails patient={taskData.patient} />
                )} */}

                <h3 className="text-sm font-medium mb-2">Context</h3>
                {filteredExtensions &&
                  filteredExtensions.length > 0 &&
                  (isFeatureEnabled('ENABLE_EXTENSION_SEARCH') ? (
                    isFeatureEnabled('USE_JSON_VIEWER_FOR_EXTENSIONS') ? (
                      <JsonSearchableExtensionDetails
                        extensions={filteredExtensions}
                      />
                    ) : (
                      <SearchableExtensionDetails
                        extensions={filteredExtensions}
                      />
                    )
                  ) : (
                    <ExtensionDetails extensions={filteredExtensions} />
                  ))}
              </div>
            </>
          </div>
        )}

        {activeTab === 'comments' && (
          <div className="flex flex-col items-center justify-center">
            <h3 className="text-sm font-medium mb-2">Comments</h3>
            {task.note && task.note.length > 0 && (
              <div className="bg-gray-50 p-3 rounded w-full mb-4">
                <p className="text-xs font-medium text-gray-500 mb-2">Notes</p>
                <div className="space-y-4">
                  {task.note.map(
                    // biome-ignore lint/suspicious/noExplicitAny: Not sure if we have a better type
                    (note: any, index: number) => (
                      <div
                        key={note.id ?? index}
                        className="bg-white p-3 rounded-md shadow-sm"
                      >
                        <p className="text-sm text-gray-800 mb-1">
                          {note.text}
                        </p>
                        <p className="text-xs text-gray-500">
                          {note.time
                            ? new Date(note.time).toLocaleString()
                            : 'No timestamp'}
                        </p>
                      </div>
                    ),
                  )}
                </div>
              </div>
            )}

            <div className="w-full space-y-4">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                className="w-full p-3 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
              <button
                type="button"
                onClick={handleSubmitComment}
                disabled={!newComment.trim()}
                className="w-full bg-blue-500 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors duration-200"
              >
                Add Comment
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
