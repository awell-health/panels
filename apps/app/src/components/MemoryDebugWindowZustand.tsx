'use client'

import { useState } from 'react'
import { useStoreDebug } from '@/hooks/use-zustand-store'

interface MemoryStats {
  patients: number
  tasks: number
  pagination: number
  totalRows: number
  estimatedMemory: string
}

export function MemoryDebugWindowZustand() {
  const [isVisible, setIsVisible] = useState(false)
  const { dataSize, getAllData } = useStoreDebug()
  const allData = getAllData()

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${Number.parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`
  }

  // Calculate estimated memory usage
  let totalMemoryBytes = 0

  // Estimate memory for patients
  for (const [_, item] of allData.patients) {
    totalMemoryBytes += JSON.stringify(item).length * 2 // Rough estimate: 2 bytes per character
  }

  // Estimate memory for tasks
  for (const [_, item] of allData.tasks) {
    totalMemoryBytes += JSON.stringify(item).length * 2
  }

  // Estimate memory for pagination
  for (const [_, item] of allData.pagination) {
    totalMemoryBytes += JSON.stringify(item).length * 2
  }

  const totalRows = dataSize.patients + dataSize.tasks + dataSize.pagination
  const estimatedMemory = formatBytes(totalMemoryBytes)

  const stats: MemoryStats = {
    patients: dataSize.patients,
    tasks: dataSize.tasks,
    pagination: dataSize.pagination,
    totalRows,
    estimatedMemory,
  }

  if (!isVisible) {
    return (
      <button
        type="button"
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 z-50 bg-green-600 hover:bg-green-700 text-white text-xs px-2 py-1 rounded shadow-lg transition-colors"
        title="Show Zustand Memory Debug Info"
      >
        🐻
      </button>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-gray-900 text-white text-xs p-3 rounded-lg shadow-lg border border-gray-700 min-w-[200px]">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-semibold text-sm">Zustand Memory Debug</h3>
        <button
          type="button"
          onClick={() => setIsVisible(false)}
          className="text-gray-400 hover:text-white transition-colors"
          title="Close"
        >
          ✕
        </button>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between">
          <span className="text-gray-300">Patients:</span>
          <span className="font-mono">{stats.patients}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-300">Tasks:</span>
          <span className="font-mono">{stats.tasks}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-300">Pagination:</span>
          <span className="font-mono">{stats.pagination}</span>
        </div>
        <div className="border-t border-gray-600 pt-1 mt-2">
          <div className="flex justify-between">
            <span className="text-gray-300">Total Rows:</span>
            <span className="font-mono font-semibold">{stats.totalRows}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-300">Est. Memory:</span>
            <span className="font-mono font-semibold text-green-400">
              {stats.estimatedMemory}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-3 pt-2 border-t border-gray-600">
        <button
          type="button"
          onClick={() => {
            // Import the store actions dynamically to avoid circular imports
            import('@/lib/reactive/panel-medplum-data-store-zustand').then(
              ({ panelDataStoreZustand }) => {
                panelDataStoreZustand.clearAllData()
              },
            )
          }}
          className="w-full bg-red-600 hover:bg-red-700 text-white text-xs py-1 px-2 rounded transition-colors"
          title="Clear All Data"
        >
          Clear All
        </button>
      </div>
    </div>
  )
}
