# Frontend Application (@panels/app)

The frontend application is a Next.js-based web application that provides the user interface for the Panels Management System. Built with React 19, Tailwind CSS, and TypeScript, it offers a modern, responsive experience for managing panels, views, and data.

## Overview

**Package Name**: `@panels/app`  
**Location**: `apps/app/`  
**Framework**: Next.js 15.3.3 with React 19  
**Build Tool**: Next.js built-in bundler  
**Port**: 3003 (development)

## Technology Stack

### Core Framework
- **Next.js 15.3.3** - React framework with SSR/SSG support
- **React 19** - Latest React with concurrent features
- **TypeScript 5.7.2** - Type safety and developer experience

### Styling & UI
- **Tailwind CSS 4.1.7** - Utility-first CSS framework
- **DaisyUI 5.0.43** - Component library for Tailwind
- **CSS Modules** - Scoped styling when needed

### Authentication & State
- **NextAuth 5.0.0-beta.25** - Authentication solution
- **React Context** - State management
- **React Hooks** - Local component state

### API Integration
- **Custom API Client** - Type-safe API integration
- **Zod Validation** - Runtime validation
- **Fetch API** - HTTP client

## Project Structure

```
apps/app/
├── src/
│   ├── api/                    # API client modules
│   │   ├── panelsAPI.ts       # Panel operations
│   │   └── viewsAPI.ts        # View operations
│   ├── components/            # Reusable UI components
│   │   ├── ui/               # Basic UI components
│   │   ├── forms/            # Form components
│   │   └── panels/           # Panel-specific components
│   ├── pages/                # Next.js pages and routing
│   │   ├── api/              # API routes (if needed)
│   │   ├── panels/           # Panel pages
│   │   └── views/            # View pages
│   ├── hooks/                # Custom React hooks
│   ├── types/                # Frontend-specific types
│   ├── utils/                # Utility functions
│   └── styles/               # Global styles
├── public/                   # Static assets
├── next.config.js           # Next.js configuration
├── tailwind.config.js       # Tailwind configuration
├── tsconfig.json           # TypeScript configuration
└── package.json            # Package configuration
```

## Key Features

### Panel Management Interface
- **Panel Creation**: Intuitive forms for creating new panels
- **Panel Dashboard**: Overview of all user panels
- **Panel Configuration**: Advanced settings and metadata
- **Real-time Updates**: Live synchronization of panel changes

### View Builder
- **Drag & Drop Interface**: Visual view construction
- **Column Management**: Add, remove, and configure columns
- **Filter Builder**: Advanced filtering interface
- **Sort Configuration**: Multi-level sorting setup

### Data Source Integration
- **Connection Wizard**: Step-by-step data source setup
- **Schema Detection**: Automatic column discovery
- **Data Preview**: Live data previews during setup
- **Sync Status**: Real-time synchronization monitoring

### Multi-tenant Support
- **Tenant Switching**: Easy tenant context switching
- **User Management**: Role-based access controls
- **Permission UI**: Granular permission management
- **Audit Trails**: Change tracking and history

## API Client Architecture

The frontend uses a custom API client that provides type-safe communication with the backend:

### panelsAPI Module
```typescript
// Core panel operations
await panelsAPI.create(panelData)
await panelsAPI.all(tenantId, userId)
await panelsAPI.get({ id: panelId })
await panelsAPI.update(panelData)
await panelsAPI.delete({ id: panelId })

// Data source operations
await panelsAPI.dataSources.create(panelId, dataSourceData)
await panelsAPI.dataSources.list(panelId, tenantId, userId)
await panelsAPI.dataSources.sync(panelId, dataSourceId, tenantId, userId)

// Column operations
await panelsAPI.columns.createBase(panelId, columnData)
await panelsAPI.columns.createCalculated(panelId, columnData)
await panelsAPI.columns.list(panelId, tenantId, userId)
```

### viewsAPI Module
```typescript
// View operations
await viewsAPI.create(viewData)
await viewsAPI.all(panelId, tenantId, userId)
await viewsAPI.get({ id: viewId })
await viewsAPI.update(viewData)

// Publishing operations
await viewsAPI.publish({ view: { id: viewId }, tenantId, userId })

// Sorting operations
await viewsAPI.sort.update({ view: { id: viewId }, sortData, tenantId, userId })
await viewsAPI.sort.get({ view: { id: viewId }, tenantId, userId })
```

## Component Architecture

### Component Hierarchy
```
App
├── Layout
│   ├── Header
│   ├── Sidebar
│   └── Footer
├── Pages
│   ├── PanelsDashboard
│   │   ├── PanelCard
│   │   ├── CreatePanelDialog
│   │   └── PanelFilters
│   ├── PanelDetail
│   │   ├── PanelHeader
│   │   ├── DataSourceList
│   │   ├── ColumnList
│   │   └── ViewList
│   └── ViewBuilder
│       ├── ColumnSelector
│       ├── FilterBuilder
│       └── SortConfig
└── Shared
    ├── DataTable
    ├── FormControls
    └── LoadingStates
```

### Reusable Components
- **DataTable**: Advanced table with sorting, filtering, pagination
- **FormBuilder**: Dynamic form generation from schemas
- **LoadingStates**: Consistent loading and error states
- **Modal System**: Reusable modal dialogs
- **Toast Notifications**: User feedback system

