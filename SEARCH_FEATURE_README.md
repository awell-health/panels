# Additional Information Search Feature

## Overview
This feature adds search functionality to the "Additional Information" sections in the worklist drawer. Users can now search through key-value data using different search modes.

## Features
- **Multiple Search Modes**: Search by keys, values, or both
- **Real-time Search**: Instant filtering as you type
- **Highlighted Results**: Visual highlighting of matched terms
- **Search Statistics**: Shows "X of Y results" 
- **Case-insensitive**: Better user experience

## Implementation

### New Components Created
1. **`useKeyValueSearch.ts`** - Custom hook for search logic
2. **`SearchableKeyValueSection.tsx`** - Reusable search UI component
3. **`SearchableAdditionalInfo.tsx`** - Wrapper for TaskDetails additional info
4. **`SearchableExtensionDetails.tsx`** - Searchable version of ExtensionDetails
5. **`featureFlags.ts`** - Feature flags for easy enable/disable

### Modified Components
1. **`TaskDetails.tsx`** - Uses searchable components conditionally
2. **`PatientDetails.tsx`** - Uses searchable extensions conditionally

## Usage

### Search Modes
- **Key Search**: Find specific field names (e.g., "patient ID", "diagnosis")
- **Value Search**: Find specific values (e.g., "diabetes", "2023")  
- **Both Search**: Search across both keys and values (default)

### UI Location
- Search bar appears above the "Additional Information" title
- Dropdown on the right side of search bar to change search mode
- Results counter appears below search bar when searching

## Easy Reversion

### Option 1: Feature Flags (Recommended)
To disable the search feature entirely, edit `apps/app/src/utils/featureFlags.ts`:

```typescript
export const FEATURE_FLAGS = {
  ENABLE_ADDITIONAL_INFO_SEARCH: false, // Disable task additional info search
  ENABLE_EXTENSION_SEARCH: false       // Disable extension search
} as const
```

### Option 2: Complete Removal
If you want to completely remove the feature:

1. **Delete new files:**
   ```bash
   rm apps/app/src/hooks/useKeyValueSearch.ts
   rm apps/app/src/components/SearchableKeyValueSection.tsx
   rm apps/app/src/app/panel/[panel]/components/SearchableAdditionalInfo.tsx
   rm apps/app/src/app/panel/[panel]/components/SearchableExtensionDetails.tsx
   rm apps/app/src/utils/featureFlags.ts
   ```

2. **Revert TaskDetails.tsx:**
   - Remove the new imports
   - Replace the conditional rendering with the original additional info section
   - Replace the conditional ExtensionDetails with the original

3. **Revert PatientDetails.tsx:**
   - Remove the new imports  
   - Replace the conditional ExtensionDetails with the original

## Files Changed

### New Files
- `apps/app/src/hooks/useKeyValueSearch.ts`
- `apps/app/src/components/SearchableKeyValueSection.tsx`
- `apps/app/src/app/panel/[panel]/components/SearchableAdditionalInfo.tsx`
- `apps/app/src/app/panel/[panel]/components/SearchableExtensionDetails.tsx`
- `apps/app/src/utils/featureFlags.ts`

### Modified Files
- `apps/app/src/app/panel/[panel]/components/TaskDetails.tsx`
- `apps/app/src/app/panel/[panel]/components/PatientDetails.tsx`

## Technical Details

### Data Structure
The search works with key-value pairs:
```typescript
interface KeyValueItem {
  key: string        // Field name
  value: string      // Field value  
  originalIndex: number  // Original position
}
```

### Performance
- Client-side filtering for fast response
- Debounced search (300ms) to prevent excessive processing
- Minimal re-renders using React.useMemo

### Accessibility
- Proper ARIA labels
- Keyboard navigation support
- Screen reader friendly

## Testing
1. Open a worklist with tasks/patients that have additional information
2. Click on a row to open the drawer
3. Look for the search bar above "Additional Information"
4. Try different search modes and terms
5. Verify highlighting and result counts work correctly 