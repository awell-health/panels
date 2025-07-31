'use client'

import type { JsonToggleProps } from './types'
import { cn } from '@/lib/utils'

export function JsonToggle({ mode, onChange, className }: JsonToggleProps) {
  return (
    <div className={cn('flex items-center space-x-2', className)}>
      <button
        type="button"
        onClick={() => onChange('view')}
        className={cn(
          'btn btn-xs',
          mode === 'view' ? 'btn-primary' : 'btn-ghost',
        )}
        aria-label="Switch to view mode"
      >
        View
      </button>
      <button
        type="button"
        onClick={() => onChange('json')}
        className={cn(
          'btn btn-xs',
          mode === 'json' ? 'btn-primary' : 'btn-ghost',
        )}
        aria-label="Switch to JSON mode"
      >
        JSON
      </button>
    </div>
  )
}
