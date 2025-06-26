# Environment Setup

This guide covers comprehensive environment configuration for the Panels project, including automated environment file generation and multi-environment support.

## Quick Start

```bash
# 1. Generate environment files from your compose.yaml
pnpm generate:env

# 2. Start infrastructure services
pnpm run:infra

# 3. Start development
pnpm dev
```

## Environment File Generation

The project includes an intelligent environment generator that extracts configuration from your Docker Compose setup and creates appropriate `.env` files for each application.

### Generated Files

| File | Purpose | Application |
|------|---------|-------------|
| `apps/services/.env` | Backend API configuration | Fastify server |
| `apps/app/.env.local` | Frontend configuration | Next.js app |
| `.env.test` | Testing environment | Test suites |
| `*.example` | Template files (safe to commit) | Documentation |

### Configuration Sources

The generator intelligently extracts settings from multiple sources:

#### From Docker Compose (`compose.yaml`)
- **PostgreSQL**: Database credentials, ports, connection strings
- **Redis**: Cache server credentials and connection details
- **Medplum**: Server URLs and client configuration
- **Service Ports**: All exposed port mappings

#### Environment-Specific Overrides
- **Development**: Local development optimizations
- **Staging**: Pre-production configurations
- **Production**: Production-ready settings with external services

### Commands

```bash
# Generate development environment (default)
pnpm generate:env

# Generate staging environment
pnpm generate:env:staging

# Generate production environment
pnpm generate:env:prod

# Force overwrite existing files
pnpm generate:env -- --force
```

### Example Output

When you run `pnpm generate:env`, you'll see:

```bash
🚀 Generating .env files for environment: development

📊 Extracted from compose.yaml:
   DATABASE_USER=medplum
   DATABASE_PASSWORD=medplum
   DATABASE_PORT=5432
   REDIS_PASSWORD=medplum
   REDIS_PORT=6379
   MEDPLUM_BASE_URL=http://localhost:8103

✅ Generated: apps/services/.env
   Backend services configuration

✅ Generated: apps/app/.env.local
   Frontend application configuration

✅ Generated: .env.test
   Testing environment configuration

📝 Generating example files...
✅ Generated: apps/services/.env.example
✅ Generated: apps/app/.env.local.example
✅ Generated: .env.test.example

🎉 Environment file generation complete!
```

## Manual Configuration

If you prefer manual setup or need custom configuration:

### Backend Services (`.env`)

```bash
# Server Configuration
NODE_ENV=development
PORT=3001
LOG_LEVEL=debug

# Database (PostgreSQL)
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=medplum
DATABASE_USER=medplum
DATABASE_PASSWORD=medplum
DATABASE_URL=postgresql://medplum:medplum@localhost:5432/medplum

# Cache (Redis)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=medplum
REDIS_URL=redis://:medplum@localhost:6379

# External Services
MEDPLUM_BASE_URL=http://localhost:8103
MEDPLUM_CLIENT_ID=2a4b77f2-4d4e-43c6-9b01-330eb5ca772f

# Security
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# Multi-tenant
DEFAULT_TENANT_ID=tenant-dev
DEFAULT_USER_ID=user-dev

# API Configuration
API_BASE_URL=http://localhost:3001
CORS_ORIGINS=http://localhost:3000,http://localhost:3003
```

### Frontend App (`.env.local`)

```bash
# Environment
NODE_ENV=development

# API Configuration
API_URL=http://localhost:3001
MEDPLUM_BASE_URL=http://localhost:8103

# Authentication
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret-change-in-production

# Feature Flags
ENABLE_DEBUG=true
APP_ENV=development
```

### Testing Environment (`.env.test`)

```bash
# Environment
NODE_ENV=test

# Test Database (separate from development)
DATABASE_URL=postgresql://medplum:medplum@localhost:5432/medplum_test
REDIS_URL=redis://:medplum@localhost:6379/1

# Test Services
API_BASE_URL=http://localhost:3001
MEDPLUM_BASE_URL=http://localhost:8103

# Test Secrets (not sensitive)
JWT_SECRET=test-jwt-secret
NEXTAUTH_SECRET=test-nextauth-secret

# Test Tenant
DEFAULT_TENANT_ID=tenant-test
DEFAULT_USER_ID=user-test

LOG_LEVEL=warn
```

## Environment-Specific Configurations

### Development Environment
- **Database**: Local PostgreSQL via Docker Compose
- **Redis**: Local Redis via Docker Compose
- **Medplum**: Local Medplum server
- **Logging**: Debug level for detailed information
- **Security**: Development-friendly secrets

### Staging Environment
- **Database**: Staging database (external)
- **Redis**: Staging cache (external)
- **Medplum**: Staging Medplum instance
- **Logging**: Info level
- **Security**: Staging-specific secrets
- **URLs**: Staging domain URLs

### Production Environment
- **Database**: Production database (external, encrypted)
- **Redis**: Production cache (external, clustered)
- **Medplum**: Production Medplum instance
- **Logging**: Error and warning levels only
- **Security**: Production secrets (never commit)
- **URLs**: Production domain URLs

## Security Best Practices

### Development
- ✅ Use the generated development secrets
- ✅ Keep `.env.example` files in version control
- ❌ Never commit actual `.env` files

### Staging/Production
- ✅ Use environment-specific secret management
- ✅ Rotate secrets regularly
- ✅ Use encrypted connections
- ❌ Never use development secrets in production

## Troubleshooting

### Common Issues

**Q: Environment files not being loaded**
```bash
# Check if files exist
ls -la apps/services/.env
ls -la apps/app/.env.local

# Regenerate if missing
pnpm generate:env --force
```

**Q: Database connection errors**
```bash
# Ensure infrastructure is running
pnpm run:infra

# Check PostgreSQL is healthy
docker ps | grep postgres
```

**Q: Redis connection errors**
```bash
# Check Redis is running
docker ps | grep redis

# Test Redis connection
docker exec -it wl-redis redis-cli -a medplum ping
```

**Q: Port conflicts**
```bash
# Check what's using the ports
lsof -i :3001  # API server
lsof -i :3000  # Frontend
lsof -i :5432  # PostgreSQL
lsof -i :6379  # Redis
```

### Environment Validation

You can validate your environment setup:

```bash
# Check all environment variables are loaded
pnpm --filter @panels/services dev --dry-run

# Test database connection
pnpm --filter @panels/services test:db-connection

# Test API endpoints
curl http://localhost:3001/health
```

## Integration with Development Workflow

The environment setup integrates seamlessly with your development workflow:

1. **Initial Setup**: `pnpm generate:env` creates all necessary files
2. **Infrastructure**: `pnpm run:infra` starts all services with correct configuration
3. **Development**: `pnpm dev` uses the generated environment files automatically
4. **Testing**: `pnpm test` uses the test environment configuration
5. **Deployment**: Environment-specific generation for different stages

## Next Steps

- [Create Your First Panel](./first-panel.md) - Build your first panel using the configured environment
- [Database Schema](../reference/database.md) - Understand the MikroORM entities and schema
- [API Integration](../guides/api-integration/) - Learn how to interact with the API 