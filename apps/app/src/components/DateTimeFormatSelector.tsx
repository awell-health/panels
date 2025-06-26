"use client"

import { useState } from 'react'
import { useDateTimeFormat, DATE_TIME_FORMATS, type DateTimeFormatKey } from '@/hooks/use-date-time-format'
import { Settings, Calendar, Clock, ChevronDown, Check } from 'lucide-react'

interface DateTimeFormatSelectorProps {
  className?: string
}

export function DateTimeFormatSelector({ className = '' }: DateTimeFormatSelectorProps) {
  const {
    selectedFormat,
    formatConfig,
    availableFormats,
    formatDateTime,
    updateFormat,
  } = useDateTimeFormat()

  const [isOpen, setIsOpen] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)

  const handleFormatChange = async (formatKey: DateTimeFormatKey) => {
    setIsUpdating(true)
    try {
      await updateFormat(formatKey)
      setIsOpen(false)
    } catch (error) {
      console.error('Failed to update format:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  // Sample date for preview
  const sampleDate = new Date('2024-12-31T14:30:00')

  return (
    <div className={`relative ${className}`}>
      <h2 className="text-base font-medium flex items-center gap-2 mb-4 h-8">
        <Calendar className="h-4 w-4 text-gray-500" />
        Date & Time Format
      </h2>

      <div className="border border-neutral-200 rounded-md bg-neutral-50">
        <div className="p-4">
          {/* Current format display */}
          <div className="mb-3">
            <div className="text-xs text-gray-500 mb-1">Current format:</div>
            <div className="text-sm font-mono bg-white p-2 rounded border">
              {formatDateTime(sampleDate)}
            </div>
          </div>

          {/* Format selector */}
          <div className="relative">
            <button
              onClick={() => setIsOpen(!isOpen)}
              disabled={isUpdating}
              className="w-full flex items-center justify-between p-2 border border-gray-300 rounded-md bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="text-sm text-gray-700">
                {formatConfig.label}
              </span>
              <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown menu */}
            {isOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-10 max-h-64 overflow-y-auto">
                {Object.entries(availableFormats).map(([key, format]) => (
                  <button
                    key={key}
                    onClick={() => handleFormatChange(key as DateTimeFormatKey)}
                    disabled={isUpdating}
                    className="w-full px-3 py-2 text-left hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between"
                  >
                    <div className="flex-1">
                      <div className="text-sm text-gray-900">{format.label}</div>
                      <div className="text-xs text-gray-500 font-mono">{format.example}</div>
                    </div>
                    {selectedFormat === key && (
                      <Check className="h-4 w-4 text-blue-600" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Helper text */}
          <div className="mt-3 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>This format will be used for all dates and times in the application.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Backdrop to close dropdown */}
      {isOpen && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  )
} 