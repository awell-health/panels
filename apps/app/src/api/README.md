# API Testing Setup

This directory contains the API modules for panels and views, along with comprehensive unit tests using Vitest.

## Structure

```
src/api/
├── config/
│   └── apiConfig.ts          # API configuration with runtime-based base URL
├── testUtils.ts              # Shared test utilities and mock data
├── panelsAPI.ts              # Panels API functions
├── panelsAPI.test.ts         # Panels API tests
├── viewsAPI.ts               # Views API functions
├── viewsAPI.test.ts          # Views API tests
└── README.md                 # This file
```

## Configuration

### Runtime Configuration

The API base URL is now configured through runtime configuration using `getRuntimeConfig()`:

- **`storageApiBaseUrl`** - Primary configuration from runtime config
- **Fallback**: Environment variable `APP_API_BASE_URL` for backward compatibility
- **Default**: Empty string (uses relative URLs)

The runtime configuration is fetched from the server and cached to avoid repeated server calls.

### API Configuration

The `apiConfig` object in `config/apiConfig.ts` provides:

- **`getBaseUrl()`**: Async function to get base URL from runtime config
- **`buildUrl(path)`**: Async helper function to build complete URLs
- **`buildUrlSync(path)`**: Synchronous version for backward compatibility
- **`clearCache()`**: Clear runtime config cache
- **`defaultOptions`**: Default fetch options with common headers

```typescript
import { apiConfig } from './config/apiConfig'

// Async version (recommended)
const url = await apiConfig.buildUrl('/api/panels/123')

// Sync version (fallback)
const url = apiConfig.buildUrlSync('/api/panels/123')
```

## Testing

### Test Setup

Tests use Vitest with the following features:

- **Mocked fetch calls** - No actual HTTP requests
- **Type-safe mock data** - Generated from your TypeScript types
- **Environment configuration** - Test different base URL scenarios
- **Comprehensive error testing** - Network, HTTP, and validation errors

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test panelsAPI.test.ts
```

### Test Structure

Each API module has a corresponding test file with:

1. **CRUD Operations Testing**
   - Create, Read, Update, Delete operations
   - Proper URL construction
   - Correct HTTP methods and headers
   - Request body validation

2. **Error Handling Testing**
   - Network failures
   - HTTP error codes (400, 401, 403, 404, 500)
   - Malformed responses
   - Timeout scenarios

3. **Environment Configuration Testing**
   - Different base URLs
   - Missing environment variables
   - Relative URL fallback

### Example Test

```typescript
describe('panelsAPI', () => {
  it('should create a panel with correct API call', async () => {
    const panelData = mockData.panel()
    const expectedResponse = mockResponses.createPanelResponse()

    mockFetch.mockReturnValue(mockFetchSuccess(expectedResponse))

    const result = await panelsAPI.create(panelData)

    // Verify URL construction
    testCrudOperations.expectCorrectUrl(
      mockFetch, 
      'https://api.test.com/api/panels'
    )
    
    // Verify HTTP method
    testCrudOperations.expectCorrectMethod(mockFetch, 'POST')
    
    // Verify request body
    testCrudOperations.expectCorrectBody(mockFetch, panelData)
    
    // Verify response
    expect(result).toEqual(expectedResponse)
  })
})
```

## Mock Data

The `testUtils.ts` file provides comprehensive mock data generators:

### Mock Data Generators

- `mockData.panel()` - Generate panel data
- `mockData.view()` - Generate view data
- `mockData.viewWithId()` - Generate view data with ID
- `mockData.viewPublishInfo()` - Generate publish information
- `mockData.viewSortsInfo()` - Generate sort information

### Mock Response Generators

- `mockResponses.panelResponse()` - Panel API response
- `mockResponses.viewsResponse()` - Views list response
- `mockResponses.errorResponse()` - Error response

### Mock Utilities

- `mockFetchSuccess(data, status)` - Mock successful HTTP response
- `mockFetchError(status, statusText)` - Mock HTTP error response
- `mockNetworkError()` - Mock network failure
- `setupTest()` - Set up test environment
- `cleanupTest()` - Clean up after tests

## API Functions

### Panels API (`panelsAPI.ts`)

- `get(panel, options)` - Fetch single panel
- `all(tenantId, userId, options)` - Fetch all panels
- `create(panel, options)` - Create new panel
- `update(panel, options)` - Update existing panel
- `delete(panel, options)` - Delete panel
- `dataSources.*` - Data source operations
- `columns.*` - Column operations

### Views API (`viewsAPI.ts`)

- `all(tenantId, userId, options)` - Fetch all views
- `get(view, options)` - Fetch single view
- `create(view, options)` - Create new view
- `update(view, options)` - Update existing view
- `delete(view, options)` - Delete view
- `publishing.publish(view, context, options)` - Publish view
- `sorts.update(view, sorts, options)` - Update view sorts
- `sorts.get(view, tenantId, userId, options)` - Get view sorts

## Best Practices

### API Usage

1. **Always use the API functions** instead of direct fetch calls
2. **Pass options parameter** for custom fetch configuration
3. **Handle errors appropriately** in your application code
4. **Use TypeScript types** for type safety

```typescript
// Good
const panels = await panelsAPI.all('tenant-123', 'user-123')

// With custom options
const panels = await panelsAPI.all('tenant-123', 'user-123', {
  signal: abortController.signal,
  cache: 'no-cache'
})
```

### Testing

1. **Mock all external dependencies** (fetch, environment variables)
2. **Test both success and error scenarios**
3. **Verify API calls are made correctly** (URL, method, headers, body)
4. **Use descriptive test names** that explain the scenario
5. **Group related tests** using `describe` blocks

### Configuration

1. **Set environment variables** appropriate for each environment
2. **Use HTTPS in production** for API base URLs
3. **Configure proper CORS** settings on your API server
4. **Handle missing environment variables** gracefully

## Troubleshooting

### Common Issues

**Tests failing with "server-only" error:**
- The `vitest.setup.ts` file mocks the server-only module
- Ensure the setup file is included in your vitest config

**Environment variables not working:**
- Check your `.env` file is in the correct location
- Restart your development server after changing environment variables
- Use `*` prefix for client-side variables

**Type errors in tests:**
- Ensure your mock data matches the TypeScript types
- Check that all required properties are included in mock objects
- Update mock data when API types change

**Network errors in tests:**
- Verify that fetch is properly mocked in your test setup
- Check that `setupTest()` is called in your `beforeEach` block
- Ensure `cleanupTest()` is called in your `afterEach` block 