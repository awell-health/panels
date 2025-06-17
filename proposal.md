# Column Tagging System Proposal

## Current Situation

Currently, there's a mismatch between how columns are organized in the frontend and backend:

### Frontend (App)
- Panels have two distinct collections of columns:
  - `patientViewColumns`: Columns for patient data
  - `taskViewColumns`: Columns for task data
- These collections are treated as separate entities, but they're just different groupings of the same column types

### Backend (Services)
- Panels have a single collection of columns
- Columns are categorized by their type:
  - `baseColumns`: Direct data source columns
  - `calculatedColumns`: Computed columns
- No concept of different column collections or views

## Problem

The current structure creates several issues:
1. Misalignment between frontend and backend data models
2. Unnecessary complexity in managing different column collections
3. Limited flexibility for future column organization
4. Potential confusion between "view" columns and actual view objects

## Proposed Solution: Column Tagging System

### Core Concept
Introduce a tagging system for columns where each column can have multiple tags. This allows for flexible column organization without changing the underlying data structure.

### Implementation Details

#### 1. Backend Changes (Services)

```typescript
// In the Column entity
@Entity()
export class Column {
  // ... existing fields ...

  @Property()
  tags: string[] = []

  // ... rest of the entity
}
```

#### 2. Frontend Changes (App)

```typescript
// In the column creation process
const createPanelColumns = async (panel: PanelDefinition) => {
  // Create all columns as base columns
  const allColumns = [
    ...panel.patientViewColumns.map(col => ({
      ...col,
      tags: ['panel:patients']
    })),
    ...panel.taskViewColumns.map(col => ({
      ...col,
      tags: ['panel:tasks']
    }))
  ]

  // Create columns with their respective tags
  await Promise.all(allColumns.map(column => 
    panelsAPI.columns.createBase({
      ...column,
      tags: column.tags
    })
  ))
}
```

### Benefits

1. **Flexibility**: 
   - Columns can belong to multiple collections
   - Easy to add new column groupings without schema changes
   - Support for future column organization needs

2. **Simplicity**:
   - Single source of truth for columns
   - No need for separate collections
   - Clearer distinction between column organization and view objects

3. **Extensibility**:
   - Easy to add new tags for different purposes
   - Support for future features like column sharing
   - Better support for complex column relationships

4. **Performance**:
   - Single query to get all columns
   - Filtering by tags is efficient
   - Reduced data duplication

### Migration Strategy

1. **Phase 1: Backend Changes**
   - Add tags field to Column entity
   - Update column creation/update endpoints
   - Add tag-based filtering to column queries

2. **Phase 2: Frontend Adaptation**
   - Update column creation process to include tags
   - Modify column filtering to use tags
   - Update UI to reflect new column organization

3. **Phase 3: Data Migration**
   - Add tags to existing columns based on their current organization
   - Validate data consistency
   - Update documentation

### API Changes

```typescript
// New column creation endpoint
POST /columns
{
  name: string
  type: string
  tags: string[]
  // ... other fields
}

// New column query endpoint
GET /panels/:id/columns?tags=panel:patients,panel:tasks
```

### Considerations

1. **Backward Compatibility**:
   - Existing columns will need default tags
   - API endpoints should handle missing tags
   - Frontend should handle both tagged and untagged columns

2. **Performance**:
   - Index tags for efficient querying
   - Consider caching strategies
   - Optimize tag-based filtering

3. **Security**:
   - Validate tags on creation/update
   - Implement tag-based access control
   - Sanitize tag values

## Next Steps

1. Review and approve this proposal
2. Create detailed implementation plan
3. Set up development environment
4. Begin implementation in phases
5. Test and validate changes
6. Deploy and monitor

## Questions for Review

1. Should we implement any tag validation rules?
2. Do we need to support tag hierarchies?
3. Should we add any specific indexes for tag-based queries?
4. How should we handle tag-based permissions?
5. What is the expected volume of tags per column?

## Feedback Request

Please review this proposal and provide feedback on:
1. Overall approach and feasibility
2. Implementation details
3. Migration strategy
4. Any concerns or suggestions
5. Additional considerations we should address 