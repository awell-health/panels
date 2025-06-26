# Reactive Data Storage Implementation Proposal

## Problem Statement

The current architecture has a critical issue with column synchronization between panels and views:

1. **Column Synchronization Problem**: When a column name or type is changed in a view or panel, this change is not automatically reflected in other views referencing that column
2. **UI Inconsistency**: Users need to refresh the page to see changes, which is not acceptable for a modern web application
3. **Data Model Mismatch**: The frontend model differs from the backend model, requiring complex type adapters and manual synchronization

## Current Architecture Analysis

### Current Data Flow
```
Backend API → API Storage Adapter → Type Adapters → Panel Store → React Components
```

### Issues Identified
1. **Imperative Updates**: Changes are made imperatively and don't propagate automatically
2. **Complex Type Mapping**: Multiple layers of type conversion between frontend and backend
3. **Manual State Management**: Each component manages its own state without automatic synchronization
4. **Cache Invalidation**: Manual cache invalidation is error-prone and inconsistent

## Solution Comparison: TanStack DB vs TinyBase

### TanStack DB Analysis
**Pros:**
- Built on TanStack Query (already familiar ecosystem)
- Optimistic mutations with automatic rollback
- Live queries with differential dataflow
- Strong TypeScript support
- Collections and normalized data structure
- Built-in sync capabilities

**Cons:**
- Still in development (not yet released)
- Less mature ecosystem
- Limited documentation and community support

### TinyBase Analysis
**Pros:**
- Mature and stable (v6.3)
- Extremely lightweight (5.3kB - 11.7kB)
- Built-in React bindings
- Excellent TypeScript support
- Rich feature set (indexes, relationships, metrics)
- 100% test coverage
- Active development and community

**Cons:**
- Different paradigm from current TanStack Query usage
- Requires learning new API patterns

## Recommended Solution: TinyBase

**Rationale:**
1. **Maturity**: TinyBase is production-ready with extensive testing
2. **Size**: Minimal bundle impact
3. **React Integration**: Native React hooks and components
4. **Feature Completeness**: All required features available
5. **Performance**: Sub-millisecond queries and fine-grained reactivity

## Implementation Plan

### Phase 1: Core Reactive Store Setup

#### 1.1 Create Reactive Store Structure
```typescript
// apps/app/src/lib/reactive-store/reactive-panel-store.ts
import { createStore, Store } from 'tinybase'

interface ReactivePanelStore {
  panels: Store
  views: Store
  columns: Store
  relationships: Store
}

// Tables structure:
// panels: { panelId -> panelData }
// views: { viewId -> viewData }
// columns: { columnId -> columnData }
// relationships: { panelId -> { views: [viewIds], columns: [columnIds] } }
```

#### 1.2 Create Type Definitions
```typescript
// apps/app/src/types/reactive-worklist.ts
export interface ReactivePanelDefinition {
  id: string
  title: string
  filters: Filter[]
  createdAt: Date
  updatedAt: Date
}

export interface ReactiveColumnDefinition {
  id: string
  key: string
  name: string
  type: ColumnType
  description?: string
  properties?: ColumnProperties
  panelId: string
  viewType: 'patient' | 'task'
}

export interface ReactiveViewDefinition {
  id: string
  title: string
  panelId: string
  viewType: 'patient' | 'task'
  columnIds: string[]
  filters: Filter[]
  sortConfig?: SortConfig[]
  createdAt: Date
  updatedAt: Date
}
```

### Phase 2: Reactive Store Implementation

