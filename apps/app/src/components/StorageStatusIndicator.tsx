'use client'

import { useStorageConfig } from '@/hooks/use-storage-config'
import { getStorageConfig } from '@/lib/storage/storage-factory'
import { Cloud, CloudOff, Database, HardDrive, Loader2, Settings } from 'lucide-react'
import { useEffect, useState } from 'react'

interface StorageStatus {
    mode: 'local' | 'api'
    health: 'healthy' | 'loading' | 'error'
    details: {
        mode: string
        cacheEnabled?: boolean
        cacheDuration?: number
        apiConfig?: {
            baseUrl: string
            tenantId: string
            userId: string
        }
    }
    lastChecked: Date
}

interface StorageStatusIndicatorProps {
    className?: string
}

export function StorageStatusIndicator({ className = '' }: StorageStatusIndicatorProps) {
    const [status, setStatus] = useState<StorageStatus>({
        mode: 'local',
        health: 'loading',
        details: { mode: 'local' },
        lastChecked: new Date(),
    })
    const [showDetails, setShowDetails] = useState(false)
    const storageConfig = useStorageConfig()

    useEffect(() => {
        let cancelled = false

        const checkStorageStatus = async () => {
            if (cancelled) return

            try {
                if (!cancelled) {
                    setStatus(prev => ({ ...prev, health: 'loading' }))
                }

                const config = getStorageConfig()

                // Simple health check without creating new adapter instances
                // Just check if configuration is valid
                const isHealthy = config.mode === 'local' ||
                    (config.mode === 'api' && config.apiConfig?.baseUrl && config.apiConfig?.tenantId)

                if (!cancelled) {
                    setStatus({
                        mode: config.mode as 'local' | 'api',
                        health: isHealthy ? 'healthy' : 'error',
                        details: {
                            mode: config.mode,
                            cacheEnabled: config.mode === 'api' ? storageConfig.isCacheEnabled : false,
                            cacheDuration: config.mode === 'api' ? storageConfig.cacheDurationMs : undefined,
                            apiConfig: config.apiConfig,
                        },
                        lastChecked: new Date(),
                    })
                }
            } catch (error) {
                console.error('Storage health check failed:', error)
                if (!cancelled) {
                    setStatus(prev => ({
                        ...prev,
                        health: 'error',
                        lastChecked: new Date(),
                    }))
                }
            }
        }

        checkStorageStatus()

        // Reduce polling frequency to avoid conflicts
        const interval = setInterval(() => {
            if (!cancelled) {
                checkStorageStatus()
            }
        }, 10 * 60 * 1000) // Check every 10 minutes to minimize conflicts

        return () => {
            cancelled = true
            clearInterval(interval)
        }
    }, [storageConfig.isCacheEnabled, storageConfig.cacheDurationMs])

    const getIcon = () => {
        if (status.health === 'loading') {
            return <Loader2 className="h-3 w-3 animate-spin" />
        }

        if (status.mode === 'api') {
            return status.health === 'healthy' ? (
                <Cloud className="h-3 w-3" />
            ) : (
                <CloudOff className="h-3 w-3" />
            )
        }

        return status.health === 'healthy' ? (
            <HardDrive className="h-3 w-3" />
        ) : (
            <Database className="h-3 w-3 opacity-50" />
        )
    }

    const getStatusColor = () => {
        switch (status.health) {
            case 'healthy':
                return status.mode === 'api' ? 'text-blue-600' : 'text-gray-600'
            case 'loading':
                return 'text-yellow-600'
            case 'error':
                return 'text-red-600'
            default:
                return 'text-gray-400'
        }
    }

    const getStatusText = () => {
        const modeText = status.mode === 'api' ? 'API' : 'Local'

        switch (status.health) {
            case 'healthy':
                return modeText
            case 'loading':
                return `${modeText}...`
            case 'error':
                return `${modeText} Error`
            default:
                return modeText
        }
    }

    const formatDuration = (ms: number) => {
        const minutes = Math.floor(ms / (1000 * 60))
        return `${minutes}m`
    }

    return (
        <div className="relative">
            <button
                type="button"
                className={`btn text-xs font-normal h-8 px-2 flex items-center justify-center text-gray-700 ${getStatusColor()} ${className}`}
                onClick={() => setShowDetails(!showDetails)}
                title={`Storage: ${getStatusText()} - Click for details`}
            >
                {getIcon()}
                <span className="ml-1">{getStatusText()}</span>
            </button>

            {showDetails && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setShowDetails(false)}
                        onKeyDown={(e) => {
                            if (e.key === 'Escape') {
                                setShowDetails(false)
                            }
                        }}
                        role="button"
                        tabIndex={-1}
                        style={{
                            background: 'transparent',
                            margin: 0,
                            padding: 0,
                            width: '100vw',
                            height: '100vh',
                            left: 0,
                            top: 0
                        }}
                    />

                    {/* Details popup */}
                    <div className="absolute right-0 bottom-full mb-1 z-50 bg-white border border-gray-200 rounded-md shadow-lg w-80 max-w-[calc(100vw-2rem)] min-w-0 p-3">
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xs font-medium text-gray-900">Storage Status</h3>
                                <div className={`flex items-center ${getStatusColor()}`}>
                                    {getIcon()}
                                    <span className="ml-1 text-xs">{status.health}</span>
                                </div>
                            </div>

                            <div className="space-y-2 text-xs">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Mode:</span>
                                    <span className="text-gray-900">{status.details.mode}</span>
                                </div>

                                {status.mode === 'api' && (
                                    <>
                                        <hr className="border-gray-100" />
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-gray-500 font-medium flex items-center">
                                                    <Settings className="h-3 w-3 mr-1" />
                                                    Cache Settings
                                                </span>
                                            </div>

                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Status:</span>
                                                <span className="text-gray-900">
                                                    {storageConfig.isCacheEnabled ? 'Enabled' : 'Disabled'}
                                                </span>
                                            </div>

                                            {storageConfig.isCacheEnabled && (
                                                <div className="flex justify-between">
                                                    <span className="text-gray-500">Duration:</span>
                                                    <span className="text-gray-900">{storageConfig.cacheDurationText}</span>
                                                </div>
                                            )}

                                            <div className="space-y-1">
                                                <span className="text-gray-500 text-xs">Quick Settings:</span>
                                                <div className="flex flex-wrap gap-1">
                                                    {Object.entries(storageConfig.presetDurations).map(([preset, duration]) => (
                                                        <button
                                                            key={preset}
                                                            type="button"
                                                            className={`px-2 py-1 text-xs rounded ${storageConfig.cacheDurationMs === duration
                                                                ? 'bg-blue-100 text-blue-700 border border-blue-200'
                                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                                }`}
                                                            onClick={() => storageConfig.setPresetDuration(preset as keyof typeof storageConfig.presetDurations)}
                                                        >
                                                            {preset === 'off' ? 'Off' : storageConfig.formatDuration(duration)}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )}

                                {status.details.apiConfig && (
                                    <>
                                        <hr className="border-gray-100" />
                                        <div className="space-y-1">
                                            <div className="text-gray-500 font-medium">API Configuration:</div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Base URL:</span>
                                                <span className="text-gray-900 truncate ml-2">{status.details.apiConfig.baseUrl}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Tenant:</span>
                                                <span className="text-gray-900">{status.details.apiConfig.tenantId}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">User:</span>
                                                <span className="text-gray-900">{status.details.apiConfig.userId}</span>
                                            </div>
                                        </div>
                                    </>
                                )}

                                <hr className="border-gray-100" />
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Last Checked:</span>
                                    <span className="text-gray-900">{status.lastChecked.toLocaleTimeString()}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    )
} 