# Panels Project

This project provides a comprehensive Panel Management System for healthcare applications, featuring dynamic data visualization, multi-tenant architecture, and configurable data sources.

## 🚀 Proof of Concept (POC)

This branch introduces a **Proof of Concept** for a comprehensive **Healthcare Data Hub** architecture. The POC demonstrates:

- **Healthcare Data Ingestion**: Heterogeneous data collection and raw payload persistence
- **FHIR Transformation**: Automated conversion of raw data into valid FHIR resources via Medplum
- **Low-Code Workflows**: Visual workflow creation and execution through n8n
- **Unified API Facade**: Single backend interface abstracting all components
- **Multi-Deployment Support**: Self-hosted and SaaS deployment modes without mandatory paid services
- **Full Observability**: Complete audit trail with before/after transformation states

**Core Components:**
- **Backend Facade Service**: Orchestrates n8n, PostgreSQL, Medplum, and NATS
- **n8n Workflows**: Executes ingestion, transformation, and client-specific logic
- **PostgreSQL**: Stores raw payloads, workflow metadata, mapping rules, and audit logs
- **NATS JetStream**: Event bus for ingestion events and transformation tasks
- **Medplum**: FHIR storage and validation

> 📋 **For comprehensive architecture details, design decisions, and implementation roadmap, see [EVOLUTION.md](EVOLUTION.md)** - This document outlines the complete healthcare data hub architecture and serves as the foundation for future system development.

## <a name='TableofContents'></a>Table of Contents

