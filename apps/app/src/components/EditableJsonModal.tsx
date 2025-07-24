'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Check, Copy, X, ChevronDown, ChevronRight } from 'lucide-react'

interface EditableJsonModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  initialData?: object | string
  onSave?: (data: object) => void
}

export function EditableJsonModal({
  isOpen,
  onClose,
  title = 'Edit JSON Configuration',
  initialData = [],
  onSave,
}: EditableJsonModalProps) {
  const [jsonString, setJsonString] = useState(() => {
    try {
      return JSON.stringify(initialData, null, 2)
    } catch {
      return '{}'
    }
  })
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [showExample, setShowExample] = useState(false)

  const exampleJson = `[
  {
    "name": "Patient demographics",
    "fields": [
      {
        "label": "Full name",
        "key": "name",
        "fhirPath": "name"
      },
      {
        "label": "Date of birth",
        "key": "birthDate",
        "fhirPath": "birthDate"
      }
    ]
  },
  {
    "name": "Vital signs",
    "fields": [
      {
        "label": "Weight (lbs)",
        "key": "weight",
        "fhirPath": "extension.where(url='weight').valueString"
      }
    ]
  }
]`

  const validateJson = (value: string) => {
    try {
      const parsed = JSON.parse(value)

      // Check if it's an array
      if (!Array.isArray(parsed)) {
        setError('JSON must be an array of FHIR cards')
        return false
      }

      // Check each card structure
      for (let i = 0; i < parsed.length; i++) {
        const card = parsed[i]

        // Check if card is an object
        if (!card || typeof card !== 'object') {
          setError(`Card at index ${i} must be an object`)
          return false
        }

        // Check required properties
        if (!card.name || typeof card.name !== 'string') {
          setError(`Card at index ${i} must have a 'name' property as a string`)
          return false
        }

        if (!card.fields || !Array.isArray(card.fields)) {
          setError(
            `Card at index ${i} must have a 'fields' property as an array`,
          )
          return false
        }

        // Check each field structure
        for (let j = 0; j < card.fields.length; j++) {
          const field = card.fields[j]

          if (!field || typeof field !== 'object') {
            setError(
              `Field at index ${j} in card "${card.name}" must be an object`,
            )
            return false
          }

          if (!field.label || typeof field.label !== 'string') {
            setError(
              `Field at index ${j} in card "${card.name}" must have a 'label' property as a string`,
            )
            return false
          }

          if (!field.key || typeof field.key !== 'string') {
            setError(
              `Field at index ${j} in card "${card.name}" must have a 'key' property as a string`,
            )
            return false
          }

          if (!field.fhirPath || typeof field.fhirPath !== 'string') {
            setError(
              `Field at index ${j} in card "${card.name}" must have a 'fhirPath' property as a string`,
            )
            return false
          }
        }
      }

      setError(null)
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid JSON')
      return false
    }
  }

  const handleJsonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    setJsonString(value)
    validateJson(value)
  }

  const handleSave = () => {
    if (validateJson(jsonString)) {
      try {
        const parsedData = JSON.parse(jsonString)
        onSave?.(parsedData)
        onClose()
      } catch (err) {
        setError('Failed to parse JSON')
      }
    }
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(jsonString)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy JSON:', err)
    }
  }

  const handleFormat = () => {
    if (validateJson(jsonString)) {
      try {
        const parsed = JSON.parse(jsonString)
        setJsonString(JSON.stringify(parsed, null, 2))
      } catch (err) {
        // Error already handled by validateJson
      }
    }
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      className="max-w-[80vw] max-h-[90vh]"
    >
      <DialogContent className="flex flex-col p-0 m-0 w-[80vw] h-[80vh]">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold text-gray-900">
              {title}
            </DialogTitle>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-1 hover:bg-gray-100"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </DialogHeader>

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Edit the JSON configuration below. Make sure the JSON is valid
                before saving.
              </p>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleFormat}
                  className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Format
                </button>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center"
                >
                  {copied ? (
                    <>
                      <Check className="h-3 w-3 mr-1 text-green-500" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3 mr-1" />
                      Copy
                    </>
                  )}
                </button>
              </div>
            </div>
            {error && (
              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">
                  <strong>JSON Error:</strong> {error}
                </p>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-hidden px-6 py-4">
            <textarea
              value={jsonString}
              onChange={handleJsonChange}
              className={`w-full h-full font-mono text-sm border rounded-md p-4 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                error ? 'border-red-300 bg-red-50' : 'border-gray-300 bg-white'
              }`}
              placeholder="Enter JSON here..."
              spellCheck={false}
            />
          </div>

          <div className="px-6 py-3 border-t border-gray-200 bg-gray-50">
            <button
              type="button"
              onClick={() => setShowExample(!showExample)}
              className="flex items-center text-sm text-gray-600 hover:text-gray-800 focus:outline-none"
            >
              {showExample ? (
                <ChevronDown className="h-4 w-4 mr-1" />
              ) : (
                <ChevronRight className="h-4 w-4 mr-1" />
              )}
              Show example FHIR card structure
            </button>

            {showExample && (
              <div className="mt-3 p-3 bg-white border border-gray-200 rounded-md">
                <p className="text-xs text-gray-600 mb-2">
                  Expected structure: Array of cards with name and fields
                  properties
                </p>
                <pre className="text-xs font-mono text-gray-700 overflow-x-auto bg-gray-50 p-2 rounded border max-h-32 overflow-y-auto">
                  {exampleJson}
                </pre>
                <div className="mt-2 text-xs text-gray-500">
                  <p>
                    <strong>Required properties:</strong>
                  </p>
                  <ul className="list-disc list-inside ml-2 space-y-1">
                    <li>
                      <code className="bg-gray-100 px-1 rounded">name</code> -
                      Card display name (string)
                    </li>
                    <li>
                      <code className="bg-gray-100 px-1 rounded">fields</code> -
                      Array of field objects
                    </li>
                    <li>
                      <code className="bg-gray-100 px-1 rounded">label</code> -
                      Field display label (string)
                    </li>
                    <li>
                      <code className="bg-gray-100 px-1 rounded">key</code> -
                      Field identifier (string)
                    </li>
                    <li>
                      <code className="bg-gray-100 px-1 rounded">fhirPath</code>{' '}
                      - FHIR path expression (string)
                    </li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!!error}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-blue-600 rounded-md hover:bg-blue-700 hover:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            Save Changes
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
