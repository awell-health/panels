import { cn } from '@/lib/utils'
import { Crown, Edit, Eye } from 'lucide-react'

type Role = 'owner' | 'editor' | 'viewer'

interface RoleBadgeProps {
  role: Role
  className?: string
  size?: 'sm' | 'md' | 'lg'
  showIcon?: boolean
}

export function RoleBadge({
  role,
  className,
  size = 'sm',
  showIcon = true,
}: RoleBadgeProps) {
  const roleConfig = {
    owner: {
      label: 'Owner',
      icon: Crown,
      className: 'badge-primary',
    },
    editor: {
      label: 'Editor',
      icon: Edit,
      className: 'badge-secondary',
    },
    viewer: {
      label: 'Viewer',
      icon: Eye,
      className: 'badge-outline',
    },
  }

  const config = roleConfig[role]
  const Icon = config.icon

  const sizeClasses = {
    sm: 'badge-sm',
    md: 'badge-md',
    lg: 'badge-lg',
  }

  return (
    <div
      className={cn(
        'badge gap-1',
        sizeClasses[size],
        config.className,
        className,
      )}
    >
      {showIcon && <Icon className="h-3 w-3" />}
      <span className="text-xs">{config.label}</span>
    </div>
  )
}
