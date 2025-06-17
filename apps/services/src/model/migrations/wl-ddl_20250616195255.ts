import { Migration } from '@mikro-orm/migrations';

export class Migration20250616195255 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table "view" add column "metadata" jsonb null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "view" drop column "metadata";`);
  }

}
