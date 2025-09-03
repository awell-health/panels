import { RoleBadge } from './RoleBadge'
import { useResourceRole } from '@/contexts/ACLContext'

interface ViewRoleBadgeProps {
  panelId: string | number
  viewId?: string | number
  className?: string
  showIcon?: boolean
  showPanelFallback?: boolean // Show panel role if no view role exists
}

export function ViewRoleBadge({
  panelId,
  viewId,
  className,
  showIcon = true,
  showPanelFallback = true,
}: ViewRoleBadgeProps) {
  const { viewRole, panelRole, effectiveRole } = useResourceRole(
    panelId,
    viewId,
  )

  if (!effectiveRole) {
    return null
  }

  return (
    <div className="flex items-center gap-1">
      <RoleBadge
        role={effectiveRole as 'owner' | 'editor' | 'viewer'}
        className={className}
        showIcon={showIcon}
      />
      {viewId && viewRole && showPanelFallback && (
        <span className="text-xs text-gray-500">(view)</span>
      )}
      {viewId && !viewRole && panelRole && showPanelFallback && (
        <span className="text-xs text-gray-500">(panel)</span>
      )}
    </div>
  )
}