## State Management

### Context Providers
```typescript
// Authentication context
const AuthProvider: React.FC<{ children: ReactNode }>

// Tenant context
const TenantProvider: React.FC<{ children: ReactNode }>

// Panel context
const PanelProvider: React.FC<{ children: ReactNode }>

// Theme context
const ThemeProvider: React.FC<{ children: ReactNode }>
```

### Custom Hooks
```typescript
// API hooks
const usePanel = (panelId: string) => { ... }
const usePanels = (tenantId: string, userId: string) => { ... }
const useViews = (panelId: string) => { ... }

// State hooks
const useAuth = () => { ... }
const useTenant = () => { ... }
const useLocalStorage = (key: string) => { ... }

// UI hooks
const useModal = () => { ... }
const useToast = () => { ... }
const useDebounce = (value: any, delay: number) => { ... }
```

## Styling System

### Tailwind Configuration
```javascript
// tailwind.config.js
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: { ... },
        secondary: { ... },
        accent: { ... }
      }
    }
  },
  plugins: [require('daisyui')]
}
```

### Design System
- **Typography**: Consistent text styles and sizes
- **Colors**: Brand-aligned color palette
- **Spacing**: Standardized margins and padding
- **Components**: Pre-built UI component library
- **Responsive**: Mobile-first responsive design

## Development Workflow

### Available Scripts
```bash
# Development
pnpm dev                 # Start development server
pnpm build              # Build for production
pnpm start              # Start production server

# Code Quality
pnpm lint               # Run ESLint
pnpm lint:fix           # Fix linting issues
pnpm typecheck          # TypeScript type checking
pnpm format             # Format code with Prettier

# Testing
pnpm test               # Run tests
pnpm test:watch         # Run tests in watch mode
pnpm test:coverage      # Run tests with coverage
```

### Development Server
```bash
# Start development server
cd apps/app
pnpm dev

# Server will start on http://localhost:3003
# Hot reload enabled for instant feedback
# API proxy configured for backend integration
```

## Environment Configuration

### Environment Variables
```bash
# .env.local
NEXTAUTH_URL=http://localhost:3003
NEXTAUTH_SECRET=your-secret-key
API_URL=http://localhost:3001
APP_ENV=development
```

### Next.js Configuration
```javascript
// next.config.js
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    appDir: true
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:3001/:path*'
      }
    ]
  }
}
```

## Performance Optimization

### Next.js Features
- **Automatic Code Splitting**: Route-based code splitting
- **Image Optimization**: Next.js Image component
- **Static Generation**: SSG for static content
- **Server-Side Rendering**: SSR for dynamic content

### Custom Optimizations
- **API Response Caching**: Client-side response caching
- **Component Lazy Loading**: Dynamic imports for large components
- **Bundle Analysis**: Regular bundle size monitoring
- **Performance Monitoring**: Core Web Vitals tracking

## Testing Strategy

### Testing Framework
- **Vitest**: Fast unit test runner
- **React Testing Library**: Component testing
- **MSW**: API mocking for tests
- **Playwright**: End-to-end testing

### Test Structure
```
src/
├── __tests__/          # Global tests
├── components/
│   └── __tests__/      # Component tests
├── hooks/
│   └── __tests__/      # Hook tests
└── utils/
    └── __tests__/      # Utility tests
```

## Building and Deployment

### Build Process
```bash
# Production build
pnpm build

# Output directory: .next/
# Static files: .next/static/
# Server files: .next/server/
```

### Deployment Options
- **Vercel**: Native Next.js deployment
- **Docker**: Containerized deployment
- **Static Export**: Static site generation
- **Custom Server**: Node.js server deployment

## Integration with Backend

### API Communication
- **Type-safe Client**: Full TypeScript integration
- **Error Handling**: Consistent error management
- **Request/Response Transformation**: Data normalization
- **Authentication**: JWT token management

### Real-time Features
- **WebSocket Integration**: Real-time updates
- **Server-Sent Events**: Live notifications
- **Optimistic Updates**: Immediate UI feedback
- **Conflict Resolution**: Handling concurrent updates

## Monitoring and Analytics

### Error Tracking
- **Error Boundaries**: React error boundaries
- **Global Error Handler**: Unhandled error capture
- **User Action Logging**: User interaction tracking
- **Performance Metrics**: Core Web Vitals monitoring

### Analytics Integration
- **User Analytics**: Usage pattern tracking
- **Performance Analytics**: App performance monitoring
- **Feature Usage**: Feature adoption metrics
- **Error Analytics**: Error frequency and patterns

## Future Enhancements

### Planned Features
- **Offline Support**: Progressive Web App features
- **Mobile App**: React Native mobile application
- **Advanced Visualization**: Chart and graph components
- **Collaboration Features**: Real-time collaborative editing

### Technical Improvements
- **Micro-frontends**: Modular frontend architecture
- **Edge Computing**: Edge-side rendering
- **Advanced Caching**: Sophisticated caching strategies
- **AI Integration**: Smart suggestions and automation

## Related Documentation

- [API Client Reference](/reference/api-client/panels-api.md)
- [Component Library](/reference/frontend/panel-components.md)
- [Testing Guide](/guides/development/testing-strategies.md)
- [Deployment Guide](/guides/deployment/production-setup.md) 