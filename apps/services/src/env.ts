import { createEnv } from '@t3-oss/env-core'
import { z } from 'zod'

export const env = createEnv({
  server: {
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    APPLICATION_NAME: z.string().min(1),
    APPLICATION_PORT: z.coerce.number().int().positive().min(1).max(65535),
    CLOSE_GRACE_DELAY: z.coerce.number().default(1000),
    DBSQL_URL: z.string().min(1),
    CACHE_URI: z.string().min(1),
    JWT_SECRET: z.string().min(1),
  },
  runtimeEnv: process.env,
})
