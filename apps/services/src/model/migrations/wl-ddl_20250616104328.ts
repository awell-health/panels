import { Migration } from '@mikro-orm/migrations';

export class Migration20250616104328 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table "base_column" drop constraint "base_column_data_source_id_foreign";`);

    this.addSql(`alter table "calculated_column" add column "tags" jsonb null;`);

    this.addSql(`alter table "base_column" add column "tags" jsonb null;`);
    this.addSql(`alter table "base_column" alter column "data_source_id" type int using ("data_source_id"::int);`);
    this.addSql(`alter table "base_column" alter column "data_source_id" drop not null;`);
    this.addSql(`alter table "base_column" add constraint "base_column_data_source_id_foreign" foreign key ("data_source_id") references "data_source" ("id") on update cascade on delete set null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "base_column" drop constraint "base_column_data_source_id_foreign";`);

    this.addSql(`alter table "base_column" drop column "tags";`);

    this.addSql(`alter table "base_column" alter column "data_source_id" type int4 using ("data_source_id"::int4);`);
    this.addSql(`alter table "base_column" alter column "data_source_id" set not null;`);
    this.addSql(`alter table "base_column" add constraint "base_column_data_source_id_foreign" foreign key ("data_source_id") references "data_source" ("id") on update cascade on delete no action;`);

    this.addSql(`alter table "calculated_column" drop column "tags";`);
  }

}
