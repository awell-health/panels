import type { FastifyInstance } from 'fastify'
import { createApp } from '../src/app.js'
import { BaseColumn } from '../src/modules/column/entities/base-column.entity.js'
import { DataSource } from '../src/modules/datasource/entities/data-source.entity.js'
import { Panel } from '../src/modules/panel/entities/panel.entity.js'

let app: FastifyInstance

export async function createTestApp(): Promise<FastifyInstance> {
  if (app) return app

  // Set test environment variables
  Object.assign(process.env, {
    NODE_ENV: 'test',
    APPLICATION_NAME: 'Awell Panels Test',
    APPLICATION_PORT: '3001',
    DBSQL_URL: 'postgres://medplum:medplum@localhost:5432/medplum_test',
    CACHE_URI: 'redis://:medplum@localhost:6379/1'
  })

  // Create Fastify app
  app = await createApp()

  // Initialize database schema for tests
  try {
    await app.store.orm.schema.refreshDatabase({ dropDb: true })
  } catch (error) {
    console.error('Failed to refresh database schema:', error)
  }

  return app
}

export async function cleanupTestDatabase() {
  if (app && app.store) {
    const em = app.store.orm.em.fork()
    
    // Delete in correct order to avoid foreign key constraints
    await em.nativeDelete(BaseColumn, {})
    await em.nativeDelete('CalculatedColumn', {})
    await em.nativeDelete('ViewSort', {})
    await em.nativeDelete('ViewFilter', {})
    await em.nativeDelete('View', {})
    await em.nativeDelete('DataSource', {})
    await em.nativeDelete(Panel, {})
    await em.flush()
  }
}

export async function closeTestApp() {
  if (app) {
    await app.store.orm.close()
    await app.close()
  }
}

// Test data helpers
export const testTenantId = 'test-tenant-123'
export const testUserId = 'test-user-123'

export async function createTestPanel(
  app: FastifyInstance,
  data: Partial<Panel> = {},
) {
  const em = app.store.orm.em.fork()
  const panel = em.create(Panel, {
    name: 'Test Panel',
    description: 'Test Description',
    tenantId: testTenantId,
    userId: testUserId,
    cohortRule: { conditions: [], logic: 'AND' },
    ...data,
  })
  await em.persistAndFlush(panel)
  return panel
}

export async function createTestDataSource(
  app: FastifyInstance,
  panelId: number,
  data: Partial<DataSource> = {},
) {
  const em = app.store.orm.em.fork()
  const panel = await em.findOne(Panel, { id: panelId })
  if (!panel) throw new Error('Panel not found')

  const dataSource = em.create(DataSource, {
    type: 'api',
    config: { resourceType: 'Patient' },
    lastSync: new Date(),
    panel,
    ...data,
  })
  await em.persistAndFlush(dataSource)
  return dataSource
}

export async function createTestColumn(
  app: FastifyInstance,
  panelId: number,
  data: Partial<BaseColumn> = {},
) {
  const em = app.store.orm.em.fork()
  const panel = await em.findOne(Panel, { id: panelId })
  if (!panel) throw new Error('Panel not found')

  const column = em.create(BaseColumn, {
    name: 'Test Column',
    type: 'text',
    sourceField: 'test_field',
    properties: {
      required: true,
    },
    metadata: data.metadata || {},
    panel,
    ...data,
  })
  await em.persistAndFlush(column)
  return column
}
