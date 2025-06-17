//avoid format on save
import 'dotenv/config'
import { env } from '@/env.js'
import type { Options } from '@mikro-orm/core'
import { Migrator } from '@mikro-orm/migrations' // or `@mikro-orm/migrations-mongodb`
import { PostgreSqlDriver } from '@mikro-orm/postgresql'
import { TsMorphMetadataProvider } from '@mikro-orm/reflection'
import { SeedManager } from '@mikro-orm/seeder'

const config: Options<PostgreSqlDriver> = {
  entities: ['./dist/**/*.entity.js'],
  entitiesTs: ['./src/**/*.entity.ts'],
  clientUrl: env.DBSQL_URL,
  driver: PostgreSqlDriver,
  extensions: [Migrator, SeedManager],
  metadataProvider: TsMorphMetadataProvider,
  migrations: {
    path: './dist/model/migrations', // path to the folder with migrations
    pathTs: './src/model/migrations', // path to the folder with TS migrations (if used, we should put path to compiled files in `path`)
    glob: '!(*.d).{js,ts}', // how to match migration files (all .js and .ts files, but not .d.ts)
    fileName: (timestamp: string) => `wl-ddl_${timestamp}`,
    snapshot: false,
  },
  seeder: {
    path: './dist/model/seeders',
    pathTs: './src/model/seeders',
  },
  implicitTransactions: true,
}

export default config
