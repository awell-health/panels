#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from 'yaml'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const rootDir = resolve(__dirname, '../..')

// Default configuration templates
const ENV_TEMPLATES = {
  services: {
    // Backend services configuration
    NODE_ENV: 'development',
    PORT: '3001',

    // Database configuration (from compose)
    DATABASE_HOST: 'localhost',
    DATABASE_PORT: '5432',
    DATABASE_NAME: 'medplum',
    DATABASE_USER: 'medplum',
    DATABASE_PASSWORD: 'medplum',
    DATABASE_URL: 'postgresql://medplum:medplum@localhost:5432/medplum',

    // Redis configuration (from compose)
    REDIS_HOST: 'localhost',
    REDIS_PORT: '6379',
    REDIS_PASSWORD: 'medplum',
    REDIS_URL: 'redis://:medplum@localhost:6379',

    // Medplum integration (from compose)
    MEDPLUM_BASE_URL: 'http://localhost:8103',
    MEDPLUM_CLIENT_ID: '2a4b77f2-4d4e-43c6-9b01-330eb5ca772f',

    // JWT and security
    JWT_SECRET: 'your-super-secret-jwt-key-change-in-production',

    // Multi-tenant settings
    DEFAULT_TENANT_ID: 'tenant-dev',
    DEFAULT_USER_ID: 'user-dev',

    // API Configuration
    API_BASE_URL: 'http://localhost:3001',
    CORS_ORIGINS: 'http://localhost:3000,http://localhost:3003',

    // Logging
    LOG_LEVEL: 'debug',
  },

  app: {
    // Frontend application configuration
    NODE_ENV: 'development',

    // API endpoints
    NEXT_PUBLIC_API_URL: 'http://localhost:3001',
    NEXT_PUBLIC_MEDPLUM_BASE_URL: 'http://localhost:8103',

    // Authentication
    NEXTAUTH_URL: 'http://localhost:3000',
    NEXTAUTH_SECRET: 'your-nextauth-secret-change-in-production',

    // Features flags
    NEXT_PUBLIC_ENABLE_DEBUG: 'true',
    NEXT_PUBLIC_APP_ENV: 'development',
  },

  test: {
    // Testing environment
    NODE_ENV: 'test',

    // Test database (separate from dev)
    DATABASE_HOST: 'localhost',
    DATABASE_PORT: '5432',
    DATABASE_NAME: 'medplum_test',
    DATABASE_USER: 'medplum',
    DATABASE_PASSWORD: 'medplum',
    DATABASE_URL: 'postgresql://medplum:medplum@localhost:5432/medplum_test',

    // Test Redis
    REDIS_HOST: 'localhost',
    REDIS_PORT: '6379',
    REDIS_PASSWORD: 'medplum',
    REDIS_URL: 'redis://:medplum@localhost:6379/1',

    // Test API
    API_BASE_URL: 'http://localhost:3001',
    MEDPLUM_BASE_URL: 'http://localhost:8103',

    // Test secrets (not sensitive for testing)
    JWT_SECRET: 'test-jwt-secret',
    NEXTAUTH_SECRET: 'test-nextauth-secret',

    // Test tenant
    DEFAULT_TENANT_ID: 'tenant-test',
    DEFAULT_USER_ID: 'user-test',

    LOG_LEVEL: 'warn',
  },
}

// Environment-specific overrides
const ENV_OVERRIDES = {
  production: {
    services: {
      NODE_ENV: 'production',
      LOG_LEVEL: 'info',
      CORS_ORIGINS: 'https://your-production-domain.com',
      API_BASE_URL: 'https://api.your-production-domain.com',
      // Database and Redis would typically be external services in production
      DATABASE_URL: 'postgresql://user:password@prod-db-host:5432/prod_db',
      REDIS_URL: 'redis://:password@prod-redis-host:6379',
    },
    app: {
      NODE_ENV: 'production',
      NEXT_PUBLIC_API_URL: 'https://api.your-production-domain.com',
      NEXT_PUBLIC_MEDPLUM_BASE_URL:
        'https://medplum.your-production-domain.com',
      NEXTAUTH_URL: 'https://your-production-domain.com',
      NEXT_PUBLIC_ENABLE_DEBUG: 'false',
      NEXT_PUBLIC_APP_ENV: 'production',
    },
  },

  staging: {
    services: {
      NODE_ENV: 'staging',
      LOG_LEVEL: 'info',
      API_BASE_URL: 'https://staging-api.your-domain.com',
      CORS_ORIGINS: 'https://staging.your-domain.com',
    },
    app: {
      NODE_ENV: 'staging',
      NEXT_PUBLIC_API_URL: 'https://staging-api.your-domain.com',
      NEXT_PUBLIC_APP_ENV: 'staging',
    },
  },
}

function parseComposeFile() {
  try {
    const composeContent = readFileSync(
      resolve(rootDir, 'compose.yaml'),
      'utf8',
    )
    return parse(composeContent)
  } catch (error) {
    console.error('❌ Error reading compose.yaml:', error.message)
    process.exit(1)
  }
}

