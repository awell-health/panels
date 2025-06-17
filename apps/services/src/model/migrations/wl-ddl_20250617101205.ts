import { Migration } from '@mikro-orm/migrations';

export class Migration20250617101205 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table "panel" add column "metadata" jsonb null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "panel" drop column "metadata";`);
  }

}
