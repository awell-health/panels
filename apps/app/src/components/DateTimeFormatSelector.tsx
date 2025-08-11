'use client'

import {
  useDateTimeFormat,
  type DateFormatKey,
  type DateTimeFormatKey,
} from '@/hooks/use-date-time-format'
import { Calendar, Check, Clock } from 'lucide-react'
import { useState } from 'react'
import Select, { components, type OptionProps } from 'react-select'
import { cn } from '../lib/utils'

interface DateTimeFormatSelectorProps {
  className?: string
}

interface FormatOption {
  value: string
  label: string
  example: string
}

export function DateTimeFormatSelector({
  className = '',
}: DateTimeFormatSelectorProps) {
  const {
    selectedDateFormat,
    selectedDateTimeFormat,
    availableDateFormats,
    availableDateTimeFormats,
    formatDateTime,
    updateDateFormat,
    updateDateTimeFormat,
  } = useDateTimeFormat()

  const [isUpdating, setIsUpdating] = useState(false)

  const handleDateFormatChange = async (option: FormatOption | null) => {
    if (!option) return

    setIsUpdating(true)
    try {
      await updateDateFormat(option.value as DateFormatKey)
    } catch (error) {
      console.error('Failed to update date format:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDateTimeFormatChange = async (option: FormatOption | null) => {
    if (!option) return

    setIsUpdating(true)
    try {
      await updateDateTimeFormat(option.value as DateTimeFormatKey)
    } catch (error) {
      console.error('Failed to update date+time format:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  // Sample dates for preview
  const sampleDate = new Date()
  const sampleDateTime = new Date()

  // Convert available formats to React Select options
  const dateFormatOptions: FormatOption[] = Object.entries(
    availableDateFormats,
  ).map(([key, format]) => ({
    value: key,
    label: format.label,
    example: format.example,
  }))

  const dateTimeFormatOptions: FormatOption[] = Object.entries(
    availableDateTimeFormats,
  ).map(([key, format]) => ({
    value: key,
    label: format.label,
    example: format.example,
  }))

  // Custom option component to show label and example
  const CustomOption = (props: OptionProps<FormatOption>) => {
    const { data, isSelected } = props

    const handleClick = () => {
      props.setValue(data, 'select-option')
    }

    return (
      <div
        className={cn(
          'px-3 py-2 hover:bg-gray-100 cursor-pointer',
          isSelected && 'text-primary',
        )}
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            handleClick()
          }
        }}
      >
        <div className="text-sm flex items-center gap-1">
          {isSelected ? (
            <Check className="h-4 w-4 text-primary" />
          ) : (
            <span className="h-4 w-4" />
          )}
          {data.label}
          <div className="text-xs text-gray-500 font-mono">{data.example}</div>
        </div>
      </div>
    )
  }

  const renderFormatSelector = (
    options: FormatOption[],
    selectedOption: string,
    formatPreview: string,
    onChange: (option: FormatOption | null) => void,
    isDisabled: boolean,
    title: string,
  ) => {
    return (
      <div className="card bg-base-100 shadow-sm">
        <div className="card-body flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-600" />
            <h3 className="text-sm font-medium text-gray-900">{title}</h3>
          </div>
          <div>
            <label htmlFor="date-format-select" className="label">
              <span className="label-text text-xs font-medium">
                Select Format:
              </span>
            </label>
            <Select
              value={options.find((option) => option.value === selectedOption)}
              onChange={(option) => {
                onChange(option as FormatOption | null)
              }}
              options={options}
              isDisabled={isDisabled}
              components={{
                Option: CustomOption,
              }}
              className="text-sm"
              classNamePrefix="react-select"
              placeholder="Select date format..."
              isSearchable={false}
            />
          </div>
          <div className="flex items-center gap-2 p-2 bg-base-200 rounded-md">
            Format Preview{' '}
            <span className="font-mono font-medium">{formatPreview}</span>
          </div>
        </div>
      </div>
    )
  }
  return (
    <div className={cn('flex flex-col gap-4 max-w-lg', className)}>
      {renderFormatSelector(
        dateFormatOptions,
        selectedDateFormat,
        formatDateTime(sampleDate),
        handleDateFormatChange,
        isUpdating,
        'Date Format',
      )}
      {renderFormatSelector(
        dateTimeFormatOptions,
        selectedDateTimeFormat,
        formatDateTime(sampleDateTime),
        handleDateTimeFormatChange,
        isUpdating,
        'Date + Time Format',
      )}
    </div>
  )
}