#### 2.1 Create Reactive Panel Store
```typescript
// apps/app/src/lib/reactive-store/reactive-panel-store.ts
export class ReactivePanelStore {
  private store: Store
  private relationships: Store
  private apiAdapter: APIStorageAdapter

  constructor(userId?: string, organizationSlug?: string) {
    this.store = createStore()
    this.relationships = createStore()
    this.apiAdapter = new APIStorageAdapter(userId, organizationSlug)
    this.initializeStore()
  }

  private initializeStore() {
    // Set up tables
    this.store.setTable('panels', {})
    this.store.setTable('views', {})
    this.store.setTable('columns', {})
    
    // Set up relationships
    this.relationships.setTable('panelViews', {})
    this.relationships.setTable('panelColumns', {})
    this.relationships.setTable('viewColumns', {})
  }

  // Reactive methods for CRUD operations
  async loadPanels(): Promise<void> {
    const panels = await this.apiAdapter.getPanels()
    
    // Clear existing data
    this.store.delTable('panels')
    this.store.delTable('views')
    this.store.delTable('columns')
    
    // Load panels
    panels.forEach(panel => {
      this.store.setRow('panels', panel.id, {
        title: panel.title,
        filters: panel.filters,
        createdAt: panel.createdAt,
        updatedAt: new Date()
      })
      
      // Load columns
      panel.patientViewColumns.forEach(col => {
        this.store.setRow('columns', col.id, {
          ...col,
          panelId: panel.id,
          viewType: 'patient'
        })
      })
      
      panel.taskViewColumns.forEach(col => {
        this.store.setRow('columns', col.id, {
          ...col,
          panelId: panel.id,
          viewType: 'task'
        })
      })
      
      // Load views
      panel.views?.forEach(view => {
        this.store.setRow('views', view.id, {
          title: view.title,
          panelId: panel.id,
          viewType: view.viewType,
          columnIds: view.columns.map(c => c.id),
          filters: view.filters,
          sortConfig: view.sortConfig,
          createdAt: view.createdAt,
          updatedAt: new Date()
        })
      })
    })
  }

  // Column operations with automatic propagation
  async updateColumn(columnId: string, updates: Partial<ReactiveColumnDefinition>): Promise<void> {
    // Update in store (optimistic)
    const currentColumn = this.store.getRow('columns', columnId)
    if (!currentColumn) return
    
    this.store.setRow('columns', columnId, {
      ...currentColumn,
      ...updates,
      updatedAt: new Date()
    })
    
    // Update in API
    try {
      await this.apiAdapter.updateColumn(columnId, updates)
    } catch (error) {
      // Rollback on error
      this.store.setRow('columns', columnId, currentColumn)
      throw error
    }
  }

  // View operations
  async updateView(viewId: string, updates: Partial<ReactiveViewDefinition>): Promise<void> {
    const currentView = this.store.getRow('views', viewId)
    if (!currentView) return
    
    this.store.setRow('views', viewId, {
      ...currentView,
      ...updates,
      updatedAt: new Date()
    })
    
    try {
      await this.apiAdapter.updateView(currentView.panelId, viewId, updates)
    } catch (error) {
      this.store.setRow('views', viewId, currentView)
      throw error
    }
  }

  // Reactive queries
  getPanelColumns(panelId: string, viewType: 'patient' | 'task'): ReactiveColumnDefinition[] {
    return this.store.getTable('columns')
      .filter(col => col.panelId === panelId && col.viewType === viewType)
      .sort((a, b) => (a.properties?.display?.order || 0) - (b.properties?.display?.order || 0))
  }

  getViewColumns(viewId: string): ReactiveColumnDefinition[] {
    const view = this.store.getRow('views', viewId)
    if (!view) return []
    
    return view.columnIds
      .map(colId => this.store.getRow('columns', colId))
      .filter(Boolean)
  }
}
```

#### 2.2 Create React Hooks
```typescript
// apps/app/src/hooks/use-reactive-panel-store.tsx
import { useStore, useRow, useTable } from 'tinybase/ui-react'
import { ReactivePanelStore } from '@/lib/reactive-store/reactive-panel-store'

export function useReactivePanelStore() {
  const store = useContext(ReactivePanelStoreContext)
  
  return {
    // Panel operations
    panels: useTable(store.store, 'panels'),
    getPanel: (id: string) => useRow(store.store, 'panels', id),
    
    // Column operations
    columns: useTable(store.store, 'columns'),
    getColumn: (id: string) => useRow(store.store, 'columns', id),
    
    // View operations
    views: useTable(store.store, 'views'),
    getView: (id: string) => useRow(store.store, 'views', id),
    
    // Methods
    updateColumn: store.updateColumn.bind(store),
    updateView: store.updateView.bind(store),
    loadPanels: store.loadPanels.bind(store)
  }
}
```

### Phase 3: Component Migration

#### 3.1 Create Reactive Components
```typescript
// apps/app/src/app/panel/[panel]/page-reactive.tsx
export default function WorklistPageReactive() {
  const { getPanel, getPanelColumns, updateColumn } = useReactivePanelStore()
  const params = useParams()
  const panelId = params.panel as string
  
  // Reactive data - automatically updates when store changes
  const panel = getPanel(panelId)
  const patientColumns = getPanelColumns(panelId, 'patient')
  const taskColumns = getPanelColumns(panelId, 'task')
  
  const onColumnUpdate = async (columnId: string, updates: Partial<ColumnDefinition>) => {
    await updateColumn(columnId, updates)
    // No need to manually update local state - it's reactive!
  }
  
  // Rest of component remains the same
}
```

#### 3.2 Create Reactive View Component
```typescript
// apps/app/src/app/panel/[panel]/view/[view]/page-reactive.tsx
export default function WorklistViewPageReactive() {
  const { getView, getViewColumns, updateView, updateColumn } = useReactivePanelStore()
  const params = useParams()
  const viewId = params.view as string
  
  // Reactive data
  const view = getView(viewId)
  const columns = getViewColumns(viewId)
  
  const onColumnUpdate = async (columnId: string, updates: Partial<ColumnDefinition>) => {
    // Update column globally - all views will automatically reflect the change
    await updateColumn(columnId, updates)
  }
  
  // Rest of component remains the same
}
```

### Phase 4: Feature Flag Implementation

Add a single feature flag to control the entire reactive data storage system:

```typescript
// In apps/app/src/utils/featureFlags.ts
export const FEATURE_FLAGS = {
  // ... existing flags ...

  // Enable reactive data storage with TinyBase
  ENABLE_REACTIVE_DATA_STORAGE: false,
} as const
```

This single flag will control:
- Whether to use the new reactive store implementation
- Whether to use TinyBase for data management
- Whether to use the new reactive hooks and components

