import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { ColumnType } from '../src/modules/column/entities/base-column.entity.js'
import {
  closeTestApp,
  createTestApp,
  createTestColumn,
  createTestDataSource,
  createTestPanel,
  testTenantId,
  testUserId,
} from './setup.js'

describe('Panel Column API', () => {
  let app: Awaited<ReturnType<typeof createTestApp>>
  let panelId: number

  beforeAll(async () => {
    app = await createTestApp()
  })

  afterAll(async () => {
    await closeTestApp()
  })

  beforeEach(async () => {
    // await cleanupTestDatabase()
    const panel = await createTestPanel(app)
    panelId = panel.id
  })

  describe('POST /panels/:id/columns/base', () => {
    it('should create a base column', async () => {
      // Create a data source first
      const dataSource = await createTestDataSource(app, panelId)

      const response = await app.inject({
        method: 'POST',
        url: `/panels/${panelId}/columns/base`,
        payload: {
          name: 'Test Column',
          type: ColumnType.TEXT,
          sourceField: 'test_field',
          dataSourceId: dataSource.id,
          properties: {
            required: true,
          },
          tenantId: testTenantId,
          userId: testUserId,
        },
      })
      const body = JSON.parse(response.body)

      expect(response.statusCode).toBe(201)
      expect(body.name).toBe('Test Column')
      expect(body.type).toBe(ColumnType.TEXT)
      expect(body.sourceField).toBe('test_field')
      expect(body.properties.required).toBe(true)
    })

    it('should validate required fields', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/panels/${panelId}/columns/base`,
        payload: {
          name: 'Test Column',
        },
      })

      expect(response.statusCode).toBe(400)
      const body = JSON.parse(response.body)
      expect(body.message).toContain('type')
      expect(body.message).toContain('sourceField')
      expect(body.message).toContain('properties')
      expect(body.message).toContain('dataSourceId')
      // Note: tenantId and userId are no longer required fields
    })

    it('should return 404 for non-existent panel', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/panels/999/columns/base',
        payload: {
          type: ColumnType.TEXT,
          sourceField: 'test_field',
          dataSourceId: 1,
          name: 'Test Column',
          properties: {
            required: true,
          },
          tenantId: testTenantId,
          userId: testUserId,
        },
      })

      expect(response.statusCode).toBe(404)
    })
  })

  describe('GET /panels/:id/columns', () => {
    it('should list columns', async () => {
      await createTestColumn(app, panelId, {
        name: 'Column 1',
        sourceField: 'column_1',
      })
      await createTestColumn(app, panelId, {
        name: 'Column 2',
        sourceField: 'column_2',
      })

      const response = await app.inject({
        method: 'GET',
        url: `/panels/${panelId}/columns?tenantId=${testTenantId}&userId=${testUserId}`,
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(Array.isArray(body.baseColumns)).toBe(true)
      expect(body.baseColumns).toHaveLength(2)
      expect(body.baseColumns[0].name).toBe('Column 1')
      expect(body.baseColumns[1].name).toBe('Column 2')
    })

    it('should return 404 for non-existent panel', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/panels/999/columns?tenantId=${testTenantId}&userId=${testUserId}`,
      })

      expect(response.statusCode).toBe(404)
    })
  })

  describe('PUT /panels/:id/columns/:columnId', () => {
    it('should update a column', async () => {
      const column = await createTestColumn(app, panelId)

      const response = await app.inject({
        method: 'PUT',
        url: `/panels/${panelId}/columns/${column.id}`,
        payload: {
          name: 'Updated Column',
          properties: {
            required: false,
          },
          tenantId: testTenantId,
          userId: testUserId,
        },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.name).toBe('Updated Column')
      expect(body.properties.required).toBe(false)
    })

    it('should return 404 for non-existent column', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/panels/${panelId}/columns/999`,
        payload: {
          name: 'Updated Column',
          tenantId: testTenantId,
          userId: testUserId,
        },
      })

      expect(response.statusCode).toBe(404)
    })
  })

  describe('DELETE /panels/:id/columns/:columnId', () => {
    it('should delete a column', async () => {
      const column = await createTestColumn(app, panelId)

      const response = await app.inject({
        method: 'DELETE',
        url: `/panels/${panelId}/columns/${column.id}?tenantId=${testTenantId}&userId=${testUserId}`,
      })

      expect(response.statusCode).toBe(204)

      // Verify column is deleted
      const getResponse = await app.inject({
        method: 'GET',
        url: `/panels/${panelId}/columns?tenantId=${testTenantId}&userId=${testUserId}`,
      })
      const body = JSON.parse(getResponse.body)
      expect(body.baseColumns).toHaveLength(0)
    })

    it('should return 404 for non-existent column', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/panels/${panelId}/columns/999?tenantId=${testTenantId}&userId=${testUserId}`,
      })

      expect(response.statusCode).toBe(404)
    })
  })
})
