"use client"

import { isFeatureEnabled } from '@/utils/featureFlags'
import type { ReactNode } from 'react'

interface ReactiveComponentSelectorProps {
    reactiveComponent: ReactNode
    regularComponent: ReactNode
}

export default function ReactiveComponentSelector({
    reactiveComponent,
    regularComponent
}: ReactiveComponentSelectorProps) {
    const isReactiveEnabled = isFeatureEnabled('ENABLE_REACTIVE_DATA_STORAGE')

    return isReactiveEnabled ? <>{reactiveComponent}</> : <>{regularComponent}</>
} 