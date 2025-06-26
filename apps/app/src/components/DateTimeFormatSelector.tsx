"use client"

import {
  useDateTimeFormat,
  type DateFormatKey,
  type DateTimeFormatKey
} from '@/hooks/use-date-time-format'
import { Calendar, Check, ChevronDown, Clock } from 'lucide-react'
import { useState } from 'react'

interface DateTimeFormatSelectorProps {
  className?: string
}

export function DateTimeFormatSelector({ className = '' }: DateTimeFormatSelectorProps) {
  const {
    selectedDateFormat,
    selectedDateTimeFormat,
    dateFormatConfig,
    dateTimeFormatConfig,
    availableDateFormats,
    availableDateTimeFormats,
    formatDateTime,
    updateDateFormat,
    updateDateTimeFormat,
  } = useDateTimeFormat()

  const [isDateOpen, setIsDateOpen] = useState(false)
  const [isDateTimeOpen, setIsDateTimeOpen] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)

  const handleDateFormatChange = async (formatKey: DateFormatKey) => {
    setIsUpdating(true)
    try {
      await updateDateFormat(formatKey)
      setIsDateOpen(false)
    } catch (error) {
      console.error('Failed to update date format:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDateTimeFormatChange = async (formatKey: DateTimeFormatKey) => {
    setIsUpdating(true)
    try {
      await updateDateTimeFormat(formatKey)
      setIsDateTimeOpen(false)
    } catch (error) {
      console.error('Failed to update date+time format:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  // Sample dates for preview
  const sampleDate = '2024-12-31'
  const sampleDateTime = '2024-12-31T14:30:00'

  return (
    <div className={`relative ${className}`}>
      <h2 className="text-base font-medium flex items-center gap-2 mb-4 h-8">
        <Calendar className="h-4 w-4 text-gray-500" />
        Date & Time Formatting
      </h2>

      <div className="space-y-4">
        {/* Date-only format selector */}
        <div className="border border-neutral-200 rounded-md bg-neutral-50">
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="h-4 w-4 text-gray-600" />
              <h3 className="text-sm font-medium text-gray-900">Date Format</h3>
            </div>

            {/* Current date format display */}
            <div className="mb-3">
              <div className="text-xs text-gray-500 mb-1">Preview (date only):</div>
              <div className="text-sm font-mono bg-white p-2 rounded border">
                {formatDateTime(sampleDate)}
              </div>
            </div>

            {/* Date format selector */}
            <div className="relative">
              <button
                onClick={() => setIsDateOpen(!isDateOpen)}
                disabled={isUpdating}
                className="w-full flex items-center justify-between p-2 border border-gray-300 rounded-md bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="text-sm text-gray-700">
                  {dateFormatConfig.label}
                </span>
                <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isDateOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Date format dropdown menu */}
              {isDateOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-20 max-h-64 overflow-y-auto">
                  {Object.entries(availableDateFormats).map(([key, format]) => (
                    <button
                      key={key}
                      onClick={() => handleDateFormatChange(key as DateFormatKey)}
                      disabled={isUpdating}
                      className="w-full px-3 py-2 text-left hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between"
                    >
                      <div className="flex-1">
                        <div className="text-sm text-gray-900">{format.label}</div>
                        <div className="text-xs text-gray-500 font-mono">{format.example}</div>
                      </div>
                      {selectedDateFormat === key && (
                        <Check className="h-4 w-4 text-blue-600" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Date+time format selector */}
        <div className="border border-neutral-200 rounded-md bg-neutral-50">
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-4 w-4 text-gray-600" />
              <h3 className="text-sm font-medium text-gray-900">Date + Time Format</h3>
            </div>

            {/* Current date+time format display */}
            <div className="mb-3">
              <div className="text-xs text-gray-500 mb-1">Preview (date with time):</div>
              <div className="text-sm font-mono bg-white p-2 rounded border">
                {formatDateTime(sampleDateTime)}
              </div>
            </div>

            {/* Date+time format selector */}
            <div className="relative">
              <button
                onClick={() => setIsDateTimeOpen(!isDateTimeOpen)}
                disabled={isUpdating}
                className="w-full flex items-center justify-between p-2 border border-gray-300 rounded-md bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="text-sm text-gray-700">
                  {dateTimeFormatConfig.label}
                </span>
                <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isDateTimeOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Date+time format dropdown menu */}
              {isDateTimeOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-20 max-h-64 overflow-y-auto">
                  {Object.entries(availableDateTimeFormats).map(([key, format]) => (
                    <button
                      key={key}
                      onClick={() => handleDateTimeFormatChange(key as DateTimeFormatKey)}
                      disabled={isUpdating}
                      className="w-full px-3 py-2 text-left hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between"
                    >
                      <div className="flex-1">
                        <div className="text-sm text-gray-900">{format.label}</div>
                        <div className="text-xs text-gray-500 font-mono">{format.example}</div>
                      </div>
                      {selectedDateTimeFormat === key && (
                        <Check className="h-4 w-4 text-blue-600" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Backdrop to close dropdowns */}
      {(isDateOpen || isDateTimeOpen) && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => {
            setIsDateOpen(false)
            setIsDateTimeOpen(false)
          }}
        />
      )}
    </div>
  )
} 