function extractServiceConfig(compose) {
  const config = {}

  // Extract PostgreSQL config
  const pgService = compose.services?.['wl-postgres']
  if (pgService) {
    const pgEnv = pgService.environment || []

    for (const env of pgEnv) {
      if (typeof env === 'string') {
        const [key, value] = env.split('=')
        if (key === 'POSTGRES_USER') config.DATABASE_USER = value
        if (key === 'POSTGRES_PASSWORD') config.DATABASE_PASSWORD = value
      }
    }

    // Extract port from ports mapping
    const ports = pgService.ports
    if (ports?.[0]) {
      const port = ports[0].split(':')[0]
      config.DATABASE_PORT = port
    }
  }

  // Extract Redis config
  const redisService = compose.services?.['wl-redis']
  if (redisService) {
    // Extract password from command
    const command = redisService.command
    if (command?.includes('--requirepass')) {
      const commandStr = Array.isArray(command) ? command.join(' ') : command
      const match = commandStr.match(/--requirepass\s+(\S+)/)
      if (match) config.REDIS_PASSWORD = match[1]
    }

    // Extract port
    const ports = redisService.ports
    if (ports?.[0]) {
      const port = ports[0].split(':')[0]
      config.REDIS_PORT = port
    }
  }

  // Extract Medplum config
  const medplumService = compose.services?.['wl-medplum-server']
  if (medplumService) {
    const ports = medplumService.ports
    if (ports?.[0]) {
      const port = ports[0].split(':')[0]
      config.MEDPLUM_PORT = port
      config.MEDPLUM_BASE_URL = `http://localhost:${port}`
    }

    // Extract environment variables
    const environment = medplumService.environment
    if (environment) {
      for (const [key, value] of Object.entries(environment)) {
        if (key === 'MEDPLUM_ADMIN_CLIENT_ID') {
          config.MEDPLUM_CLIENT_ID = value
        }
      }
    }
  }

  return config
}

function generateEnvContent(template, overrides = {}) {
  const config = { ...template, ...overrides }

  return (
    Object.entries(config)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n') + '\n'
  )
}

function writeEnvFile(filePath, content, backup = true) {
  // Create directory if it doesn't exist
  const dir = dirname(filePath)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }

  // Backup existing file
  if (backup && existsSync(filePath)) {
    const backupPath = `${filePath}.backup.${Date.now()}`
    const existingContent = readFileSync(filePath, 'utf8')
    writeFileSync(backupPath, existingContent)
    console.log(`📋 Backed up existing file to: ${backupPath}`)
  }

  writeFileSync(filePath, content)
  console.log(`✅ Generated: ${filePath}`)
}

function main() {
  const args = process.argv.slice(2)
  const environment = args[0] || 'development'
  const force = args.includes('--force')

  console.log(`🚀 Generating .env files for environment: ${environment}\n`)

  // Parse compose file to extract dynamic configuration
  const compose = parseComposeFile()
  const serviceConfig = extractServiceConfig(compose)

  console.log('📊 Extracted from compose.yaml:')
  for (const [key, value] of Object.entries(serviceConfig)) {
    console.log(`   ${key}=${value}`)
  }
  console.log()

  // Get base templates
  let servicesTemplate = { ...ENV_TEMPLATES.services, ...serviceConfig }
  let appTemplate = { ...ENV_TEMPLATES.app }
  const testTemplate = { ...ENV_TEMPLATES.test, ...serviceConfig }

  // Apply environment-specific overrides
  if (ENV_OVERRIDES[environment]) {
    const overrides = ENV_OVERRIDES[environment]
    if (overrides.services) {
      servicesTemplate = { ...servicesTemplate, ...overrides.services }
    }
    if (overrides.app) {
      appTemplate = { ...appTemplate, ...overrides.app }
    }
  }

  // Generate .env files
  const envFiles = [
    {
      path: resolve(rootDir, 'apps/services/.env'),
      content: generateEnvContent(servicesTemplate),
      description: 'Backend services configuration',
    },
    {
      path: resolve(rootDir, 'apps/app/.env.local'),
      content: generateEnvContent(appTemplate),
      description: 'Frontend application configuration',
    },
    {
      path: resolve(rootDir, '.env.test'),
      content: generateEnvContent(testTemplate),
      description: 'Testing environment configuration',
    },
  ]

  // Write files
  for (const { path, content, description } of envFiles) {
    if (existsSync(path) && !force) {
      console.log(`⚠️  File exists, skipping: ${path}`)
      console.log('   Use --force to overwrite')
    } else {
      writeEnvFile(path, content, !force)
      console.log(`   ${description}`)
    }
    console.log()
  }

  // Generate example files
  console.log('📝 Generating example files...')
  for (const { path, content } of envFiles) {
    const examplePath = `${path}.example`
    writeEnvFile(examplePath, content, false)
  }

  console.log('\n🎉 Environment file generation complete!')
  console.log('\n📚 Next steps:')
  console.log('1. Review the generated .env files')
  console.log('2. Update any production secrets/URLs')
  console.log('3. Add .env files to your .gitignore (keep .example files)')
  console.log('4. Run `pnpm run:infra` to start infrastructure')
  console.log('5. Run `pnpm dev` to start development')
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}