**Benefits of single flag:**
- **Simpler management**: One flag to enable/disable the entire feature
- **Atomic deployment**: Either all reactive features are on or off
- **Easier testing**: Clear on/off state for the entire system
- **Reduced complexity**: No need to manage multiple interdependent flags

**Usage:**
```typescript
import { isFeatureEnabled } from '@/utils/featureFlags'

// In components
if (isFeatureEnabled('ENABLE_REACTIVE_DATA_STORAGE')) {
  // Use reactive implementation
  return <ReactiveWorklistPage />
} else {
  // Use current implementation
  return <WorklistPage />
}
```

### Phase 5: Migration Strategy

#### 5.1 File Naming Convention
All new reactive files will be suffixed with `-reactive`:
- `page.tsx` → `page-reactive.tsx`
- `use-panel-store.tsx` → `use-reactive-panel-store.tsx`
- `api-storage-adapter.ts` → `reactive-api-storage-adapter.ts`

#### 5.2 Gradual Migration
1. **Phase 1**: Implement reactive store alongside existing store
2. **Phase 2**: Create reactive components with feature flag
3. **Phase 3**: Test reactive components thoroughly
4. **Phase 4**: Enable feature flag for testing
5. **Phase 5**: Migrate all components to reactive version
6. **Phase 6**: Remove old imperative store

## Benefits of This Approach

### 1. Automatic Column Synchronization
- Changes to column properties automatically propagate to all views
- No manual state management required
- Real-time UI updates without page refresh

### 2. Improved Performance
- Fine-grained reactivity (only changed components re-render)
- Sub-millisecond queries
- Optimistic updates with automatic rollback

### 3. Better Developer Experience
- Simplified state management
- Automatic type safety
- Built-in debugging tools

### 4. Maintainability
- Clear separation of concerns
- Easier testing with reactive patterns
- Reduced complexity in components

## Implementation Timeline

### Week 1: Core Setup
- [ ] Install TinyBase dependencies
- [ ] Create reactive store structure
- [ ] Implement basic CRUD operations
- [ ] Add feature flags

### Week 2: Component Migration
- [ ] Create reactive panel page
- [ ] Create reactive view page
- [ ] Implement reactive hooks
- [ ] Add type definitions

### Week 3: Testing & Integration
- [ ] Test reactive components
- [ ] Validate column synchronization
- [ ] Performance testing
- [ ] Bug fixes

### Week 4: Production Deployment
- [ ] Enable feature flag for testing
- [ ] Monitor performance
- [ ] Gradual rollout
- [ ] Documentation updates

## Risk Mitigation

### 1. Backward Compatibility
- Feature flag ensures old functionality remains available
- Gradual migration reduces risk
- Easy rollback if issues arise

### 2. Performance Impact
- TinyBase is extremely lightweight
- Fine-grained reactivity reduces unnecessary re-renders
- Comprehensive testing before deployment

### 3. Data Consistency
- Optimistic updates with automatic rollback
- Proper error handling
- Transaction-like operations

## Conclusion

This proposal addresses the core column synchronization issue while providing a foundation for future reactive features. The use of TinyBase provides a mature, performant solution that integrates well with React and maintains the existing UI/UX.

The feature flag approach ensures a smooth transition with minimal risk, allowing for thorough testing before full deployment.

---

**Original Prompt for Reference:**
```
We have an issue with panels and views. As you can see, a panel has two sets of columns, patientView columns and taskView columns. A view, on the other hand, has a collection of visible columns.
When we try to change column names or column type in views or in the panel, this change is not reflected automatically in everything referencing that column. This makes the UI buggy, because even if I change a column name on a view, that column name remains unchanged on the other views referencing that column, and also on the panel.
To make the change visible on the UI, the user needs to refresh the page. And this is not acceptable.
There is another aspect to consider: the model used in the pages, the one for View and Panel, is different from the data model used in the backend. We use to manage the logic and required transformation in the @use-panel-store.tsx, then we use the @storage-factory.ts to abstract the storage, which is now mainly the @api-storage-adapter.ts.
Since the problem I'm describing is quite blocking for the correct usage of the application, I'm thinking about changing the way the pages are bound to data and receive/manage data. I want to implement a reactive data storage, and I'm in doubt between tanskatckdb (@https://tanstack.com/db/latest ) and tinybase (@https://tinybase.org/)
Now I want you to come out with:
- What could be the best fitting solution between tanstackdb and tinybase, and why
- A proposal about the solution and all the changes required to change the actual model from an imperativa data bind to a reactive data bind using the best of the two options
- A proposal about the required changes need to implent all the actual features using the reactive model
The change we are introducing should keep all the features actually implemented in the pages and the UI for the panel and views must be exactly the same
To make the change smoother and easier to manage, I want you to implement the changes (once you have my positive feedback) by duplicating each file that requires the change naming it in wya that it could be recognized as the one with these new changes.
I want you to make this entire change driven by a new feature flag to be created in @featureFlags.ts
Write down the full proposal in a markdown file so that I can use it for later actions. Include in the markdown also this prompt for later usage
Before making any change to the code, wait for my positive feedback
``` 