import { Migration } from '@mikro-orm/migrations'

export class Migration20250717172902 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table "base_column" alter column "source_field" type varchar(1024) using ("source_field"::varchar(1024));`,
    )
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table "base_column" alter column "source_field" type varchar(255) using ("source_field"::varchar(255));`,
    )
  }
}
