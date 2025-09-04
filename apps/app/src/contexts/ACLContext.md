# ACL Context Provider

The ACL Context Provider provides a centralized way to manage and access user permissions for panels and views throughout the application.

## Features

- **Centralized Permission Management**: All ACL data is managed in one place
- **Lazy Loading**: ACLs are fetched only when needed
- **Caching**: Once fetched, ACLs are cached to avoid redundant API calls
- **Permission Checking**: Built-in methods to check user permissions
- **Automatic Refresh**: ACLs are automatically refreshed when changes are made

## Usage

### Basic Usage

```tsx
import { useACL, usePanelRole, useViewRole } from '@/contexts/ACLContext'

function MyComponent() {
  const { getUserRole, hasPermission } = useACL()
  
  // Get user role for a panel
  const panelRole = getUserRole('panel', '123')
  
  // Check if user has editor permission
  const canEdit = hasPermission('panel', '123', 'editor')
  
  return (
    <div>
      {canEdit && <button>Edit Panel</button>}
    </div>
  )
}
```

### Convenience Hooks

```tsx
import { usePanelRole, useViewRole } from '@/contexts/ACLContext'

function PanelComponent({ panelId }: { panelId: string }) {
  const { 
    role, 
    acl, 
    hasViewerPermission, 
    hasEditorPermission, 
    hasOwnerPermission 
  } = usePanelRole(panelId)
  
  return (
    <div>
      {hasEditorPermission && <button>Edit</button>}
      {hasOwnerPermission && <button>Delete</button>}
    </div>
  )
}
```

### Permission Guards

```tsx
import { PermissionGuard, PanelPermissionGuard, ViewPermissionGuard, ResourcePermissionGuard } from '@/components/PermissionGuard'

function PanelActions({ panelId }: { panelId: string }) {
  return (
    <div>
      <PanelPermissionGuard panelId={panelId} permission="editor">
        <button>Edit Panel</button>
      </PanelPermissionGuard>
      
      <PanelPermissionGuard panelId={panelId} permission="owner">
        <button>Delete Panel</button>
      </PanelPermissionGuard>
    </div>
  )
}

function ViewActions({ panelId, viewId }: { panelId: string, viewId: string }) {
  return (
    <div>
      {/* Check view permission first, fall back to panel permission */}
      <ResourcePermissionGuard panelId={panelId} viewId={viewId} permission="editor">
        <button>Edit View</button>
      </ResourcePermissionGuard>
      
      {/* Check only view permission */}
      <ViewPermissionGuard viewId={viewId} permission="owner">
        <button>Delete View</button>
      </ViewPermissionGuard>
    </div>
  )
}
```

### Role Badges

```tsx
import { RoleBadge } from '@/components/RoleBadge'
import { ViewRoleBadge } from '@/components/ViewRoleBadge'
import { usePanelRole, useResourceRole } from '@/contexts/ACLContext'

function PanelCard({ panelId }: { panelId: string }) {
  const { role } = usePanelRole(panelId)
  
  return (
    <div>
      <h3>Panel Title</h3>
      {role && <RoleBadge role={role} />}
    </div>
  )
}

function ViewCard({ panelId, viewId }: { panelId: string, viewId: string }) {
  const { effectiveRole } = useResourceRole(panelId, viewId)
  
  return (
    <div>
      <h3>View Title</h3>
      {effectiveRole && <ViewRoleBadge panelId={panelId} viewId={viewId} />}
    </div>
  )
}
```

## API Reference

### useACL()

Returns the main ACL context with the following methods:

- `getUserRole(resourceType, resourceId)`: Get user's role for a resource
- `getUserACL(resourceType, resourceId)`: Get full ACL object for a resource
- `hasPermission(resourceType, resourceId, permission)`: Check if user has specific permission
- `getAllUserACLs()`: Get all cached ACLs for the current user
- `refreshACL(resourceType, resourceId)`: Refresh ACL for a specific resource
- `refreshAllACLs()`: Refresh all ACLs
- `isLoading`: Loading state

### usePanelRole(panelId)

Convenience hook for panel-specific operations:

- `role`: User's role ('owner', 'editor', 'viewer', or null)
- `acl`: Full ACL object
- `hasViewerPermission`: Boolean
- `hasEditorPermission`: Boolean
- `hasOwnerPermission`: Boolean

### useViewRole(viewId)

Convenience hook for view-specific operations (same interface as usePanelRole).

### useResourceRole(panelId, viewId?)

Hook for handling nested resources (views within panels):

- `panelRole`: User's role for the panel
- `viewRole`: User's role for the view (if viewId provided)
- `effectiveRole`: The effective role (view role takes precedence over panel role)
- `panelAcl`: Full ACL object for the panel
- `viewAcl`: Full ACL object for the view (if viewId provided)
- `hasViewerPermission`: Checks both view and panel permissions
- `hasEditorPermission`: Checks both view and panel permissions
- `hasOwnerPermission`: Checks both view and panel permissions

### Permission Levels

- **viewer**: Can view the resource
- **editor**: Can view and edit the resource
- **owner**: Can view, edit, and manage permissions for the resource

### RoleBadge Component

```tsx
<RoleBadge 
  role="owner" 
  size="sm" // 'sm' | 'md' | 'lg'
  showIcon={true} // Show/hide the role icon
  className="custom-class" // Additional CSS classes
/>
```

## View-Level Permissions

Views inherit permissions from their parent panel, but can also have their own specific permissions:

### Permission Hierarchy

1. **View-specific permissions** take precedence over panel permissions
2. **Panel permissions** serve as a fallback for views
3. **Effective permissions** are the highest level of access the user has

### Example Usage

```tsx
// Check if user can edit a view (view permission OR panel permission)
const { hasEditorPermission } = useResourceRole(panelId, viewId)

// Check only view-specific permission
const { hasEditorPermission } = useViewRole(viewId)

// Display role badge showing effective permission
<ViewRoleBadge panelId={panelId} viewId={viewId} />
```

## Integration with ShareModal

The ShareModal automatically refreshes the ACL context when permissions are changed:

```tsx
// In ShareModal.tsx
const { refreshACL } = useACL()

const handleAddUser = async (email: string) => {
  await createACL(resourceType, resourceId, { userEmail: email, permission: 'viewer' })
  await refreshACL(resourceType, resourceId) // Refresh context
}
```

## Performance Considerations

- ACLs are fetched lazily (only when requested)
- Once fetched, ACLs are cached in memory
- ACLs are automatically cleared when the user changes
- Use `refreshACL()` to update cached data when permissions change
