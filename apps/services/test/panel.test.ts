import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { Panel } from '../src/modules/panel/entities/panel.entity.js'
import {
  cleanupTestDatabase,
  closeTestApp,
  createTestApp,
  createTestPanel,
  testTenantId,
  testUserId,
} from './setup.js'

describe('Panel API', () => {
  let app: Awaited<ReturnType<typeof createTestApp>>

  beforeAll(async () => {
    app = await createTestApp()
  })

  afterAll(async () => {
    await closeTestApp()
  })

  beforeEach(async () => {
    await cleanupTestDatabase()
  })

  describe('POST /panels', () => {
    it('should create a panel', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/panels',
        payload: {
          name: 'Test Panel',
          description: 'Test Description',
          tenantId: testTenantId,
          userId: testUserId,
          cohortRule: { conditions: [], logic: 'AND' },
        },
      })

      expect(response.statusCode).toBe(201)
      const body = JSON.parse(response.body)
      expect(body.name).toBe('Test Panel')
      expect(body.description).toBe('Test Description')
      // expect(body.tenantId).toBe(testTenantId);
      // expect(body.userId).toBe(testUserId);
    })

    it('should validate required fields', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/panels',
        payload: {
          description: 'Test Description',
          // Missing tenantId and userId which are required
        },
      })

      expect(response.statusCode).toBe(400)
      const body = JSON.parse(response.body)
      expect(body.message).toContain('tenantId')
      expect(body.message).toContain('userId')
    })
  })

  describe('GET /panels', () => {
    it('should list panels', async () => {
      // Create test panels
      await createTestPanel(app, { name: 'Panel 1' })
      await createTestPanel(app, { name: 'Panel 2' })

      const response = await app.inject({
        method: 'GET',
        url: `/panels?tenantId=${testTenantId}&userId=${testUserId}`,
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(Array.isArray(body)).toBe(true)
      expect(body).toHaveLength(2)
      expect(body.find((w: Panel) => w.name === 'Panel 1')).toBeDefined()
      expect(body.find((w: Panel) => w.name === 'Panel 2')).toBeDefined()
    })
  })

  describe('GET /panels/:id', () => {
    it('should get a panel by id', async () => {
      const panel = await createTestPanel(app, { name: 'Test Panel' })

      const response = await app.inject({
        method: 'GET',
        url: `/panels/${panel.id}?tenantId=${testTenantId}&userId=${testUserId}`,
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.id).toBe(panel.id)
      expect(body.name).toBe('Test Panel')
    })

    it('should return 404 for non-existent panel', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/panels/999?tenantId=${testTenantId}&userId=${testUserId}`,
      })

      expect(response.statusCode).toBe(404)
    })
  })

  describe('PUT /panels/:id', () => {
    it('should update a panel', async () => {
      const panel = await createTestPanel(app, { name: 'Original Name' })

      const response = await app.inject({
        method: 'PUT',
        url: `/panels/${panel.id}`,
        payload: {
          name: 'Updated Name',
          description: 'Updated Description',
          tenantId: testTenantId,
          userId: testUserId,
        },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.name).toBe('Updated Name')
      expect(body.description).toBe('Updated Description')
    })

    it('should return 404 for non-existent panel', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: '/panels/999',
        payload: {
          name: 'Updated Name',
          tenantId: testTenantId,
          userId: testUserId,
        },
      })

      expect(response.statusCode).toBe(404)
    })
  })

  describe('DELETE /panels/:id', () => {
    it('should delete a panel', async () => {
      const panel = await createTestPanel(app)

      const response = await app.inject({
        method: 'DELETE',
        url: `/panels/${panel.id}?tenantId=${testTenantId}&userId=${testUserId}`,
      })

      expect(response.statusCode).toBe(204)

      // Verify panel is deleted
      const getResponse = await app.inject({
        method: 'GET',
        url: `/panels/${panel.id}?tenantId=${testTenantId}&userId=${testUserId}`,
      })
      expect(getResponse.statusCode).toBe(404)
    })

    it('should return 404 for non-existent panel', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/panels/999?tenantId=${testTenantId}&userId=${testUserId}`,
      })

      expect(response.statusCode).toBe(404)
    })
  })
})