<!-- vscode-markdown-toc -->
- [Panels Project](#panels-project)
  - [🚀 Proof of Concept (POC)](#-proof-of-concept-poc)
  - [Table of Contents](#table-of-contents)
  - [Overview](#overview)
  - [Architecture](#architecture)
    - [Core Entities](#core-entities)
    - [Key Features](#key-features)
  - [Tech Stack](#tech-stack)
    - [Backend (Services)](#backend-services)
    - [Frontend (App)](#frontend-app)
    - [Documentation](#documentation)
    - [Infrastructure](#infrastructure)
      - [🔄 **New in the POC: Enhanced Database Configuration**](#-new-in-the-poc-enhanced-database-configuration)
  - [Prerequisites](#prerequisites)
  - [Project Structure](#project-structure)
      - [🔄 **New in the POC: Enhanced Configuration Files**](#-new-in-the-poc-enhanced-configuration-files)
  - [API Modules](#api-modules)
    - [Panel Management](#panel-management)
    - [Data Source Management](#data-source-management)
    - [Column Management](#column-management)
    - [View Management](#view-management)
  - [Getting Started](#getting-started)
      - [🔄 **Updated for the POC: Enhanced Environment Setup**](#-updated-for-the-poc-enhanced-environment-setup)
  - [Database Setup](#database-setup)
      - [🔄 **New in the POC: Automated Database Initialization**](#-new-in-the-poc-automated-database-initialization)
  - [API Testing](#api-testing)
  - [Unit Testing](#unit-testing)
    - [Frontend API Testing](#frontend-api-testing)
      - [Key Features](#key-features-1)
      - [Test Files](#test-files)
      - [Running Tests](#running-tests)
    - [Backend Testing](#backend-testing)
    - [API Configuration](#api-configuration)
  - [Development Tools](#development-tools)
  - [Available Scripts](#available-scripts)
    - [Development \& Build](#development--build)
    - [Environment Setup](#environment-setup)
      - [🔄 **New in the POC: Enhanced Environment Management**](#-new-in-the-poc-enhanced-environment-management)
    - [Infrastructure](#infrastructure-1)
    - [Code Quality](#code-quality)
    - [Testing](#testing)
    - [Documentation](#documentation-1)
  - [Infrastructure](#infrastructure-2)
      - [🔄 **Updated for the POC: Enhanced Infrastructure Services**](#-updated-for-the-poc-enhanced-infrastructure-services)
  - [Contributing](#contributing)
  - [License](#license)

<!-- vscode-markdown-toc-config
	numbering=false
	autoSave=true
	/vscode-markdown-toc-config -->
<!-- /vscode-markdown-toc -->


## <a name='Overview'></a>Overview

The Panels system allows organizations to:

- Create configurable data panels with dynamic columns from multiple data sources
- Build user-specific views with filtering, sorting, and publishing capabilities
- Manage base columns (from data sources) and calculated columns (formula-based)
- Track changes and notify users of panel modifications
- Support multi-tenant environments with proper data isolation

## <a name='Architecture'></a>Architecture

### <a name='CoreEntities'></a>Core Entities

- **Panels**: Configurable data containers with base and calculated columns
- **Data Sources**: External data connections (databases, APIs, files)
- **Views**: User-specific filtered visualizations of panels
- **Columns**: Base columns (from data sources) and calculated columns (formulas)
- **Change Tracking**: Panel modification history and user notifications

### <a name='KeyFeatures'></a>Key Features

- **Multi-tenant Support**: Tenant-level and user-level panel management
- **Dynamic Data Sources**: Support for various data source types with synchronization
- **Calculated Columns**: Formula-based columns with dependency tracking
- **View Publishing**: Share personal views tenant-wide
- **Change Management**: Track panel changes and notify affected view users
- **Cohort Rules**: Define population criteria for panels

## <a name='TechStack'></a>Tech Stack

### <a name='BackendServices'></a>Backend (Services)

- **Runtime**: Node.js 22.14.0
- **Framework**: Fastify 5.3.2 with TypeScript
- **ORM**: MikroORM 6.4.16 with PostgreSQL driver
- **Validation**: Zod 3.25.51 with fastify-type-provider-zod
- **Authentication**: @fastify/jwt and @fastify/auth
- **API Documentation**: @fastify/swagger and @fastify/swagger-ui
- **Testing**: Vitest 3.2.1
- **Code Quality**: Biome 1.9.4

### <a name='FrontendApp'></a>Frontend (App)

- **Framework**: Next.js 15.3.3 with React 19
- **Styling**: Tailwind CSS 4.1.7 with DaisyUI 5.0.43
- **Authentication**: NextAuth 5.0.0-beta.25
- **Healthcare**: Medplum Core 4.1.6 with FHIR types
- **Drag & Drop**: @dnd-kit suite
- **AI Integration**: OpenAI 4.103.0
- **Testing**: Vitest 3.2.1 with JSdom, comprehensive API unit tests

### <a name='Documentation'></a>Documentation

- **Framework**: VitePress 1.6.3
- **Features**: Interactive documentation, API reference, guides, and examples
- **Location**: `apps/docs/`

### <a name='Infrastructure'></a>Infrastructure

- **Database**: PostgreSQL 16
- **Cache**: Redis 7
- **Package Manager**: pnpm 10.11.0
- **Development**: Docker Compose for infrastructure
- **Build System**: Turbo with TypeScript 5.8.3

#### 🔄 **New in the POC: Enhanced Database Configuration**
- **Centralized Credentials**: Root `.env` file manages all database credentials
- **Automated Initialization**: PostgreSQL setup with proper schema ownership
- **Multi-Database Support**: Separate databases for Medplum and n8n services
- **Permission Management**: PostgreSQL 15+ compatible schema permissions

## <a name='Prerequisites'></a>Prerequisites

- Node.js >= 22
- pnpm >= 10.11.0
- Docker and Docker Compose
- PostgreSQL 16 (if running locally)
- Redis 7 (if running locally)

## <a name='ProjectStructure'></a>Project Structure

```
.
├── apps/
│   ├── app/                    # Next.js frontend application
│   │   └── src/api/            # API client functions
│   │       ├── config/         # API configuration
│   │       ├── *.test.ts       # Unit tests (alongside API files)
│   │       ├── testUtils.ts    # Testing utilities and mocks
│   │       └── README.md       # API testing documentation
│   ├── docs/                   # VitePress documentation site
│   │   ├── getting-started/    # Installation and setup guides
│   │   ├── guides/            # How-to guides and tutorials
│   │   ├── reference/         # API reference documentation
│   │   ├── examples/          # Code examples and use cases
│   │   └── .vitepress/        # VitePress configuration
│   └── services/               # Fastify backend API
│       └── src/modules/        # API modules
│           ├── panel/          # Panel management routes
│           ├── datasource/     # Data source management
│           ├── column/         # Column management (base & calculated)
│           ├── view/           # User views and publishing
│           └── change/         # Change tracking and notifications
├── packages/                   # Shared packages
│   └── types/                  # Shared TypeScript types
├── dev/                        # Development configuration
│   ├── config/                 # Configuration files
│   │   └── init-data.sh       # 🔄 Enhanced database initialization script
│   ├── scripts/               # Development scripts
│   │   └── generate-env.js    # 🔄 Enhanced environment generation
│   └── datastore/             # Local database storage
├── compose.yaml               # 🔄 Updated Docker Compose configuration
├── .env.example              # 🔄 New root environment template
└── EVOLUTION.md              # 📋 POC architecture evolution document
```

#### 🔄 **New in the POC: Enhanced Configuration Files**

**Key Configuration Updates:**
- **`compose.yaml`**: Added environment variable support for database credentials
- **`dev/config/init-data.sh`**: Enhanced PostgreSQL initialization with schema ownership
- **`dev/scripts/generate-env.js`**: Improved environment generation with database URL construction
- **`.env.example`**: New root environment template for centralized credential management
- **`EVOLUTION.md`**: Comprehensive architecture evolution document

## <a name='APIModules'></a>API Modules

### <a name='PanelManagement'></a>Panel Management

- **GET** `/panels` - List user/tenant panels
- **POST** `/panels` - Create new panel
- **GET** `/panels/:id` - Get panel details
- **PUT** `/panels/:id` - Update panel
- **DELETE** `/panels/:id` - Delete panel

### <a name='DataSourceManagement'></a>Data Source Management

- **GET** `/panels/:panelId/datasources` - List panel data sources
- **POST** `/panels/:panelId/datasources` - Add data source
- **PUT** `/datasources/:id` - Update data source
- **DELETE** `/datasources/:id` - Remove data source
- **POST** `/datasources/:id/sync` - Sync data source

### <a name='ColumnManagement'></a>Column Management

- **GET** `/panels/:panelId/columns` - List panel columns
- **POST** `/panels/:panelId/columns/base` - Create base column
- **POST** `/panels/:panelId/columns/calculated` - Create calculated column
- **PUT** `/columns/:id` - Update column
- **DELETE** `/columns/:id` - Delete column

### <a name='ViewManagement'></a>View Management

- **GET** `/panels/:panelId/views` - List user views
- **POST** `/panels/:panelId/views` - Create view
- **GET** `/views/:id` - Get view details
- **PUT** `/views/:id` - Update view
- **DELETE** `/views/:id` - Delete view
- **POST** `/views/:id/publish` - Publish view tenant-wide

## <a name='GettingStarted'></a>Getting Started

1. **Install Dependencies**

   ```bash
   pnpm bootstrap
   ```

2. **Generate Environment Files**

   ```bash
   # Generate .env files from compose.yaml configuration
   pnpm generate:env
   ```

3. **Start Development Environment**

   ```bash
   # Start the infrastructure (PostgreSQL, Redis)
   pnpm run:infra

   # Start the development servers
   pnpm dev
   ```

4. **Access the Applications**
   - **Frontend App**: http://localhost:3003 - Main application interface
   - **Backend API**: http://localhost:3001 - RESTful API server
   - **API Documentation**: http://localhost:3001/docs - Interactive API docs (Swagger)
   - **Project Documentation**: http://localhost:3004 - Comprehensive guides and references
     ```bash
     pnpm --filter @panels/docs docs:dev
     ```
   - **Database UI**: http://localhost:8081 - pgweb interface for PostgreSQL

#### 🔄 **Updated for the POC: Enhanced Environment Setup**

**New Workflow with Centralized Configuration:**

1. **Create Root Environment File**
   ```bash
   # Create .env file in project root with database credentials
   cp .env.example .env
   # Edit .env with your database credentials
   ```

2. **Generate Services Configuration**
   ```bash
   # Automatically generates services .env with correct DBSQL_URL
   pnpm generate:env:force
   ```

3. **Start Infrastructure with Proper Database Setup**
   ```bash
   # PostgreSQL will automatically create databases and users
   docker compose up -d
   ```

**Key Improvements:**
- ✅ **Single Source of Truth**: All database credentials in root `.env`
- ✅ **Automatic Database Creation**: PostgreSQL creates medplum and n8n databases
- ✅ **Proper Permissions**: Schema ownership prevents permission errors
- ✅ **Seamless Integration**: Services automatically use correct database URLs

## <a name='DatabaseSetup'></a>Database Setup

The services use MikroORM for database management:

```bash
# Create a new migration
pnpm --filter @panels/services migration:create

# Apply migrations
pnpm --filter @panels/services migration:apply

# Reset database with fresh schema
pnpm --filter @panels/services schema:fresh
```

#### 🔄 **New in the POC: Automated Database Initialization**

**Enhanced Database Setup Process:**

1. **Automatic Database Creation**
   ```bash
   # PostgreSQL automatically creates databases and users on first startup
   docker compose up -d wl-postgres
   ```

2. **Database Configuration**
   ```bash
   # Medplum database: medplum user with full schema ownership
   # N8N database: n8n user with full schema ownership
   # Both databases created with proper PostgreSQL 15+ permissions
   ```

3. **Environment-Based Configuration**
   ```bash
   # Root .env file controls all database credentials
   MEDPLUM_DB_USER=myuser
   MEDPLUM_DB_PASSWORD=mypass
   N8N_DB_USER=n8nuser
   N8N_DB_PASSWORD=n8npass
   ```

**Benefits:**
- 🚀 **Zero Manual Setup**: Databases created automatically
- 🔒 **Secure Permissions**: Proper schema ownership prevents permission errors
- 🔄 **Environment Flexibility**: Easy credential management across environments
- 📊 **Multi-Service Support**: Separate databases for different services

## <a name='APITesting'></a>API Testing

The project includes a comprehensive Bruno collection for API testing with all endpoints covered. The collection provides:

- Complete test coverage for all Panel, Data Source, Column, and View operations
- Environment configuration for local development
- Sequential test execution workflow
- Realistic test data examples

📋 **[View the complete Bruno API Test Collection](dev/api-tests/README.md)**

## <a name='UnitTesting'></a>Unit Testing

The project includes comprehensive unit testing infrastructure for API functions with advanced mocking and environment configuration capabilities.

### <a name='FrontendAPITesting'></a>Frontend API Testing

- **Framework**: Vitest with JSdom environment
- **Location**: `apps/app/src/api/` (tests alongside API files)
- **Coverage**: Complete test coverage for `panelsAPI` and `viewsAPI`
- **Configuration**: Environment-based API URL configuration

#### <a name='KeyFeatures-1'></a>Key Features

- **Configurable Base URL**: APIs support environment-based URL configuration
  ```typescript
  // Environment variable: API_BASE_URL
  // Development: http://localhost:3001
  // Testing: https://api.test.com (or custom)
  ```

- **Advanced Mocking**: Comprehensive mock data generators and response builders
- **Error Testing**: Network failures, HTTP errors, and validation testing
- **Environment Management**: Dynamic environment variable stubbing in tests

#### <a name='TestFiles'></a>Test Files

- `panelsAPI.test.ts` - 20 test cases covering CRUD operations, nested resources
- `viewsAPI.test.ts` - 27 test cases covering views, publishing, and sorts
- `testUtils.ts` - Mock data generators and testing utilities
- `vitest.config.ts` - Test environment configuration
- `vitest.setup.ts` - Global test setup and mocks

#### <a name='RunningTests'></a>Running Tests

```bash
# Run frontend API tests
pnpm --filter @panels/app test

# Run with coverage
pnpm --filter @panels/app test:coverage

# Run in watch mode
pnpm --filter @panels/app test:watch

# Run specific test file
pnpm --filter @panels/app test panelsAPI.test.ts
```

### <a name='BackendTesting'></a>Backend Testing

- **Framework**: Vitest 3.2.1
- **Location**: `apps/services/src/`

```bash
# Run backend tests
pnpm --filter @panels/services test

# Run with coverage
pnpm --filter @panels/services test:coverage
```

### <a name='APIConfiguration'></a>API Configuration

The API functions now support configurable base URLs through environment variables:

```typescript
// apps/app/src/api/config/apiConfig.ts
export const apiConfig = {
  get baseUrl(): string {
    return process.env.API_BASE_URL || 'http://localhost:3001'
  },
  buildUrl: (path: string): string => `${apiConfig.baseUrl}${path}`
}
```

This enables seamless switching between development, testing, and production environments.

## <a name='DevelopmentTools'></a>Development Tools

- **Biome**: Used for code formatting and linting

  ```bash
  pnpm format     # Check formatting
  pnpm format:fix # Fix formatting issues
  pnpm lint       # Run linter
  pnpm lint:fix   # Fix linting issues
  ```

- **TypeScript**: Type checking

  ```bash
  pnpm typecheck
  ```

- **Testing**:
  ```bash
  # Run all tests (frontend + backend)
  pnpm test

  # Frontend API tests only
  pnpm --filter @panels/app test

  # Backend tests only  
  pnpm --filter @panels/services test

  # Run with coverage
  pnpm --filter @panels/services test:coverage
  pnpm --filter @panels/app test:coverage
  
  # Watch mode for development
  pnpm --filter @panels/app test:watch
  ```

## <a name='AvailableScripts'></a>Available Scripts

### <a name='DevelopmentBuild'></a>Development & Build
- `pnpm dev`: Start development servers
- `pnpm build`: Build all applications
- `pnpm clean`: Clean build artifacts
- `pnpm clean:all`: Clean all artifacts including datastore

### <a name='EnvironmentSetup'></a>Environment Setup
- `pnpm generate:env`: Generate development .env files
- `pnpm generate:env:prod`: Generate production .env files
- `pnpm generate:env:staging`: Generate staging .env files

#### 🔄 **New in the POC: Enhanced Environment Management**
- `pnpm generate:env:force`: Force regenerate all .env files (overwrites existing)
- **Root `.env` Integration**: Automatically reads database credentials from root `.env`
- **Database URL Construction**: Builds correct `DBSQL_URL` for services from root credentials
- **Multi-Environment Support**: Generates separate configs for dev/staging/prod

### <a name='Infrastructure-1'></a>Infrastructure
- `pnpm run:infra`: Start infrastructure services
- `pnpm run:infra:stop`: Stop infrastructure services

### <a name='CodeQuality'></a>Code Quality
- `pnpm format`: Check code formatting
- `pnpm format:fix`: Fix code formatting
- `pnpm lint`: Run linter
- `pnpm lint:fix`: Fix linting issues
- `pnpm typecheck`: Run TypeScript type checking

### <a name='Testing'></a>Testing
- `pnpm test`: Run all tests

### <a name='Documentation-1'></a>Documentation
- `pnpm --filter @panels/docs docs:dev`: Start documentation server
- `pnpm --filter @panels/docs docs:build`: Build documentation

## <a name='Infrastructure-1'></a>Infrastructure

The project uses Docker Compose to manage the following services:

- **PostgreSQL**: Database server

  - Port: 5432
  - Default credentials: medplum/medplum

- **Redis**: Cache server

  - Port: 6379
  - Password: medplum

- **pgweb**: Database management UI
  - Port: 8081

#### 🔄 **Updated for the POC: Enhanced Infrastructure Services**

**New Database Configuration:**
- **Multi-Database Setup**: Separate databases for Medplum and n8n services
- **Automated Initialization**: PostgreSQL creates databases and users on first startup
- **Environment Variables**: All database credentials configurable via root `.env` file
- **Schema Ownership**: Proper PostgreSQL 15+ permissions prevent access errors

**Database Services:**
- **Medplum Database**: `medplum` user with full schema ownership
- **N8N Database**: `n8n` user with full schema ownership  
- **Admin Access**: `postgres` user for database administration

**Configuration Files:**
- `compose.yaml`: Updated with environment variable support
- `dev/config/init-data.sh`: Enhanced database initialization script
- `dev/scripts/generate-env.js`: Improved environment generation with database URL construction

## <a name='Contributing'></a>Contributing

1. Install pre-commit hooks:

   ```bash
   pnpm prepare
   ```

2. Use conventional commits:
   ```bash
   pnpm commit
   ```

## <a name='License'></a>License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.
