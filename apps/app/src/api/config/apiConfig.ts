export const apiConfig = {
  // Dynamic getter for base URL to support environment variable changes in tests
  get baseUrl(): string {
    return (
      process.env.NEXT_PUBLIC_APP_API_BASE_URL ||
      process.env.APP_API_BASE_URL ||
      ''
    )
  },

  // Helper function to build full URLs
  buildUrl: (path: string): string => {
    const base = apiConfig.baseUrl.replace(/\/$/, '') // Remove trailing slash
    const cleanPath = path.startsWith('/') ? path : `/${path}`
    return `${base}${cleanPath}`
  },

  // Default fetch options that can be overridden
  defaultOptions: {
    headers: {
      'Content-Type': 'application/json',
    },
  } as RequestInit,
}

// Type for API fetch options
export type ApiOptions = RequestInit | undefined
