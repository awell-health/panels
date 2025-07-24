# Tailwind CSS Rules for AI Code Assistants

This document provides comprehensive rules for AI code assistants to generate proper Tailwind CSS classes that follow this project's established patterns and conventions.

## Project Setup
- **Framework**: Next.js with TypeScript
- **UI Library**: DaisyUI (built on Tailwind CSS)
- **Plugins**: DaisyUI, @tailwindcss/typography
- **Utility Function**: Always use `cn()` from `@/lib/utils`
- **Base Font Size**: `text-xs` is inherited by default - don't add unless overriding

## Core Rules

### 1. Always Use the `cn()` Utility Function
```tsx
import { cn } from '@/lib/utils'

// ✅ CORRECT - Always use cn() for combining classes
<div className={cn('base-classes', condition && 'conditional-classes', className)}>

// ❌ WRONG - Don't use template literals
<div className={`base-classes ${condition ? 'conditional-classes' : ''}`}>
```

### 2. Typography Standards

#### Font Sizes
- **Inherited**: `text-xs` (default, don't specify unless overriding)
- **Headlines**: `text-sm` for section headers and titles
- **Never go larger** than `text-sm` without specific justification

#### Text Colors (Only Two Colors)
- **Primary Text**: `text-gray-900` for main content, values, headings
- **Secondary Text**: `text-gray-600` for labels, captions, descriptions

#### Font Weight
- **Default**: `font-normal` (inherited, don't specify)
- **Emphasis**: `font-medium` for highlighting important text
- **Never**: Use `font-bold` or `font-semibold` 

```tsx
// ✅ CORRECT - Typography examples
<h3 className="font-medium text-gray-900">Section Title</h3>  // headline
<p className="text-gray-900">Main content text</p>           // body text
<label className="text-gray-600">Field Label</label>         // labels
<span className="font-medium text-gray-900">Emphasized</span>  // emphasis
```

### 3. Color Palette

#### Borders
- **Standard**: `border-gray-200` for all borders
- **Subtle dividers**: `border-gray-100` for internal dividers

#### Backgrounds
- **Cards**: `bg-white` (primary container background)
- **Hover states**: `hover:bg-gray-50` or `hover:bg-gray-100`

#### Button Colors (Based on TaskAsignment.tsx)
- **Blue buttons**: `text-blue-600 border-blue-200 hover:bg-blue-50`
- **Red buttons**: `text-red-600 border-red-200 hover:bg-red-50`
- **Disabled**: `text-gray-600` with `border-0`

```tsx
// ✅ CORRECT - Button color patterns
<button className={cn(
  'px-3 py-1 rounded border transition-colors cursor-pointer',
  'text-blue-600 border-blue-200 hover:bg-blue-50'
)}>
```

### 4. Spacing Standards

#### Padding
- **Standard**: `p-2` for most containers
- **Cards**: `p-3` for card headers
- **Content**: `px-3 pb-3` for card content areas

#### Margins and Gaps
- **Standard gap**: `gap-2` for flex/grid layouts
- **Vertical spacing**: `space-y-2` for stacked elements
- **Larger sections**: `mb-4` for component separation

```tsx
// ✅ CORRECT - Spacing examples
<div className="p-2 rounded-lg border border-gray-200">        // standard container
<div className="p-3 flex items-center justify-between">        // card header
<div className="px-3 pb-3 border-t border-gray-100">          // card content
<div className="space-y-2">                                   // stacked content
```

### 5. Border and Shape Standards

#### Border Radius
- **Standard**: `rounded-md` for buttons, inputs, small cards
- **Larger containers**: `rounded-lg` for main cards and modals
- **Never**: Use `rounded` (too small) or `rounded-xl` (too large)

#### Borders
- **Default**: `border border-gray-200`
- **Internal dividers**: `border-t border-gray-100`

```tsx
// ✅ CORRECT - Border examples
<div className="border border-gray-200 rounded-lg bg-white">   // main card
<button className="border border-gray-200 rounded-md">        // button
<div className="border-t border-gray-100">                    // divider
```

### 6. Component Patterns

#### Card Pattern (Based on ExpandableCard.tsx)
```tsx
<div className="border border-gray-200 rounded-lg bg-white">
  {/* Header */}
  <button className="w-full p-3 flex items-center justify-between hover:bg-gray-100 transition-colors">
    <h4 className="font-medium text-gray-900">Card Title</h4>
    <ChevronDown className="h-4 w-4 text-gray-500" />
  </button>
  
  {/* Content */}
  <div className="px-3 pb-3 border-t border-gray-100">
    <div className="space-y-2">
      {/* Card content */}
    </div>
  </div>
</div>
```

#### Button Pattern (Based on TaskAsignment.tsx)
```tsx
<button className={cn(
  'flex items-center gap-1 px-3 py-1 rounded border transition-colors cursor-pointer',
  // State-based colors
  'text-blue-600 border-blue-200 hover:bg-blue-50',  // primary
  'text-red-600 border-red-200 hover:bg-red-50',     // danger
  'text-gray-600 border-0'                           // disabled
)}>
  Button Text
</button>
```

#### Badge Pattern (Based on TaskStatusBadge.tsx)
```tsx
<div className="badge badge-soft badge-sm text-white bg-blue-400">
  Badge Text
</div>

// Available badge colors:
// bg-gray-400 (neutral/cancelled)
// bg-blue-400 (in-progress/requested)  
// bg-green-500 (completed/received)
// bg-yellow-400 (accepted/pending)
// bg-red-400 (failed/rejected)
// bg-purple-400 (ready)
```

#### Row Data Item Pattern (Based on CardRowItem.tsx)
```tsx
<div className="flex justify-between">
  <div className="text-gray-600 max-w-[32%] break-words">
    Label Text
  </div>
  <div className="text-gray-900 max-w-[65%] text-right pr-1.5 break-words">
    Value Text
  </div>
</div>
```

### 7. Interactive States

#### Required States
- **Hover**: Always include hover states for interactive elements
- **Transition**: `transition-colors` for smooth color changes
- **Cursor**: `cursor-pointer` for clickable elements
- **Disabled**: `disabled:opacity-50 disabled:cursor-not-allowed`

```tsx
// ✅ CORRECT - Complete interactive states
<button className="px-3 py-1 rounded border transition-colors cursor-pointer hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
```

### 8. Layout Patterns

#### Flex Layouts
- **Space between**: `flex items-center justify-between`
- **Centered**: `flex items-center justify-center`
- **With gap**: `flex items-center gap-2`

#### Responsive Design
- **Mobile-first**: Start with mobile styles, add `sm:`, `md:`, `lg:` as needed
- **Grid**: Use CSS Grid for complex layouts (already defined in globals.css)

```tsx
// ✅ CORRECT - Layout examples
<div className="flex items-center justify-between">     // header layout
<div className="flex items-center gap-2">              // icon + text
<div className="space-y-2">                           // stacked content
```

### 9. Icon Standards

#### Icon Sizing
- **Small**: `h-4 w-4` for buttons and inline icons
- **Standard**: `h-5 w-5` for standalone icons
- **Never**: Use `h-3 w-3` (too small) or `h-6 w-6` (too large)

#### Icon Colors
- **Default**: `text-gray-500` for neutral icons
- **Interactive**: Match the parent text color

```tsx
// ✅ CORRECT - Icon examples
<ChevronDown className="h-4 w-4 text-gray-500" />
<LoaderCircle className="h-4 w-4 animate-spin" />
```

### 10. Form Elements

#### Input Fields
```tsx
<div className="space-y-2">
  <label className="text-gray-600">Field Label</label>
  <input className="w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
</div>
```

#### Error States
```tsx
<input className="border-red-200 focus:ring-red-500" />
<p className="text-red-600">Error message</p>
```

## Anti-Patterns to Avoid

### ❌ DON'T DO:
- Don't specify `text-xs` everywhere (it's inherited)
- Don't use colors other than `text-gray-900` and `text-gray-600` for text
- Don't use `font-bold` or `font-semibold` 
- Don't use font sizes larger than `text-sm`
- Don't use `rounded` or `rounded-xl` - stick to `rounded-md` and `rounded-lg`
- Don't use borders other than `border-gray-200` and `border-gray-100`
- Don't use padding other than `p-2` and `p-3` without justification
- Don't use arbitrary values like `w-[200px]`
- Don't forget hover states and transitions
- Don't mix DaisyUI and custom styles inconsistently

### ✅ DO:
- Use `cn()` for all className combinations
- Prefer DaisyUI components when they fit (`badge`, `modal`, etc.)
- Follow the established component patterns above
- Include proper interactive states (hover, disabled, transitions)
- Use semantic HTML elements
- Include proper accessibility attributes

## Example Component Following All Rules

```tsx
import { cn } from '@/lib/utils'
import { ChevronDown, User } from 'lucide-react'
import { useState } from 'react'

interface UserCardProps {
  name: string
  email: string
  isActive?: boolean
  onToggle?: () => void
  className?: string
}

export function UserCard({ 
  name, 
  email, 
  isActive = false, 
  onToggle,
  className 
}: UserCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  
  return (
    <div className={cn('border border-gray-200 rounded-lg bg-white', className)}>
      {/* Header */}
      <div className="p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-gray-500" />
          <div>
            <h4 className="font-medium text-gray-900">{name}</h4>
            <p className="text-gray-600">{email}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <div className={cn(
            'badge badge-soft badge-sm text-white',
            isActive ? 'bg-green-500' : 'bg-gray-400'
          )}>
            {isActive ? 'Active' : 'Inactive'}
          </div>
          
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <ChevronDown className={cn(
              'h-4 w-4 text-gray-500 transition-transform',
              isExpanded && 'rotate-180'
            )} />
          </button>
        </div>
      </div>
      
      {/* Expandable Content */}
      {isExpanded && (
        <div className="px-3 pb-3 border-t border-gray-100">
          <div className="space-y-2">
            <div className="flex justify-between">
              <div className="text-gray-600">Status</div>
              <div className="text-gray-900">{isActive ? 'Active User' : 'Inactive User'}</div>
            </div>
            
            {onToggle && (
              <button
                onClick={onToggle}
                className={cn(
                  'flex items-center gap-1 px-3 py-1 rounded border transition-colors cursor-pointer',
                  isActive 
                    ? 'text-red-600 border-red-200 hover:bg-red-50'
                    : 'text-blue-600 border-blue-200 hover:bg-blue-50'
                )}
              >
                {isActive ? 'Deactivate' : 'Activate'} User
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
```

This component demonstrates all the rules: `cn()` usage, proper typography, color scheme, spacing, interactive states, and follows the established patterns from the codebase. 