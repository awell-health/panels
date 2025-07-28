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
    APPLICATION_NAME: 'Awell Panels Services',
    APPLICATION_PORT: '3001',
    CLOSE_GRACE_DELAY: '1000',

    // Database configuration (constructed from root .env)
    DBSQL_URL: 'postgres://medplum:medplum@localhost:5432/medplum',

    // Cache configuration (from compose)
    CACHE_URI: 'redis://:medplum@localhost:6379/0',
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
    APPLICATION_NAME: 'Awell Panels Services Test',
    APPLICATION_PORT: '3001',
    CLOSE_GRACE_DELAY: '1000',

    // Test database (separate from dev)
    DBSQL_URL: 'postgres://medplum:medplum@localhost:5432/medplum_test',

    // Test Cache
    CACHE_URI: 'redis://:medplum@localhost:6379/1',
  },
}

// Environment-specific overrides
const ENV_OVERRIDES = {
  production: {
    services: {
      NODE_ENV: 'production',
      APPLICATION_NAME: 'Awell Panels Services Production',
      // Database and Cache would typically be external services in production
      DBSQL_URL: 'postgres://user:password@prod-db-host:5432/prod_db',
      CACHE_URI: 'redis://:password@prod-redis-host:6379/0',
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
      APPLICATION_NAME: 'Awell Panels Services Staging',
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

function parseRootEnvFile() {
  const envPath = resolve(rootDir, '.env')

  if (!existsSync(envPath)) {
    console.log('ℹ️  No root .env file found, using defaults')
    return {}
  }

  try {
    const envContent = readFileSync(envPath, 'utf8')
    const envVars = {}

    for (const line of envContent.split('\n')) {
      const trimmed = line.trim()
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=')
        if (key && valueParts.length > 0) {
          envVars[key] = valueParts.join('=')
        }
      }
    }

    return envVars
  } catch (error) {
    console.error('❌ Error reading root .env file:', error.message)
    return {}
  }
}

function constructDatabaseUrl(envVars) {
  const user = envVars.MEDPLUM_DB_USER || 'medplum'
  const password = envVars.MEDPLUM_DB_PASSWORD || 'medplum'
  const host = 'localhost'
  const port = '5432'
  const database = 'medplum'

  return `postgres://${user}:${password}@${host}:${port}/${database}`
}

function extractServiceConfig(compose) {
  const config = {}

  // Extract Redis config for cache URI
  const redisService = compose.services?.['wl-redis']
  if (redisService) {
    // Extract password from command
    const command = redisService.command
    if (command?.includes('--requirepass')) {
      const commandStr = Array.isArray(command) ? command.join(' ') : command
      const match = commandStr.match(/--requirepass\s+(\S+)/)
      if (match) {
        config.CACHE_URI = `redis://:${match[1]}@localhost:6379/0`
      }
    }
  }

  return config
}

function generateEnvContent(template, overrides = {}) {
  const config = { ...template, ...overrides }

  return `${Object.entries(config)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n')}\n`
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

  // Parse root .env file to get database credentials
  const rootEnvVars = parseRootEnvFile()

  // Parse compose file to extract dynamic configuration
  const compose = parseComposeFile()
  const serviceConfig = extractServiceConfig(compose)

  // Construct database URL from root .env credentials
  const dbUrl = constructDatabaseUrl(rootEnvVars)

  console.log('📊 Database configuration:')
  console.log(`   MEDPLUM_DB_USER=${rootEnvVars.MEDPLUM_DB_USER || 'medplum'}`)
  console.log(`   DBSQL_URL=${dbUrl.replace(/:([^:@]+)@/, ':***@')}`)
  console.log()

  if (Object.keys(serviceConfig).length > 0) {
    console.log('📊 Extracted from compose.yaml:')
    for (const [key, value] of Object.entries(serviceConfig)) {
      console.log(`   ${key}=${value}`)
    }
    console.log()
  }

  // Get base templates with constructed database URL
  let servicesTemplate = {
    ...ENV_TEMPLATES.services,
    ...serviceConfig,
    DBSQL_URL: dbUrl,
  }
  let appTemplate = { ...ENV_TEMPLATES.app }
  const testTemplate = {
    ...ENV_TEMPLATES.test,
    ...serviceConfig,
    DBSQL_URL: constructDatabaseUrl(rootEnvVars).replace(
      '/medplum',
      '/medplum_test',
    ),
  }

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
  console.log(
    '1. Create a root .env file with database credentials (MEDPLUM_DB_USER, MEDPLUM_DB_PASSWORD, etc.)',
  )
  console.log('2. Review the generated services .env file')
  console.log(
    '3. Update any production secrets/URLs for production environment',
  )
  console.log('4. Add .env files to your .gitignore (keep .example files)')
  console.log('5. Run `docker compose up -d` to start infrastructure')
  console.log('6. Run `pnpm dev` to start development')
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}
