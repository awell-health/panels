import type { Extension } from '@medplum/fhirtypes'

export type ExtensionDetailsProps = {
  extensions: Extension[]
  title?: string
}

const renderExtensionValue = (
  ext: Extension,
  parentIndex?: number,
): React.ReactNode => {
  if (ext.extension && ext.extension.length > 0) {
    return (
      <div className="space-y-2">
        {ext.extension.map((nestedExt: Extension, nestedIndex: number) => (
          <div
            key={nestedExt.id ?? nestedIndex}
            className="bg-gray-50 p-3 rounded"
          >
            <div
              className="text-xs font-medium text-gray-500"
              title={`FHIR Path: extension${parentIndex !== undefined ? `[${parentIndex}]` : ''}.extension[${nestedIndex}]`}
            >
              {nestedExt.url}
            </div>
            <div className="text-sm">
              {renderExtensionValue(nestedExt, nestedIndex)}
            </div>
          </div>
        ))}
      </div>
    )
  }

  // Handle JSON values
  if (
    ext.valueString &&
    (ext.valueString.startsWith('{') || ext.valueString.startsWith('['))
  ) {
    try {
      const jsonValue = JSON.parse(ext.valueString)
      return (
        <div className="truncate" title={ext.valueString}>
          {JSON.stringify(jsonValue, null, 2)}
        </div>
      )
    } catch (e) {
      // If JSON parsing fails, return the original string
      return ext.valueString
    }
  }

  return (
    ext.valueString ||
    ext.valueBoolean ||
    ext.valueInteger ||
    ext.valueDecimal ||
    ext.valueDate ||
    ext.valueDateTime ||
    ext.valueTime ||
    ext.valueCode ||
    ext.valueReference?.reference ||
    'No value'
  )
}

export function ExtensionDetails({
  extensions,
  title = 'Additional Information',
}: ExtensionDetailsProps) {
  if (!extensions || extensions.length === 0) return null

  return (
    <div>
      <div className="text-xs font-medium text-gray-500">{title}</div>
      <div className="grid grid-cols-1">
        {extensions.map((ext: Extension, index: number) => (
          <div key={ext.id ?? index} className="bg-gray-50 p-3 rounded">
            <div
              className="text-xs font-medium text-gray-500 mb-1"
              title={ext.url}
            >
              {ext.url.split('/').pop()}
            </div>
            <div className="text-sm">{renderExtensionValue(ext)}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
