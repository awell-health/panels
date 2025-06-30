'use client'

import { useState, useRef } from 'react'
import { Search, X } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { Bot } from '@medplum/fhirtypes'

type AddIngestionModalProps = {
  isOpen: boolean
  onClose: () => void
  onSelectSource: (category: string, service: string) => void
  ingestionBots: Bot[]
}

// Function to get color based on service name
function getColorForService(name: string) {
  // Simple hash function to generate a consistent color
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }

  // Generate HSL color with fixed saturation and lightness
  const h = Math.abs(hash % 360)
  return `hsl(${h}, 70%, 60%)`
}

// Function to get initials from service name
function getInitials(name: string) {
  return name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .substring(0, 2)
}

// Data for the sources with exact URLs from the JSON
const sourceData = {
  categories: [
    {
      name: 'Suggested',
      services: [
        {
          name: 'Awell Tasks',
          favicon: 'https://logo.clearbit.com/awellhealth.com',
          enabled: true,
        },
        {
          name: 'Healthie Tasks',
          favicon: 'https://logo.clearbit.com/gethealthie.com',
        },
        {
          name: 'Elation',
          favicon: 'https://logo.clearbit.com/elationhealth.com',
        },
      ],
    },
    {
      name: 'Electronic Health Records',
      services: [
        { name: 'Epic', favicon: 'https://logo.clearbit.com/epic.com' },
        { name: 'Cerner', favicon: 'https://logo.clearbit.com/cerner.com' },
        {
          name: 'Athenahealth',
          favicon: 'https://logo.clearbit.com/athenahealth.com',
        },
        {
          name: 'Canvas Medical',
          favicon: 'https://logo.clearbit.com/canvasmedical.com',
        },
        {
          name: 'Elation',
          favicon: 'https://logo.clearbit.com/elationhealth.com',
        },
        {
          name: 'Healthie',
          favicon: 'https://logo.clearbit.com/gethealthie.com',
        },
      ],
    },
    {
      name: 'HIEs & Data Aggregators',
      services: [
        {
          name: 'Metriport',
          favicon: 'https://logo.clearbit.com/metriport.com',
        },
        { name: 'Redox', favicon: 'https://logo.clearbit.com/redoxengine.com' },
        {
          name: 'Particle Health',
          favicon: 'https://logo.clearbit.com/particlehealth.com',
        },
        { name: '1upHealth', favicon: 'https://logo.clearbit.com/1up.health' },
        {
          name: 'Health Gorilla',
          favicon: 'https://logo.clearbit.com/healthgorilla.com',
        },
        { name: 'Datavant', favicon: 'https://logo.clearbit.com/datavant.com' },
      ],
    },
    // Other categories remain the same...
  ],
}

export function AddIngestionModal({
  isOpen,
  onClose,
  onSelectSource,
}: AddIngestionModalProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  // Filter categories and services based on search query
  const filteredCategories = sourceData.categories
    .map((category) => {
      const filteredServices = category.services.filter((service) =>
        service.name.toLowerCase().includes(searchQuery.toLowerCase()),
      )
      return {
        ...category,
        services: filteredServices,
      }
    })
    .filter(
      (category) =>
        category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        category.services.length > 0,
    )

  // Handle service selection
  const handleServiceClick = (categoryName: string, serviceName: string) => {
    onSelectSource(categoryName, serviceName)
    // Close the modal
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="overflow-hidden max-h-[85vh] flex flex-col p-0 m-0">
        <DialogHeader className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-medium">
              Add source
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
          <div className="mt-4 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search"
              className="w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 border-gray-200"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </DialogHeader>

        <div ref={containerRef} className="flex-1 overflow-y-auto">
          {filteredCategories.map((category, categoryIndex) => (
            <div key={`${category.name}-${categoryIndex}`} className="relative">
              <div className="bg-white py-3 px-4 font-medium text-sm sticky top-0 z-10 border-b border-gray-200">
                {category.name}
              </div>
              <div className="px-4">
                {category.services.map((service, serviceIndex) => {
                  const bgColor = getColorForService(service.name)
                  const initials = getInitials(service.name)

                  return (
                    <div
                      key={`${service.name}-${serviceIndex}`}
                      className={`flex items-center py-3 px-2 hover:bg-gray-50 rounded-md cursor-pointer ${
                        service.enabled ? 'bg-blue-50' : ''
                      }`}
                      onClick={() =>
                        handleServiceClick(category.name, service.name)
                      }
                      onKeyUp={(e) => {
                        if (e.key === 'Enter') {
                          handleServiceClick(category.name, service.name)
                        }
                      }}
                    >
                      <div
                        className="w-8 h-8 mr-3 flex-shrink-0 rounded-md flex items-center justify-center text-white text-xs font-medium"
                        style={{ backgroundColor: bgColor }}
                      >
                        {initials}
                      </div>
                      <div>
                        <span
                          className="text-sm"
                          style={{ color: service.enabled ? '#000' : '#666' }}
                        >
                          {service.name}
                        </span>
                        {!service.enabled && (
                          <span className="ml-2 text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full">
                            Coming soon
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
