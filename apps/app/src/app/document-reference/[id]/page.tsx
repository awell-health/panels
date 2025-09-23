'use client'

import { useMedplum } from '@/contexts/MedplumClientProvider'
import type { DocumentReference } from '@medplum/fhirtypes'
import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import ReactMarkdown from 'react-markdown'

function DocumentReferencePage() {
  const params = useParams()
  const { id } = params
  const { readDocumentReference, isLoading: isMedplumLoading } = useMedplum()
  const [documentReference, setDocumentReference] =
    useState<DocumentReference | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchDocumentReference = async () => {
      try {
        setLoading(true)
        setError(null)
        const docRef = await readDocumentReference(id as string)
        setDocumentReference(docRef)
      } catch (err) {
        console.error('Error fetching DocumentReference:', err)
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to load document reference',
        )
      } finally {
        setLoading(false)
      }
    }

    if (id && !isMedplumLoading) {
      fetchDocumentReference()
    }
  }, [id, readDocumentReference, isMedplumLoading])

  console.log(documentReference)

  if (isMedplumLoading || loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-red-500">Error: {error}</div>
      </div>
    )
  }

  if (!documentReference) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div>Document reference not found</div>
      </div>
    )
  }
  console.log(documentReference.content)

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Document Reference</h1>

      <div className="bg-white shadow rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="font-semibold text-gray-700">ID</h3>
            <p className="text-gray-900">{documentReference.id}</p>
          </div>

          <div>
            <h3 className="font-semibold text-gray-700">Status</h3>
            <p className="text-gray-900">{documentReference.status}</p>
          </div>

          {documentReference.type && (
            <div>
              <h3 className="font-semibold text-gray-700">Type</h3>
              <p className="text-gray-900">
                {documentReference.type.coding?.[0]?.display ||
                  documentReference.type.coding?.[0]?.code ||
                  documentReference.type.text}
              </p>
            </div>
          )}

          {documentReference.date && (
            <div>
              <h3 className="font-semibold text-gray-700">Date</h3>
              <p className="text-gray-900">
                {new Date(documentReference.date).toLocaleDateString()}
              </p>
            </div>
          )}

          {documentReference.subject && (
            <div>
              <h3 className="font-semibold text-gray-700">Subject</h3>
              <p className="text-gray-900">
                {documentReference.subject.display ||
                  documentReference.subject.reference}
              </p>
            </div>
          )}

          {documentReference.description && (
            <div className="md:col-span-2">
              <h3 className="font-semibold text-gray-700">Description</h3>
              <p className="text-gray-900">{documentReference.description}</p>
            </div>
          )}
        </div>

        {documentReference.content && documentReference.content.length > 0 && (
          <div className="mt-6">
            <h3 className="font-semibold text-gray-700 mb-3">Content</h3>
            <div className="space-y-3">
              {documentReference.content.map((content, index) => (
                <div
                  // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
                  key={index}
                  className="border border-gray-200 rounded p-3"
                >
                  {content.attachment && (
                    <div>
                      <h4 className="font-medium text-gray-700">
                        {content.attachment.title || `Attachment ${index + 1}`}
                      </h4>
                      {content.attachment.contentType && (
                        <p className="text-sm text-gray-500">
                          Type: {content.attachment.contentType}
                        </p>
                      )}
                      {content.attachment.data && (
                        <div className="mt-2">
                          <h5 className="text-sm font-medium text-gray-700 mb-1">
                            Document Content:
                          </h5>
                          <div className="bg-gray-50 p-3 rounded border border-gray-200">
                            <div className="prose prose-sm max-w-none">
                              {(() => {
                                try {
                                  return atob(content.attachment.data)
                                } catch (error) {
                                  console.error(
                                    'Error decoding base64 data:',
                                    error,
                                  )
                                  return (
                                    <div className="text-red-500 text-sm">
                                      Error decoding document content
                                    </div>
                                  )
                                }
                              })()}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default DocumentReferencePage
